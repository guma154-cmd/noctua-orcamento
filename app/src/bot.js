const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

const { initDb } = require('./db/sqlite');
const intake = require('./agents/intake');
const dialogueEngine = require('./core/DialogueEngine');
const memoria = require('./agents/memoria');
const qualificacao = require('./agents/qualificacao');

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
      if (session.meta && session.meta.awaiting_name_for_draft) {
        const draftId = session.meta.awaiting_name_for_draft;
        const newName = ctx.message.text.trim();
        await memoria.atualizarNomeFornecedorCotacao(draftId, newName);
        delete session.meta.awaiting_name_for_draft;
        await memoria.salvarSessao(chatId, session);
        return ctx.reply(`✅ Nome atualizado para: *${newName}*`, { parse_mode: 'Markdown' });
      }
      messageContent.text = ctx.message.text;
    } else {
      const resultIntake = await intake.classificarIntencao(ctx);
      if (resultIntake.content) {
        messageContent.text = resultIntake.content;
        messageContent.type = resultIntake.intent;
      } else {
        return ctx.reply("❌ Não consegui ler este arquivo. Tente enviar novamente.");
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
      return ctx.reply(`🔍 Detalhes do Alerta [ID ${orcId}]:\nO cliente parou na última pergunta técnica. Verifique o banco para detalhes do escopo atual.`);
    }

    if (data.startsWith('admin:resolve:')) {
      const orcId = data.split(':')[2];
      await memoria.resolverAlertaOrcamento(orcId);
      try {
        await ctx.editMessageText(`✅ Alerta do Orçamento [ID ${orcId}] marcado como resolvido.`);
      } catch (e) {}
      return;
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

  let statusMsg = `📊 *Status da Sessão*\n\n`;
  statusMsg += `👤 Operador: ${session.operator_name || 'Rafael'}\n`;
  statusMsg += `📍 Etapa: ${session.flow_status.toUpperCase()}\n`;
  statusMsg += `📝 Progresso: ${respondidos}/${total} (${porcentagem}%)\n`;
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
      await ctx.reply(`🆔 ID: ${alerta.id}\n📅 Última interação: ${dateStr}`, Markup.inlineKeyboard(buttons));
    }
  } catch (err) {
    console.error("[Admin Error]:", err);
    ctx.reply("Erro ao buscar alertas.");
  }
});

bot.command('followup', async (ctx) => {
  // Comando para ambiente de testes - simula inatividade curta (1 hora) ao invés de 24h
  try {
    const FollowUpService = require('./services/FollowUpService');
    await ctx.reply("🔄 Iniciando rotina de Follow-up (Teste)...");
    
    // Forçando 1 hora de inatividade para facilitar testes
    const resultado = await FollowUpService.processarRotinaManual(1);
    
    let report = `📊 *Teste de Follow-up (Inatividade > 1h)*\n`;
    report += `Elegíveis encontrados: ${resultado.total}\n`;
    report += `Follow-ups disparados: ${resultado.executados}\n\n`;
    
    if (resultado.logs.length > 0) {
      report += `*Logs:*\n- ${resultado.logs.join('\n- ')}`;
    }
    
    await ctx.reply(report, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error("[FollowUp Error]:", err);
    ctx.reply("Erro ao executar follow-up manual.");
  }
});

bot.on(['message', 'photo', 'document', 'voice'], async (ctx) => {
  messageQueue.push({ ctx });
  processQueue();
});

console.log('Bot AIOX Architecture Active with Queue System!');
bot.launch({ dropPendingUpdates: true }).catch((err) => console.error('Falha ao iniciar o bot:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));