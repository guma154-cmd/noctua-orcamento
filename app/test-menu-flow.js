const dialogueEngine = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');
const qualificacao = require('./src/agents/qualificacao');

async function testFlow() {
  const chatId = 'test_user_123';
  
  console.log('--- 1. Resetando Sessão ---');
  await memoria.limparSessao(chatId);
  
  console.log('--- 2. Mostrando Menu Principal ---');
  let result = await dialogueEngine.showMainMenu(chatId, { ...qualificacao.DEFAULT_STATE });
  console.log('Resposta:', result.response);
  console.log('Teclado (Inline):', result.keyboard ? 'Sim' : 'Não');

  console.log('\n--- 3. Clicando em "Novo Orçamento" (Simulando rawAction: novo_orcamento) ---');
  // Simulando que session.last_question_family é MAIN_MENU
  result = await dialogueEngine.process(chatId, { text: 'novo_orcamento', type: 'text' });
  
  console.log('Resposta:', result.response);
  console.log('Teclado (Reply):', result.keyboard ? 'Sim (Array)' : 'Não');
  if (result.keyboard) {
      console.log('Opções do Teclado:', JSON.stringify(result.keyboard, null, 2));
  }
}

testFlow();
