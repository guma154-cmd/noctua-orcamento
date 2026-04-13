const dialogueEngine = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');
const { initDb } = require('./src/db/sqlite');

async function runTests() {
  console.log("🚀 Iniciando Testes de Relatório Operacional + Orçamento Cliente...");
  await initDb();
  
  const chatId = "test_user_report";
  await memoria.limparSessao(chatId);

  console.log("\n--- Simulando Fluxo Completo para Modelo B ---");
  await dialogueEngine.process(chatId, { text: "oi" });
  await dialogueEngine.process(chatId, { text: "1" }); // Novo
  await dialogueEngine.process(chatId, { text: "Casa" });
  await dialogueEngine.process(chatId, { text: "4" });
  await dialogueEngine.process(chatId, { text: "Interno" });
  await dialogueEngine.process(chatId, { text: "IP" });
  await dialogueEngine.process(chatId, { text: "Sim" });
  await dialogueEngine.process(chatId, { text: "Sim" });
  await dialogueEngine.process(chatId, { text: "Noctua fornece" });
  await dialogueEngine.process(chatId, { text: "Rafael Master" });
  
  console.log("\n--- Selecionando Modelo B ---");
  const res = await dialogueEngine.process(chatId, { text: "2" });
  
  console.log("\n--- RESULTADO FINAL (VERIFICAÇÃO DE ORDEM) ---");
  console.log(res.response);

  const hasOperationalReport = res.response.includes("RELATÓRIO OPERACIONAL");
  const hasClientBudget = res.response.includes("OWL *NOCTUA*") || res.response.includes("NOCTUA") && res.response.includes("📌 *ORÇAMENTO*");
  const correctOrder = res.response.indexOf("RELATÓRIO OPERACIONAL") < res.response.indexOf("📌 *ORÇAMENTO*");

  if (hasOperationalReport) console.log("✅ Bloco 1: Relatório Operacional presente.");
  if (hasClientBudget) console.log("✅ Bloco 2: Orçamento Cliente presente.");
  if (correctOrder) console.log("✅ Ordem correta: Relatório seguido de Orçamento.");

  if (res.response.includes("• Camera 2MP") && res.response.includes("• DVR 4 Canais")) {
    console.log("✅ Detalhamento de materiais no relatório operacional ok.");
  }

  console.log("\n✅ Testes de Saída Final concluídos!");
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
