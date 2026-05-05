const ai = require("../services/ai");
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
    const filePath = await module.exports.downloadTelegramFile(ctx, ctx.message.voice.file_id);
    text = await ai.transcribeAudio(filePath);
  } else if (ctx.message.photo) {
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const fileDetails = ctx.message.photo[ctx.message.photo.length - 1];
    let filePath;

    try {
      filePath = await module.exports.downloadTelegramFile(ctx, fileId);
      console.log(`[Intake] Imagem recebida: ${fileId}, Tamanho: ${fileDetails.file_size} bytes, Path: ${filePath}`);

      const promptJson = `Analise a imagem da cotação/orçamento e extraia os itens e preços no seguinte formato JSON OBRIGATÓRIO:
{
  "fornecedor_nome": "Nome do fornecedor (ou null se não achar)",
  "itens": [
    { 
      "item_codigo": "Código/SKU do fornecedor (se houver)",
      "descricao_bruta": "Nome do produto", 
      "quantidade": 1, 
      "preco_unitario": 150.00, 
      "preco_total": 150.00 
    }
  ],
  "total_identificado": 150.00
}`;
      text = await ai.processMultimodal(filePath, "image/jpeg", promptJson);
    } catch (err) {
      console.error(`[Intake] Falha Crítica na Extração de Visão para fileId: ${fileId}.`, {
        error: err.message,
        stack: err.stack,
        filePath: filePath,
        fileSize: fileDetails.file_size,
        googleApiKey: process.env.GOOGLE_API_KEY ? 'Presente' : 'Ausente',
      });
      
      let userMessage = `❌ Falha na extração: ${err.message}.`;
      if (err.message.includes('API key not valid')) {
        userMessage = '❌ Falha na extração: A chave de API do Gemini não é válida. Verifique o .env.';
      } else if (fileDetails.file_size > 4 * 1024 * 1024) { // Gemini Vision limit is 4MB
        userMessage = '❌ Falha na extração: A imagem é muito grande. Envie imagens menores que 4MB.';
      } else if (err.message.includes('vazio')) {
        userMessage = '❌ Falha na extração: Não foi possível extrair dados da imagem. Tente uma foto mais nítida e com melhor iluminação.';
      }

      return { intent: "erro", content: userMessage };
    } finally {
      const fs = require('fs');
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } else if (ctx.message.document && (ctx.message.document.mime_type === "application/pdf" || ctx.message.document.file_name?.toLowerCase().endsWith(".pdf"))) {
    const doc = ctx.message.document;
    const filePath = await module.exports.downloadTelegramFile(ctx, doc.file_id);
    
    try {
      console.log("[Intake] Iniciando Extração Bruta Local...");
      const raw = extrairTextoBrutoPDF(filePath);
      
      const promptJson = `Analise a imagem da cotação/orçamento e extraia os itens e preços no seguinte formato JSON OBRIGATÓRIO:
{
  "fornecedor_nome": "Nome do fornecedor (ou null se não achar)",
  "itens": [
    { 
      "item_codigo": "Código/SKU do fornecedor (se houver)",
      "descricao_bruta": "Nome do produto", 
      "quantidade": 1, 
      "preco_unitario": 150.00, 
      "preco_total": 150.00 
    }
  ],
  "total_identificado": 150.00
}`;

      if (raw.length > 50) {
        console.log(`[Intake] Sucesso! Texto extraído (${raw.length} chars). Processando via IA...`);
        const prompt = `Analise este orçamento de CFTV e extraia os dados em JSON:
        {
          "fornecedor_nome": "...",
          "itens": [{ "descricao_bruta": "...", "quantidade": 1, "preco_unitario": 0, "preco_total": 0 }],
          "total_identificado": 0
        }
        TEXTO: ${raw.substring(0, 12000)}`;
        
        text = await ai.askGemini(prompt, "Extrator JSON. Retorne apenas o código JSON.");
      }

      if (!text || text.length < 50) {
        text = await ai.extractConsolidatedPDF(filePath, promptJson);
      }
    } catch (err) {
      console.error("[Intake] Erro PDF:", err.message);
    }

    const fs = require('fs');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  if (!text) return { intent: "erro", content: null };

  let isExtractedData = false;
  if (ctx.message.photo || ctx.message.document) {
    // Limpa crases markdown antes de verificar se é JSON
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    if (cleanedText.startsWith('{') || cleanedText.startsWith('[')) {
       isExtractedData = true;
    }
  }

  if (isExtractedData) {
    return { intent: "input_fornecedor", content: text };
  }

  const prompt = `Classifique: nova_solicitacao, input_fornecedor, ajuda, historico, comando_gestao, conversa_geral. Texto: "${text.substring(0, 500)}"`;
  const response = await ai.askGemini(prompt, "Classificador de intenções.");
  const intent = ai.sanitizeResponse(response, ["nova_solicitacao", "input_fornecedor", "ajuda", "historico", "comando_gestao", "conversa_geral"]);
  
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

module.exports = { classificarIntencao, downloadTelegramFile };