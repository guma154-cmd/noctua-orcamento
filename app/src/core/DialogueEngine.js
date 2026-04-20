const qualificacao = require('../agents/qualificacao');
const orcamento = require('../agents/orcamento');
const fornecedor = require('../agents/fornecedor');
const memoria = require('../agents/memoria');
const ai = require('../services/ai');
const technicalScopeResolver = require('../agents/technical_scope_resolver');
const technicalAuditor = require('../agents/technical_auditor');
const ingestorPlanilha = require('../agents/ingestor_planilha');
const { parseLocal } = require('../utils/heuristic-parser');
const menus = require('../ui/telegram-menu');
const { STATUS_NOCTUA } = require('../utils/constants');

/**
 * NOCTUA DIALOGUE ENGINE - V17 (HARDENING READY)
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
    let { text, type, filePath, mimeType } = messageContent;

    // 0. SUPORTE GLOBAL A ÁUDIO (MULTIMODAL)
    if ((type === 'voice' || type === 'audio') && filePath) {
      console.log(`[Engine] Transcrevendo áudio global para: ${chatId}`);
      const transcription = await ai.transcribeAudio(filePath);
      if (transcription) {
        console.log(`[Engine] Áudio transcrito: "${transcription}"`);
        text = transcription;
      }
    }

    const cleanText = (text || "").toLowerCase().trim();

    // 1. GESTÃO DE COMANDOS GLOBAIS
    const resetKeywords = ['reset', 'reiniciar', 'limpar', 'limpar sessão', '/start', 'start'];
    const isNewBudget = cleanText === 'novo_orcamento' || cleanText === 'novo orçamento';
    
    // Lista de sinônimos para o comando de retorno
    const backKeywords = ['voltar', 'retornar', 'retroceder', 'etapa anterior', 'pergunta anterior', 'voltar etapa', 'voltar pergunta'];
    const isBack = backKeywords.some(kw => cleanText === kw || cleanText.includes(kw)) || cleanText === 'menu:voltar';
    const isMenu = cleanText === 'menu:main' || cleanText === 'menu' || cleanText === '/menu';

    // Heurística local para detecção de reset antes de carregar sessão (proteção contra números)
    const localLocal = parseLocal(text || "");
    const isReset = localLocal.is_reset || resetKeywords.some(kw => cleanText === kw);

    let session = await memoria.buscarSessao(chatId) || { ...qualificacao.getDefaultState() };
    session.meta = session.meta || {};

    if (isMenu) {
      console.log(`[Engine] Retornando ao menu principal via comando: ${chatId}`);
      await memoria.limparSessao(chatId);
      return await this.showMainMenu(chatId, { ...qualificacao.getDefaultState() });
    }

    if (isBack) {
      console.log(`[Engine] Voltando etapa para: ${chatId}`);

      // 1. Prioridade para voltar no TSR
      if (session.flow_status === 'collecting_tech' || session.flow_status === 'tech_review' || (session.last_question_family && session.last_question_family.startsWith('TECH_'))) {
          const keys = Object.keys(session.technical_scope || {});
          if (keys.length > 0) {
              const lastKey = keys[keys.length - 1];
              delete session.technical_scope[lastKey];
          } else {
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

      return await this.showMainMenu(chatId, session);
    }

    if (isReset) {
      console.log(`[Engine] Reset interceptado - aguardando confirmação: ${chatId}`);
      session.prev_flow_status = session.flow_status; 
      session.flow_status = 'awaiting_reset_confirmation';
      await memoria.salvarSessao(chatId, session);
      const menuReset = menus.menuConfirmacaoReset();
      return { response: menuReset.text, keyboard: menuReset.keyboard, status: 'awaiting_reset_confirmation' };
    }

    if (isNewBudget) {
      console.log(`[Engine] Novo Orçamento solicitado via: ${cleanText}`);
      await memoria.limparSessao(chatId); 
      let newSession = { ...qualificacao.getDefaultState() };
      return await this.handleMainMenuSelection(chatId, '1', newSession);
    }

    // 0.1 TRATAMENTO DE ARQUIVOS (PLANILHAS)
    if (type === 'document' && filePath) {
        const isExcel = mimeType && (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('officedocument'));
        const isCSV = mimeType && mimeType.includes('csv');
        if (isExcel || isCSV || filePath.endsWith('.xlsx') || filePath.endsWith('.csv')) {
            return await this.handleSpreadsheetIngestion(chatId, filePath, mimeType, session);
        }
    }

    // 1. RESOLVER PENDÊNCIAS
    if (session.last_question_family || session.flow_status === 'tech_review' || session.flow_status === 'awaiting_import_review' || session.flow_status === 'awaiting_reset_confirmation') {
      
      // 1.0 Reset Confirmation
      if (session.flow_status === 'awaiting_reset_confirmation') {
        const resetConfirm = cleanText === 'reset:confirm' || cleanText.includes('sim');
        const resetCancel = cleanText === 'reset:cancel' || cleanText.includes('não') || cleanText.includes('nao');

        if (resetConfirm) {
           console.log(`[Engine] Reset confirmado para: ${chatId}`);
           await memoria.limparSessao(chatId);
           return await this.showMainMenu(chatId, { ...qualificacao.getDefaultState() });
        } else if (resetCancel) {
           console.log(`[Engine] Reset cancelado para: ${chatId}`);
           session.flow_status = session.prev_flow_status || 'idle';
           await memoria.salvarSessao(chatId, session);
           return await this.continueFlow(chatId, "", session, 'smalltalk');
        } else {
           const menuReset = menus.menuConfirmacaoReset();
           return { response: "Por favor, escolha uma das opções:", keyboard: menuReset.keyboard, status: 'awaiting_reset_confirmation' };
        }
      }

      // 1.1 Tech Review
      if (session.flow_status === 'tech_review') {
        const operationalMessages = require('../utils/operational_messages');
        const hasCriticalBlock = (session.technical_payload.incompatibilities || []).some(code => operationalMessages.translate(code).severity === operationalMessages.SEVERITY.BLOCK);

        if (cleanText === '1' || cleanText.includes('sim') || cleanText.includes('prosseguir')) {
          if (hasCriticalBlock) {
            return { response: "❌ *BLOQUEIO CRÍTICO:* Rafael, este orçamento possui inconsistências técnicas graves que impedem a finalização automática. Por favor, selecione 'Corrigir Dados'.", status: 'tech_review' };
          }
          await this.syncNoctuaStatus(chatId, session, STATUS_NOCTUA.QUALIFIED);
          
          const result = await this.executeBudgetWorkflow(chatId, session);
          const resumo = {
              orcamento_id: result.orcamento_id,
              relatorio_interno: orcamento.gerarRelatorioOperacional('B', result)
          };

          session.last_question_family = 'MODEL_CHOICE';
          session.flow_status = 'awaiting_model_choice';
          await memoria.salvarSessao(chatId, session);
          
          const menuReview = menus.menuRevisaoOrcamento(resumo);
          return { response: menuReview.text, keyboard: menuReview.keyboard, status: 'awaiting_model_choice' };
        } else if (cleanText === '2' || cleanText.includes('corrigir')) {
          session.technical_scope = {};
          session.flow_status = 'collecting_tech';
          await memoria.salvarSessao(chatId, session);
          return await this.handleTechnicalScope(chatId, session);
        } else {
          return await this.handleTechnicalScope(chatId, session);
        }
      }

      if (session.flow_status === 'awaiting_import_review') {
          return await this.handleImportReview(chatId, text, session);
      }

      // 1.2 Pergunta Técnica
      if (session.last_question_family && session.last_question_family.startsWith('TECH_')) {
        const questionId = session.last_question_family.replace('TECH_', '');
        // Normalização: remove prefixos se for callback
        const normalizedText = text.includes(':') ? text.split(':')[1] : text;
        const resolved = technicalScopeResolver.resolvePendingTechnicalAnswer(normalizedText, questionId);
        
        if (resolved === 'WAIT_FOR_MANUAL') {
          const budgetIdPrefix = session.meta && session.meta.draft_id ? `[${session.meta.draft_id}] ` : "";
          let instruction = "a quantidade exata:";
          if (questionId === 'recording_days') instruction = "o número de dias de gravação:";
          const msg = `${budgetIdPrefix}Entendido. Por favor, digite ${instruction}`;
          const menu = menus.menuOpcoes(msg, []);
          return { response: menu.text, keyboard: menu.keyboard, status: 'collecting_tech' };
        }

        if (resolved !== null && resolved !== "") {
          session.technical_scope = session.technical_scope || {};
          const profile = technicalScopeResolver.PROFILES[session.property_type] || technicalScopeResolver.PROFILES['Outro'];
          const question = (profile.questions || []).find(q => q.id === questionId) || 
                           technicalScopeResolver.GLOBAL_TECH_QUESTIONS.find(q => q.id === questionId);
          
          if (question) {
            if (question.id === 'cable_total' || question.id === 'long_distance_risk') {
              delete session.technical_scope['detailed_long_distance_count'];
              delete session.technical_scope['detailed_entry_mode'];
              delete session.technical_scope['raw_detailed_points'];
            }
            if (question.id === 'cable_individual_distance') {
              session.technical_scope.raw_detailed_points = session.technical_scope.raw_detailed_points || {};
              const nextIdx = Object.keys(session.technical_scope.raw_detailed_points).length + 1;
              session.technical_scope.raw_detailed_points[nextIdx] = resolved;
              const totalToCollect = parseInt(session.technical_scope.detailed_long_distance_count) || 0;
              if (Object.keys(session.technical_scope.raw_detailed_points).length < totalToCollect) {
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
          return await this.handleTechnicalScope(chatId, session);
        }
      }

      if (session.last_question_family === 'CONFIRM_SAVE_BEFORE_EXIT') return await this.handleSaveConfirmation(chatId, text, session);
      if (session.last_question_family === 'MODEL_CHOICE') return await this.handleModelChoice(chatId, text, session);
      if (session.last_question_family === 'MAIN_MENU') return await this.handleMainMenuSelection(chatId, text, session);
      
      // SUPLEMENTO: Handlers de Cotação de Fornecedor
      if (text.startsWith('supplier_midia:')) return await this.handleSupplierMidiaSelection(chatId, text, session);
      if (text.startsWith('confirm_quote:')) return await this.handleSupplierConfirm(chatId, text, session);
      if (text.startsWith('cancel_quote:')) return await this.handleSupplierCancel(chatId, text, session);
      if (text.startsWith('edit_name_quote:')) return await this.handleSupplierEditName(chatId, text, session);

      const normalizedText = text.includes(':') ? text.split(':')[1] : text;
      const resolved = qualificacao.resolvePendingAnswer(normalizedText, session.last_question_family);
      if (resolved) {
        if (resolved === 'WAIT_FOR_MANUAL') {
          const budgetIdPrefix = session.meta && session.meta.draft_id ? `[${session.meta.draft_id}] ` : "";
          const msg = `${budgetIdPrefix}Entendido. Por favor, digite a quantidade exata de câmeras:`;
          const menu = menus.menuOpcoes(msg, []);
          return { response: menu.text, keyboard: menu.keyboard, status: 'collecting' };
        }
        const family = session.last_question_family;
        const field = qualificacao.QUESTION_FAMILIES[family].fields[0];
        session[field] = resolved;
        if (!session.answered_families.includes(family)) session.answered_families.push(family);
        session.last_question_family = null;
        await memoria.salvarSessao(chatId, session);
        return await this.continueFlow(chatId, "", session, 'answer_pending');
      }
      return await this.continueFlow(chatId, text, session, 'answer_pending');
    }

    const intent = await qualificacao.classifyIncomingMessage(text || "", session);
    return await this.continueFlow(chatId, text, session, intent);
  }

  async handleTechnicalScope(chatId, session) {
    const payload = await technicalScopeResolver.generateTechnicalPayload(session);
    session.technical_payload = payload;
    session.technical_scope = session.technical_scope || {};
    const profile = technicalScopeResolver.PROFILES[session.property_type] || technicalScopeResolver.PROFILES['Outro'];
    const isUnanswered = (val) => val === undefined || val === null || val === "";
    let unanswered = (profile.questions || []).find(q => isUnanswered(session.technical_scope[q.field]) && (!q.condition || q.condition(payload)));
    if (!unanswered) unanswered = technicalScopeResolver.GLOBAL_TECH_QUESTIONS.find(q => isUnanswered(session.technical_scope[q.field]) && (!q.condition || q.condition(payload)));
    if (unanswered) {
      session.last_question_family = `TECH_${unanswered.id}`;
      session.flow_status = 'collecting_tech';
      await memoria.salvarSessao(chatId, session);
      const promptText = typeof unanswered.prompt === 'function' ? unanswered.prompt(payload) : unanswered.prompt;
      
      // Sempre anexa navegação no TSR também
      const menu = menus.menuOpcoes(promptText, unanswered.options || []);
      return { response: menu.text, keyboard: menu.keyboard, status: 'collecting_tech' };
    }
    const auditResult = await technicalAuditor.audit(session, payload);
    payload.audit_log = auditResult;
    
    const operationalMessages = require('../utils/operational_messages');
    const translatedIncompatibilities = (payload.incompatibilities || []).map(code => ({ code, ...operationalMessages.translate(code) }));
    const hasCriticalBlock = translatedIncompatibilities.some(t => t.severity === operationalMessages.SEVERITY.BLOCK);

    if (auditResult.audit_state !== 'APPROVED' || payload.waiting_human || payload.requires_human_review || hasCriticalBlock) {
      const systemIncompatibilities = translatedIncompatibilities.map(t => {
          return `• ${t.title}: ${t.message}`;
      });
      const aiFlags = (auditResult.flags || []).map(f => `• [IA] ${f.issue} (Severidade: ${f.severity})`);
      const allAlerts = [...systemIncompatibilities, ...aiFlags].join('\n');
      const aiNote = auditResult.ai_observations ? `\n\n🔍 *Observação do Auditor IA:*\n${auditResult.ai_observations}` : "";
      
      session.flow_status = 'tech_review';
      await memoria.salvarSessao(chatId, session);

      if (hasCriticalBlock) {
        const menu = menus.menuOpcoes(`❌ *BLOQUEIO TÉCNICO CRÍTICO*\n\nDetectamos erros que inviabilizam o orçamento automático:\n${allAlerts}${aiNote}\n\nRafael, estes itens *PRECISAM* ser corrigidos antes de gerar o orçamento.`, ['Corrigir Dados', 'Resetar Orçamento']);
        return { response: menu.text, keyboard: menu.keyboard, status: 'tech_review' };
      }

      const menu = menus.menuOpcoes(`⚠️ *REVISÃO NECESSÁRIA*\n\nDetectamos as seguintes inconsistências:\n${allAlerts}${aiNote}\n\nRafael, deseja prosseguir com o dimensionamento automático ou prefere corrigir os dados?`, ['Sim, prosseguir', 'Corrigir']);
      return { response: menu.text, keyboard: menu.keyboard, status: 'tech_review' };
    }
    await this.syncNoctuaStatus(chatId, session, STATUS_NOCTUA.QUALIFIED);
    
    // EXIBIÇÃO DE RESUMO DO ORÇAMENTO (T011)
    const result = await this.executeBudgetWorkflow(chatId, session);
    const resumo = {
        orcamento_id: result.orcamento_id,
        relatorio_interno: orcamento.gerarRelatorioOperacional('B', result)
    };

    session.last_question_family = 'MODEL_CHOICE';
    session.flow_status = 'awaiting_model_choice';
    await memoria.salvarSessao(chatId, session);
    
    const menuReview = menus.menuRevisaoOrcamento(resumo);
    return { response: menuReview.text, keyboard: menuReview.keyboard, status: 'awaiting_model_choice' };
  }

  async handleImportReview(chatId, text, session) {
      const choice = text.trim();
      const clean = choice.toLowerCase();
      if (choice === '4' || clean.includes('cancelar')) {
          await memoria.limparSessao(chatId);
          return await this.showMainMenu(chatId, { ...qualificacao.getDefaultState() });
      }
      const isTudo = choice === '1' || clean.includes('tudo');
      const isConfiaveis = choice === '2' || clean.includes('confiáveis') || clean.includes('confiaveis');
      const isManual = choice === '3' || clean.includes('manual');
      if (!isTudo && !isConfiaveis && !isManual) {
          const menuReview = menus.menuRevisaoImportacao(session.meta.draft_id);
          return { response: "⚠️ Opção inválida.\n" + menuReview.text, keyboard: menuReview.keyboard, status: 'awaiting_import_review' };
      }
      const originalItems = session.meta.raw_import_items || [];
      let finalItems = [...originalItems];
      let reviewForced = false;
      if (isConfiaveis) finalItems = originalItems.filter(i => i.confidence >= 0.8);
      else if (isManual) reviewForced = true;
      session.technical_payload.resolved_items = finalItems;
      session.technical_payload.requires_human_review = reviewForced || session.technical_payload.requires_human_review;
      
      const result = await this.executeBudgetWorkflow(chatId, session);
      const resumo = {
          orcamento_id: result.orcamento_id,
          relatorio_interno: orcamento.gerarRelatorioOperacional('B', result)
      };

      session.flow_status = 'awaiting_model_choice';
      session.last_question_family = 'MODEL_CHOICE';
      await memoria.salvarSessao(chatId, session);

      const menuReview = menus.menuRevisaoOrcamento(resumo);
      return { response: menuReview.text, keyboard: menuReview.keyboard, status: 'awaiting_model_choice' };
  }

  async continueFlow(chatId, text, session, intent) {
    if (text && text.length > 0) {
      session = await qualificacao.atualizarEstado(text, session);
      await memoria.salvarSessao(chatId, session);
    }
    const finalIntent = intent || await qualificacao.classifyIncomingMessage(text || "", session);
    
    if (finalIntent === 'control_command') {
        const clean = (text || "").toLowerCase();
        if (clean.includes('reset') || clean.includes('limpar') || clean.includes('cancelar')) {
             return await this.process(chatId, { text: 'reset', type: 'text' });
        }
        return await this.showMainMenu(chatId, session);
    }

    const decision = await qualificacao.decidirProximaAção(session, finalIntent);
    if (decision.action === 'ask_field') {
      session.meta.retry_count = session.meta.retry_count || {};
      const currentFamily = decision.family;
      session.meta.retry_count[currentFamily] = (session.meta.retry_count[currentFamily] || 0) + 1;
      let waitingHuman = session.meta.retry_count[currentFamily] >= 3 ? 1 : 0;
      if (waitingHuman) decision.text = "⚠️ [MODO ASSISTIDO] Rafael, tive dificuldade em entender... \n\n" + decision.text;
      await this.syncNoctuaStatus(chatId, session, STATUS_NOCTUA.INTAKE, waitingHuman);
      await memoria.salvarSessao(chatId, session);

      // Interceptação: Menu Premium para Escolha de Modelo Inicial (SPRINT 1)
      if (currentFamily === 'budget_model') {
        const menu = menus.menuSelecaoModeloInicial(session.meta.draft_id);
        return { response: menu.text, keyboard: menu.keyboard, status: 'collecting' };
      }

      // Sempre usa menuOpcoes para anexar botões de navegação (Voltar/Menu)
      const menu = menus.menuOpcoes(decision.text, decision.options || []);
      return { response: menu.text, keyboard: menu.keyboard, status: 'collecting' };
    }
    if (decision.action === 'resolve_technical_scope') return await this.handleTechnicalScope(chatId, session);
    await memoria.salvarSessao(chatId, session);
    
    // Fallback final
    const menu = menus.menuPrincipal(session);
    return { response: "Rafael, não entendi muito bem. O que mais você precisa do sistema?", keyboard: menu.keyboard, status: 'idle' };
  }

  async handleModelChoice(chatId, text, session) {
    const choice = text.trim();
    // Normalização para callback ou texto
    const cleanChoice = choice.includes(':') ? choice.split(':')[1].toLowerCase() : choice.toLowerCase();
    
    const orcResult = await this.executeBudgetWorkflow(chatId, session);
    let reportText, clientText;

    if (cleanChoice === '1' || cleanChoice === 'a' || cleanChoice.includes('modelo a')) {
      reportText = orcamento.gerarRelatorioOperacional('A', orcResult);
      clientText = orcResult.propostas.modelo_a;
    } else if (cleanChoice === '2' || cleanChoice === 'b' || cleanChoice === 'ambos' || cleanChoice.includes('modelo b')) {
      // Se for 'ambos', geramos o B por padrão no operacional mas enviamos ambos no final
      reportText = orcamento.gerarRelatorioOperacional('B', orcResult);
      clientText = cleanChoice === 'ambos' ? `${orcResult.propostas.modelo_a}\n\n---\n\n${orcResult.propostas.modelo_b}` : orcResult.propostas.modelo_b;
    } else {
      const menuModelo = menus.menuEscolhaModelo(session.meta.draft_id);
      return { response: "⚠️ Opção inválida. " + menuModelo.text, keyboard: menuModelo.keyboard, status: 'awaiting_model_choice' };
    }
    if (session.meta.current_orcamento_db_id) await memoria.atualizarStatusOrcamento(session.meta.current_orcamento_db_id, STATUS_NOCTUA.PROPOSAL_SENT, 0, { valor: orcResult.financeiro.valorModeloB });
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

  async handleSupplierInitSelection(chatId, text, session) {
    const draftId = session.meta.draft_id;
    const menuMidia = menus.menuMidiaFornecedor(draftId);
    session.last_question_family = 'SUPPLIER_INIT';
    await memoria.salvarSessao(chatId, session);
    return { response: menuMidia.text, keyboard: menuMidia.keyboard, status: 'awaiting_file' };
  }

  async handleSupplierMidiaSelection(chatId, text, session) {
    const midia = text.split(':')[1];
    session.meta.supplier_midia_type = midia;
    session.flow_status = 'awaiting_file';
    await memoria.salvarSessao(chatId, session);

    const instrucoes = {
      texto: "Por favor, cole o texto da cotação abaixo:",
      imagem: "Por favor, envie uma foto nítida da cotação ou nota fiscal:",
      pdf: "Por favor, envie o arquivo PDF da cotação:",
      audio: "Por favor, envie o áudio descrevendo os itens da cotação:"
    };

    return { response: `✅ Modo *${midia.toUpperCase()}* selecionado.\n\n${instrucoes[midia] || 'Pode enviar agora.'}`, status: 'awaiting_file', parse_mode: 'Markdown' };
  }

  async handleSupplierConfirm(chatId, text, session) {
    const draftId = text.split(':')[1];
    console.log(`[Engine] Confirmando cotação de fornecedor: ${draftId}`);
    
    // 1. Marcar no banco como confirmada
    await memoria.confirmarCotacao(draftId);
    
    // 2. Sugerir atualizações de preços (opcional/automático)
    const sugestoes = await fornecedor.sugerirAtualizacaoPrecos(draftId);
    
    await memoria.limparSessao(chatId);
    let msg = `✅ Cotação [${draftId}] salva com sucesso!`;
    if (sugestoes.sugestoes && sugestoes.sugestoes.length > 0) {
        msg += `\n\n💡 Detectamos ${sugestoes.sugestoes.length} sugestões de atualização de preço para seu catálogo. Use /alertas para revisar.`;
    }

    return { response: msg, status: 'idle' };
  }

  async handleSupplierCancel(chatId, text, session) {
    await memoria.limparSessao(chatId);
    return { response: "❌ Operação cancelada. O rascunho foi descartado.", status: 'idle' };
  }

  async handleSupplierEditName(chatId, text, session) {
    const draftId = text.split(':')[1];
    session.meta.awaiting_name_for_draft = draftId;
    await memoria.salvarSessao(chatId, session);
    return { response: "✏️ Por favor, digite o novo nome para o fornecedor:", status: 'collecting' };
  }

  async handleSupplierReview(chatId, text, session) { 
    return { response: "Rafael, por favor use os botões de Confirmar ou Cancelar para prosseguir com o rascunho.", status: 'awaiting_menu' }; 
  }

  async showMainMenu(chatId, session) {
    session.last_question_family = 'MAIN_MENU';
    await memoria.salvarSessao(chatId, session);
    const menu = menus.menuPrincipal(session);
    return { response: menu.text, keyboard: menu.keyboard, status: 'awaiting_menu' };
  }

  async handleMainMenuSelection(chatId, text, session) {
    const clean = (text || "").toLowerCase().trim();
    
    if (text == '1' || clean === 'novo_orcamento' || clean.includes('novo')) {
      session.active_flow = 'client_quote';
      const newId = await memoria.gerarProximoId();
      session.meta.draft_id = newId;
      session.answered_families = [];
      session.last_question_family = null;
      session.flow_status = 'collecting';
      await memoria.salvarSessao(chatId, session);
      return await this.continueFlow(chatId, "", session, 'client_budget_start');
    }

    if (clean === 'salvar_cotacao' || clean.includes('fornecedor')) {
      session.active_flow = 'supplier_quote';
      const newId = await memoria.gerarProximoId();
      session.meta.draft_id = newId;
      await memoria.salvarSessao(chatId, session);
      return await this.handleSupplierInitSelection(chatId, text, session);
    }

    if (text == '2' || clean === 'consultar' || clean.includes('historico')) {
        return { response: "🔍 Funcionalidade de consulta em desenvolvimento. Por enquanto, foque no Novo Orçamento!", status: 'idle' };
    }

    if (clean === 'limpar' || clean.includes('sessão')) {
        return await this.process(chatId, { text: 'reset', type: 'text' });
    }

    return await this.showMainMenu(chatId, session);
  }

  async handleSpreadsheetIngestion(chatId, filePath, mimeType, session) {
      try {
          const result = await ingestorPlanilha.processFile(filePath, mimeType);
          session.active_flow = 'spreadsheet_import';
          session.meta.raw_import_items = result.items.map(i => ({ produto: i.normalized_description, qtd: i.quantity, preco_custo: i.unit_price, sku: i.mapped_sku, categoria: i.mapped_category, origin: i.source_type, confidence: i.confidence }));
          session.technical_payload = { requires_human_review: result.summary.requires_review, incompatibilities: result.summary.requires_review ? ['ALERT_LEGACY_SOURCE_USED'] : [], operational_flags: { high_complexity: result.summary.total > 16, from_spreadsheet: true } };
          const newId = await memoria.gerarProximoId();
          session.meta.draft_id = newId;
          await memoria.salvarSessao(chatId, session);
          let response = `✅ Planilha Processada! [${newId}]\n📊 Sumário: ${result.summary.total} itens.\n`;
          session.flow_status = 'awaiting_import_review';
          const menuReview = menus.menuRevisaoImportacao(newId);
          return { response: response, keyboard: menuReview.keyboard, status: 'awaiting_import_review' };
      } catch (error) { return { response: `❌ Erro na planilha: ${error.message}`, status: 'idle' }; }
  }

  async executeBudgetWorkflow(chatId, estado) {
    const escopo = { perfil: estado.property_type || "Importado", quantidade: estado.camera_quantity || 0, ambiente: estado.installation_environment || "Não definido", nome_cliente: estado.client_name || "Rafael (Planilha)", technical_payload: estado.technical_payload };
    return await orcamento.calcularOrcamento(escopo, estado.meta.draft_id);
  }
}

module.exports = new DialogueEngine();
