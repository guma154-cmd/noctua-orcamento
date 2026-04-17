/**
 * NOCTUA CONSTANTS - Business States & Rules
 */
const STATUS_NOCTUA = {
  // Fase de Entrada e Coleta
  INTAKE: 'intake_em_andamento',
  QUALIFIED: 'lead_qualificado',
  
  // Fase de Processamento
  PROCESSING: 'processando_orcamento',
  
  // Fase Comercial
  PROPOSAL_SENT: 'proposta_enviada',
  WAITING_CLIENT: 'aguardando_cliente',
  
  // Fase de Follow-up
  FOLLOWUP_1: 'followup_24h',
  FOLLOWUP_2: 'followup_48h',
  
  // Encerramento
  WON: 'fechado_ganho',
  LOST: 'fechado_perdido',
  CANCELLED: 'cancelado'
};

const ERROR_LIMITS = {
  INTAKE_RETRY_LIMIT: 3
};

module.exports = {
  STATUS_NOCTUA,
  ERROR_LIMITS
};
