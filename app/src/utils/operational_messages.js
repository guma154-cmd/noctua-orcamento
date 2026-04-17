/**
 * NOCTUA OPERATIONAL MESSAGING CATALOG
 * Traduz estados técnicos e bloqueios em orientações para o operador.
 */

const SEVERITY = {
  BLOCK: 'CRITICAL', // Impede a finalização automática
  REVIEW: 'WARNING', // Exige atenção humana, mas permite visualização
  ALERT: 'INFO'      // Informativo sobre decisões automáticas tomadas
};

const MESSAGES = {
  // --- BLOQUEIOS (BLOCK) ---
  'BLOCK_DISTANCE_LIMIT': {
    severity: SEVERITY.BLOCK,
    title: 'LIMITE DE DISTÂNCIA EXCEDIDO',
    message: 'Um ou mais pontos de câmera ultrapassam 100 metros de cabo.',
    recommended_action: 'Utilizar conversores de mídia (Fibra Óptica) ou switches intermediários.'
  },
  'BLOCK_CAPACITY_EXCEEDED': {
    severity: SEVERITY.BLOCK,
    title: 'CAPACIDADE DE HARDWARE EXCEDIDA',
    message: 'A quantidade de câmeras é superior ao maior gravador disponível (32 canais).',
    recommended_action: 'Dividir o projeto em dois ou mais gravadores independentes.'
  },
  'BLOCK_CATALOG_CRITICAL_MISSING': {
    severity: SEVERITY.BLOCK,
    title: 'ITEM CRÍTICO AUSENTE NO CATÁLOGO',
    message: 'Não foi possível localizar um Gravador ou Câmera compatível no catálogo estruturado.',
    recommended_action: 'Cadastrar o item necessário via Seed ou verificar SKU no catálogo.'
  },
  'BLOCK_FALLBACK_DENIED': {
    severity: SEVERITY.BLOCK,
    title: 'FALLBACK DE PREÇO PROIBIDO',
    message: 'A categoria deste item não permite o uso de preços manuais/genéricos por segurança.',
    recommended_action: 'Atualizar o catálogo com um preço de custo real para este SKU.'
  },

  // --- REVISÕES (REVIEW) ---
  'REVIEW_STORAGE_ABOVE_STANDARD': {
    severity: SEVERITY.REVIEW,
    title: 'ARMAZENAMENTO ACIMA DO PADRÃO',
    message: 'A retenção solicitada exige mais de 8TB (Limite de 1 baia).',
    recommended_action: 'Verificar se o gravador suporta 2 ou mais HDs ou reduzir os dias de gravação.'
  },
  'REVIEW_TOPOLOGY_COMPLEX': {
    severity: SEVERITY.REVIEW,
    title: 'TOPOLOGIA DE REDE COMPLEXA',
    message: 'O projeto exige 3 ou mais switches PoE para distribuição.',
    recommended_action: 'Validar o local físico dos switches e a ventilação dos racks.'
  },
  'REVIEW_SWITCH_BACKBONE_REQUIRED': {
    severity: SEVERITY.REVIEW,
    title: 'BACKBONE ENTRE SWITCHES NECESSÁRIO',
    message: 'Múltiplos switches detectados sem cálculo automático de interligação.',
    recommended_action: 'Adicionar metragem de cabo CAT6 para o link entre switches.'
  },
  'REVIEW_CLIENT_MATERIAL': {
    severity: SEVERITY.REVIEW,
    title: 'MATERIAL FORNECIDO PELO CLIENTE',
    message: 'O cliente fornecerá parte ou todo o hardware principal.',
    recommended_action: 'Validar se o hardware do cliente é compatível com o padrão NOCTUA.'
  },
  'REVIEW_WAITING_HUMAN': {
    severity: SEVERITY.REVIEW,
    title: 'AGUARDANDO DEFINIÇÃO TÉCNICA',
    message: 'O sistema não pôde tomar uma decisão automática segura para este cenário.',
    recommended_action: 'Analisar o payload técnico e definir os itens manualmente.'
  },

  // --- ALERTAS (ALERT) ---
  'ALERT_FALLBACK_USED': {
    severity: SEVERITY.ALERT,
    title: 'PREÇO DE SEGURANÇA APLICADO',
    message: 'Item não encontrado no catálogo; utilizando preço manual de segurança.',
    recommended_action: 'Nenhuma, mas recomenda-se conferir se o valor manual cobre os custos atuais.'
  },
  'ALERT_LEGACY_SOURCE_USED': {
    severity: SEVERITY.ALERT,
    title: 'FONTE DE DADOS LEGADA',
    message: 'Item resolvido via busca flexível (LIKE) no catálogo antigo.',
    recommended_action: 'Migrar este item para o novo catálogo de governança com SKU único.'
  },
  'ALERT_PARTIAL_INFRASTRUCTURE': {
    severity: SEVERITY.ALERT,
    title: 'INFRAESTRUTURA PARCIAL',
    message: 'Cálculo de infra considera aproveitamento de 70% da tubulação existente.',
    recommended_action: 'Confirmar no local se a tubulação existente tem espaço para novos cabos.'
  },
  'ALERT_LONG_DISTANCE': {
    severity: SEVERITY.ALERT,
    title: 'PONTO DE LONGA DISTÂNCIA',
    message: 'Existem câmeras entre 70m e 90m.',
    recommended_action: 'Garantir o uso de cabo 100% cobre para evitar queda de tensão.'
  },
  'ALERT_DEFAULT_PROFILE_USED': {
    severity: SEVERITY.ALERT,
    title: 'PERFIL PADRÃO APLICADO',
    message: 'Tipo de imóvel não identificado; utilizando perfil "Outro" para dimensionamento.',
    recommended_action: 'Revisar se os itens selecionados atendem à estética do local.'
  },
  'ALERT_BACKBONE_ADDED': {
    severity: SEVERITY.ALERT,
    title: 'BACKBONE DE REDE CALCULADO',
    message: 'Múltiplos switches detectados; metragem de interligação adicionada automaticamente.',
    recommended_action: 'Validar se a distância física entre os racks/switches é superior a 15 metros.'
  },
  'ALERT_MULTI_RECORDER': {
    severity: SEVERITY.ALERT,
    title: 'SISTEMA COM MÚLTIPLOS GRAVADORES',
    message: 'A quantidade de câmeras exige mais de um gravador físico.',
    recommended_action: 'Validar a distribuição das câmeras entre os gravadores no local.'
  }
};

const translate = (code) => {
  return MESSAGES[code] || {
    severity: 'UNKNOWN',
    title: 'CÓDIGO NÃO MAPEADO',
    message: `O sistema gerou um estado não catalogado: ${code}`,
    recommended_action: 'Consultar o time de desenvolvimento.'
  };
};

module.exports = { MESSAGES, SEVERITY, translate };
