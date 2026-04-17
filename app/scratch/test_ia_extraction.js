const qualificacao = require('../src/agents/qualificacao');

async function testExtraction() {
  console.log("--- TESTE DE EXTRAÇÃO IA TRANSVERSAL ---");
  
  let session = { ...qualificacao.DEFAULT_STATE };
  session.last_question_family = 'camera_quantity';
  session.meta.draft_id = "ORC-TEST";

  console.log("Estado Inicial: Pendente =", session.last_question_family);

  const inputText = "10 cameras ip";
  console.log(`Input: "${inputText}"`);

  const nextSession = await qualificacao.atualizarEstado(inputText, session);

  console.log("\nResultado:");
  console.log("- camera_quantity:", nextSession.camera_quantity);
  console.log("- system_type:", nextSession.system_type);
  console.log("- last_question_family:", nextSession.last_question_family);
  console.log("- answered_families:", nextSession.answered_families);

  if (nextSession.camera_quantity == 10 && nextSession.last_question_family === null) {
    console.log("\n✅ SUCESSO: Pendência limpa e dados extraídos.");
  } else {
    console.log("\n❌ FALHA: Pendência não foi limpa ou dados incorretos.");
  }
}

testExtraction().catch(console.error);
