/**
 * TEST STORY 001 - End-to-End Orchestration Validation (REVISED V6)
 */
const orchestrator = require("./src/services/ai/orchestrator");

// --- MOCK ORCHESTRATOR ---
const originalRun = orchestrator.run;
orchestrator.run = async (type, operation, params) => {
  return { content: "mocked" };
};

const ai = require("./src/services/ai");
ai.askAI = async (prompt, system) => {
    const p = (prompt || "").toLowerCase();
    const s = (system || "").toLowerCase();
    console.log(`[MOCK IA] Prompt: ${p.substring(0, 50)}...`);

    if (s.includes("classificador de intenções")) return { content: "nova_solicitacao" };
    if (s.includes("intent router")) return { content: "smalltalk" };
    if (p.includes("extraia dados de cftv")) {
        const result = {};
        if (p.includes("4 câmeras") || p.includes("4 cameras")) result.camera_quantity = 4;
        if (p.includes("casa")) result.property_type = "Casa";
        return { content: JSON.stringify(result) };
    }
    return { content: "smalltalk" };
};
ai.askGemini = async (prompt, system) => {
    const res = await ai.askAI(prompt, system);
    return res.content;
};

const { initDb } = require("./src/db/sqlite");
const intake = require("./src/agents/intake");
const dialogueEngine = require("./src/core/DialogueEngine");
const memoria = require("./src/agents/memoria");
const qualificacao = require("./src/agents/qualificacao");

async function runTest() {
  console.log("🚀 Iniciando Teste Story 001: Validação E2E (Final Polish)...");
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

  const chatId = "test_user_001_" + Date.now();

  console.log("\n--- Passo 1: Recebimento do Pedido (Intake) ---");
  const ctx = {
    message: { text: "Gostaria de um orçamento para 4 câmeras em uma casa" },
    from: { id: chatId },
    telegram: { getFileLink: async () => ({ href: "" }) }
  };

  const resultIntake = await intake.classificarIntencao(ctx);
  assert(resultIntake.intent === "nova_solicitacao", "Intake deve classificar como nova_solicitacao");

  console.log("\n--- Passo 2: Processamento pelo DialogueEngine ---");
  const result1 = await dialogueEngine.process(chatId, { text: resultIntake.content, type: resultIntake.intent });
  
  assert(result1.status === 'collecting', "Deve iniciar a coleta de dados");
  
  let session = await memoria.buscarSessao(chatId);
  assert(session.camera_quantity === 4, "Deve ter extraído 4 câmeras");

  console.log("\n--- Passo 3: Completando as perguntas ---");
  
  let currentRes = result1;
  let iterations = 0;
  while (currentRes.status === 'collecting' && iterations < 20) {
    iterations++;
    session = await memoria.buscarSessao(chatId);
    const nextFamily = session.last_question_family;
    
    // Se for nome, precisa de mais de 1 caractere
    const responseText = (nextFamily === 'client_name') ? "Rafael Master" : "1";
    console.log(`[Flow] Pergunta: ${nextFamily} -> Resposta: ${responseText}`);
    
    currentRes = await dialogueEngine.process(chatId, { text: responseText });
  }

  assert(currentRes.status === 'awaiting_model_choice', "Deve chegar na fase de escolha de modelo");

  console.log("\n--- Passo 4: Finalização ---");
  const finalResult = await dialogueEngine.process(chatId, { text: "1" }); 
  
  assert(finalResult.status === 'finished', "Deve finalizar o fluxo");
  
  const responseArray = Array.isArray(finalResult.response) ? finalResult.response : [finalResult.response];
  const relatorio = responseArray.find(m => typeof m === 'string' && m.includes("RELATÓRIO OPERACIONAL"));
  const proposta = responseArray.find(m => typeof m === 'string' && m.includes("📌 *ORÇAMENTO*"));
  
  assert(!!relatorio, "Deve conter o relatório operacional");
  assert(!!proposta, "Deve conter a proposta para o cliente");

  console.log("\n--- Passo 5: Persistência ---");
  // O orçamento no banco 'orcamentos' não tem o draft_id, então buscamos o último inserido
  const { db } = require("./src/db/sqlite");
  const budgetInDb = await new Promise((resolve) => {
      db.get("SELECT * FROM orcamentos ORDER BY id DESC LIMIT 1", (err, row) => {
          resolve(row);
      });
  });
  
  assert(budgetInDb !== undefined, `Um orçamento deve estar salvo no banco de dados`);
  if (budgetInDb) {
      assert(budgetInDb.valor_final > 0, `Valor final (${budgetInDb.valor_final}) deve ser maior que zero`);
      console.log(`[DB] Sucesso: Orçamento ID ${budgetInDb.id} salvo com valor ${budgetInDb.valor_final}`);
  }

  console.log("\n---------------------------------------");
  if (failCount === 0) {
    console.log("🏆 TESTE STORY 001 APROVADO.");
  } else {
    console.error(`🚨 TESTE STORY 001 REPROVADO: ${failCount} falhas.`);
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
