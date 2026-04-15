const { ELIGIBILITY_MATRIX } = require("./src/services/ai/matrix");
const orchestrator = require("./src/services/ai/orchestrator");
const dialogueEngine = require("./src/core/DialogueEngine");
const memoria = require("./src/agents/memoria");
const qualificacao = require("./src/agents/qualificacao");
const { initDb } = require("./src/db/sqlite");

async function runQASuite() {
  console.log("🔍 Iniciando Suíte de Testes QA - Squad, Fila e Semântica...");
  await initDb();
  let results = [];

  const test = async (name, fn) => {
    try {
      console.log(`\n[QA] Testando: ${name}...`);
      await fn();
      console.log(`✅ SUCESSO`);
      results.push({ name, status: 'PASS' });
    } catch (e) {
      console.error(`❌ FALHA: ${e.message}`);
      results.push({ name, status: 'FAIL', error: e.message });
    }
  };

  // 1. Validar Matrix de 5 IAs
  await test("Matriz de 5 IAs - Todas as funções preenchidas", async () => {
    const deps = ["TEXT", "image-to-text", "PDF", "AUDIO"];
    for (const dep of deps) {
      const count = ELIGIBILITY_MATRIX[dep].length;
      console.log(`   - ${dep}: ${count} provedores`);
      if (count < 5) throw new Error(`Matrix ${dep} possui apenas ${count} provedores (esperado: 5)`);
    }
  });

  // 2. Validar Intenção Semântica (Reset)
  await test("Intenção Semântica - 'reinicie' detectado como budget_reset", async () => {
    const chatId = "qa_reset_" + Date.now();
    // Simulamos a classificação
    const intent = await qualificacao.classifyIncomingMessage("reinicie a conversa por favor", {});
    if (intent !== 'budget_reset' && intent !== 'control_command') throw new Error(`Intenção detectada incorretamente: ${intent}`);
  });

  await test("Intenção Semântica - 'apaga tudo' detectado como budget_reset", async () => {
    const intent = await qualificacao.classifyIncomingMessage("apaga tudo e começa do zero", {});
    if (intent !== 'budget_reset' && intent !== 'control_command') throw new Error(`Intenção detectada incorretamente: ${intent}`);
  });

  // 3. Validar Modo Fila (IDs Sequenciais)
  await test("Modo Fila - Envio de múltiplas imagens gera IDs diferentes", async () => {
    const chatId = "qa_queue_" + Date.now();
    const session = { ...qualificacao.DEFAULT_STATE, active_flow: 'supplier_sync' };
    
    const res1 = await dialogueEngine.processSupplierInput(chatId, "Texto 1", "image/jpeg", session);
    const res2 = await dialogueEngine.processSupplierInput(chatId, "Texto 2", "image/jpeg", session);
    
    if (!res1.id || !res2.id) throw new Error("IDs não gerados no retorno do processSupplierInput");
    if (res1.id === res2.id) throw new Error(`IDs duplicados em Modo Fila: ${res1.id}`);
    console.log(`   - IDs Gerados: ${res1.id}, ${res2.id}`);
  });

  // 4. Validar Edição de Nome
  await test("Edição de Nome - Atualização do fornecedor_nome no banco", async () => {
    const draftId = await memoria.gerarProximoIdCotacao();
    await memoria.salvarCotacao({
      cotacao_id: draftId,
      fornecedor_nome: "Original",
      status: "draft",
      payload_bruto: {}, payload_estruturado: {}, confidence_json: {}
    });

    await memoria.atualizarNomeFornecedorCotacao(draftId, "Fornecedor Corrigido");
    
    // Buscar direto no DB (simulação)
    const row = await new Promise((resolve) => {
      require("./src/db/sqlite").db.get("SELECT fornecedor_nome FROM cotacoes WHERE cotacao_id = ?", [draftId], (err, r) => resolve(r));
    });

    if (row.fornecedor_nome !== "Fornecedor Corrigido") throw new Error("Nome não foi atualizado no banco");
  });

  // 5. Validar Squad Parallelism logic
  await test("Squad Visão - Geração de Tasks Paralelas", async () => {
    const { getProviderConfig } = require("./src/services/ai/matrix");
    const configs = [
      getProviderConfig("image-to-text", 1),
      getProviderConfig("image-to-text", 2),
      getProviderConfig("image-to-text", 3),
      getProviderConfig("image-to-text", 4),
      getProviderConfig("image-to-text", 5)
    ];
    if (configs.some(c => c === null)) throw new Error("Squad não conseguiu carregar 5 configurações da matriz");
  });

  console.log("\n📊 RELATÓRIO FINAL QA");
  results.forEach(r => console.log(`${r.status === 'PASS' ? '✅' : '❌'} [${r.status}] ${r.name}`));
  
  if (results.every(r => r.status === 'PASS')) {
    console.log("\n🏆 TODOS OS TESTES PASSARAM! SISTEMA ESTÁVEL.");
  } else {
    console.error("\n🚨 FALHAS DETECTADAS. NÃO LIBERAR.");
    process.exit(1);
  }
}

runQASuite().catch(e => {
  console.error("Erro fatal na suíte QA:", e);
  process.exit(1);
});
