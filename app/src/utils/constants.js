/**
 * NOCTUA CONSTANTS - Business States & Rules
 */
const STATUS_NOCTUA = {
  // --- PIPELINE DE VENDAS (Story 5.1) ---
  LEAD: 'lead',
  ORCAMENTO: 'orcamento',
  NEGOCIACAO: 'negociacao',
  WON: 'fechado',
  LOST: 'perdido',

  // Fase de Entrada e Coleta (Legado/Suporte)
  INTAKE: 'intake_em_andamento',
  QUALIFIED: 'lead_qualificado',
  PROCESSING: 'processando_orcamento',
  PROPOSAL_SENT: 'proposta_enviada',
  WAITING_CLIENT: 'aguardando_cliente',
  CANCELLED: 'cancelado'
};

const ERROR_LIMITS = {
  INTAKE_RETRY_LIMIT: 3
};

module.exports = {
  STATUS_NOCTUA,
  ERROR_LIMITS
};
