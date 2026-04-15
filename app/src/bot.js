const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

const { initDb } = require('./db/sqlite');
const intake = require('./agents/intake');
const dialogueEngine = require('./core/DialogueEngine');
const memoria = require('./agents/memoria');
const qualificacao = require('./agents/qualificacao');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

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

  let replyMarkup = keyboard || null;
  if (!replyMarkup && buttons && buttons.length > 0) {
    replyMarkup = Markup.inlineKeyboard(buttons.map(b => Markup.button.callback(b.text, b.callback_data)));
  }

  const opts = {
    parse_mode: parse_mode || 'Markdown',
    ...(replyMarkup ? replyMarkup : {})
  };

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
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const chatId = ctx.from.id;

  try {
    if (data.startsWith('menu:')) {
      const action = data.split(':')[1];
      await ctx.answerCbQuery();
      const textMap = { novo_orcamento: '1', continuar_orcamento: '2', salvar_cotacao: '3', consultar: '4', limpar: '5', main: 'menu' };
      const result = await dialogueEngine.process(chatId, { text: textMap[action] || action, type: 'text' });
      return sendResult(ctx, result);
    }

    if (data.startsWith('confirm_quote:')) {
      const draftId = data.split(':')[1];
      await ctx.answerCbQuery(`✅ Confirmando...`);
      try {
        await memoria.atualizarStatusCotacao(draftId, 'confirmed');
        await memoria.sincronizarPrecosFornecedor(draftId);
      } catch (err) { console.error(err); }
      await memoria.limparSessao(chatId);
      try { await ctx.editMessageText(`✅ Cotação [${draftId}] arquivada!`, { reply_markup: { inline_keyboard: [] } }); } catch (e) {}
      const result = await dialogueEngine.showMainMenu(chatId, { ...qualificacao.DEFAULT_STATE });
      return sendResult(ctx, result);
    }

    // Outros handlers de callback (cancelar, editar nome, etc) simplificados para o bot.on principal
    // ...
  } catch (err) {
    console.error("[Callback Error]:", err);
  }
});

bot.on(['message', 'photo', 'document', 'voice'], async (ctx) => {
  messageQueue.push({ ctx });
  processQueue();
});

console.log('Bot AIOX Architecture Active with Queue System!');
bot.launch().catch((err) => console.error('Falha ao iniciar o bot:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));