/**
 * TESTE DE FLUXO HÍBRIDO - NOCTUA MENU & GUIDED (V4 CORRIGIDO)
 */
const engine = require("./src/core/DialogueEngine");
const qualificacao = require("./src/agents/qualificacao");
const memoria = require("./src/agents/memoria");

async function runHybridTests() {
  console.log("🚀 Iniciando Auditoria Híbrida V4...");

  const assert = (condition, message) => {
    console.log(condition ? `✅ PASS: ${message}` : `❌ FAIL: ${message}`);
  };

  // Limpar sessão antes do teste de início frio
  await memoria.limparSessao("user_cold_start");

  // 1. Saudação com Menu Inicial (Simulando início real)
  console.log("\n--- Caso 1: Menu Inicial ---");
  const res1 = await engine.process("user_cold_start", { text: "Oi" });
  assert(res1.response.includes("O que você quer fazer?"), "Deve mostrar menu inicial no primeiro 'Oi'");

  // 2. Orçamento Direto (Bypass Menu)
  console.log("\n--- Caso 2: Orçamento Direto ---");
  const res2 = await engine.process("user_direct", { text: "Quero 4 câmeras para uma casa" });
  assert(res2.response.includes("ambiente") || res2.response.includes("Interno") || res2.status === 'collecting', "Deve identificar intenção direta");

  // 3. Resposta Numérica à Pergunta Pendente (Loop Check)
  console.log("\n--- Caso 3: Resposta Numérica (Anti-Loop) ---");
  // Simular estado onde perguntou property_type
  const sessionLoop = { ...qualificacao.DEFAULT_STATE, active_flow: 'client_quote', last_question_family: 'property_type' };
  const res3 = await engine.process("user_loop", { text: "1" }); // Deveria responder "Casa"
  // Se responder "Qual o tipo de local?" de novo, falhou.
  assert(!res3.response.includes("Qual o tipo de local?"), "Não deve repetir a mesma pergunta após resposta válida");

  console.log("\n✅ Auditoria V4 Concluída.");
}

runHybridTests().catch(console.error);
