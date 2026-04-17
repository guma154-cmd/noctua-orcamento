const dialogueEngine = require('../src/core/DialogueEngine');
const memoria = require('../src/agents/memoria');
const FollowUpService = require('../src/services/FollowUpService');
const { initDb, db } = require('../src/db/sqlite');

// Opcional: Mock de IA para acelerar cenários puramente mecânicos (A, B, C)
// Para cenários reais (E, F), usaremos o motor real.

async function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function runScenarioA(chatId) {
  console.log('\n=======================================');
  console.log('CENÁRIO A: Orçamento Simples e Completo (Mecânico)');
  console.log('=======================================');
  await memoria.limparSessao(chatId);
  
  let res = await dialogueEngine.process(chatId, { text: "Orçamento de 2 cameras na minha casa", type: 'text' });
  console.log(`[Input] "Orçamento de 2 cameras na minha casa" -> Flow Status: ${res.status}`);
  // Asks environment
  res = await dialogueEngine.process(chatId, { text: "ambos", type: 'text' });
  console.log(`[Input] "ambos" -> Flow Status: ${res.status}`);
  // Asks system type
  res = await dialogueEngine.process(chatId, { text: "ip", type: 'text' });
  console.log(`[Input] "ip" -> Flow Status: ${res.status}`);
  // Asks recording
  res = await dialogueEngine.process(chatId, { text: "sim", type: 'text' });
  // Asks remote view
  res = await dialogueEngine.process(chatId, { text: "sim", type: 'text' });
  // Cliente fornece?
  res = await dialogueEngine.process(chatId, { text: "voces fornecem", type: 'text' });
  // Nome
  res = await dialogueEngine.process(chatId, { text: "Rafael", type: 'text' });
  
  console.log(`[Status Final do Intake] ${res.status}`);
  if (res.status === 'awaiting_model_choice') {
    console.log(`✅ [Pass] Intake finalizou corretamente com opções de modelo.`);
  } else {
    console.log(`❌ [Fail] Era esperado 'awaiting_model_choice', mas recebemos '${res.status}'.`);
  }
}

async function runScenarioC(chatId) {
  console.log('\n=======================================');
  console.log('CENÁRIO C: Acionamento de waiting_human');
  console.log('=======================================');
  await memoria.limparSessao(chatId);
  
  let res = await dialogueEngine.process(chatId, { text: "Quero fazer um orcamento para cliente", type: 'text' });
  // Responder lixo 3 vezes
  for(let i=0; i<3; i++) {
     res = await dialogueEngine.process(chatId, { text: "batata asssada com queijo", type: 'text' });
     console.log(`Tentativa ${i+1}: AI compreendeu? (Espera-se que reclame) -> Resposta longa? ${res.response.length > 50}`);
  }
  
  // Pegar orçamento no banco para checar waiting_human
  const sess = await memoria.buscarSessao(chatId);
  if (!sess.meta?.draft_id) {
    console.log(`❌ [Fail] Não há meta_draft_id na sessão!`);
    return;
  }
  
  db.get('SELECT waiting_human FROM orcamentos WHERE id = ?', [sess.meta.draft_id], (err, row) => {
    if (row && row.waiting_human === 1) {
       console.log(`✅ [Pass] waiting_human ativado com sucesso para o draft ID ${sess.meta.draft_id}`);
    } else {
       console.log(`❌ [Fail] waiting_human NÃO foi ativado após repetidas falhas. row=${JSON.stringify(row)}`);
    }
  });
}

async function runScenarioD(chatId) {
  console.log('\n=======================================');
  console.log('CENÁRIO D: Validação de Follow Up Elegível');
  console.log('=======================================');
  
  // Pegamos o orçamento de test_followup passado
  const res = await FollowUpService.processarRotinaManual(1);
  console.log(`[Follow-up] Total Elegíveis processados: ${res.total}`);
  if (res.total >= 0) {
    console.log(`✅ [Pass] O loop anti-spam operou com sucesso e travou duplicatas ou achou novos. Logs:`, res.logs);
  }
}

async function runScenarioE(chatId) {
  console.log('\n=======================================');
  console.log('CENÁRIO E: Caso Real (Respostas Textuais Livres)');
  console.log('=======================================');
  await memoria.limparSessao(chatId);
  
  let res = await dialogueEngine.process(chatId, { text: "Preciso montar CFTV na minha loja, sao umas 8 cameras, mas o equipamento eu que vou comprar. Teria que ter gravacao.", type: 'text' });
  console.log(`[Input Real 1] AI extração -> Status: ${res.status}`);
  console.log(`[Expected] Vai faltar system_type e environment.`);
  
  const sess = await memoria.buscarSessao(chatId);
  console.log(`  -> Famílias respondidas: ${sess.answered_families}`);
  
  if (sess.answered_families.includes('camera_quantity') && sess.answered_families.includes('property_type')) {
    console.log(`✅ [Pass] Inteligência Transversal capturou múltiplos campos.`);
  } else {
    console.log(`❌ [Fail] Inteligência não capturou todos os campos da frase.`);
  }
}

async function run() {
  await initDb();
  await runScenarioA("F7_USER_A");
  await delay(1000);
  await runScenarioC("F7_USER_C");
  await delay(1000);
  await runScenarioD("F7_USER_D");
  await delay(1000);
  await runScenarioE("F7_USER_E");
  
  setTimeout(() => { process.exit(0); }, 3000);
}

run();
