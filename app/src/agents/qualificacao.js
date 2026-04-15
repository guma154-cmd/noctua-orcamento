const { askGemini } = require("../services/ai");
const { parseLocal } = require("../utils/heuristic-parser");

/**
 * MAPEAMENTO DE FAMÍLIAS SEMÂNTICAS - CONVERSA GUIADA
 */
const QUESTION_FAMILIES = {
  property_type: {
    label: 'tipo de local',
    fields: ['property_type'],
    options: ['Casa', 'Apartamento', 'Comércio', 'Condomínio', 'Outro'],
    keywords: ['casa', 'apartamento', 'comércio', 'loja', 'residência', 'prédio', 'comercio', 'residencia', 'predio'],
    prompt: "Qual o tipo de local?"
  },
  camera_quantity: {
    label: 'quantidade de câmeras',
    fields: ['camera_quantity'],
    prompt: "Quantas câmeras seriam?"
  },
  installation_environment: {
    label: 'ambiente de instalação',
    fields: ['installation_environment'],
    options: ['Interno', 'Externo', 'Misto'],
    keywords: ['interno', 'externo', 'misto', 'dentro', 'fora', 'rua'],
    prompt: "O ambiente é:"
  },
  system_type: {
    label: 'tipo de sistema',
    fields: ['system_type'],
    options: ['IP (Digital)', 'Analógico (HD)', 'Ainda não sei'],
    keywords: ['ip', 'digital', 'analógico', 'analogico', 'hd'],
    prompt: "Qual tecnologia prefere?"
  },
  recording: {
    label: 'gravação',
    fields: ['recording_required'],
    options: ['Sim', 'Não', 'Ainda não sei'],
    keywords: ['sim', 'não', 'gravar', 'gravação', 'dvr', 'nvr'],
    prompt: "Vai precisar de gravação?"
  },
  remote_access: {
    label: 'acesso remoto',
    fields: ['remote_view'],
    options: ['Sim', 'Não', 'Ainda não sei'],
    keywords: ['celular', 'app', 'remoto', 'internet'],
    prompt: "Vai precisar acessar pelo celular?"
  },
  material_source: {
    label: 'material',
    fields: ['material_source'],
    options: ['Cliente fornece', 'NOCTUA fornece', 'Parcial / Não definido'],
    keywords: ['cliente', 'noctua', 'nós', 'eu'],
    prompt: "Quem vai fornecer o material?"
  },
  client_name: {
    label: 'nome do cliente',
    fields: ['client_name'],
    prompt: "Qual o nome do cliente para o orçamento?",
    free_text: true
  }
};

const DEFAULT_STATE = {
  operator_name: "Rafael",
  active_flow: null, 
  flow_status: 'idle', // [idle, awaiting_menu, collecting, finished]
  client_name: null,
  property_type: null,
  camera_quantity: null,
  installation_environment: null,
  system_type: null,
  recording_required: null,
  remote_view: null,
  material_source: null,
  answered_families: [],
  last_question_family: null,
  meta: {
    draft_id: null,
    last_parse_method: null,
    ambiguities: []
  }
};

/**
 * RESOLVER RESPOSTA (DETERMINÍSTICO)
 * Tenta mapear resposta numérica ou textual equivalente para a família atual.
 */
const resolvePendingAnswer = (text, family) => {
  const config = QUESTION_FAMILIES[family];
  if (!config) return null;

  // Se for texto livre, qualquer coisa serve (desde que não seja comando)
  if (config.free_text && text.trim().length > 1) {
    return text.trim();
  }

  const lowerText = text.toLowerCase().trim();

  // 1. Tentar Número Puro
  const numMatch = lowerText.match(/^(\d+)$/);
  if (numMatch && config.options) {
    const idx = parseInt(numMatch[1]) - 1;
    if (config.options[idx]) return config.options[idx];
  }

  // 2. Tentar Texto Equivalente (Opções)
  if (config.options) {
    const foundOpt = config.options.find(opt => lowerText === opt.toLowerCase());
    if (foundOpt) return foundOpt;
    
    // Tentar por prefixo numérico (ex: "1. Casa" -> "1")
    const optMatch = lowerText.match(/^(\d+)\s*[\.\-\)]\s*(.*)$/);
    if (optMatch) {
      const idx = parseInt(optMatch[1]) - 1;
      if (config.options[idx]) return config.options[idx];
    }
  }

  // 3. Tentar Keywords
  if (config.keywords) {
    for (const kw of config.keywords) {
      if (lowerText.includes(kw)) {
        // Se houver opções, tenta mapear a keyword para a opção
        if (config.options) {
          const matchedOpt = config.options.find(opt => opt.toLowerCase().includes(kw));
          if (matchedOpt) return matchedOpt;
        }
        return kw; // Fallback para a keyword
      }
    }
  }

  return null;
};

const classifyIncomingMessage = async (text, estado) => {
  const localResult = parseLocal(text);
  
  // Se for comando de controle, retorna control_command p/ Engine tratar
  if (localResult.is_reset || localResult.is_greeting) return 'control_command';

  // Se houver pendência, priorizar a resolução da resposta antes de classificar nova intenção
  if (estado.last_question_family) {
    const resolved = resolvePendingAnswer(text, estado.last_question_family);
    if (resolved) return 'answer_pending';
  }

  const systemInstruction = `Você é o Intent Router da Noctua. Identifique se o usuário quer:
    - client_budget_start: Iniciar um novo orçamento de cliente.
    - supplier_quote_save: Salvar cotação de fornecedor.
    - budget_reset: Resetar, limpar, apagar a conversa, começar do zero, esquecer tudo.
    - smalltalk: Conversa casual ou saudações.
    Retorne apenas uma destas palavras chaves.`;
  const result = await askGemini(text, systemInstruction);
  console.log(`[Intent-Router] Input: "${text}" -> IA Result: "${result}"`);
  
  if (!result) return localResult.intent || 'unknown';
  
  const lower = result.toLowerCase();
  if (lower.includes('fornecedor')) return 'supplier_quote_save';
  if (lower.includes('novo')) return 'client_budget_start';
  if (lower.includes('reset') || lower.includes('limpar') || lower.includes('apagar') || lower.includes('zero') || lower.includes('recomeçar') || lower.includes('reiniciar') || lower.includes('reinicie')) return 'budget_reset';
  return 'smalltalk';
};

const atualizarEstado = async (texto, estadoAtual) => {
  if (!texto) return estadoAtual;
  
  // 1. Tentar Resolver Resposta Pendente (DETERMINÍSTICO)
  if (estadoAtual.last_question_family) {
    const resolved = resolvePendingAnswer(texto, estadoAtual.last_question_family);
    if (resolved) {
      const field = QUESTION_FAMILIES[estadoAtual.last_question_family].fields[0];
      estadoAtual[field] = resolved;
      if (!estadoAtual.answered_families.includes(estadoAtual.last_question_family)) {
        estadoAtual.answered_families.push(estadoAtual.last_question_family);
      }
      estadoAtual.last_question_family = null; // LIMPA PENDÊNCIA
      return estadoAtual;
    }
  }

  // 2. Tentar IA (Modo Livre)
  const prompt = `Extraia dados de CFTV: "${texto}". Estado: ${JSON.stringify(estadoAtual)}`;
  const response = await askGemini(prompt, "Extraia campos JSON.");

  if (response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const dadosIA = JSON.parse(jsonMatch ? jsonMatch[0] : response);
      Object.assign(estadoAtual, dadosIA);
    } catch (e) {}
  }

  // 3. Auto-track famílias respondidas
  Object.keys(QUESTION_FAMILIES).forEach(fam => {
    const fields = QUESTION_FAMILIES[fam].fields;
    if (fields.some(f => estadoAtual[f] !== undefined && estadoAtual[f] !== null)) {
      if (!estadoAtual.answered_families.includes(fam)) estadoAtual.answered_families.push(fam);
    }
  });

  return estadoAtual;
};

const decidirProximaAção = async (estado, intent) => {
  const familias = Object.keys(QUESTION_FAMILIES);
  const pendente = familias.find(f => !estado.answered_families.includes(f));

  const budgetIdPrefix = estado.meta && estado.meta.draft_id ? `[${estado.meta.draft_id}] ` : "";

  if (!pendente) {
    estado.flow_status = 'finished';
    return { action: 'calculate', text: `${budgetIdPrefix}Maravilha! Orçamento concluído.` };
  }

  estado.last_question_family = pendente;
  estado.flow_status = 'collecting';
  const config = QUESTION_FAMILIES[pendente];
  
  let menu = `${budgetIdPrefix}${config.prompt}\n`;
  if (config.options) {
    menu += config.options.map((opt, i) => `${i+1}. ${opt}`).join('\n');
  }
  return { action: 'ask_field', text: menu.trim(), family: pendente };
};

module.exports = { atualizarEstado, decidirProximaAção, classifyIncomingMessage, resolvePendingAnswer, DEFAULT_STATE, QUESTION_FAMILIES };
