const dialogueEngine = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');
const qualificacao = require('./src/agents/qualificacao');

async function testFullFlow() {
  const chatId = 'test_user_flow_123';
  let session;
  
  console.log('--- ETAPA 1: INICIANDO CONVERSA ---');
  await memoria.limparSessao(chatId);
  session = await memoria.buscarSessao(chatId);
  console.log('Sessão limpa após limparSessao():', !session); // Esperado: true
  
  console.log(`
--- ETAPA 2: EXIBINDO MENU PRINCIPAL ---`);
  console.log(`\n--- ETAPA 2: EXIBINDO MENU PRINCIPAL ---`);
  let result = await dialogueEngine.showMainMenu(chatId, qualificacao.getDefaultState());
  console.log('Teclado retornado:', result.keyboard ? 'Sim' : 'Não');
  if (result.keyboard) {
      console.log('Tipo de Teclado:', result.keyboard.reply_markup?.inline_keyboard ? 'Inline' : (result.keyboard.inline_keyboard ? 'Inline (Bruto)' : 'Reply/Outro'));
      console.log('Estrutura:', JSON.stringify(result.keyboard, null, 2));
  }
  session = await memoria.buscarSessao(chatId);
  console.log('last_question_family:', session.last_question_family); // Esperado: MAIN_MENU

  console.log(`\n--- ETAPA 3: CLIQUE EM "NOVO ORÇAMENTO" (ESPERADO: Pergunta 1 com menu) ---`);
  result = await dialogueEngine.process(chatId, { text: 'novo_orcamento', type: 'text' });
  console.log('Resposta:', result.response);
  if (result.keyboard) {
      console.log('Tipo de Teclado:', result.keyboard.reply_markup?.inline_keyboard ? 'Inline' : (result.keyboard.inline_keyboard ? 'Inline (Bruto)' : 'Reply/Outro'));
  }
  session = await memoria.buscarSessao(chatId);
  console.log('last_question_family:', session.last_question_family); // Esperado: property_type
  console.log('answered_families:', session.answered_families); // Esperado: [] (vazio)

  console.log(`
--- ETAPA 4: ENVIANDO RESPOSTA INVÁLIDA (ESPERADO: Repetir Pergunta 1 com menu) ---`);
  result = await dialogueEngine.process(chatId, { text: 'xyz', type: 'text' });
  console.log('Resposta:', result.response);
  console.log('Menu de "Tipo de Local" (Repetição) OK (teclado):', result.keyboard ? 'Sim' : 'Não'); // Esperado: Sim
  session = await memoria.buscarSessao(chatId);
  console.log('last_question_family:', session.last_question_family); // Esperado: property_type
  console.log('answered_families:', session.answered_families); // Esperado: [] (vazio)

  console.log(`
--- ETAPA 5: CLIQUE EM "LIMPAR SESSÃO" NO MEIO DO FLUXO (ESPERADO: Menu Principal) ---`);
  result = await dialogueEngine.process(chatId, { text: 'limpar', type: 'text' });
  console.log('Resposta:', result.response);
  console.log('Menu Principal OK (teclado):', result.keyboard ? 'Sim' : 'Não'); // Esperado: Sim
  session = await memoria.buscarSessao(chatId);
  console.log('Pergunta Pendente (Após Limpar):', session ? session.last_question_family : 'Nenhuma (Sessão Limpa)'); // Esperado: MAIN_MENU (ou null se a sessão for totalmente limpa)

  console.log(`
--- ETAPA 6: NOVO CLIQUE EM "NOVO ORÇAMENTO" (ESPERADO: Pergunta 1 com menu) ---`);
  result = await dialogueEngine.process(chatId, { text: 'novo_orcamento', type: 'text' });
  console.log('Resposta:', result.response);
  console.log('Menu de "Tipo de Local" OK (teclado):', result.keyboard ? 'Sim' : 'Não'); // Esperado: Sim
  session = await memoria.buscarSessao(chatId);
  console.log('last_question_family:', session.last_question_family); // Esperado: property_type
  console.log('answered_families:', session.answered_families); // Esperado: [] (vazio)

  console.log(`
--- ETAPA 7: RESPONDER CORRETAMENTE "TIPO DE LOCAL" (ESPERADO: Pergunta 2 com menu) ---`);
  result = await dialogueEngine.process(chatId, { text: '1', type: 'text' }); // 1. Casa
  console.log('Resposta:', result.response);
  console.log('Menu de "Quantidade de Câmeras" OK (teclado):', result.keyboard ? 'Sim' : 'Não'); // Esperado: Sim
  session = await memoria.buscarSessao(chatId);
  console.log('last_question_family:', session.last_question_family); // Esperado: camera_quantity
  console.log('answered_families:', session.answered_families); // Esperado: ['property_type']
}

testFullFlow();
