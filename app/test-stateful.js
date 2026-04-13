const dialogueEngine = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');
const { initDb } = require('./src/db/sqlite');

async function runTests() {
  console.log("🚀 Iniciando Testes de Estado e Fluxo...");
  await initDb();
  
  const chatId = "test_user_123";
  await memoria.limparSessao(chatId);

  // Caso A: Greeting -> Menu Principal
  console.log("\n--- Caso A: Greeting ---");
  let res = await dialogueEngine.process(chatId, { text: "Oi" });
  console.log("Bot:", res.response);
  if (res.response.includes("O que você quer fazer?")) console.log("✅ Menu exibido.");

  // Caso B: Escolha "1" (Novo orçamento)
  console.log("\n--- Caso B: Escolha '1' ---");
  res = await dialogueEngine.process(chatId, { text: "1" });
  console.log("Bot:", res.response);
  if (res.response.includes("[ORC-") && res.response.includes("Qual o tipo de local?")) {
    console.log("✅ ID criado e primeira pergunta exibida com ID.");
  }

  // Caso C: Resposta numérica "1" (Casa)
  console.log("\n--- Caso C: Resposta numérica '1' ---");
  res = await dialogueEngine.process(chatId, { text: "1" });
  console.log("Bot:", res.response);
  if (res.response.includes("[ORC-") && res.response.includes("Quantas câmeras")) {
    console.log("✅ Resposta numérica consumida e ID preservado.");
  }

  // Caso D: Resposta textual "Apartamento" (Mesmo que a pergunta anterior fosse respondida, vamos testar continuidade)
  // Nota: Aqui o bot já perguntou "Quantas câmeras". Se eu responder "4", ele deve ir para a próxima.
  console.log("\n--- Caso D: Resposta de câmeras ---");
  res = await dialogueEngine.process(chatId, { text: "4" });
  console.log("Bot:", res.response);
  if (res.response.includes("[ORC-") && res.response.includes("O ambiente é")) {
    console.log("✅ Quantidade consumida e próxima pergunta exibida.");
  }

  // Caso E: Reset
  console.log("\n--- Caso E: Reset ---");
  res = await dialogueEngine.process(chatId, { text: "reiniciar" });
  console.log("Bot:", res.response);
  if (res.response.includes("Deseja salvar") || res.response.includes("O que você quer fazer?")) {
    console.log("✅ Reset interceptado.");
  }

  console.log("\n✅ Testes concluídos!");
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
