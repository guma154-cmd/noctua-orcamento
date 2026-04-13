const orchestrator = require("./ai/orchestrator");

/**
 * Função Principal de IA com Fallback Orquestrado (SORIA V2)
 */
const askAI = async (prompt, systemInstruction = "") => {
  return await orchestrator.run("TEXT", async (provider) => {
    return await provider.execute(prompt, systemInstruction);
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
  const result = await orchestrator.run("MULTIMODAL", async (provider) => {
    return await provider.processMultimodal(filePath, mimeType, prompt);
  });
  return result ? result.content : null;
};

/**
 * Transcrição de Áudio (Whisper SambaNova / Gemini Audio)
 */
const transcribeAudio = async (filePath) => {
  const result = await orchestrator.run("AUDIO", async (provider) => {
    if (provider.name === "SambaNova") {
      return await provider.transcribeAudio(filePath);
    } else {
      // No Gemini, áudio é tratado como multimodal
      return await provider.processMultimodal(filePath, "audio/ogg", "Transcreva este áudio exatamente.");
    }
  });
  return result ? result.content : null;
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
  transcribeAudio, 
  sanitizeResponse 
};
