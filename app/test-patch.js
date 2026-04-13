/**
 * TESTE DE RESILIÊNCIA E HEURÍSTICA - NOCTUA PATCH
 */
const { parseLocal } = require("./src/utils/heuristic-parser");
const qualificacao = require("./src/agents/qualificacao");

async function runTests() {
  console.log("🚀 Iniciando Testes de Validação do Patch...");

  // Caso 1: Heurística Pura (Sem IA)
  console.log("\n--- Caso 1: Extração Heurística ---");
  const msg1 = "Quero orçar 4 câmeras IP com NVR de 1GB";
  const local = parseLocal(msg1);
  console.log("Mensagem:", msg1);
  console.log("Quantidade extraída:", local.entities.camera_quantity);
  console.log("Tecnologia extraída:", local.entities.system_type);
  console.log("Ambiguidade detectada:", local.ambiguities.length > 0 ? "SIM" : "NÃO");
  if (local.ambiguities.length > 0) {
    console.log("Mensagem de Ambiguidade:", local.ambiguities[0].message);
  }

  // Caso 2: Fallback de Intenção
  console.log("\n--- Caso 2: Fallback de Intenção ---");
  const intent = await qualificacao.classifyIncomingMessage("4 cameras agora", {});
  console.log("Intenção (Local/AI):", intent);

  // Caso 3: Fallback de Pergunta (Simulando IA Offline)
  console.log("\n--- Caso 3: Fallback de Pergunta (IA Offline) ---");
  // Forçamos um estado sem answered_families para ver a próxima pergunta
  const estadoSimulado = {
    answered_families: ['property_type'],
    meta: { ambiguities: [] }
  };
  // Mock da função askGemini para retornar null (simulando falha total)
  const originalAsk = require("./src/services/ai").askGemini;
  require("./src/services/ai").askGemini = async () => null;
  
  const acao = await qualificacao.decidirProximaAção(estadoSimulado, 'client_budget_start');
  console.log("Próxima Ação sugerida (sem IA):", acao.text);
  
  // Restaurar original
  require("./src/services/ai").askGemini = originalAsk;

  console.log("\n✅ Testes concluídos.");
}

runTests().catch(console.error);
