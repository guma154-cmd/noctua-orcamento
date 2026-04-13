const { db, initDb } = require('./src/db/sqlite');
const orcamento = require('./src/agents/orcamento');
const axios = require('axios');
require('dotenv').config();

async function sendExample() {
  await initDb();
  
  // Buscar a última sessão ativa
  db.get("SELECT chat_id, estado FROM sessoes ORDER BY updated_at DESC LIMIT 1", async (err, row) => {
    if (err || !row) {
      console.error('Nenhuma sessão encontrada no banco de dados.');
      process.exit(1);
    }

    const chatId = row.chat_id;
    const estado = JSON.parse(row.estado);
    const orcamento_id = estado.meta?.draft_id || 'ORC-EXEMPLO';

    const escopo = {
      perfil: estado.property_type || 'Casa',
      quantidade: estado.camera_quantity || 4,
      ambiente: estado.installation_environment || 'Misto',
      nome_cliente: estado.client_name || 'Rafael'
    };

    console.log(`Gerando exemplo para Chat ID: ${chatId}, ID: ${orcamento_id}`);
    
    const result = await orcamento.calcularOrcamento(escopo, orcamento_id);
    const reportText = orcamento.gerarRelatorioOperacional('B', result);
    const clientText = result.propostas.modelo_b;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
      // Enviar Relatório
      await axios.post(url, {
        chat_id: chatId,
        text: reportText
      });

      // Enviar Proposta
      await axios.post(url, {
        chat_id: chatId,
        text: clientText
      });

      console.log('Exemplo enviado com sucesso para o Telegram!');
    } catch (error) {
      console.error('Erro ao enviar para o Telegram:', error.response?.data || error.message);
    }
    process.exit(0);
  });
}

sendExample();
