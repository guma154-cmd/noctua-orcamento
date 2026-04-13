const DialogueEngine = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');
const fornecedor = require('./src/agents/fornecedor');
const { initDb } = require("./src/db/sqlite");

async function testEngineLogic() {
  console.log("🧪 Iniciando Teste de Lógica do Engine (Mockando IA)...");
  await initDb();

  const chatId = 'test_user_123';
  await memoria.limparSessao(chatId);

  // 1. Simular início de fluxo de fornecedor
  console.log("\n1. Iniciando fluxo de fornecedor...");
  let res = await DialogueEngine.handleMainMenuSelection(chatId, '3', {});
  console.log("Resposta:", res.response);

  let session = await memoria.buscarSessao(chatId);
  const draftId = session.meta.draft_id;

  // 2. Simular escolha de tipo (texto)
  console.log("\n2. Escolhendo tipo texto...");
  res = await DialogueEngine.handleSupplierInitSelection(chatId, '1', session);
  console.log("Resposta:", res.response);

  // 3. Mockar extração BEM SUCEDIDA
  console.log("\n3. Simulando extração BEM SUCEDIDA...");
  const mockExtraidoSucesso = {
    fornecedor_nome: "MAKE DISTRIBUIDORA",
    total_identificado: 100.0,
    itens: [{ descricao_bruta: "Item 1", quantidade: 1, preco_unitario: 100.0, preco_total: 100.0, confianca_item: 1.0 }],
    status_rascunho: "draft_persisted",
    bloqueado_para_salvamento: false,
    confianca_global: 1.0
  };

  // Temporariamente mockar o fornecedor.extrairCotaçãoEstruturada
  const originalExtrair = fornecedor.extrairCotaçãoEstruturada;
  fornecedor.extrairCotaçãoEstruturada = async () => mockExtraidoSucesso;

  session = await memoria.buscarSessao(chatId);
  res = await DialogueEngine.processSupplierInput(chatId, "texto qualquer", "texto", session);
  console.log("Menu Rascunho (Sucesso):\n", res.response);

  // Verificar se NÃO está bloqueado no handleSupplierReview
  session = await memoria.buscarSessao(chatId);
  res = await DialogueEngine.handleSupplierReview(chatId, '1', session);
  console.log("Resultado Confirmar (Deve ser sucesso):", res.response);
  if (res.response.includes("sucesso")) console.log("✅ Lógica de Sucesso OK");
  else { console.error("❌ Falha na lógica de sucesso"); process.exit(1); }

  // 4. Mockar extração BLOQUEADA
  console.log("\n4. Simulando extração BLOQUEADA...");
  const mockExtraidoBloqueado = {
    fornecedor_nome: "FORNECEDOR ERRO",
    total_identificado: 100.0,
    itens: [{ descricao_bruta: "Item Erro", quantidade: 1, preco_unitario: 50.0, preco_total: 100.0, confianca_item: 0.2 }], // Matemática errada
    status_rascunho: "blocked_nonrecoverable",
    bloqueado_para_salvamento: true,
    confianca_global: 0.3
  };

  fornecedor.extrairCotaçãoEstruturada = async () => mockExtraidoBloqueado;
  
  await memoria.limparSessao(chatId);
  session = { meta: { draft_id: 'COT-ERR001' }, active_flow: 'supplier_sync' };
  res = await DialogueEngine.processSupplierInput(chatId, "texto erro", "texto", session);
  console.log("Menu Rascunho (Bloqueado):\n", res.response);

  session = await memoria.buscarSessao(chatId);
  res = await DialogueEngine.handleSupplierReview(chatId, '1', session);
  console.log("Resultado Confirmar (Deve ser bloqueado):", res.response);
  if (res.response.includes("bloqueado")) console.log("✅ Lógica de Bloqueio OK");
  else { console.error("❌ Falha na lógica de bloqueio"); process.exit(1); }

  // Restaurar original
  fornecedor.extrairCotaçãoEstruturada = originalExtrair;
  console.log("\n🚀 Todos os testes de lógica do Engine passaram!");
}

testEngineLogic().catch(console.error);
