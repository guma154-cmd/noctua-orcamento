const { Telegraf } = require('telegraf');
require('dotenv').config();

const { initDb } = require('./db/sqlite');
const intake = require('./agents/intake');
const dialogueEngine = require('./core/DialogueEngine');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

initDb().then(() => console.log('AIOX-Ready Database Initialized.'));

/**
 * TRANSPORT LAYER (TELEGRAM)
 * Focado apenas em capturar entrada e entregar saída.
 */
const handleTelegramInteraction = async (ctx) => {
  const chatId = ctx.from.id;
  let messageContent = { text: '', type: 'text' };

  try {
    // 1. Intake: Normalização da entrada (Voz, Texto, Imagem)
    if (ctx.message.text) {
      messageContent.text = ctx.message.text;
    } else {
      // Processar mídias via Intake Agent
      const resultIntake = await intake.classificarIntencao(ctx);
      if (resultIntake.content) {
        messageContent.text = resultIntake.content;
        messageContent.type = resultIntake.intent; // Ex: 'image/jpeg', 'audio/ogg'
      } else {
        return ctx.reply("Não consegui processar esse tipo de mídia.");
      }
    }

    // 2. Orchestration: Enviar para o Dialogue Engine
    const result = await dialogueEngine.process(chatId, messageContent);
    const { response, status } = result;

    // 3. Delivery: Entregar a resposta (Suporta string única ou array de mensagens)
    if (response) {
      if (Array.isArray(response)) {
        for (const msg of response) {
          if (msg) await ctx.reply(msg);
        }
      } else {
        await ctx.reply(response);
      }
    }

  } catch (err) {
    console.error('[Transport Error]:', err);
    ctx.reply('Tive um probleminha aqui. Pode repetir?');
  }
};

// Configurar escuta do bot
bot.on('message', handleTelegramInteraction);

console.log('Bot AIOX Architecture Active!');
bot.launch().catch((err) => console.error('Falha ao iniciar o bot:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
