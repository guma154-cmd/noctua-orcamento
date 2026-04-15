const fs = require('fs');
const path = require('path');
const intake = require('./src/agents/intake');
const dialogueEngine = require('./src/core/DialogueEngine');
const { initDb } = require('./src/db/sqlite');

const PDF_DIR = "C:\\Users\\rafae\\OneDrive\\Área de Trabalho\\Nova pasta";
const LOG_FILE = path.join(__dirname, 'stress-test-log.jsonl');

async function run() {
  console.log('--- INICIANDO TESTE DE ESTRESSE AUTOMATIZADO ---');
  await initDb();
  
  const files = fs.readdirSync(PDF_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`Encontrados ${files.length} arquivos para processar.`);

  for (const file of files) {
    const filePath = path.join(PDF_DIR, file);
    console.log(`\n[Processando]: ${file}...`);
    
    const startTime = Date.now();
    const logEntry = { file, timestamp: new Date().toISOString(), status: 'started' };

    try {
      const mockCtx = {
        message: {
          document: {
            file_name: file,
            mime_type: 'application/pdf',
            file_id: `MOCK_${file.replace(/[^a-zA-Z0-9]/g, '_')}`
          }
        },
        sendChatAction: async () => {},
        reply: async (msg) => { console.log(`   [Bot Reply]: ${msg.substring(0, 50)}...`); return { message_id: 1 }; },
        telegram: {
          getFileLink: async () => ({ href: `file://${filePath}` }),
          deleteMessage: async () => {}
        }
      };

      console.log('   Passo 1: Intake...');
      const resultIntake = await intake.classificarIntencao(mockCtx);
      
      if (!resultIntake || resultIntake.intent === 'erro') {
        throw new Error(`O Intake não conseguiu extrair dados deste PDF.`);
      }

      console.log('   Passo 2: DialogueEngine...');
      const resultEngine = await dialogueEngine.process('STRESS_TEST_USER', { 
        text: resultIntake.content, 
        type: 'input_fornecedor' 
      });

      if (!resultEngine) {
        throw new Error(`O DialogueEngine não retornou resposta.`);
      }

      const duration = Date.now() - startTime;
      logEntry.status = 'success';
      logEntry.duration_ms = duration;
      console.log(`✅ Sucesso em ${duration}ms!`);

    } catch (err) {
      console.error(`❌ Falha no arquivo ${file}:`, err.message);
      logEntry.status = 'failed';
      logEntry.error = err.message;
      
      // Se falhar, não para o script, apenas loga e vai para o próximo
      // para podermos ver quantos falham e por quê.
    }

    fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
    // Pequena pausa entre arquivos para evitar rate limits agressivos
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n--- RELATÓRIO FINAL ---');
  const logs = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const success = logs.filter(l => l.status === 'success').length;
  console.log(`Total: ${logs.length} | Sucessos: ${success} | Falhas: ${logs.length - success}`);
}

run().catch(err => {
  console.error('Erro fatal:', err);
});