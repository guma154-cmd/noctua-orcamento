const { askGemini } = require("../services/ai");
const { parseLocal } = require("../utils/heuristic-parser");

/**
 * MAPEAMENTO DE FAMÍLIAS SEMÂNTICAS - CONVERSA GUIADA
 */
const QUESTION_FAMILIES = {
  budget_model: {
    label: 'modelo do orçamento',
    fields: ['budget_model'],
    options: [
      'A - Fornecimento Completo\n(Materiais + Instalação)', 
      'B - Só Mão de Obra\n(Cliente já comprou tudo)', 
      'C - Fornecimento Misto\n(Divisão por categoria)'
    ],
    prompt: "🦉 NOCTUA — Novo Orçamento\nQual o modelo deste projeto?"
  },
  system_type: {
    label: 'tecnologia',
    fields: ['system_type'],
    options: ['IP (Cabo de Rede)', 'Analógica (Cabo Coaxial)', 'Híbrida (Existente + Nova)'],
    keywords: ['ip', 'digital', 'cvi', 'tvi', 'ahd', 'híbrida', 'hibrida', 'analógica', 'analogica', 'rede'],
    prompt: "🔧 TIPO DE TECNOLOGIA\nQual a tecnologia das câmeras deste projeto?",
    condition: (estado) => true // Essencial
  },
  poe_mode: {
    label: 'PoE',
    fields: ['poe_mode'],
    options: [
      'NVR com PoE integrado (Direto no gravador)', 
      'Switch PoE externo (Centralizado)', 
      'Fonte individual por câmera'
    ],
    prompt: "⚡ INFRAESTRUTURA PoE\nComo as câmeras serão alimentadas?",
    condition: (estado) => (estado.system_type || "").toLowerCase().includes('ip')
  },
  retrofit: {
    label: 'retrofit',
    fields: ['retrofit_coax'],
    options: ['Sim', 'Não'],
    prompt: "📡 CABEAMENTO EXISTENTE\nExiste cabo coaxial (RG59/RG6) já instalado que deseja reaproveitar?",
    condition: (estado) => (estado.system_type || "").toLowerCase().includes('analóg') || (estado.system_type || "").toLowerCase().includes('híbrid')
  },
  ip_over_coax: {
    label: 'IP over Coax',
    fields: ['use_eoc'],
    options: ['Sim, incluir tecnologia EoC', 'Não, manter convencional'],
    prompt: "💡 SUGESTÃO TÉCNICA\nExiste tecnologia que permite rodar câmeras IP em cabo coaxial existente (EoC). Isso evita nova passagem de cabo. Deseja incluir esta opção?",
    condition: (estado) => estado.retrofit_coax === 'Sim'
  },
  camera_quantity: {
    label: 'quantidade de câmeras',
    fields: ['camera_quantity'],
    options: ['4 câmeras', '8 câmeras', '16 câmeras', '32 câmeras', 'Outra quantidade'],
    prompt: "Quantas câmeras seriam?",
    condition: (estado) => true
  },
  installation_environment: {
    label: 'ambiente de instalação',
    fields: ['installation_environment'],
    options: ['Interno', 'Externo', 'Misto'],
    keywords: ['interno', 'externo', 'misto', 'dentro', 'fora', 'rua'],
    prompt: "O ambiente é:",
    condition: (estado) => true
  },
  recording: {
    label: 'gravação',
    fields: ['recording_required'],
    options: ['Sim', 'Não', 'Já possuo o HD', 'Não sabe (Verificar)'],
    keywords: ['sim', 'não', 'gravar', 'gravação', 'dvr', 'nvr', 'hd', 'possuo', 'tenho', 'sabe', 'verificar'],
    prompt: "O sistema terá gravação?",
    condition: (estado) => true 
  },
  recording_days: {
    label: 'dias de gravação',
    fields: ['recording_days'],
    options: ['7 dias (Econômico)', '15 dias (Padrão)', '30 dias (Segurança Máxima)', 'Outro (Personalizado)'],
    prompt: "Quantos dias de gravação deseja manter?",
    condition: (estado) => {
        if (estado.recording_required !== 'Sim') return false;
        if (estado.budget_model === 'A') return true;
        if (estado.budget_model === 'C' && estado.source_recorder?.includes('NOCTUA')) return true;
        return false;
    }
  },
  client_hd_size: {
    label: 'tamanho do HD',
    fields: ['client_hd_gb'],
    options: ['500 GB', '1 TB', '2 TB', '4 TB', 'Outro tamanho'],
    prompt: "Qual a capacidade do HD do cliente?",
    condition: (estado) => {
        if (estado.recording_required === 'Não') return false;
        if (estado.recording_required?.includes('possuo')) return true;
        if (estado.budget_model === 'B' && estado.recording_required === 'Sim') return true;
        if (estado.budget_model === 'C' && estado.source_recorder?.includes('Cliente') && estado.recording_required === 'Sim') return true;
        return false;
    }
  },
  remote_access: {
    label: 'acesso remoto',
    fields: ['remote_view'],
    options: ['Sim', 'Não', 'Ainda não sei'],
    keywords: ['celular', 'app', 'remoto', 'internet'],
    prompt: "Vai precisar acessar pelo celular?",
    condition: (estado) => true
  },
  installation_type: {
    label: 'tipo de instalação',
    fields: ['installation_complexity'],
    options: ['Parede normal', 'Teto', 'Altura > 3m', 'Fachada'],
    prompt: "Qual o tipo de instalação predominante?",
    condition: (estado) => true
  },
  cable_path_type: {
    label: 'passagem de cabo',
    fields: ['cable_path_complexity'],
    options: ['Embutida existente', 'Calha/Eletroduto', 'Sobreposta', 'Requer quebra de alvenaria'],
    prompt: "Como será a passagem do cabeamento?",
    condition: (estado) => true
  },
  category_allocation_cameras: {
    label: 'responsável pelas câmeras',
    fields: ['source_cameras'],
    options: ['NOCTUA fornece', 'Cliente fornece'],
    prompt: "No Modelo Misto, quem fornece as Câmeras?",
    condition: (estado) => estado.budget_model === 'C'
  },
  category_allocation_recorder: {
    label: 'responsável pelo gravador',
    fields: ['source_recorder'],
    options: ['NOCTUA fornece', 'Cliente fornece'],
    prompt: "Quem fornece o Gravador (DVR/NVR)?",
    condition: (estado) => estado.budget_model === 'C'
  },
  category_allocation_cables: {
    label: 'responsável pelos cabos',
    fields: ['source_cables'],
    options: ['NOCTUA fornece', 'Cliente fornece'],
    prompt: "Quem fornece os Cabos e Conectores?",
    condition: (estado) => estado.budget_model === 'C'
  },
  category_allocation_infra: {
    label: 'responsável pela infra',
    fields: ['source_infra'],
    options: ['NOCTUA fornece', 'Cliente fornece'],
    prompt: "Quem fornece a Infraestrutura (Eletrodutos, caixas)?",
    condition: (estado) => estado.budget_model === 'C'
  },
  client_name: {
    label: 'nome do cliente',
    fields: ['client_name'],
    prompt: "Qual o nome do cliente para o orçamento?",
    free_text: true
  },
  client_address: {
    label: 'endereço',
    fields: ['client_address'],
    prompt: "Qual o endereço de instalação?",
    free_text: true
  },
  client_phone: {
    label: 'telefone',
    fields: ['client_phone'],
    prompt: "Qual o telefone de contato do cliente?",
    free_text: true
  }
};

const getDefaultState = () => ({
  operator_name: "Rafael",
  active_flow: null, 
  flow_status: 'idle', // [idle, awaiting_menu, collecting, finished]
  client_name: null,
  client_address: null,
  client_phone: null,
  property_type: null,
  camera_quantity: null,
  installation_environment: null,
  system_type: null,
  poe_mode: null,
  retrofit_coax: null,
  use_eoc: null,
  recording_required: null,
  recording_days: null,
  client_hd_gb: null,
  remote_view: null,
  budget_model: null,
  material_source: null,
  answered_families: [],
  last_question_family: null,
  meta: {
    draft_id: null,
    last_parse_method: null,
    ambiguities: [],
    retry_count: {}
  }
});

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

  // Bloqueio de comandos do menu principal que podem colidir com números
  const menuCommands = ['1', '2', '3', '4', '5'];
  
  // 1. Tentar Número Puro
  const numMatch = lowerText.match(/^(\d+)$/);
  if (numMatch) {
    const cleanNum = numMatch[1];
    if (config.options) {
      const idx = parseInt(cleanNum) - 1;
      if (config.options[idx]) {
          const selectedOpt = config.options[idx].toLowerCase();
          // INTERCEPTAÇÃO: Se escolheu "Outra", mas é um número puro
          if (selectedOpt.includes('outra')) {
              if (lowerText.includes('outra')) return 'WAIT_FOR_MANUAL'; // Clique ou texto explícito
              return cleanNum; // Apenas o número, aceita como valor
          }
          return config.options[idx];
      }

      // Se não corresponde a um índice de opção mas a família permite número direto (ex: quantidade)
      if (family === 'camera_quantity' || family.includes('quantity') || family.includes('count')) {
          return cleanNum;
      }
    } else {
      return cleanNum;
    }
  }

  // 2. Tentar Texto Equivalente (Opções)
  if (config.options) {
    const foundOpt = config.options.find(opt => lowerText === opt.toLowerCase());
    if (foundOpt) {
        if (foundOpt.toLowerCase().includes('outra')) return 'WAIT_FOR_MANUAL';
        return foundOpt;
    }
    // Tentar por prefixo numérico (ex: "1. Casa" -> "1")
    const optMatch = lowerText.match(/^(\d+)\s*[\.\-\)]\s*(.*)$/);
    if (optMatch) {
      const idx = parseInt(optMatch[1]) - 1;
      if (config.options[idx]) {
          if (config.options[idx].toLowerCase().includes('outra')) return 'WAIT_FOR_MANUAL';
          return config.options[idx];
      }
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

  if (family === 'client_hd_size') {
      const lower = text.toLowerCase();
      const match = lower.match(/(\d+([.,]\d+)?)\s*(t|g)/);
      if (match) {
          let val = parseFloat(match[1].replace(',', '.'));
          const unit = match[3];
          if (unit === 't') return val.toString(); // Internamente o TSR e orcamento vão usar TB agora
          return (val / 1024).toFixed(3); // Converte GB para TB e salva
      }
      if (lower.includes('500')) return '0.5';
      if (lower.includes('1')) return '1';
      if (lower.includes('2')) return '2';
      if (lower.includes('4')) return '4';
  }

  if (family === 'recording_days') {
      const daysNum = parseInt(lowerText);
      if (!isNaN(daysNum) && daysNum > 50) return daysNum.toString(); // Números grandes -> dias
      if (lowerText === '1' || lowerText.includes('7')) return '7';
      if (lowerText === '2' || lowerText.includes('15')) return '15';
      if (lowerText === '3' || lowerText.includes('30')) return '30';
  }

  if (family === 'budget_model') {
      if (clean === '1' || lower.includes('modelo a') || lower.includes('completo')) return 'A';
      if (clean === '2' || lower.includes('modelo b') || lower.includes('obra')) return 'B';
      if (clean === '3' || lower.includes('modelo c') || lower.includes('misto')) return 'C';
      if (lower === 'a' || lower === 'b' || lower === 'c') return lower.toUpperCase();
  }

  return null;
}

const classifyIncomingMessage = async (text, estado) => {
  const localResult = parseLocal(text);
  const clean = (text || "").toLowerCase().trim();
  
  // 1. Tentar Número Puro (Decimais e Unidades) - PROTEÇÃO AGRESSIVA
  const isTechnicalData = /^(\d+([.,]\d+)?)(m|metros)?$/.test(clean);
  if (isTechnicalData) return 'answer_pending';

  // Se for comando de controle, retorna control_command p/ Engine tratar
  if (localResult.is_reset || localResult.is_greeting || clean.includes('limpar') || clean.includes('reset') || clean === 'menu' || clean === '/start' || clean === '/cancelar') return 'control_command';

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
  
  let result;
  try {
    result = await askGemini(text, systemInstruction);
    console.log(`[Intent-Router] Input: "${text}" -> IA Result: "${result}"`);
  } catch (err) {
    console.error(`[Intent-Router Error]: Falha no Gemini: ${err.message}`);
    result = null;
  }
  
  if (!result) return localResult.intent || 'unknown';
  
  const lower = result.toLowerCase();
  
  if (lower.includes('fornecedor')) return 'supplier_quote_save';
  if (lower.includes('novo')) return 'client_budget_start';
  if (!isTechnicalData && (lower.includes('reset') || lower.includes('limpar') || lower.includes('apagar') || lower.includes('zero') || lower.includes('recomeçar') || lower.includes('reiniciar') || lower.includes('reinicie'))) return 'budget_reset';
  return 'smalltalk';
};

const atualizarEstado = async (texto, estadoAtual) => {
  if (!texto) return estadoAtual;
  
  // 1. Tentar Resolver Resposta Pendente (DETERMINÍSTICO)
  if (estadoAtual.last_question_family) {
    const resolved = resolvePendingAnswer(texto, estadoAtual.last_question_family);
    if (resolved && resolved !== 'WAIT_FOR_MANUAL') {
      const field = QUESTION_FAMILIES[estadoAtual.last_question_family].fields[0];
      estadoAtual[field] = resolved;
      if (!estadoAtual.answered_families.includes(estadoAtual.last_question_family)) {
        estadoAtual.answered_families.push(estadoAtual.last_question_family);
      }
      estadoAtual.last_question_family = null; // LIMPA PENDÊNCIA
      return estadoAtual;
    }
    // Se for WAIT_FOR_MANUAL, apenas retorna o estado sem limpar pendência
    if (resolved === 'WAIT_FOR_MANUAL') return estadoAtual;
  }

  // 2. Tentar IA (Modo Livre / Extração Transversal)
  console.log(`[IA-Qualificacao] Analisando: "${texto}" (Pendente: ${estadoAtual.last_question_family || 'Nenhuma'})`);

  const systemPrompt = `Você é o extrator de dados CFTV da Noctua.
  Extraia APENAS os dados explicitamente presentes no texto. NÃO invente valores.
  Se um campo não for mencionado, NÃO o inclua no JSON.
  
  Campos: property_type (Casa/Apartamento/Comércio/Condomínio/Outro), 
          camera_quantity (número), 
          installation_environment (Interno/Externo/Misto), 
          system_type (IP (Cabo de Rede)/Analógica (Cabo Coaxial)/Híbrida (Existente + Nova)),
          poe_mode (NVR com PoE integrado (Direto no gravador)/Switch PoE externo (Centralizado)/Fonte individual por câmera),
          retrofit_coax (Sim/Não),
          use_eoc (Sim, incluir tecnologia EoC/Não, manter convencional),
          recording_required (Sim/Não/Já possuo o HD), 
          recording_days (número de dias),
          client_hd_gb (tamanho em GB),
          remote_view (Sim/Não), 
          material_source (Cliente fornece/NOCTUA fornece),
          client_address (endereço),
          client_phone (telefone).
          
  IMPORTANTE: 
  - "digital", "rede", "UTP", "RJ45" -> system_type: "IP (Cabo de Rede)".
  - "coaxial", "cvi", "tvi", "balun" -> system_type: "Analógica (Cabo Coaxial)".
  - "nvr poe", "direto no nvr" -> poe_mode: "NVR com PoE integrado (Direto no gravador)".
  - "switch", "switch poe" -> poe_mode: "Switch PoE externo (Centralizado)".
  
  Retorne APENAS o JSON puro.`;

  const response = await askGemini(texto, systemPrompt);

  if (response) {
    try {
      // Limpeza de blocos de código markdown se existirem
      const cleanJson = response.replace(/```json|```/g, "").trim();
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      const dadosIA = JSON.parse(jsonMatch ? jsonMatch[0] : cleanJson);
      
      console.log(`[IA-Qualificacao] Extraído:`, JSON.stringify(dadosIA));

      // Normalização: Garantir que camera_quantity seja número se possível
      if (dadosIA.camera_quantity !== undefined && dadosIA.camera_quantity !== null) {
        const parsedNum = parseInt(dadosIA.camera_quantity);
        if (!isNaN(parsedNum)) dadosIA.camera_quantity = parsedNum;
      }

      // Merge dos dados
      Object.assign(estadoAtual, dadosIA);

      // Limpeza de pendência SE o campo correspondente foi preenchido
      if (estadoAtual.last_question_family) {
        const fam = estadoAtual.last_question_family;
        const config = QUESTION_FAMILIES[fam];
        if (config && config.fields.every(f => estadoAtual[f] !== null)) {
          console.log(`[IA-Qualificacao] Pendência resolvida: ${fam}`);
          estadoAtual.last_question_family = null; 
        }
      }
    } catch (e) {
      console.error("[IA-Qualificacao-Erro]: Falha ao processar JSON:", response, e.message);
    }
  }

  // 3. Sincronizar families respondidas (Garantia de Fluxo como PILHA)
  Object.keys(QUESTION_FAMILIES).forEach(fam => {
    const fields = QUESTION_FAMILIES[fam].fields;
    const isCompleted = fields.every(f => estadoAtual[f] !== undefined && estadoAtual[f] !== null && estadoAtual[f] !== "");
    if (isCompleted) {
      if (!estadoAtual.answered_families.includes(fam)) {
        estadoAtual.answered_families.push(fam);
      }
      // Se a família foi respondida transversalmente, limpa ela da pendência se for a atual
      if (estadoAtual.last_question_family === fam) {
        estadoAtual.last_question_family = null;
      }
    } else {
        // Se por algum motivo o campo foi zerado, remove da pilha
        estadoAtual.answered_families = estadoAtual.answered_families.filter(f => f !== fam);
    }
  });

  return estadoAtual;
}

const decidirProximaAção = async (estado, intent) => {
  const familias = Object.keys(QUESTION_FAMILIES);
  const pendente = familias.find(f => {
    const config = QUESTION_FAMILIES[f];
    const jaRespondida = estado.answered_families.includes(f);
    if (jaRespondida) return false;
    
    // Se houver condição, avalia se deve perguntar
    if (config.condition && !config.condition(estado)) {
      // Se a condição falhar, marca como respondida (pulada) para não travar
      if (!estado.answered_families.includes(f)) estado.answered_families.push(f);
      return false;
    }
    
    return true;
  });

  const budgetIdPrefix = estado.meta && estado.meta.draft_id ? `[${estado.meta.draft_id}] ` : "";

  if (!pendente) {
    estado.flow_status = 'qualificado';
    return { action: 'resolve_technical_scope', text: `${budgetIdPrefix}Maravilha! Dados básicos coletados. Vamos para a composição técnica.` };
  }

  estado.last_question_family = pendente;
  estado.flow_status = 'collecting';
  const config = QUESTION_FAMILIES[pendente];
  
  let menu = `${budgetIdPrefix}${config.prompt}`;
  
  // Garantia: Sempre retorna botões de navegação, mesmo que a pergunta seja de texto livre
  const options = config.options || [];

  return { 
    action: 'ask_field', 
    text: menu.trim(), 
    family: pendente,
    options: options.length > 0 ? options : null // DialogueEngine deve tratar null enviando teclado de navegação
  };
};

module.exports = { atualizarEstado, decidirProximaAção, classifyIncomingMessage, resolvePendingAnswer, getDefaultState, QUESTION_FAMILIES };
