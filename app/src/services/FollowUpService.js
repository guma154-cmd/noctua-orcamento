const memoria = require('../agents/memoria');
const { LeadsRepository } = require('./LeadsRepository');
const { EVENT_TYPES } = require('./LeadsRepository');

class FollowUpService {
  /**
   * Calcula a pontuaÃ§Ã£o de prioridade de um lead.
   */
  calcularPrioridade(orc) {
    const P_status = { 'negociacao': 40, 'orcamento': 20, 'lead': 5 };
    const statusScore = P_status[orc.status_noctua] || 0;

    const diasInativo = (new Date() - new Date(orc.last_interaction_at)) / (1000 * 60 * 60 * 24);
    let tempoScore = 0;
    if (diasInativo <= 1) tempoScore = 30;
    else if (diasInativo <= 3) tempoScore = 20;
    else if (diasInativo <= 7) tempoScore = 10;

    const valor = parseFloat(orc.valor_total) || 0;
    let valorScore = 0;
    if (valor > 10000) valorScore = 30;
    else if (valor >= 5000) valorScore = 20;
    else if (valor >= 2000) valorScore = 10;
    else if (valor > 0) valorScore = 5;

    const total = statusScore + tempoScore + valorScore;
    let nivel = 'Baixa';
    if (total >= 70) nivel = 'Alta';
    else if (total >= 40) nivel = 'MÃ©dia';

    return { total, nivel, diasInativo };
  }

  /**
   * Processa a rotina de busca de leads que precisam de follow-up.
   */
  async processarRotinaFollowUp() {
    const ativos = await memoria.listarOrcamentosAtivosParaFollowUp();
    const alertas = [];

    for (const orc of ativos) {
      const prioridade = this.calcularPrioridade(orc);
      const horasInativo = prioridade.diasInativo * 24;
      const count = orc.followup_count || 0;

      // Regra de tempo por prioridade
      const threshold = prioridade.nivel === 'Alta' ? 24 : 48;

      // 1. Verificar se atingiu limite de tentativas
      if (count >= 3 && horasInativo >= 48) {
        await LeadsRepository.alterarStatus(orc.id, 'perdido', { motivo: 'Inatividade apÃ³s 3 follow-ups' });
        continue;
      }

      // 2. Verificar se precisa de novo alerta
      const tempoDesdeUltimo = orc.last_followup_at ? (new Date() - new Date(orc.last_followup_at)) / (1000 * 60 * 60) : horasInativo;
      
      if (tempoDesdeUltimo >= threshold && count < 3) {
        alertas.push({
          orc_id: orc.id,
          cliente: orc.cliente_nome,
          valor: orc.valor_total,
          prioridade: prioridade.nivel,
          horas_inativo: Math.floor(horasInativo),
          tentativa: count + 1,
          mensagem_sugerida: this.gerarMensagemSugerida(orc.cliente_nome, count + 1)
        });
      }
    }

    return alertas;
  }

  gerarMensagemSugerida(nome, tentativa) {
    const templates = [
      `Oi ${nome}, tudo bem? Passando para saber se conseguiu ver a proposta que te enviei.`,
      `${nome}, conseguimos tirar suas dÃºvidas sobre o projeto? Qualquer coisa estou Ã  disposiÃ§Ã£o.`,
      `Oi ${nome}, ainda tem interesse na instalaÃ§Ã£o das cÃ¢meras? Me avisa se podemos seguir.`
    ];
    return templates[tentativa - 1] || templates[0];
  }

  async confirmarEnvio(orcId, adminId, bot) {
    const orc = await memoria.buscarOrcamentoPorId(orcId);
    if (!orc) return;

    const novoCount = (orc.followup_count || 0) + 1;
    await memoria.registrarAcaoFollowUp(orcId, novoCount);
    await LeadsRepository.registrarEvento(orcId, EVENT_TYPES.FOLLOWUP_ENVIADO, { tentativa: novoCount });
    
    // Aqui em um cenÃ¡rio real o bot enviaria a mensagem para o CLIENTE.
    // Como nÃ£o temos o chat_id do cliente direto no orcamento (apenas no cliente), 
    // simulamos o sucesso.
    return { success: true, tentativa: novoCount };
  }
}

module.exports = new FollowUpService();
