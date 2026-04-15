const { askGemini, processMultimodal, extractConsolidatedVision, extractConsolidatedPDF, transcribeAudio, sanitizeResponse } = require("../services/ai");
const { MAX_AUDIO_DURATION_SECONDS } = require("../services/ai/policy/audio_policy");

const extrairTextoBrutoPDF = (filePath) => {
  const fs = require('fs');
  try {
    const buffer = fs.readFileSync(filePath);
    return buffer.toString('utf8').replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s\s+/g, ' ');
  } catch (e) {
    console.error("[Intake] Erro na extração bruta:", e.message);
    return "";
  }
};

/**
 * Intake Agent
 * Processa Texto, Voz, Imagens e PDFs.
 */
const classificarIntencao = async (ctx) => {
  let text = "";
  console.log(`[Intake] Mensagem recebida:`, JSON.stringify(ctx.message, null, 2));
  
  if (ctx.message.text) {
    text = ctx.message.text;
  } else if (ctx.message.voice) {
    if (ctx.message.voice.duration > MAX_AUDIO_DURATION_SECONDS) {
      return { intent: "erro", content: `Áudio muito longo.` };
    }
    const filePath = await downloadTelegramFile(ctx, ctx.message.voice.file_id);
    text = await transcribeAudio(filePath);
  } else if (ctx.message.photo) {
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const filePath = await downloadTelegramFile(ctx, fileId);
    text = await extractConsolidatedVision(filePath, "image/jpeg", "Extraia JSON de itens e preços.");
  } else if (ctx.message.document && (ctx.message.document.mime_type === "application/pdf" || ctx.message.document.file_name?.toLowerCase().endsWith(".pdf"))) {
    const doc = ctx.message.document;
    const filePath = await downloadTelegramFile(ctx, doc.file_id);
    
    try {
      console.log("[Intake] Iniciando Extração Bruta Local...");
      const raw = extrairTextoBrutoPDF(filePath);
      
      if (raw.length > 50) {
        console.log(`[Intake] Sucesso! Texto extraído (${raw.length} chars). Processando via IA...`);
        const prompt = `Analise este orçamento de CFTV e extraia os dados em JSON:
        {
          "fornecedor_nome": "...",
          "itens": [{ "descricao_bruta": "...", "quantidade": 1, "preco_unitario": 0, "preco_total": 0 }],
          "total_identificado": 0
        }
        TEXTO: ${raw.substring(0, 12000)}`;
        
        text = await askGemini(prompt, "Extrator JSON. Retorne apenas o código JSON.");
      }

      if (!text || text.length < 50) {
        console.warn("[Intake] Fallback para Squad de Visão...");
        text = await extractConsolidatedPDF(filePath, "Extraia JSON.");
      }
    } catch (err) {
      console.error("[Intake] Erro PDF:", err.message);
    }

    const fs = require('fs');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  if (!text) return { intent: "erro", content: null };

  const prompt = `Classifique: nova_solicitacao, input_fornecedor, ajuda, historico, comando_gestao, conversa_geral. Texto: "${text.substring(0, 500)}"`;
  const response = await askGemini(prompt, "Classificador de intenções.");
  const intent = sanitizeResponse(response, ["nova_solicitacao", "input_fornecedor", "ajuda", "historico", "comando_gestao", "conversa_geral"]);
  
  return { intent: intent || "input_fornecedor", content: text };
};

const downloadTelegramFile = async (ctx, fileId) => {
  const fs = require('fs');
  const path = require('path');
  const axios = require('axios');
  const link = await ctx.telegram.getFileLink(fileId);
  
  let ext = path.extname(link.href || '').toLowerCase();
  if (ext.includes('?')) ext = ext.split('?')[0];
  if (!ext || ext === '.') ext = '.pdf'; 

  const downloadPath = path.resolve(__dirname, `../../temp_${fileId}${ext}`);
  
  if (link.href.startsWith('file://')) {
    const srcPath = link.href.replace('file://', '');
    fs.copyFileSync(srcPath, downloadPath);
    return downloadPath;
  }

  const response = await axios({ method: 'GET', url: link.href, responseType: 'stream' });
  const writer = fs.createWriteStream(downloadPath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(downloadPath));
    writer.on('error', reject);
  });
};

module.exports = { classificarIntencao };