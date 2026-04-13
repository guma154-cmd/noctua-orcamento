const dialogueEngine = require('./src/core/DialogueEngine');
const { initDb } = require('./src/db/sqlite');

async function test() {
  console.log("--- INICIANDO TESTE DE ROTEAMENTO ---");
  await initDb();
  
  const chatId = "TEST_RAFAEL";
  const input = "Preciso salvar um orçamento de fornecedor";
  
  console.log(`Input: ${input}`);
  const result = await dialogueEngine.process(chatId, { text: input });
  
  console.log("\n--- RESULTADO ---");
  console.log(`Status: ${result.status}`);
  console.log(`Resposta: ${result.response}`);
  
  if (result.response.includes("residência") || result.response.includes("comércio")) {
    console.error("\n❌ FALHA: O bot roteou para Qualificação de Cliente!");
  } else if (result.response.includes("FORNECEDOR")) {
    console.log("\n✅ SUCESSO: O bot roteou corretamente para Fornecedor.");
  } else {
    console.log("\n⚠️ INDETERMINADO: Verifique a resposta manual.");
  }
}

test().catch(console.error);
