/**
 * TESTE DE FINALIZAÇÃO INTELIGENTE - NOCTUA V11 (FINAL)
 */
const engine = require("./src/core/DialogueEngine");
const memoria = require("./src/agents/memoria");

async function runFinishTests() {
  console.log("🚀 Iniciando Auditoria de Finalização Inteligente V11...");

  const assert = (condition, message) => {
    console.log(condition ? `✅ PASS: ${message}` : `❌ FAIL: ${message}`);
  };

  const chatId = "test_user_finish_v11";
  await memoria.limparSessao(chatId);

  // 1. Iniciar fluxo (Menu Inicial -> Opção 1)
  console.log("\n--- Caso 1: Iniciando Orçamento ---");
  const res1 = await engine.process(chatId, { text: "Oi" });
  assert(res1.response.includes("O que você quer fazer?"), "Deve mostrar menu inicial");

  const res2 = await engine.process(chatId, { text: "1" });
  assert(res2.response.includes("Vamos começar"), "Deve iniciar fluxo de orçamento");

  // 2. Coletar dado
  await engine.process(chatId, { text: "Casa" });

  // 3. Pedir Nova Conversa (Reset Inteligente)
  console.log("\n--- Caso 2: Pedindo Reset com rascunho ---");
  const res3 = await engine.process(chatId, { text: "reiniciar" });
  assert(res3.response.includes("Deseja salvar"), "Deve perguntar se quer salvar rascunho");
  assert(res3.response.includes("ORC-"), "Deve exibir ID do rascunho");

  // 4. Confirmar Salvamento
  console.log("\n--- Caso 3: Confirmando Salvamento ---");
  const res4 = await engine.process(chatId, { text: "1" }); // 1 = Sim
  assert(res4.response.includes("salvo com sucesso"), "Deve confirmar sucesso");

  console.log("\n✅ Auditoria V11 Concluída.");
}

runFinishTests().catch(console.error);
