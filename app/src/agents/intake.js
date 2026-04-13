const { askGemini, processMultimodal, transcribeAudio, sanitizeResponse } = require("../services/ai");
const { MAX_AUDIO_DURATION_SECONDS } = require("../services/ai/policy/audio_policy");

/**
 * Intake Agent
 * Processa Texto, Voz, Imagens e PDFs.
 */
const classificarIntencao = async (ctx) => {
  let text = "";
  
  // Identificar Tipo de Mídia e Processar
  if (ctx.message.text) {
    text = ctx.message.text;
  } else if (ctx.message.voice) {
    if (ctx.message.voice.duration > MAX_AUDIO_DURATION_SECONDS) {
      return { 
        intent: "erro", 
        content: `Áudio muito longo (${ctx.message.voice.duration}s). O limite é de ${MAX_AUDIO_DURATION_SECONDS}s.` 
      };
    }
    const filePath = await downloadTelegramFile(ctx, ctx.message.voice.file_id);
    text = await transcribeAudio(filePath);
  } else if (ctx.message.photo) {
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const filePath = await downloadTelegramFile(ctx, fileId);
    text = await processMultimodal(filePath, "image/jpeg", "ESTRATÉGIA DE TRANSCRIÇÃO MESTRE:\n1. Identifique o LOGO/NOME DA EMPRESA no topo.\n2. Se houver tabela, transcreva-a obrigatoriamente no formato Markdown (| Coluna |).\n3. Liste todos os valores numéricos, mesmo que pareçam zerados.\n4. Identifique número de orçamento e datas.\n\nDOCUMENTO COMERCIAL:");
  } else if (ctx.message.document && ctx.message.document.mime_type === "application/pdf") {
    const filePath = await downloadTelegramFile(ctx, ctx.message.document.file_id);
    text = await processMultimodal(filePath, "application/pdf", `ESTRATÉGIA DE TRANSCRIÇÃO MESTRE:
1. Transcreva INTEGRALMENTE este PDF.
2. Tabelas devem ser convertidas para formato Markdown (| Item | Qtd | ... |).
3. Identifique o cabeçalho comercial e rodapés financeiros.`);
  // NEW CONDITION FOR IMAGE DOCUMENTS
  } else if (ctx.message.document && ctx.message.document.mime_type.startsWith("image/")) {
    const filePath = await downloadTelegramFile(ctx, ctx.message.document.file_id);
    // Use the actual mime_type for processMultimodal
    text = await processMultimodal(filePath, ctx.message.document.mime_type, `ESTRATÉGIA DE TRANSCRIÇÃO MESTRE:
1. Identifique o LOGO/NOME DA EMPRESA no topo.
2. Se houver tabela, transcreva-a obrigatoriamente no formato Markdown (| Coluna |).
3. Liste todos os valores numéricos, mesmo que pareçam zerados.
4. Identifique número de orçamento e datas.

DOCUMENTO COMERCIAL:`);
  }

  if (!text) return { intent: "erro", content: null };
  // Classificação Inteligente
  const prompt = `Classifique a intenção do usuário em apenas UMA das seguintes palavras: nova_solicitacao, input_fornecedor, ajuda, historico, comando_gestao, conversa_geral.
  
  DICA: Se houver um PDF ou Imagem que pareça uma lista de produtos, preços, marcas (Intelbras, Hikvision, etc) ou um orçamento de outra empresa, classifique como 'input_fornecedor'.
  
  Texto/Descrição: "${text}"`;
  
  const response = await askGemini(prompt, "Classificador de intenções para orçamentos de CFTV. Responda apenas com a palavra-chave.");
  const intent = sanitizeResponse(response, ["nova_solicitacao", "input_fornecedor", "ajuda", "historico", "comando_gestao", "conversa_geral"]);
  
  if (!intent) {
    return { intent: "erro", content: text };
  }

  return { intent, content: text };
};

const downloadTelegramFile = async (ctx, fileId) => {
  const fs = require('fs');
  const path = require('path');
  const axios = require('axios');
  const link = await ctx.telegram.getFileLink(fileId);
  
  let ext = path.extname(link.href).toLowerCase();
  // Mapeamento de extensões para compatibilidade com Groq/Whisper
  if (ext === '.oga') ext = '.ogg';
  if (!ext || ext === '.') ext = '.ogg'; // Default para voz

  const downloadPath = path.resolve(__dirname, `../../temp_${fileId}${ext}`);
  
  const response = await axios({ method: 'GET', url: link.href, responseType: 'stream' });
  const writer = fs.createWriteStream(downloadPath);
  response.data.pipe(writer);
  return new Promise((resolve) => writer.on('finish', () => resolve(downloadPath)));
};

module.exports = { classificarIntencao };
