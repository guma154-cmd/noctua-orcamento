const qualificacao = require('../agents/qualificacao');
const orcamento = require('../agents/orcamento');
const fornecedor = require('../agents/fornecedor');
const memoria = require('../agents/memoria');
const { parseLocal } = require('../utils/heuristic-parser');

/**
 * NOCTUA DIALOGUE ENGINE - SMART FINALIZATION V11
 * Prioridade Local Absoluta e Anti-Loop.
 */
class DialogueEngine {
  
  async process(chatId, messageContent) {
    const { text, type } = messageContent;
    const local = parseLocal(text || "");
    let session = await memoria.buscarSessao(chatId) || { ...qualificacao.DEFAULT_STATE };
    session.meta = session.meta || {};
    
    const cleanText = (text || "").trim().toLowerCase();
    
    // 1. HARD COMMANDS (RESET / FINISH) - Prioridade Máxima
    const isReset = local.is_reset || cleanText.includes('reiniciar') || cleanText.includes('nova conversa') || cleanText.includes('recomeçar');
    const isFinish = cleanText.includes('finalizar') || cleanText.includes('terminar') || cleanText.includes('encerrar');

    if (isReset || isFinish) {
      if (session.active_flow === 'client_quote' && (session.property_type || session.camera_quantity)) {
        const tempId = session.meta.draft_id || await memoria.gerarProximoId();
        session.meta.draft_id = tempId;
        session.last_question_family = 'CONFIRM_SAVE_BEFORE_EXIT';
        await memoria.salvarSessao(chatId, session);
        return { response: `Rafael, identifiquei que você quer encerrar. Deseja salvar este orçamento rascunho (${tempId}) para continuar depois?\n\n1. Sim, salvar\n2. Não, pode descartar`, status: 'awaiting_save_confirm' };
      } else {
        await memoria.limparSessao(chatId);
        return await this.showMainMenu(chatId, { ...qualificacao.DEFAULT_STATE });
      }
    }

    // 2. RESOLVER PENDÊNCIAS ATIVAS
    if (session.last_question_family) {
      // 2.1 Confirmação de Saída
      if (session.last_question_family === 'CONFIRM_SAVE_BEFORE_EXIT') {
        return await this.handleSaveConfirmation(chatId, text, session);
      }
      
      // 2.2 Escolha de Modelo (Modelo A / B)
      if (session.last_question_family === 'MODEL_CHOICE') {
        return await this.handleModelChoice(chatId, text, session);
      }

      // 2.3 Menu Principal
      if (session.last_question_family === 'MAIN_MENU') {
        return await this.handleMainMenuSelection(chatId, text, session);
      }

      // 2.4 Revisão de Fornecedor (Fase 2A)
      if (session.last_question_family === 'SUPPLIER_REVIEW') {
        return await this.handleSupplierReview(chatId, text, session);
      }

      // 2.5 Escolha de Mídia Fornecedor
      if (session.last_question_family === 'SUPPLIER_INIT') {
        return await this.handleSupplierInitSelection(chatId, text, session);
      }

      // 2.6 Pergunta Técnica (Heurística determinística)
      const resolved = qualificacao.resolvePendingAnswer(text, session.last_question_family);
      if (resolved) {
        const family = session.last_question_family;
        const field = qualificacao.QUESTION_FAMILIES[family].fields[0];
        session[field] = resolved;
        if (!session.answered_families.includes(family)) {
          session.answered_families.push(family);
        }
        session.last_question_family = null;
        await memoria.salvarSessao(chatId, session);
        return await this.continueFlow(chatId, "", session, 'answer_pending');
      }
    }

    // 3. COMANDOS DE RETOMADA
    const isRetrievalCommand = cleanText.includes('voltar ao') || cleanText.includes('carregar orc');
    const longIdMatch = (text || "").match(/ORC-(\d{6})/i);
    if (isRetrievalCommand || longIdMatch) {
      const targetId = longIdMatch ? longIdMatch[0].toUpperCase() : local.detected_id;
      if (targetId) {
        return await this.handleBudgetRetrieval(chatId, targetId, session);
      }
    }

    // 4. SAUDAÇÕES / INÍCIO (Se não houver fluxo)
    const isGreeting = local.is_greeting || ['oi', 'olá', 'ola', 'menu'].includes(cleanText);
    if (!session.active_flow && isGreeting) {
      await memoria.limparSessao(chatId);
      return await this.showMainMenu(chatId, { ...qualificacao.DEFAULT_STATE });
    }

    // 5. FLUXO DE FORNECEDOR (Fase 2A) - Recebimento de Mídia
    if (session.active_flow === 'supplier_sync' && (type || text)) {
      return await this.processSupplierInput(chatId, text, type, session);
    }

    // 6. FLUXO NORMAL (IA / Contextual)
    return await this.continueFlow(chatId, text, session);
  }

  async handleSupplierInitSelection(chatId, text, session) {
    const choice = text.trim();
    const map = { '1': 'texto', '2': 'imagem', '3': 'pdf', '4': 'áudio' };
    const type = map[choice];
    
    if (!type) return { response: "Escolha uma opção de 1 a 4.", status: 'supplier_init' };
    
    session.last_question_family = null;
    session.flow_status = 'awaiting_file';
    session.meta.supplier_input_type = type;
    await memoria.salvarSessao(chatId, session);
    
    return { response: `Iniciando rascunho [${session.meta.draft_id}]. Pode enviar o(a) ${type} agora.`, status: 'awaiting_file' };
  }

  async processSupplierInput(chatId, text, type, session) {
    console.log(`[DEBUG] OCR Bruto recebido (${type}):\n${text}`);
    
    // 1. Armazenar Original Bruto (Raw Source)
    const raw_source = {
      full_text: text,
      type: type,
      timestamp: new Date().toISOString()
    };

    // 2. Extração Estruturada via IA
    const extraido = await fornecedor.extrairCotaçãoEstruturada(text, type);
    console.log(`[DEBUG] Extração Estruturada:\n${JSON.stringify(extraido, null, 2)}`);
    
    if (!extraido) return { response: "Não consegui extrair dados dessa cotação. Pode tentar enviar de outra forma?", status: 'error' };

    // Enriquecer com campos da Fase 2A
    extraido.itens = extraido.itens.map((it, idx) => ({
      ...it,
      id: idx + 1,
      preco_total: it.preco_total || (it.preco_unitario * it.quantidade),
      status_mapeamento: "nao_mapeado"
    }));

    // 3. Camada 1 de Persistência: draft_persisted
    session.supplier_quote_draft = {
      cotacao_id: session.meta.draft_id,
      fornecedor_nome: extraido.fornecedor_nome,
      origem: type,
      original_bruto: text,
      itens: extraido.itens,
      total_calculado: extraido.total_identificado,
      status_rascunho: extraido.status_rascunho,
      bloqueado_para_salvamento: extraido.bloqueado_para_salvamento,
      revisao_obrigatoria: true
    };

    await memoria.salvarCotacao({
      cotacao_id: session.meta.draft_id,
      fornecedor_nome: extraido.fornecedor_nome,
      origem: type,
      payload_bruto: raw_source,
      payload_estruturado: extraido,
      confidence_json: { global: extraido.confianca_global, items: extraido.itens.map(i => i.confianca_item) },
      status: extraido.bloqueado_para_salvamento ? 'blocked' : 'draft'
    });

    session.last_question_family = 'SUPPLIER_REVIEW';
    await memoria.salvarSessao(chatId, session);

    const menuRascunho = fornecedor.renderizarRascunhoTelegram(session.meta.draft_id, extraido);
    return { response: menuRascunho, status: 'awaiting_review' };
  }

  async handleSupplierReview(chatId, text, session) {
    const clean = text.toLowerCase();
    const draft = session.supplier_quote_draft;
    const isBloqueado = draft && (draft.status_rascunho === "blocked_nonrecoverable" || draft.bloqueado_para_salvamento === true);
    
    if (clean === '1' || clean.includes('confirmar')) {
      if (isBloqueado) {
        return { response: "⚠️ Este rascunho está bloqueado por inconsistências (ex: soma não bate). Você precisa '2. Corrigir Informação' antes de salvar.", status: 'awaiting_review' };
      }
      // Camada 2 de Persistência: confirmed_saved
      await memoria.atualizarStatusCotacao(session.meta.draft_id, 'confirmed');
      await memoria.limparSessao(chatId);
      return { response: "✅ Cotação salva e confirmada com sucesso!", status: 'idle' };
    }

    if (clean === '3' || clean.includes('cancelar')) {
      await memoria.atualizarStatusCotacao(session.meta.draft_id, 'cancelled');
      await memoria.limparSessao(chatId);
      return { response: "❌ Cotação cancelada.", status: 'idle' };
    }

    return { response: "Por enquanto, use 1 para confirmar ou 3 para cancelar. Correção manual em breve.", status: 'supplier_review' };
  }

  async handleSaveConfirmation(chatId, text, session) {
    const clean = text.toLowerCase();
    const isYes = clean.includes('sim') || clean === '1' || clean.includes('salvar');
    
    if (isYes) {
      const draftId = session.meta.draft_id;
      await memoria.salvarSessao(chatId, session); 
      await memoria.limparSessao(chatId); 
      return { response: `✅ Orçamento ${draftId} salvo com sucesso! Quando quiser continuar, use o menu "Continuar orçamento".`, status: 'idle' };
    } else {
      await memoria.limparSessao(chatId);
      return await this.showMainMenu(chatId, { ...qualificacao.DEFAULT_STATE });
    }
  }

  async showMainMenu(chatId, session) {
    const menu = "O que você quer fazer?\n\n1. Novo orçamento\n2. Continuar orçamento em andamento\n3. Salvar cotação de fornecedor\n4. Consultar orçamento ou cotação\n5. Cancelar / limpar contexto";
    session.last_question_family = 'MAIN_MENU';
    session.active_flow = null;
    session.flow_status = 'awaiting_menu';
    await memoria.salvarSessao(chatId, session);
    return { response: menu, status: 'awaiting_menu' };
  }

  async handleMainMenuSelection(chatId, text, session) {
    const local = parseLocal(text);
    const choice = local.numeric_selection || text.toLowerCase();

    if (choice == '1' || text.includes('novo')) {
      session.active_flow = 'client_quote';
      session.flow_status = 'collecting';
      session.last_question_family = null;
      session.answered_families = [];
      const newId = await memoria.gerarProximoId();
      session.meta = session.meta || {};
      session.meta.draft_id = newId;
      await memoria.salvarSessao(chatId, session);
      return await this.continueFlow(chatId, "", session, 'client_budget_start');
    }

    if (choice == '2' || text.includes('continuar')) {
      return { response: "Digite o ID do orçamento que deseja continuar.", status: 'ask_id' };
    }

    if (choice == '3' || text.includes('fornecedor')) {
      session.active_flow = 'supplier_sync';
      session.last_question_family = 'SUPPLIER_INIT';
      const newId = await memoria.gerarProximoIdCotacao();
      session.meta = session.meta || {};
      session.meta.draft_id = newId; // ID nasce em sessão
      await memoria.salvarSessao(chatId, session);
      return { response: "Beleza. Como você quer enviar essa cotação?\n1. Texto\n2. Imagem\n3. PDF\n4. Áudio", status: 'supplier_init' };
    }

    if (choice == '5') {
      await memoria.limparSessao(chatId);
      return { response: "Contexto limpo.", status: 'idle' };
    }

    session.last_question_family = null;
    return await this.continueFlow(chatId, text, session);
  }

  async continueFlow(chatId, text, session, intent) {
    if (text && text.length > 0) {
      session = await qualificacao.atualizarEstado(text, session);
    }
    const finalIntent = intent || await qualificacao.classifyIncomingMessage(text || "", session);
    const decision = await qualificacao.decidirProximaAção(session, finalIntent);
    await memoria.salvarSessao(chatId, session);

    if (decision.action === 'ask_field') {
      return { response: decision.text, status: 'collecting' };
    }

    if (decision.action === 'calculate') {
      session.last_question_family = 'MODEL_CHOICE';
      await memoria.salvarSessao(chatId, session);
      return { 
        response: `[${session.meta.draft_id}] Dados coletados com sucesso!\n\nQual versão você quer gerar agora?\n1. Modelo A — material fornecido pelo cliente\n2. Modelo B — material fornecido pela NOCTUA\n3. Gerar ambos`, 
        status: 'awaiting_model_choice' 
      };
    }

    return { response: "Rafael, o que mais você precisa?", status: 'idle' };
  }

  async handleModelChoice(chatId, text, session) {
    const choice = text.trim();
    const orcResult = await this.executeBudgetWorkflow(chatId, session);
    
    let reportText = "";
    let clientText = "";

    if (choice === '1' || text.toLowerCase().includes('modelo a')) {
      reportText = orcamento.gerarRelatorioOperacional('A', orcResult);
      clientText = orcResult.propostas.modelo_a;
    } else if (choice === '2' || text.toLowerCase().includes('modelo b')) {
      reportText = orcamento.gerarRelatorioOperacional('B', orcResult);
      clientText = orcResult.propostas.modelo_b;
    } else if (choice === '3' || text.toLowerCase().includes('ambos')) {
      const repA = orcamento.gerarRelatorioOperacional('A', orcResult);
      const repB = orcamento.gerarRelatorioOperacional('B', orcResult);
      reportText = `📄 *RELATÓRIOS INTERNOS*\n\n${repA}\n\n-------------------\n\n${repB}`;
      clientText = `📄 *PROPOSTAS DO CLIENTE*\n\n*MODELO A*\n${orcResult.propostas.modelo_a}\n\n-------------------\n\n*MODELO B*\n${orcResult.propostas.modelo_b}`;
    } else {
      return { response: "Escolha uma opção válida:\n1. Modelo A\n2. Modelo B\n3. Ambos", status: 'awaiting_model_choice' };
    }

    // Registrar no banco de dados (Modo B como valor base de referência)
    await memoria.salvarOrcamento(null, session, orcResult.financeiro.valorModeloB);

    session.last_question_family = null;
    session.flow_status = 'finished';
    await memoria.salvarSessao(chatId, session);

    return { 
      response: [reportText, clientText], 
      status: 'finished' 
    };
  }

  async handleBudgetRetrieval(chatId, targetId, session) {
    if (session.meta.draft_id === targetId || targetId.includes(session.meta.draft_id)) {
      session.last_question_family = 'MODEL_CHOICE';
      await memoria.salvarSessao(chatId, session);
      return { 
        response: `[${session.meta.draft_id}] Orçamento localizado. Qual versão deseja gerar?\n1. Modelo A\n2. Modelo B\n3. Ambos`, 
        status: 'awaiting_model_choice' 
      };
    }
    return { response: `Não consegui carregar os dados do ${targetId} na sessão ativa.`, status: 'idle' };
  }

  async executeBudgetWorkflow(chatId, estado) {
    const escopo = {
      perfil: estado.property_type,
      quantidade: estado.camera_quantity,
      ambiente: estado.installation_environment,
      nome_cliente: estado.client_name || "Rafael"
    };
    return await orcamento.calcularOrcamento(escopo, estado.meta.draft_id);
  }
}

module.exports = new DialogueEngine();

