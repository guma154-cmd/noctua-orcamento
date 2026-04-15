const orchestrator = require("./ai/orchestrator");

/**
 * Função Principal de IA com Fallback Orquestrado (SORIA V2)
 */
const askAI = async (prompt, systemInstruction = "") => {
  return await orchestrator.run("TEXT", async (provider, config) => {
    return await provider.execute(prompt, systemInstruction, config?.params?.model);
  });
};

/**
 * Alias para manter compatibilidade com o código existente (retornando apenas o conteúdo)
 */
const askGemini = async (prompt, system) => {
  const result = await askAI(prompt, system);
  return result ? result.content : null;
};

/**
 * Processamento Multimodal (Imagens/Documentos)
 */
const processMultimodal = async (filePath, mimeType, prompt) => {
  const opType = mimeType === "application/pdf" ? "PDF" : "image-to-text";
  const result = await orchestrator.run(opType, async (provider, config) => {
    return await provider.processMultimodal(filePath, mimeType, prompt, config?.params?.model);
  });
  return result ? result.content : null;
};

const { getProviderConfig } = require("./ai/matrix");

/**
 * EXTRAÇÃO ROBUSTA (SQUAD DE VISÃO)
 * Tenta extrair dados estruturados usando múltiplos modelos em paralelo e consolida o resultado.
 */
const extractConsolidatedVision = async (filePath, mimeType, structuredPrompt) => {
  console.log("[AI-Service] Iniciando Squad de Visão para extração robusta...");
  
  // 1. Preparar tarefas para os 3 primeiros provedores de visão da matriz
  const squadConfigs = [
    getProviderConfig("image-to-text", 1), // Gemini Primary
    getProviderConfig("image-to-text", 2), // Gemini Fallback
    getProviderConfig("image-to-text", 3), // Groq Vision
    getProviderConfig("image-to-text", 4), // SambaNova
    getProviderConfig("image-to-text", 5), // OpenRouter (Dolphin)
    getProviderConfig("image-to-text", 6)  // OpenAI (GPT-4o-mini)
  ].filter(c => c !== null);

  const tasks = squadConfigs.map((config, index) => 
    orchestrator.runSpecificConfig(config, async (provider, cfg) => {
      console.log(`[AI-Service] Iniciando tarefa do modelo ${index+1} (${provider.name})...`);
      return await provider.processMultimodal(filePath, mimeType, structuredPrompt, cfg?.params?.model);
    }, null, "SQUAD_VISION")
  );

  // 2. Executar em paralelo
  console.log(`[AI-Service] Aguardando respostas do Squad (${tasks.length} modelos)...`);
  const results = await Promise.allSettled(tasks);
  const validResults = results
    .filter(r => r.status === 'fulfilled' && r.value && r.value.content)
    .map(r => r.value.content);

  console.log(`[AI-Service] Squad finalizado. Resultados válidos: ${validResults.length}/${squadConfigs.length}`);

  if (validResults.length === 0) return null;
  if (validResults.length === 1) return validResults[0];

  // 3. Consolidação Crítica: Usamos um modelo forte para julgar os resultados
  const consolidationPrompt = `
    Você é um juiz de dados fiscais (CFTV). Recebi extrações de múltiplos modelos de visão.
    Alguns modelos podem ter falhado ou ignorado itens da tabela.
    
    TAREFA: Compare as extrações abaixo e gere um JSON ÚNICO e CONSOLIDADO que contenha TODOS os itens encontrados, priorizando valores numéricos claros.
    
    Resultados dos Modelos:
    ${validResults.map((res, i) => `[MODELO ${i+1}]:\n${res}`).join("\n\n")}

    JSON FINAL CONSOLIDADO:
  `;

  console.log(`[AI-Service] Consolidando via Juiz (Prompt de ${consolidationPrompt.length} chars)...`);
  const finalResponse = await askGemini(consolidationPrompt, "Consolidador mestre de orçamentos. Retorne APENAS JSON.");
  console.log(`[AI-Service] Resposta do Juiz: ${finalResponse ? 'Sucesso' : 'Falha'}`);
  return finalResponse;
};

/**
 * Transcrição de Áudio (Whisper SambaNova / Gemini Audio)
 */
const transcribeAudio = async (filePath) => {
  const result = await orchestrator.run("AUDIO", async (provider) => {
    if (provider.name === "SambaNova" || provider.name === "Groq") {
      return await provider.transcribeAudio(filePath);
    } else {
      // No Gemini, áudio é tratado como multimodal
      return await provider.processMultimodal(filePath, "audio/ogg", "Transcreva este áudio exatamente.");
    }
  });
  return result ? result.content : null;
};

/**
 * SQUAD DE PDF (EXTRAÇÃO SEQUENCIAL RESILIENTE)
 * PDFs são pesados. Tentamos modelos sequencialmente para evitar Rate Limit (429).
 */
const extractConsolidatedPDF = async (filePath, structuredPrompt) => {
  console.log("[AI-Service] Iniciando extração de PDF...");
  
  const squadConfigs = [
    getProviderConfig("PDF", 1), // Gemini Primary
    getProviderConfig("PDF", 3), // OpenRouter (Geralmente modelos diferentes)
    getProviderConfig("PDF", 2), // Gemini Fallback
    getProviderConfig("PDF", 6)  // OpenAI
  ].filter(c => c !== null);

  const validResults = [];

  for (const config of squadConfigs) {
    try {
      const result = await orchestrator.runSpecificConfig(config, async (provider, cfg) => {
        return await provider.processMultimodal(filePath, "application/pdf", structuredPrompt, cfg?.params?.model);
      }, null, "SQUAD_PDF");

      if (result && result.content) {
        validResults.push(result.content);
        // Se conseguimos um resultado de ALTA QUALIDADE (Gemini ou OpenAI), 
        // podemos decidir parar aqui para economizar tokens/tempo, 
        // ou continuar para consolidar. Vamos parar no primeiro sucesso por enquanto 
        // para agilizar o teste de estresse.
        break; 
      }
    } catch (err) {
      console.warn(`[AI-Service] Falha no modelo do Squad: ${err.message}`);
    }
  }

  if (validResults.length === 0) return null;
  if (validResults.length === 1) return validResults[0];

  // Se por algum motivo tivermos mais de um (caso removamos o 'break' acima)
  const consolidationPrompt = `
    Você é um juiz de dados fiscais. Recebi extrações de múltiplos modelos de um PDF.
    Gere um JSON ÚNICO e CONSOLIDADO com TODOS os itens encontrados no documento.
    
    Resultados:
    ${validResults.map((res, i) => `[MODELO ${i+1}]:\n${res}`).join("\n\n")}

    JSON FINAL:
  `;

  return await askGemini(consolidationPrompt, "Consolidador de PDFs. Retorne apenas JSON.");
};

/**
 * Limpa e padroniza a resposta da IA
 */
const sanitizeResponse = (text, allowedKeywords = []) => {
  if (!text) return "";
  const clean = text.toLowerCase();
  if (allowedKeywords.length > 0) {
    for (const key of allowedKeywords) {
      if (clean.includes(key)) return key;
    }
  }
  return text.trim();
};

module.exports = { 
  askAI, 
  askGemini, 
  processMultimodal, 
  extractConsolidatedVision,
  extractConsolidatedPDF,
  transcribeAudio, 
  sanitizeResponse 
};

