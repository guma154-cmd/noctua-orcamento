const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.telegram.getMe().then((me) => {
  console.log('Bot Me:', JSON.stringify(me, null, 2));
}).catch((err) => {
  console.error('Error:', err.message);
});
