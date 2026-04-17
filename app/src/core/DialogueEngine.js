const qualificacao = require('../agents/qualificacao');
const orcamento = require('../agents/orcamento');
const fornecedor = require('../agents/fornecedor');
const memoria = require('../agents/memoria');
const technicalScopeResolver = require('../agents/technical_scope_resolver');
const technicalAuditor = require('../agents/technical_auditor');
const ingestorPlanilha = require('../agents/ingestor_planilha');
const { parseLocal } = require('../utils/heuristic-parser');
const menus = require('../ui/telegram-menu');
const { STATUS_NOCTUA } = require('../utils/constants');

/**
 * NOCTUA DIALOGUE ENGINE - V16 (ASSISTED REVIEW READY)
 */
class DialogueEngine {

  async syncNoctuaStatus(chatId, session, status, waitingHuman = 0) {
    if (session.meta && session.meta.current_orcamento_db_id) {
      session.status_noctua = status;
      await memoria.atualizarStatusOrcamento(
        session.meta.current_orcamento_db_id, 
        status, 
        waitingHuman,
        { 
          last_field: session.last_question_family,
          answered: session.answered_families.length,
          total: Object.keys(qualificacao.QUESTION_FAMILIES).length
        }
      );
    }
  }
  
  async process(chatId, messageContent) {
    const { text, type, filePath, mimeType } = messageContent;
    const cleanText = (text || "").toLowerCase().trim();

    // 0. GESTÃO DE COMANDOS GLOBAIS (Prioridade Absoluta)
    const resetKeywords = ['oi', 'olá', 'ola', 'reset', 'reiniciar', 'limpar', 'limpar sessão', 'menu', 'voltar', '/start', 'start'];
    const isNewBudget = cleanText === 'novo_orcamento' || cleanText === 'novo orçamento';
    const isReset = resetKeywords.some(kw => cleanText.includes(kw));
    
    // Lista de sinônimos para o comando de retorno
    const backKeywords = ['voltar', 'retornar', 'retroceder', 'etapa anterior', 'pergunta anterior', 'voltar etapa', 'voltar pergunta'];
    const isBack = backKeywords.some(kw => cleanText === kw || cleanText.includes(kw)) || cleanText === 'menu:voltar';

    if (isBack) {
      let session = await memoria.buscarSessao(chatId);
      if (!session) return await this.showMainMenu(chatId, { ...qualificacao.getDefaultState() });

      console.log(`[Engine] Voltando etapa para: ${chatId}`);

      // 1. Prioridade para voltar no TSR
      if (session.flow_status === 'collecting_tech' || session.flow_status === 'tech_review' || (session.last_question_family && session.last_question_family.startsWith('TECH_'))) {
          const keys = Object.keys(session.technical_scope || {});
          if (keys.length > 0) {
              const lastKey = keys[keys.length - 1];
              delete session.technical_scope[lastKey];
          } else {
              // Se não houver nada no TSR, volta para o final da Qualificação
              session.flow_status = 'collecting';
          }
          session.last_question_family = null;
          await memoria.salvarSessao(chatId, session);
          return await this.handleTechnicalScope(chatId, session);
      }

      // 2. Voltar na Qualificação
      if (session.answered_families.length > 0) {
          const lastFam = session.answered_families.pop();
          const config = qualificacao.QUESTION_FAMILIES[lastFam];
          if (config) {
              config.fields.forEach(f => session[f] = null);
          }
          session.last_question_family = null;
          await memoria.salvarSessao(chatId, session);
          return await this.continueFlow(chatId, "", session, 'answer_pending');
      }

      // 3. Se não tiver para onde voltar, vai pro Menu
      return await this.showMainMenu(chatId, session);
    }

    if (isReset) {
      console.log(`[Engine] Reset solicitado via: ${cleanText}`);
      await memoria.limparSessao(chatId); 
      return await this.showMainMenu(chatId, { ...qualificacao.getDefaultState() });
    }

    if (isNewBudget) {
      console.log(`[Engine] Novo Orçamento solicitado via: ${cleanText}`);
      await memoria.limparSessao(chatId); // Garante limpeza total antes de novo
      let session = { ...qualificacao.getDefaultState() };
      return await this.handleMainMenuSelection(chatId, '1', session);
    }

    const local = parseLocal(text || "");
    let session = await memoria.buscarSessao(chatId) || { ...qualificacao.getDefaultState() };
    session.meta = session.meta || {};

    // 0.1 TRATAMENTO DE ARQUIVOS (PLANILHAS)
    if (type === 'document' && filePath) {
        const isExcel = mimeType && (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('officedocument'));
        const isCSV = mimeType && mimeType.includes('csv');
        if (isExcel || isCSV || filePath.endsWith('.xlsx') || filePath.endsWith('.csv')) {
            return await this.handleSpreadsheetIngestion(chatId, filePath, mimeType, session);
        }
    }

    // 1. RESOLVER PENDÊNCIAS (Prioridade Determinística)
    if (session.last_question_family || session.flow_status === 'tech_review' || session.flow_status === 'awaiting_import_review') {
      
      // 1.0 Tech Review
      if (session.flow_status === 'tech_review') {
        if (cleanText === '1' || cleanText.includes('sim') || cleanText.includes('prosseguir')) {
          await this.syncNoctuaStatus(chatId, session, STATUS_NOCTUA.QUALIFIED);
          session.last_question_family = 'MODEL_CHOICE';
          session.flow_status = 'awaiting_model_choice';
          await memoria.salvarSessao(chatId, session);
          const menuModelo = menus.menuEscolhaModelo(session.meta.draft_id);
          return { response: menuModelo.text, keyboard: menuModelo.keyboard, status: 'awaiting_model_choice' };
        } else if (cleanText === '2' || cleanText.includes('corrigir')) {
          session.technical_scope = {};
          session.flow_status = 'collecting_tech';
          await memoria.salvarSessao(chatId, session);
          return await this.handleTechnicalScope(chatId, session);
        } else {
          // Re-exibir menu de revisão se a resposta for inválida
          return await this.handleTechnicalScope(chatId, session);
        }
      }

      // 1.0.1 Import Review (NOVO)
      if (session.flow_status === 'awaiting_import_review') {
          return await this.handleImportReview(chatId, text, session);
      }

      // 1.1 Pergunta Técnica
      if (session.last_question_family && session.last_question_family.startsWith('TECH_')) {
        const questionId = session.last_question_family.replace('TECH_', '');
        const resolved = technicalScopeResolver.resolvePendingTechnicalAnswer(text, questionId);
        
        if (resolved === 'WAIT_FOR_MANUAL') {
          const budgetIdPrefix = session.meta && session.meta.draft_id ? `[${session.meta.draft_id}] ` : "";
          let instruction = "a quantidade exata:";
          if (questionId === 'recording_days') instruction = "o número de dias de gravação:";
          
          return { 
            response: `${budgetIdPrefix}Entendido. Por favor, digite ${instruction}`,
            status: 'collecting_tech' 
          };
        }

        if (resolved !== null && resolved !== "") {
          session.technical_scope = session.technical_scope || {};
          const profile = technicalScopeResolver.PROFILES[session.property_type] || technicalScopeResolver.PROFILES['Outro'];
          const question = (profile.questions || []).find(q => q.id === questionId) || 
                           technicalScopeResolver.GLOBAL_TECH_QUESTIONS.find(q => q.id === questionId);
          
          if (question) {
            // Se houver troca na metragem total ou risco técnico, limpamos subfluxos para forçar nova coleta
            if (question.id === 'cable_total' || question.id === 'long_distance_risk') {
              delete session.technical_scope['detailed_long_distance_count'];
              delete session.technical_scope['detailed_entry_mode'];
              delete session.technical_scope['raw_detailed_points'];
            }

            // ACUMULAÇÃO: Coleta iterativa de distâncias individuais
            if (question.id === 'cable_individual_distance') {
              session.technical_scope.raw_detailed_points = session.technical_scope.raw_detailed_points || {};
              const nextIdx = Object.keys(session.technical_scope.raw_detailed_points).length + 1;
              session.technical_scope.raw_detailed_points[nextIdx] = resolved;
              
              // Verifica se ainda faltam câmeras para coletar
              const totalToCollect = parseInt(session.technical_scope.detailed_long_distance_count) || 0;
              if (Object.keys(session.technical_scope.raw_detailed_points).length < totalToCollect) {
                  // Mantém a pergunta ativa para a próxima câmera
                  session.last_question_family = `TECH_cable_individual_distance`;
                  await memoria.salvarSessao(chatId, session);
                  return await this.handleTechnicalScope(chatId, session);
              }
            } else {
              session.technical_scope[question.field] = resolved;
            }
          }
          session.last_question_family = null;
          await memoria.salvarSessao(chatId, session);
          return await this.handleTechnicalScope(chatId, session);
        } else {
          // Resposta técnica inválida ou não resolvida -> Re-exibir menu técnico
          return await this.handleTechnicalScope(chatId, session);
        }
      }

      // 1.2 Outros Handlers
      if (session.last_question_family === 'CONFIRM_SAVE_BEFORE_EXIT') return await this.handleSaveConfirmation(chatId, text, session);
      if (session.last_question_family === 'MODEL_CHOICE') return await this.handleModelChoice(chatId, text, session);
      if (session.last_question_family === 'MAIN_MENU') return await this.handleMainMenuSelection(chatId, text, session);
      if (session.last_question_family === 'SUPPLIER_REVIEW') return await this.handleSupplierReview(chatId, text, session);
      if (session.last_question_family === 'SUPPLIER_INIT') return await this.handleSupplierInitSelection(chatId, text, session);

      // 1.3 Qualificação Determinística
      const resolved = qualificacao.resolvePendingAnswer(text, session.last_question_family);
      if (resolved) {
        if (resolved === 'WAIT_FOR_MANUAL') {
          const budgetIdPrefix = session.meta && session.meta.draft_id ? `[${session.meta.draft_id}] ` : "";
          return { 
            response: `${budgetIdPrefix}Entendido. Por favor, digite a quantidade exata de câmeras:`,
            status: 'collecting' 
          };
        }
        const family = session.last_question_family;
        const field = qualificacao.QUESTION_FAMILIES[family].fields[0];
        session[field] = resolved;
        if (!session.answered_families.includes(family)) session.answered_families.push(family);
        session.last_question_family = null;
        await memoria.salvarSessao(chatId, session);
        return await this.continueFlow(chatId, "", session, 'answer_pending');
      }
      // Se não resolveu a qualificação, o continueFlow abaixo já vai re-exibir a pergunta
      return await this.continueFlow(chatId, text, session, 'answer_pending');
    }

    // 2. GESTÃO DE INTENÇÃO GLOBAL
    const intent = await qualificacao.classifyIncomingMessage(text || "", session);
    return await this.continueFlow(chatId, text, session, intent);
  }

  async handleTechnicalScope(chatId, session) {
    const payload = await technicalScopeResolver.generateTechnicalPayload(session);
    session.technical_payload = payload;
    session.technical_scope = session.technical_scope || {};

    const profile = technicalScopeResolver.PROFILES[session.property_type] || technicalScopeResolver.PROFILES['Outro'];
    
    // CORREÇÃO DEFINITIVA: Checagem robusta de preenchimento (trata null, undefined e "" como pendentes)
    const isUnanswered = (val) => val === undefined || val === null || val === "";

    let unanswered = (profile.questions || []).find(q => 
      isUnanswered(session.technical_scope[q.field]) && 
      (!q.condition || q.condition(payload))
    );
    
    if (!unanswered) {
      unanswered = technicalScopeResolver.GLOBAL_TECH_QUESTIONS.find(q => 
        isUnanswered(session.technical_scope[q.field]) && 
        (!q.condition || q.condition(payload))
      );
    }

    if (unanswered) {
      session.last_question_family = `TECH_${unanswered.id}`;
      session.flow_status = 'collecting_tech';
      await memoria.salvarSessao(chatId, session);
      
      const promptText = typeof unanswered.prompt === 'function' ? unanswered.prompt(payload) : unanswered.prompt;

      if (unanswered.options) {
          const menu = menus.menuOpcoes(promptText, unanswered.options);
          return { response: menu.text, keyboard: menu.keyboard, status: 'collecting_tech' };
      }
      
      return { response: promptText, status: 'collecting_tech' };
    }

    // --- CAMADA DE AUDITORIA IA ---
    // Executada apenas quando todos os dados técnicos básicos foram coletados
    const auditResult = await technicalAuditor.audit(session, payload);
    payload.audit_log = auditResult; // Anexa log de auditoria ao payload

    if (auditResult.audit_state !== 'APPROVED' || payload.waiting_human || payload.requires_human_review) {
      const systemIncompatibilities = (payload.incompatibilities || []).map(code => {
          const t = require('../utils/operational_messages').translate(code);
          return `• ${t.title}: ${t.message}`;
      });

      const aiFlags = (auditResult.flags || []).map(f => `• [IA] ${f.issue} (Severidade: ${f.severity})`);
      
      const allAlerts = [...systemIncompatibilities, ...aiFlags].join('\n');
      const aiNote = auditResult.ai_observations ? `\n\n🔍 *Observação do Auditor IA:*\n${auditResult.ai_observations}` : "";

      session.flow_status = 'tech_review';
      await memoria.salvarSessao(chatId, session);
      
      const menu = menus.menuOpcoes(
          `⚠️ *REVISÃO NECESSÁRIA*\n\nDetectamos as seguintes inconsistências:\n${allAlerts}${aiNote}\n\nRafael, deseja prosseguir com o dimensionamento automático ou prefere corrigir os dados?`,
          ['Sim, prosseguir', 'Corrigir']
      );
      return { response: menu.text, keyboard: menu.keyboard, status: 'tech_review' };
    }

    await this.syncNoctuaStatus(chatId, session, STATUS_NOCTUA.QUALIFIED);
    session.last_question_family = 'MODEL_CHOICE';
    session.flow_status = 'awaiting_model_choice';
    await memoria.salvarSessao(chatId, session);
    const menuModelo = menus.menuEscolhaModelo(session.meta.draft_id);
    return { response: menuModelo.text, keyboard: menuModelo.keyboard, status: 'awaiting_model_choice' };
  }

  async handleImportReview(chatId, text, session) {
      const choice = text.trim();
      const clean = choice.toLowerCase();
      
      const isCancel = choice === '4' || clean.includes('cancelar');
      const isTudo = choice === '1' || clean.includes('tudo');
      const isConfiaveis = choice === '2' || clean.includes('confiáveis') || clean.includes('confiaveis');
      const isManual = choice === '3' || clean.includes('manual');

      if (isCancel) {
          await memoria.limparSessao(chatId);
          return await this.showMainMenu(chatId, { ...qualificacao.getDefaultState() });
      }

      if (!isTudo && !isConfiaveis && !isManual) {
          // Re-exibir menu de revisão se a resposta for inválida
          const menuReview = menus.menuRevisaoImportacao(session.meta.draft_id);
          return { response: "⚠️ Opção inválida.\n" + menuReview.text, keyboard: menuReview.keyboard, status: 'awaiting_import_review' };
      }

      const originalItems = session.meta.raw_import_items || [];
      let finalItems = [...originalItems];
      let reviewForced = false;

      if (isConfiaveis) {
          finalItems = originalItems.filter(i => i.confidence >= 0.8);
      } else if (isManual) {
          reviewForced = true;
      }
      // ... rest of the logic

      session.technical_payload.resolved_items = finalItems;
      session.technical_payload.requires_human_review = reviewForced || session.technical_payload.requires_human_review;
      session.technical_payload.import_decision = choice;
      
      session.flow_status = 'awaiting_model_choice';
      session.last_question_family = 'MODEL_CHOICE';
      await memoria.salvarSessao(chatId, session);
      
      const menuModelo = menus.menuEscolhaModelo(session.meta.draft_id);
      let response = choice === '2' ? `✅ Filtrado! Importados apenas itens reconhecidos (${finalItems.length}).\n\n` : `✅ Importação confirmada!\n\n`;
      return { response: response + menuModelo.text, keyboard: menuModelo.keyboard, status: 'awaiting_model_choice' };
  }

  async continueFlow(chatId, text, session, intent) {
    if (text && text.length > 0) {
      session = await qualificacao.atualizarEstado(text, session);
      await memoria.salvarSessao(chatId, session);
    }
    const finalIntent = intent || await qualificacao.classifyIncomingMessage(text || "", session);
    const decision = await qualificacao.decidirProximaAção(session, finalIntent);
    
    if (decision.action === 'ask_field') {
      session.meta.retry_count = session.meta.retry_count || {};
      const currentFamily = decision.family;
      session.meta.retry_count[currentFamily] = (session.meta.retry_count[currentFamily] || 0) + 1;
      let waitingHuman = session.meta.retry_count[currentFamily] >= 3 ? 1 : 0;
      if (waitingHuman) decision.text = "⚠️ [MODO ASSISTIDO] Rafael, tive dificuldade em entender... \n\n" + decision.text;

      await this.syncNoctuaStatus(chatId, session, STATUS_NOCTUA.INTAKE, waitingHuman);
      await memoria.salvarSessao(chatId, session);
      
      if (decision.options) {
          const menu = menus.menuOpcoes(decision.text, decision.options);
          return { response: menu.text, keyboard: menu.keyboard, status: 'collecting' };
      }

      return { response: decision.text, status: 'collecting' };
    }

    if (decision.action === 'resolve_technical_scope') return await this.handleTechnicalScope(chatId, session);
    
    await memoria.salvarSessao(chatId, session);
    return { response: "Rafael, o que mais você precisa?", status: 'idle' };
  }

  async handleModelChoice(chatId, text, session) {
    const choice = text.trim();
    const orcResult = await this.executeBudgetWorkflow(chatId, session);
    const cleanChoice = choice.toLowerCase();
    let reportText, clientText;

    if (choice === '1' || cleanChoice.includes('a')) {
      reportText = orcamento.gerarRelatorioOperacional('A', orcResult);
      clientText = orcResult.propostas.modelo_a;
    } else if (choice === '2' || cleanChoice.includes('b')) {
      reportText = orcamento.gerarRelatorioOperacional('B', orcResult);
      clientText = orcResult.propostas.modelo_b;
    } else {
      const menuModelo = menus.menuEscolhaModelo(session.meta.draft_id);
      return { response: "⚠️ Opção inválida. " + menuModelo.text, keyboard: menuModelo.keyboard, status: 'awaiting_model_choice' };
    }

    if (session.meta.current_orcamento_db_id) {
       await memoria.atualizarStatusOrcamento(session.meta.current_orcamento_db_id, STATUS_NOCTUA.PROPOSAL_SENT, 0, { valor: orcResult.financeiro.valorModeloB });
    }

    session.last_question_family = null;
    session.flow_status = 'finished';
    await memoria.salvarSessao(chatId, session);
    return { response: [reportText, clientText], status: 'finished' };
  }

  async handleSaveConfirmation(chatId, text, session) {
    const clean = text.toLowerCase();
    if (clean.includes('sim') || clean === '1') {
      await memoria.salvarSessao(chatId, session); 
      await memoria.limparSessao(chatId); 
      return { response: `✅ Orçamento salvo com sucesso!`, status: 'idle' };
    }
    await memoria.limparSessao(chatId);
    return await this.showMainMenu(chatId, { ...qualificacao.getDefaultState() });
  }

  async handleSupplierInitSelection(chatId, text, session) { return { response: "Aguardando arquivo...", status: 'awaiting_file' }; }
  async handleSupplierReview(chatId, text, session) { return { response: "Cotação processada.", status: 'idle' }; }

  async showMainMenu(chatId, session) {
    session.last_question_family = 'MAIN_MENU';
    await memoria.salvarSessao(chatId, session);
    const menu = menus.menuPrincipal(session);
    return { response: menu.text, keyboard: menu.keyboard, status: 'awaiting_menu' };
  }

  async handleMainMenuSelection(chatId, text, session) {
    const clean = (text || "").toLowerCase().trim();
    if (text == '1' || clean.includes('novo')) {
      session.active_flow = 'client_quote';
      const newId = await memoria.gerarProximoId();
      session.meta.draft_id = newId;
      session.meta.current_orcamento_db_id = await memoria.salvarOrcamento(null, { status: 'iniciado' }, 0, { status_noctua: STATUS_NOCTUA.INTAKE });
      session.answered_families = []; // Resetar para garantir fluxo limpo
      session.last_question_family = null;
      await memoria.salvarSessao(chatId, session);
      return await this.continueFlow(chatId, "", session, 'client_budget_start');
    }

    if (text == '2' || clean.includes('planilha') || clean.includes('enviar')) {
        session.flow_status = 'awaiting_spreadsheet';
        await memoria.salvarSessao(chatId, session);
        return { response: "Por favor, envie o arquivo da planilha (.xlsx ou .csv).", status: 'awaiting_spreadsheet' };
    }

    return await this.showMainMenu(chatId, session);
  }

  async handleSpreadsheetIngestion(chatId, filePath, mimeType, session) {
      try {
          const result = await ingestorPlanilha.processFile(filePath, mimeType);
          
          session.active_flow = 'spreadsheet_import';
          session.meta.raw_import_items = result.items.map(i => ({ 
              produto: i.normalized_description, 
              qtd: i.quantity, 
              preco_custo: i.unit_price, 
              sku: i.mapped_sku, 
              categoria: i.mapped_category,
              origin: i.source_type,
              confidence: i.confidence
          }));

          session.technical_payload = {
              requires_human_review: result.summary.requires_review,
              incompatibilities: result.summary.requires_review ? ['ALERT_LEGACY_SOURCE_USED'] : [],
              operational_flags: { 
                  high_complexity: result.summary.total > 16,
                  from_spreadsheet: true 
              }
          };
          
          const newId = await memoria.gerarProximoId();
          session.meta.draft_id = newId;
          
          await memoria.salvarSessao(chatId, session);
          
          let response = `✅ Planilha Processada! [${newId}]\n`;
          response += `📊 Sumário de Mapeamento:\n`;
          response += `• Total de itens: ${result.summary.total}\n`;
          response += `• ✅ Reconhecidos: ${result.summary.mapped}\n`;
          if (result.summary.partial > 0) response += `• 🟡 Parciais: ${result.summary.partial}\n`;
          if (result.summary.unknown > 0) response += `• ❓ Desconhecidos: ${result.summary.unknown}\n`;
          
          if (result.summary.requires_review) {
              response += `\n⚠️ Atenção: Detectamos itens de baixa confiança que exigem sua decisão.`;
          }
          
          session.flow_status = 'awaiting_import_review';
          const menuReview = menus.menuRevisaoImportacao(newId);
          return { response: response, keyboard: menuReview.keyboard, status: 'awaiting_import_review' };
          
      } catch (error) {
          return { response: `❌ Erro na planilha: ${error.message}`, status: 'idle' };
      }
  }

  async executeBudgetWorkflow(chatId, estado) {
    const escopo = {
      perfil: estado.property_type || "Importado",
      quantidade: estado.camera_quantity || (estado.technical_payload?.resolved_items.filter(i => i.categoria === 'Camera').reduce((acc, i) => acc + i.qtd, 0)) || 0,
      ambiente: estado.installation_environment || "Não definido",
      nome_cliente: estado.client_name || "Rafael (Planilha)",
      technical_payload: estado.technical_payload
    };
    return await orcamento.calcularOrcamento(escopo, estado.meta.draft_id);
  }
}

module.exports = new DialogueEngine();
