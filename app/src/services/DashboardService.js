const { db } = require('../db/sqlite');

class DashboardService {
  /**
   * Consolida as mÃ©tricas do pipeline comercial.
   */
  async obterMetricasPipeline() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT status_noctua, COUNT(*) as qtd, SUM(valor_total) as valor_total
        FROM orcamentos
        GROUP BY status_noctua
      `;
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Lista leads com prioridade alta (Score >= 70).
   */
  async listarPrioridadeAlta() {
    const FollowUpService = require('./FollowUpService');
    const { LeadsRepository } = require('./LeadsRepository');
    
    return new Promise((resolve, reject) => {
        db.all(`SELECT o.*, c.nome as cliente_nome FROM orcamentos o JOIN clientes c ON o.cliente_id = c.id WHERE o.status_noctua NOT IN ('fechado', 'perdido', 'cancelado')`, [], (err, rows) => {
            if (err) return reject(err);
            const alta = rows.filter(r => FollowUpService.calcularPrioridade(r).total >= 70);
            resolve(alta);
        });
    });
  }

  /**
   * Identifica leads sem prÃ³xima aÃ§Ã£o definida.
   */
  async listarSemProximaAcao() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT o.id, c.nome as cliente_nome
        FROM orcamentos o
        JOIN clientes c ON o.cliente_id = c.id
        LEFT JOIN proximas_acoes pa ON o.id = pa.lead_id AND pa.concluida = 0
        WHERE o.status_noctua IN ('orcamento', 'negociacao')
        AND pa.id IS NULL
      `;
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Gera o relatório em formato texto para o Telegram.
   */
  async gerarPainelResumo() {
    const metricas = await this.obterMetricasPipeline();
    const alta = await this.listarPrioridadeAlta();
    const semAcao = await this.listarSemProximaAcao();

    let msg = `ðŸ“Š *DASHBOARD COMERCIAL NOCTUA*\n\n`;
    
    msg += `ðŸ“ *PIPELINE:*\n`;
    metricas.forEach(m => {
        const valor = (m.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        msg += `â—ª ${m.status_noctua.toUpperCase()}: ${m.qtd} (${valor})\n`;
    });

    msg += `\nðŸ”¥ *PRIORIDADE ALTA (Score 70+):*\n`;
    if (alta.length === 0) msg += `_Nenhum lead crÃ­tico no momento._\n`;
    else alta.forEach(a => msg += `â€¢ #${a.id} ${a.cliente_nome}\n`);

    msg += `\nâš ï¸ *SEM PRÃ“XIMA AÃ‡ÃƒO (AtenÃ§Ã£o):*\n`;
    if (semAcao.length === 0) msg += `_Todos os leads ativos possuem aÃ§Ã£o._\n`;
    else semAcao.forEach(s => msg += `â€¢ #${s.id} ${s.cliente_nome}\n`);

    return msg;
  }
}

module.exports = new DashboardService();
