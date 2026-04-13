const dialogueEngine = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');
const { initDb } = require('./src/db/sqlite');

async function runTests() {
  console.log("🚀 Iniciando Testes de Modelos A/B e Retomada...");
  await initDb();
  
  const chatId = "test_user_models_final";
  await memoria.limparSessao(chatId);

  console.log("\n--- Passo 0: Selecionar Menu (Gera ID) ---");
  await dialogueEngine.process(chatId, { text: "oi" }); // Menu
  await dialogueEngine.process(chatId, { text: "1" }); // Escolhe Novo Orçamento -> Gera ID

  console.log("\n--- Passo 1: Fluxo de Coleta ---");
  await dialogueEngine.process(chatId, { text: "Casa" }); // Tipo
  await dialogueEngine.process(chatId, { text: "4" }); // Qtd
  await dialogueEngine.process(chatId, { text: "Interno" }); // Ambiente
  await dialogueEngine.process(chatId, { text: "IP" }); // Tecnologia
  await dialogueEngine.process(chatId, { text: "Sim" }); // Gravação
  await dialogueEngine.process(chatId, { text: "Sim" }); // Remoto
  await dialogueEngine.process(chatId, { text: "Noctua fornece" }); // Material
  let res = await dialogueEngine.process(chatId, { text: "Rafael Teste" }); // Nome -> Gatilho de cálculo
  
  console.log("Bot:", res.response);
  if (res.response.includes("Qual versão você quer gerar agora?")) {
    console.log("✅ Pergunta de modelo exibida.");
  }

  console.log("\n--- Passo 2: Gerar Modelo B ---");
  res = await dialogueEngine.process(chatId, { text: "2" });
  console.log("Bot (Modelo B):", res.response.substring(0, 300) + "...");
  
  const orcIdMatch = res.response.match(/ORC-\d+/);
  if (!orcIdMatch) {
    console.error("❌ Erro: ID do orçamento não encontrado na resposta!");
    process.exit(1);
  }
  const orcId = orcIdMatch[0];
  console.log("ID Identificado:", orcId);

  if (res.response.includes("material fornecido pela NOCTUA") && res.response.includes(orcId)) {
    console.log("✅ Modelo B gerado com sucesso.");
  }

  console.log("\n--- Passo 3: Retomada e Gerar Modelo A ---");
  // v12 exige ID longo ou "voltar ao"
  res = await dialogueEngine.process(chatId, { text: `voltar ao ${orcId}` });
  console.log("Bot:", res.response);
  
  res = await dialogueEngine.process(chatId, { text: "1" });
  console.log("Bot (Modelo A):", res.response.substring(0, 300) + "...");
  if (res.response.includes("material fornecido pelo cliente")) {
    console.log("✅ Retomada e Modelo A gerados com sucesso.");
  }

  console.log("\n✅ Testes de Modelos concluídos!");
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
