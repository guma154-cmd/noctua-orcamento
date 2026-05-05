const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

const { initDb } = require('./db/sqlite');
const intake = require('./agents/intake');
const dialogueEngine = require('./core/DialogueEngine');
const memoria = require('./agents/memoria');
const qualificacao = require('./agents/qualificacao');
const { LeadsRepository, PIPELINE_STATES } = require('./services/LeadsRepository');
const fornecedor = require('./agents/fornecedor');
const menus = require('./ui/telegram-menu');


const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
bot.catch((err, ctx) => {
  console.error(`[Global Error] Error for ${ctx.updateType}:`, err);
});

initDb().then(() => console.log('AIOX-Ready Database Initialized.'));

// Fila de Processamento Sequencial (Anti-Stress)
const messageQueue = [];
let isProcessing = false;

const processQueue = async () => {
  if (isProcessing || messageQueue.length === 0) return;
  isProcessing = true;
  
  const { ctx, resolve } = messageQueue.shift();
  try {
    await handleTelegramInteraction(ctx);
  } catch (err) {
    console.error("[Queue Error]:", err);
  } finally {
    isProcessing = false;
    if (resolve) resolve();
    processQueue();
  }
};

/**
 * HELPER: renderiza qualquer resultado do DialogueEngine no Telegram.
 */
const sendResult = async (ctx, result) => {
  if (!result || !result.response) return;
  const { response, keyboard, parse_mode, buttons } = result;

  let opts = { parse_mode: parse_mode || 'Markdown' };
  
  if (keyboard) {
    if (keyboard.reply_markup) {
      // Já é um Markup do Telegraf (Inline ou outro)
      Object.assign(opts, keyboard);
    } else if (keyboard.inline_keyboard) {
      // Objeto bruto de inline keyboard
      opts.reply_markup = keyboard;
    }
  } else if (buttons && buttons.length > 0) {
    const inlineKeyboard = buttons.map(b => [Markup.button.callback(b.text, b.callback_data)]);
    opts.reply_markup = { inline_keyboard: inlineKeyboard };
  } else {
    // Se não houver teclado definido, removemos teclados Reply anteriores (limpeza de legado)
    opts.reply_markup = { remove_keyboard: true };
  }

  if (Array.isArray(response)) {
    for (const msg of response) {
      if (msg) await ctx.reply(msg, opts);
    }
  } else {
    await ctx.reply(response, opts);
  }
};


/**
 * TRANSPORT LAYER (TELEGRAM)
 */
const handleTelegramInteraction = async (ctx) => {
  console.log(`[Queue] Processando mensagem de: ${ctx.from.id} (${messageQueue.length} pendentes)`);

  const chatId = ctx.from.id;
  let messageContent = { text: '', type: 'text' };
  let session = await memoria.buscarSessao(chatId) || { ...qualificacao.DEFAULT_STATE };

  try {
    if (ctx.message.text) {
      const cleanText = ctx.message.text.trim();

      // STORY 5.3: CAPTURAR DESCRIÇÃO DE PRÓXIMA AÇÃO
      if (session.meta && session.meta.awaiting_next_action_desc) {
        const { tipo, id } = session.meta.awaiting_next_action_desc;
        const { LeadsRepository } = require('./services/LeadsRepository');
        
        await LeadsRepository.definirProximaAcao(id, {
            tipo,
            descricao: cleanText,
            data_prevista: new Date().toISOString() // Simplificado para o MVP (hoje)
        });

        delete session.meta.awaiting_next_action_desc;
        await memoria.salvarSessao(chatId, session);
        return ctx.reply(`âœ… PrÃ³xima aÃ§Ã£o definida para o lead #${id}:
*${tipo.toUpperCase()}* - ${cleanText}`, { parse_mode: 'Markdown' });
      }
      if (session.meta && session.meta.awaiting_name_for_draft) {
        const draftId = session.meta.awaiting_name_for_draft;
        const newName = ctx.message.text.trim();
        await memoria.atualizarNomeFornecedorCotacao(draftId, newName);
        delete session.meta.awaiting_name_for_draft;
        await memoria.salvarSessao(chatId, session);
        return ctx.reply(`✅ Nome atualizado para: *${newName}*`, { parse_mode: 'Markdown' });
      }

      if (session.meta && session.meta.awaiting_supplier_name) {
        const supplierName = ctx.message.text.trim();
        const { extracted_supplier_data } = session.meta;
        
        const normalizedItems = await fornecedor.normalizeItems(extracted_supplier_data, supplierName);
        session.meta.normalized_supplier_items = normalizedItems;
        delete session.meta.awaiting_supplier_name;
        delete session.meta.extracted_supplier_data;
        await memoria.salvarSessao(chatId, session);
        
        const summary = fornecedor.createSummary(normalizedItems);
        const menu = menus.menuConfirmacaoFornecedor(session.meta.draft_id);
        
        return ctx.reply(`${summary}

O que você deseja fazer?`, { reply_markup: menu.keyboard });
      }

      messageContent.text = cleanText;
    } else {
      const resultIntake = await intake.classificarIntencao(ctx);
      if (resultIntake.intent === 'erro') {
        return ctx.reply(resultIntake.content || "❌ Ocorreu um erro desconhecido na extração. A equipe já foi notificada.");
      }
      
      if (resultIntake.content) {
        messageContent.text = resultIntake.content;
        messageContent.type = resultIntake.intent;
      } else {
        return ctx.reply("❌ Não consegui extrair conteúdo do arquivo. Tente enviar um formato diferente ou verifique a qualidade.");
      }
    }

    const result = await dialogueEngine.process(chatId, messageContent);
    await sendResult(ctx, result);

  } catch (err) {
    console.error('[Transport Error]:', err);
    ctx.reply('Tive um problema ao processar. Tente novamente em instantes.');
  }
};

/**
 * HANDLER PARA BOTÕES INLINE
 */
// Proteção contra Double-Click (Local memory)
const lastClicks = new Map();

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const chatId = ctx.from.id;

  // Prevenção de Double-click (Idempotência básica)
  const now = Date.now();
  const last = lastClicks.get(chatId);
  if (last && last.data === data && (now - last.time < 1000)) {
      return ctx.answerCbQuery("Processando... aguarde.");
  }
  lastClicks.set(chatId, { data, time: now });

  try {
    // 1. Feedback visual imediato e limpeza do menu clicado
    await ctx.answerCbQuery();
    
    // Tratamento administrativo (admin:) não remove botões imediatamente se for para visualizar
    const isAdmin = data.startsWith('admin:');
    if (!isAdmin) {
        try { await ctx.editMessageReplyMarkup(undefined); } catch (e) {}
    }

    if (data.startsWith('admin:view:')) {
      const orcId = data.split(':')[2];
      return ctx.reply(`🔍 Detalhes do Alerta [ID ${orcId}]:
O cliente parou na última pergunta técnica. Verifique o banco para detalhes do escopo atual.`);
    }

    if (data.startsWith('admin:resolve:')) {
      const orcId = data.split(':')[2];
      await memoria.resolverAlertaOrcamento(orcId);
      try {
        await ctx.editMessageText(`âœ… Alerta do OrÃ§amento [ID ${orcId}] marcado como resolvido.`);
      } catch (e) {}
      return;
    }

    // --- STORY 4.3: REVIEW SYSTEM ---
    if (data.startsWith('review:approve:')) {
      const orcId = data.split(':')[2];
      const orcData = await memoria.buscarOrcamentoPorId(orcId);
      if (!orcData) return ctx.reply("âŒ OrÃ§amento nÃ£o encontrado.");

      const escopo = JSON.parse(orcData.escopo);
      const result = await dialogueEngine.executeBudgetWorkflow(chatId, { ...escopo, meta: { draft_id: orcId } });

      const model = escopo.budget_model || 'A';
      const propostaTextual = model === 'A' ? result.propostas.modelo_a : (model === 'B' ? result.propostas.modelo_b : result.propostas.modelo_c);

      // Registrar versÃ£o
      await memoria.salvarVersaoOrcamento(orcId, { model, proposta: propostaTextual, enviado: true });
      await memoria.atualizarStatusOrcamento(orcId, 'proposta_enviada');

      // REGISTRO DE EVENTO: Proposta Enviada (Story 5.1)
      await LeadsRepository.registrarEvento(orcId, 'proposta_enviada', { model });

      await ctx.reply(`âœ… *PROPOSTA ENVIADA AO CLIENTE*

${propostaTextual}`, { parse_mode: 'Markdown' });
      return;
    }

    if (data.startsWith('review:edit:')) {
      return ctx.reply("ðŸ—ï¸ A funcionalidade de ediÃ§Ã£o direta ainda estÃ¡ em desenvolvimento. Por favor, reinicie o fluxo se precisar de alteraÃ§Ãµes crÃ­ticas.");
    }

    if (data.startsWith('review:cancel:')) {
      const orcId = data.split(':')[2];
      await memoria.atualizarStatusOrcamento(orcId, 'cancelado');
      return ctx.editMessageText("âŒ OrÃ§amento cancelado e arquivado.");
    }

    // --- STORY 5.2: FOLLOW-UP ACTIONS ---
    if (data.startsWith('followup:')) {
      const [_, action, orcId] = data.split(':');
      const FollowUpService = require('./services/FollowUpService');
      const { LeadsRepository } = require('./services/LeadsRepository');

      if (action === 'send') {
        const res = await FollowUpService.confirmarEnvio(orcId);
        if (res.success) {
          return ctx.editMessageText(`âœ… Follow-up (#${res.tentativa}) marcado como enviado para o lead [${orcId}].`);
        }
      } else if (action === 'delay') {
        await LeadsRepository.adicionarNota(orcId, "Follow-up adiado por 12h pelo Rafael.");
        return ctx.editMessageText(`â•’ Follow-up do lead [${orcId}] adiado por 12h.`);
      } else if (action === 'skip') {
        await LeadsRepository.adicionarNota(orcId, "Follow-up pulado manualmente pelo Rafael.");
        return ctx.editMessageText(`â­ Follow-up do lead [${orcId}] ignorado nesta rodada.`);
      }
    }

    if (data.startsWith('confirm_supplier_quote:')) {
      const draftId = data.split(':')[1];
      const session = await memoria.buscarSessao(chatId);
      
      const rawData = session.meta.temp_supplier_data || {};
      const fornecedorNome = rawData.fornecedor_nome || 'Desconhecido';
      const itens = rawData.itens || [];

      const normalizedItems = itens.map(item => {
         // Se nÃ£o veio código, geramos um slug determinístico baseado na descrição bruta
         const generatedCode = item.item_codigo || 
           item.descricao_bruta.toLowerCase()
             .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
             .replace(/[^a-z0-9]/g, "-") // Troca tudo que nÃ£o Ã© letra/numero por -
             .replace(/-+/g, "-") // Remove duplicatas de -
             .substring(0, 20); // Limita o tamanho

         return {
            fornecedor_nome: fornecedorNome,
            item_codigo: generatedCode,
            marca: item.marca || null,
            categoria: item.categoria || null,
            subcategoria: item.subcategoria || null,
            modelo: item.modelo || null,
            descricao_padronizada: null,
            descricao_original: item.descricao_bruta || item.descricao || 'Item sem descrição',
            unidade_medida: item.unidade || 'UN',
            preco_unitario: item.preco_unitario || 0,
            moeda: 'BRL',
            origem_preco_tipo: 'cotacao',
            origem_preco_referencia: draftId,
            data_coleta: new Date().toISOString(),
            confianca_extracao: rawData.confianca_global || 1.0,
            status_registro: 'active'
         };
      });

      if (normalizedItems.length > 0) {
        const FornecedorRepository = require('./services/FornecedorRepository');
        await FornecedorRepository.bulkInsert(normalizedItems);
        const totalCount = await FornecedorRepository.getTotalItemCount();
        await memoria.limparSessao(chatId);
        return ctx.reply(`✅ Cotação salva! ${normalizedItems.length} itens do fornecedor *${fornecedorNome}* foram cadastrados na base (Total: ${totalCount}).`, { parse_mode: 'Markdown' });
      } else {
        await memoria.limparSessao(chatId);
        return ctx.reply('❌ Nenhum item encontrado para salvar. Operação cancelada.');
      }
    }

    if (data.startsWith('review_supplier_quote:')) {
      return ctx.reply('Função de revisão ainda não implementada.');
    }

    if (data.startsWith('cancel_supplier_quote:')) {
       await memoria.limparSessao(chatId);
       return ctx.reply('❌ Operação cancelada.');
    }

    // 2. Mapeamento de cliques do menu principal
    if (data.startsWith('menu:')) {
      const action = data.split(':')[1];
      const textMap = { 
        novo_orcamento: 'novo_orcamento', 
        continuar_orcamento: 'continuar_orcamento', 
        salvar_cotacao: 'salvar_cotacao', 
        consultar: 'consultar', 
        limpar: 'limpar', 
        main: 'menu' 
      };
      const result = await dialogueEngine.process(chatId, { text: textMap[action] || action, type: 'text' });
      return sendResult(ctx, result);
    }


    // 3. Encaminhamento resiliente para o DialogueEngine
    // Passamos o 'data' completo para preservar prefixos (ex: confirm_quote:ID), 
    // permitindo que o Engine decida como tratar.
    const result = await dialogueEngine.process(chatId, { text: data, type: 'text' });
    return sendResult(ctx, result);

  } catch (err) {
    console.error("[Callback Error]:", err);
  }
});

bot.command('cancelar', async (ctx) => {
  const result = await dialogueEngine.process(ctx.from.id, { text: 'reset', type: 'text' });
  return sendResult(ctx, result);
});

bot.command('status', async (ctx) => {
  const chatId = ctx.from.id;
  const session = await memoria.buscarSessao(chatId);
  if (!session || !session.flow_status || session.flow_status === 'idle') {
    return ctx.reply("ℹ️ Nenhuma sessão ativa no momento. Use /start para começar.");
  }

  const respondidos = session.answered_families ? session.answered_families.length : 0;
  const total = Object.keys(qualificacao.QUESTION_FAMILIES).length;
  const porcentagem = Math.round((respondidos / total) * 100);

  let statusMsg = `📊 *Status da Sessão*

`;
  statusMsg += `👤 Operador: ${session.operator_name || 'Rafael'}
`;
  statusMsg += `📍 Etapa: ${session.flow_status.toUpperCase()}
`;
  statusMsg += `📝 Progresso: ${respondidos}/${total} (${porcentagem}%)
`;
  if (session.meta && session.meta.draft_id) {
    statusMsg += `🆔 Orçamento: \`${session.meta.draft_id}\`\n`;
  }

  return ctx.reply(statusMsg, { parse_mode: 'Markdown' });
});

bot.command('alertas', async (ctx) => {
  // TODO: Adicionar trava de ADMIN_ID em produção
  try {
    const alertas = await memoria.listarOrcamentosEmAlerta();
    if (alertas.length === 0) {
      return ctx.reply("✅ Nenhum orçamento em alerta no momento.");
    }

    await ctx.reply(`⚠️ *Orçamentos aguardando intervenção:*`, { parse_mode: 'Markdown' });
    
    for (const alerta of alertas) {
      const dateStr = new Date(alerta.last_interaction_at).toLocaleString('pt-BR');
      const buttons = [
        Markup.button.callback('🔍 Ver', `admin:view:${alerta.id}`),
        Markup.button.callback('✅ Resolver', `admin:resolve:${alerta.id}`)
      ];
      await ctx.reply(`🆔 ID: ${alerta.id}
📅 Última interação: ${dateStr}`, Markup.inlineKeyboard(buttons));
    }
  } catch (err) {
    console.error("[Admin Error]:", err);
    ctx.reply("Erro ao buscar alertas.");
  }
});

bot.command('followup', async (ctx) => {
  try {
    const FollowUpService = require('./services/FollowUpService');
    const { Markup } = require('telegraf');
    const menus = require('./ui/telegram-menu');

    await ctx.reply("ðŸ”„ Buscando leads para Follow-up...");
    const alertas = await FollowUpService.processarRotinaFollowUp();

    if (alertas.length === 0) {
      return ctx.reply("âœ… Nenhum lead precisa de follow-up no momento.");
    }

    for (const alerta of alertas) {
      const msg = `ðŸ”” *Follow-up NecessÃ¡rio: ${alerta.cliente}*
` +
                  `ID: \`${alerta.orc_id}\` | Valor: R$ ${alerta.valor}\n` +
                  `Inativo hÃ¡: ${alerta.horas_inativo}h | Tentativa: ${alerta.tentativa}/3\n` +
                  `Prioridade: *${alerta.prioridade}*\n\n` +
                  `ðŸ’¬ *Mensagem Sugerida:*\n_${alerta.mensagem_sugerida}_`;

      const buttons = [
        [Markup.button.callback('ðŸš€ Enviar', `followup:send:${alerta.orc_id}`)],
        [Markup.button.callback('â•’ Adiar 12h', `followup:delay:${alerta.orc_id}`), 
         Markup.button.callback('â­ Pular', `followup:skip:${alerta.orc_id}`)]
      ];

      await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
    }
  } catch (err) {
    console.error("[FollowUp Error]:", err);
    ctx.reply("Erro ao processar follow-up.");
  }
});

// --- COMANDOS CRM (Story 5.1) ---

bot.command('status', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) {
    return ctx.reply("⚠️ Uso correto: `/status {id} {novo_status}`\nEx: `/status 1 negociacao`", { parse_mode: 'Markdown' });
  }

  const id = parts[1];
  const novoStatus = parts[2].toLowerCase();
  const confirmado = parts[3] === 'sim';

  try {
    const res = await LeadsRepository.alterarStatus(id, novoStatus, { confirmado, motivo: 'Comando Telegram' });
    ctx.reply(`âœ… Status do Lead #${id} alterado: *${res.de}* âž¡ï¸ *${res.para}*`, { parse_mode: 'Markdown' });
  } catch (err) {
    ctx.reply(`âŒ Erro: ${err.message}`);
  }
});

bot.command('historico', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  const id = parts[1];
  if (!id) return ctx.reply("âš ï¸ Uso correto: `/historico {id}`");

  try {
    const eventos = await LeadsRepository.buscarHistorico(id);
    if (eventos.length === 0) return ctx.reply("â„¹ï¸ Nenhun evento encontrado para este lead.");

    let msg = `ðŸ“‹ *HistÃ³rico do Lead #${id}*

`;
    eventos.forEach(ev => {
      const data = new Date(ev.created_at).toLocaleString('pt-BR');
      const emoji = ev.evento === EVENT_TYPES.FECHADO_GANHO ? 'ðŸ†' : 
                    ev.evento === EVENT_TYPES.FECHADO_PERDIDO ? 'ðŸ’”' : 
                    ev.evento === EVENT_TYPES.STATUS_ALTERADO ? 'ðŸ”„' : 'ðŸ';
      
      msg += `${emoji} *${data}* - ${ev.evento.toUpperCase()}\n`;
      try {
        const p = JSON.parse(ev.payload_snapshot);
        if (p.de) msg += `   _De: ${p.de} Para: ${p.para}_\n`;
        if (p.motivo) msg += `   _Motivo: ${p.motivo}_\n`;
        if (p.texto) msg += `   _"${p.texto}"_\n`;
      } catch (e) {}
    });

    ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (err) {
    ctx.reply(`âŒ Erro ao buscar histÃ³rico: ${err.message}`);
  }
});

bot.command('nota', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  const id = parts[1];
  const texto = parts.slice(2).join(' ');

  if (!id || !texto) return ctx.reply("âš ï¸ Uso correto: `/nota {id} {seu texto aqui}`");

  try {
    await LeadsRepository.adicionarNota(id, texto);
    ctx.reply(`âœ… Nota adicionada ao Lead #${id}.`);
  } catch (err) {
    ctx.reply(`âŒ Erro ao adicionar nota: ${err.message}`);
  }
});

bot.command('dashboard', async (ctx) => {
  const DashboardService = require('./services/DashboardService');
  try {
    const painel = await DashboardService.gerarPainelResumo();
    ctx.reply(painel, { parse_mode: 'Markdown' });
  } catch (err) {
    ctx.reply(`âŒ Erro ao gerar dashboard: ${err.message}`);
  }
});

bot.command('proxima', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  const id = parts[1];
  if (!id) return ctx.reply("âš ï¸ Uso correto: `/proxima {id}`");

  const msg = `ðŸ“ *Definir PrÃ³xima AÃ§Ã£o - Lead #${id}*\n\nEscolha o tipo de aÃ§Ã£o:`;  const buttons = [
    [Markup.button.callback('ðŸ“ž LigaÃ§Ã£o', `next_action:ligacao:${id}`), Markup.button.callback('ðŸ¤ ReuniÃ£o', `next_action:reuniao:${id}`)],
    [Markup.button.callback('ðŸ“„ Proposta', `next_action:envio_proposta:${id}`), Markup.button.callback('ðŸ¡ Visita TÃ©cnica', `next_action:visita:${id}`)],
    [Markup.button.callback('âœï¸ Contrato', `next_action:contrato:${id}`), Markup.button.callback('â• Outro', `next_action:outro:${id}`)]
  ];

  ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
});

bot.command('fornecedores', async (ctx) => {
    try {
        const produtos = await memoria.listarFornecedores();
        if (produtos.length === 0) {
            return ctx.reply("Nenhum produto de fornecedor cadastrado ainda.");
        }
        let msg = "📦 *Últimos Produtos Cadastrados:*\n\n";
        produtos.forEach(p => {
            const data = new Date(p.updated_at).toLocaleDateString('pt-BR');
            msg += `â€¢ *${p.produto}*
  R$ ${p.preco_custo.toFixed(2)} (em ${data})
`;
        });
        ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (err) {
        ctx.reply(`ðŸŒ¬ï¸ Erro ao listar fornecedores: ${err.message}`);
    }
});

bot.on('callback_query', async (ctx, next) => {
  const data = ctx.callbackQuery.data;
  
  if (data.startsWith('next_action:')) {
    const [_, tipo, id] = data.split(':');
    const session = await memoria.buscarSessao(ctx.from.id) || {};
    session.meta = session.meta || {};
    session.meta.awaiting_next_action_desc = { tipo, id };
    await memoria.salvarSessao(ctx.from.id, session);
    
    return ctx.editMessageText(`âœ… Tipo *${tipo.toUpperCase()}* selecionado.

Agora digite a *DESCRIÃ‡ÃƒO* da aÃ§Ã£o e a *DATA* (ex: Ligar para Rafael amanhÃ£ as 10h):`, { parse_mode: 'Markdown' });
  }

  if (data.startsWith('followup:')) {
    const [_, action, orcId] = data.split(':');
    const FollowUpService = require('./services/FollowUpService');
    const { LeadsRepository } = require('./services/LeadsRepository');

    if (action === 'send') {
      const res = await FollowUpService.confirmarEnvio(orcId);
      if (res.success) {
        return ctx.editMessageText(`âœ… Follow-up (#${res.tentativa}) marcado como enviado para o lead [${orcId}].`);
      }
    } else if (action === 'delay') {
      await LeadsRepository.adicionarNota(orcId, "Follow-up adiado por 12h pelo Rafael.");
      return ctx.editMessageText(`â•’ Follow-up do lead [${orcId}] adiado por 12h.`);
    } else if (action === 'skip') {
      await LeadsRepository.adicionarNota(orcId, "Follow-up pulado manualmente pelo Rafael.");
      return ctx.editMessageText(`â­ Follow-up do lead [${orcId}] ignorado nesta rodada.`);
    }
  }

  // 2. Mapeamento de cliques do menu principal
  if (data.startsWith('menu:')) {
    const action = data.split(':')[1];
    const textMap = { 
      novo_orcamento: 'novo_orcamento', 
      continuar_orcamento: 'continuar_orcamento', 
      salvar_cotacao: 'salvar_cotacao', 
      consultar: 'consultar', 
      limpar: 'limpar', 
      main: 'menu' 
    };
    const result = await dialogueEngine.process(chatId, { text: textMap[action] || action, type: 'text' });
    return sendResult(ctx, result);
  }

  // 3. Encaminhamento resiliente para o DialogueEngine
  const result = await dialogueEngine.process(chatId, { text: data, type: 'text' });
  return sendResult(ctx, result);

});

bot.on(['message', 'photo', 'document', 'voice'], async (ctx) => {
  messageQueue.push({ ctx });
  processQueue();
});

console.log('Bot AIOX Architecture Active with Queue System!');
bot.launch({ dropPendingUpdates: true }).catch((err) => console.error('Falha ao iniciar o bot:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
