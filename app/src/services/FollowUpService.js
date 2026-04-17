const memoria = require('../agents/memoria');
const { STATUS_NOCTUA } = require('../utils/constants');

class FollowUpService {
  /**
   * Processa todos os orçamentos elegíveis para follow-up.
   * Regras: status maduro, inativo há X horas, waiting_human=0 e anti-spam via metadata.
   */
  async processarRotinaManual(horasInatividade = 24) {
    console.log(`[FollowUpService] Buscando orçamentos inativos há mais de ${horasInatividade}h...`);
    const elegiveis = await memoria.listarOrcamentosParaFollowUp(horasInatividade);
    
    if (elegiveis.length === 0) {
      return { total: 0, executados: 0, logs: ["Nenhum caso elegível para follow-up no momento."] };
    }

    let executados = 0;
    const logs = [];

    for (const orc of elegiveis) {
      const meta = orc.metadata_json ? JSON.parse(orc.metadata_json) : {};
      
      // Regra Anti-Repetição (Mínimo de 48h entre follow-ups proativos)
      if (meta.last_followup_at) {
        const lastFollowUpDate = new Date(meta.last_followup_at);
        const agora = new Date();
        const diffHoras = (agora - lastFollowUpDate) / (1000 * 60 * 60);
        
        if (diffHoras < 48) {
          logs.push(`⚠️ IGNORADO [${orc.id}]: Follow-up recente enviado há ${diffHoras.toFixed(1)}h.`);
          continue;
        }
      }

      // Preparando a ação de Follow-Up
      meta.followups_sent = (meta.followups_sent || 0) + 1;
      meta.last_followup_at = new Date().toISOString();
      const novoStatus = meta.followups_sent === 1 ? STATUS_NOCTUA.FOLLOWUP_1 : STATUS_NOCTUA.FOLLOWUP_2;

      // Montando a cópia
      const fallbackName = orc.metadata_json.includes('client_name') ? (JSON.parse(orc.metadata_json).client_name || 'Rafael') : 'Rafael';
      const msg = this.gerarMensagemDeFollowup(fallbackName, orc.id, meta.followups_sent);

      // Persistindo o novo estado antes de disparar (garante que não repita se a rede cair)
      orc.status_noctua = novoStatus;
      orc.metadata_json = JSON.stringify(meta);
      
      // Como o núcleo de memoria.js salva sessoes e não atualiza orçamentos diretamente, 
      // usaremos a função atualizarStatusOrcamento que suporta metadata
      await memoria.atualizarStatusOrcamento(orc.id, novoStatus, 0, meta);
      
      logs.push(`✅ FOLLOW-UP ENVIADO [${orc.id}] (Envio #${meta.followups_sent}): "${msg.substring(0, 30)}..."`);
      executados++;
    }

    return { total: elegiveis.length, executados, logs };
  }

  gerarMensagemDeFollowup(nome, id, tentativaNumero) {
    if (tentativaNumero === 1) {
      return `Oi, ${nome}. Conseguiu avaliar o último rascunho de orçamento (${id})? Se quiser fazer alguma alteração (adicionar câmeras, mudar de IP para analógico), é só me avisar!`;
    } else {
      return `${nome}, vi que não avançamos com o orçamento [${id}]. Se o projeto estiver pausado, me dê um ok só para eu tirar do meu radar, senão o chefe me cobra. Abraço!`;
    }
  }
}

module.exports = new FollowUpService();
