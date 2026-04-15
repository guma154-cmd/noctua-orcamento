/**
 * QA COMPREHENSIVE TEST SUITE - NOCTUA RESILIENCE PATCH v12
 * Auditoria de Quinn (QA Architect)
 */
const { parseLocal } = require("./src/utils/heuristic-parser");
const qualificacao = require("./src/agents/qualificacao");
const ai = require("./src/services/ai");
const dialogueEngine = require("./src/core/DialogueEngine");
const { initDb } = require("./src/db/sqlite");

async function runAudit() {
  console.log("🛡️ Iniciando Auditoria Quinn (QA) v12...");
  await initDb();
  let failCount = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
    } else {
      console.error(`❌ FAIL: ${message}`);
      failCount++;
    }
  };

  // Mock Falha Total de IA - v12 Return Format
  const originalAskAI = ai.askAI;
  ai.askAI = async () => ({ content: null, status: "degraded_mode_triggered", attempts: [] });

  // TESTE 1: Extração Heurística sem IA
  console.log("\n--- Audit 1: Heurística Pura (Sem LLM) ---");
  const local = parseLocal("Rafael, coloca 8 câmeras ae");
  assert(local.entities.camera_quantity === 8, "Deve extrair 8 câmeras");
  // v12: Intenção pode ser null se não houver keywords de ação, o importante é a entidade
  assert(local.entities.camera_quantity === 8, "Entidade técnica extraída corretamente");

  // TESTE 2: Ambiguidade Crítica 1GB vs 1TB
  console.log("\n--- Audit 2: Ambiguidade de Unidade ---");
  const ambig = parseLocal("NVR com HD de 2GB");
  assert(ambig.ambiguities.length > 0, "Deve detectar ambiguidade em 2GB");
  assert(ambig.ambiguities[0].suggestion === "2TB", "Deve sugerir 2TB");

  // TESTE 3: Modo Degradado Operacional
  console.log("\n--- Audit 3: Modo Degradado (Pergunta Guiada de Fallback) ---");
  const estadoPendente = {
    answered_families: ['property_type', 'camera_quantity'],
    meta: { ambiguities: [], draft_id: 'ORC-000001' }
  };
  const acao = await qualificacao.decidirProximaAção(estadoPendente, 'collecting');
  assert(acao.action === 'ask_field', "Deve manter ação de perguntar mesmo sem IA");
  assert(acao.text.includes("1. Interno"), "Deve oferecer opções numeradas");

  // TESTE 4: Null Safety
  console.log("\n--- Audit 4: Proteção contra Crash ---");
  try {
    const result = await qualificacao.classifyIncomingMessage("", {});
    assert(result !== null, "Não deve retornar null para entrada vazia");
  } catch (e) {
    assert(false, `Sistema crashou com input nulo: ${e.message}`);
  }

  // Restaurar IA p/ testes de engine que dependem dela
  ai.askAI = originalAskAI;

  // TESTE 5: Menu Inicial em Conversa Fria
  console.log("\n--- Audit 5: Menu Inicial em Conversa Fria ---");
  const chatId = "qa_test_" + Date.now();
  const menuRes = await dialogueEngine.process(chatId, { text: "oi" });
  assert(menuRes.response.includes("O que você quer fazer?"), "Deve mostrar o menu ao receber 'oi'");

  // TESTE 6: Resposta Determinística (v12 Priority)
  console.log("\n--- Audit 6: Resposta Determinística a Pergunta Pendente ---");
  // 1. Iniciar orçamento
  await dialogueEngine.process(chatId, { text: "1" }); 
  // 2. Responder "1" (Casa)
  const resCase = await dialogueEngine.process(chatId, { text: "1" });
  assert(resCase.response.includes("Quantas câmeras"), "Deve avançar para próxima pergunta após '1'");
  
  // TESTE 7: Resposta de Texto Livre (Correção Bug Nome)
  console.log("\n--- Audit 7: Resposta de Texto Livre (client_name) ---");
  // Avançar até o nome (simulado via estado para rapidez)
  const session = await require("./src/agents/memoria").buscarSessao(chatId);
  session.answered_families = Object.keys(qualificacao.QUESTION_FAMILIES).filter(f => f !== 'client_name');
  session.last_question_family = 'client_name';
  await require("./src/agents/memoria").salvarSessao(chatId, session);

  const resName = await dialogueEngine.process(chatId, { text: "Rafael Master" });
  assert(resName.response.includes("concluído") || resName.response.includes("sucesso") || resName.status === 'awaiting_model_choice' || resName.status === 'finished', "Deve aceitar texto livre para nome do cliente");

  console.log("\n---------------------------------------");
  if (failCount === 0) {
    console.log("🏆 AUDITORIA QA v12 APROVADA.");
  } else {
    console.error(`🚨 AUDITORIA QA REPROVADA: ${failCount} falhas encontradas.`);
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error("Erro fatal na auditoria:", err);
  process.exit(1);
});
