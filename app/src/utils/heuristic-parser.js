/**
 * NOCTUA HEURISTIC PARSER
 * Lógica determinística para extração de dados, IDs e Comandos de Controle.
 */

const HEURISTICS = {
  quantity: /(\d+)\s*(?:câmera|camera|cam|ponto|canal|canais|unidade|un)/i,
  tech: /\b(ip|digital|analógica|analogica|ahd|hdcvi|hdcvi)\b/i,
  storage: /(\d+)\s*(gb|tb)/i,
  recorder: /\b(nvr|dvr|hvr|gravador|video recorder)\b/i,
  short_id: /\b(?:orc-|cot-)?(\d{1,6})\b/i,

  // Comandos de Controle (Prioridade Máxima)
  control: {
    reset: /\b(reinicie|reiniciar|resetar|limpar|começar de novo|apagar|nova conversa|novo atendimento|novo atendimento)\b/i,
    finish: /\b(finalizar|encerrar|concluir|terminar|fechar esse orçamento|salvar e sair)\b/i,
    menu: /\b(menu|voltar|opções|inicio|início|oi|olá|ola|oii|bom dia|boa tarde|boa noite)\b/i
  },

  intents: {
    client_budget_start: /\b(orçamento|orcamento|preço|valor|quero|preciso|instalar|montar|camera|câmera)\b/i,
    budget_reset: /\b(limpar|reset|apagar|novo|recomeçar|zero)\b/i,
    supplier_sync: /\b(fornecedor|tabela|preço fornecedor|cotação fornecedor)\b/i,
    history: /\b(consultar|ver|listar|histórico|historico|meus)\b/i
  }
};

const parseLocal = (text) => {
  const result = {
    entities: {},
    intent: null,
    ambiguities: [],
    numeric_selection: null,
    detected_id: null,
    is_reset: false,
    is_greeting: false
  };

  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();

  // 1. Detectar Comandos de Controle
  if (HEURISTICS.control.reset.test(lowerText)) result.is_reset = true;
  if (HEURISTICS.control.menu.test(lowerText)) result.is_greeting = true;

  // 2. Detectar seleção numérica pura
  const numMatch = cleanText.match(/^(\d+)$/);
  if (numMatch) result.numeric_selection = parseInt(numMatch[1]);

  // 3. Detectar ID
  const idMatch = cleanText.match(HEURISTICS.short_id);
  if (idMatch && cleanText.length < 15) result.detected_id = idMatch[1];

  // 4. Entidades Técnicas
  const qtyMatch = text.match(HEURISTICS.quantity) || text.match(/(\d+)\s*(?:camera|câmera)/i);
  if (qtyMatch) result.entities.camera_quantity = parseInt(qtyMatch[1]);

  const techMatch = text.match(HEURISTICS.tech);
  if (techMatch) result.entities.system_type = techMatch[1].toUpperCase();

  const recMatch = text.match(HEURISTICS.recorder);
  if (recMatch) result.entities.recording_required = true;

  const storeMatch = text.match(HEURISTICS.storage);
  if (storeMatch) {
    const val = parseInt(storeMatch[1]);
    const unit = storeMatch[2].toLowerCase();
    if (unit === 'gb' && val <= 10) {
      result.ambiguities.push({ 
        field: 'storage_unit', 
        message: `Você disse ${val}GB, mas para NVR/DVR o comum é ${val}TB. Confirma se é Tera?`,
        suggestion: `${val}TB`
      });
    }
    result.entities.storage_info = `${val}${unit.toUpperCase()}`;
  }

  // 5. Intenção (Heurística)
  for (const [intent, regex] of Object.entries(HEURISTICS.intents)) {
    if (regex.test(text)) {
      result.intent = intent;
      break;
    }
  }

  return result;
};

module.exports = { parseLocal };
