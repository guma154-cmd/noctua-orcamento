/**
 * LeadsRepository.js
 * Gerencia o ciclo de vida dos leads e a timeline imutÃ¡vel.
 */
const { db } = require('../db/sqlite');

const PIPELINE_STATES = {
  LEAD: 'lead',
  ORCAMENTO: 'orcamento',
  NEGOCIACAO: 'negociacao',
  FECHADO: 'fechado',
  PERDIDO: 'perdido'
};

const EVENT_TYPES = {
  MENSAGEM_RECEBIDA: 'mensagem_recebida',
  ORCAMENTO_GERADO: 'orcamento_gerado',
  PROPOSTA_ENVIADA: 'proposta_enviada',
  FOLLOWUP_ENVIADO: 'followup_enviado',
  STATUS_ALTERADO: 'status_alterado',
  PROXIMA_ACAO_DEFINIDA: 'proxima_acao_definida',
  NOTA_MANUAL: 'nota_manual',
  FECHADO_GANHO: 'fechado_ganho',
  FECHADO_PERDIDO: 'fechado_perdido'
};

const ALLOWED_TRANSITIONS = {
  [PIPELINE_STATES.LEAD]: [PIPELINE_STATES.ORCAMENTO, PIPELINE_STATES.PERDIDO],
  [PIPELINE_STATES.ORCAMENTO]: [PIPELINE_STATES.NEGOCIACAO, PIPELINE_STATES.PERDIDO],
  [PIPELINE_STATES.NEGOCIACAO]: [PIPELINE_STATES.FECHADO, PIPELINE_STATES.PERDIDO, PIPELINE_STATES.ORCAMENTO],
  [PIPELINE_STATES.FECHADO]: [], // Estado final
  [PIPELINE_STATES.PERDIDO]: [PIPELINE_STATES.LEAD] // Permite reativaÃ§Ã£o
};

class LeadsRepository {
  /**
   * Registra um evento na timeline imutÃ¡vel.
   */
  static async registrarEvento(leadId, evento, payload = {}) {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO timeline_eventos (lead_id, evento, payload_snapshot) VALUES (?, ?, ?)",
        [leadId, evento, JSON.stringify(payload)],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Altera o estado do lead validando a mÃ¡quina de estados.
   */
  static async alterarStatus(leadId, novoStatus, metadata = {}) {
    return new Promise((resolve, reject) => {
      db.get("SELECT status_noctua, metadata_json FROM orcamentos WHERE id = ?", [leadId], async (err, lead) => {
        if (err) return reject(err);
        if (!lead) return reject(new Error("Lead nÃ£o encontrado."));

        const statusAtual = lead.status_noctua || PIPELINE_STATES.LEAD;

        // 1. Validar transiÃ§Ã£o
        const transicoesPossiveis = ALLOWED_TRANSITIONS[statusAtual] || [];
        if (!transicoesPossiveis.includes(novoStatus) && statusAtual !== novoStatus) {
          return reject(new Error(`TransiÃ§Ã£o de ${statusAtual} para ${novoStatus} nÃ£o Ã© permitida.`));
        }

        // 2. Regra: Fechado exige confirmaÃ§Ã£o (ou flag metadata)
        if (novoStatus === PIPELINE_STATES.FECHADO) {
          if (!metadata.confirmado) {
            return reject(new Error("A transiÃ§Ã£o para 'fechado' exige confirmaÃ§Ã£o explÃ­cita."));
          }
          
          // STORY 5.3: BLOQUEIO SE SEM VISITA OU CONTRATO
          const acoesConcluidas = await this.buscarAcoesConcluidas(leadId);
          const temVisitaOuContrato = acoesConcluidas.some(a => ['visita', 'contrato'].includes(a.tipo));
          if (!temVisitaOuContrato) {
            return reject(new Error("Bloqueio de Fechamento: Ã‰ necessÃ¡rio concluir uma 'visita' ou 'contrato' antes de fechar o lead."));
          }
        }

        // 3. Atualizar Lead
        db.run(
          "UPDATE orcamentos SET status_noctua = ?, last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?",
          [novoStatus, leadId],
          async (err) => {
            if (err) return reject(err);

            // 4. Determinar Evento EspecÃ­fico
            let eventoNome = EVENT_TYPES.STATUS_ALTERADO;
            if (novoStatus === PIPELINE_STATES.FECHADO) eventoNome = EVENT_TYPES.FECHADO_GANHO;
            if (novoStatus === PIPELINE_STATES.PERDIDO) eventoNome = EVENT_TYPES.FECHADO_PERDIDO;

            // 5. Registrar na Timeline
            await this.registrarEvento(leadId, eventoNome, {
              de: statusAtual,
              para: novoStatus,
              motivo: metadata.motivo || 'AlteraÃ§Ã£o manual',
              ...metadata
            });

            resolve({ success: true, de: statusAtual, para: novoStatus });
          }
        );
      });
    });
  }

  /**
   * Busca os Ãºltimos eventos de um lead.
   */
  static async buscarHistorico(leadId, limit = 10) {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM timeline_eventos WHERE lead_id = ? ORDER BY created_at DESC LIMIT ?",
        [leadId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  /**
   * Adiciona uma nota manual.
   */
  static async adicionarNota(leadId, texto) {
    return this.registrarEvento(leadId, 'nota_manual', { texto });
  }

  /**
   * Regra de automaÃ§Ã£o: Perdido apÃ³s 3 follow-ups (Mock para Story 5.2)
   */
  static async processarFollowUpAutomatico(leadId, count) {
    if (count >= 3) {
      return this.alterarStatus(leadId, PIPELINE_STATES.PERDIDO, { motivo: 'Inatividade apÃ³s 3 follow-ups' });
    }
  }
  /**
   * Busca aÃ§Ãµes concluÃ­das de um lead.
   */
  static async buscarAcoesConcluidas(leadId) {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM proximas_acoes WHERE lead_id = ? AND concluida = 1", [leadId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Registra uma prÃ³xima aÃ§Ã£o.
   */
  static async definirProximaAcao(leadId, dados) {
    const { tipo, descricao, data_prevista } = dados;
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO proximas_acoes (lead_id, tipo, descricao, data_prevista) VALUES (?, ?, ?, ?)",
        [leadId, tipo, descricao, data_prevista],
        async function(err) {
          if (err) reject(err);
          else {
            const acaoId = this.lastID;
            await LeadsRepository.registrarEvento(leadId, EVENT_TYPES.PROXIMA_ACAO_DEFINIDA, dados);
            resolve(acaoId);
          }
        }
      );
    });
  }

  /**
   * Conclui uma aÃ§Ã£o.
   */
  static async concluirAcao(acaoId) {
    return new Promise((resolve, reject) => {
      db.run("UPDATE proximas_acoes SET concluida = 1 WHERE id = ?", [acaoId], function(err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  /**
   * Busca a prÃ³xima aÃ§Ã£o pendente.
   */
  static async buscarAcaoPendente(leadId) {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM proximas_acoes WHERE lead_id = ? AND concluida = 0 ORDER BY data_prevista ASC", [leadId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  /**
   * Busca clientes e seus orçamentos por termo (nome ou contato).
   */
  static async buscarPorTermo(termo) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT c.nome, c.contato, o.id as orcamento_id, o.status_noctua, o.valor_total, o.created_at
        FROM clientes c
        LEFT JOIN orcamentos o ON c.id = o.cliente_id
        WHERE c.nome LIKE ? OR c.contato LIKE ?
        ORDER BY o.created_at DESC
        LIMIT 10
      `;
      const searchPattern = `%${termo}%`;
      db.all(query, [searchPattern, searchPattern], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = { LeadsRepository, PIPELINE_STATES, EVENT_TYPES };
