/**
 * NOCTUA REGRESSION & STABILITY SUITE v1.0
 * Foco: Estabilidade, Regressão de Bugs Reais e Fluxo de Orçamento.
 */
const { parseLocal } = require("./src/utils/heuristic-parser");
const qualificacao = require("./src/agents/qualificacao");
const dialogueEngine = require("./src/core/DialogueEngine");
const memoria = require("./src/agents/memoria");
const orcamento = require("./src/agents/orcamento");
const { initDb } = require("./src/db/sqlite");

async function runRegression() {
  console.log("🚀 Iniciando Suíte de Regressão NOCTUA...");
  await initDb();
  let results = [];

  const test = async (name, fn) => {
    try {
      console.log(`\nTesting: ${name}...`);
      await fn();
      console.log(`✅ PASS: ${name}`);
      results.push({ name, status: 'PASS' });
    } catch (e) {
      console.error(`❌ FAIL: ${name}\n   Error: ${e.message}`);
      results.push({ name, status: 'FAIL', error: e.message });
    }
  };

  const chatId = "regress_" + Date.now();

  // 1. Menu Principal
  await test("Menu Principal - 'Oi' sem fluxo ativo", async () => {
    await memoria.limparSessao(chatId);
    const res = await dialogueEngine.process(chatId, { text: "oi" });
    if (!res.response.includes("O que você quer fazer?")) throw new Error("Menu não exibido");
    if (res.status !== 'awaiting_menu') throw new Error(`Status incorreto: ${res.status}`);
  });

  // 2. Criação imediata do ID ao iniciar novo orçamento
  await test("Novo Orçamento - Criação imediata de ID", async () => {
    const res = await dialogueEngine.process(chatId, { text: "1" }); // Escolha "1. Novo orçamento"
    const session = await memoria.buscarSessao(chatId);
    if (!session.meta.draft_id) throw new Error("ID (draft_id) não criado imediatamente");
    if (!res.response.includes(session.meta.draft_id)) throw new Error("ID não exibido na primeira pergunta");
  });

  // 3. Resposta numérica "1" consumida corretamente (Bug: "1" não consumida)
  await test("Resposta Numérica - '1' consumida para tipo de local", async () => {
    const session = await memoria.buscarSessao(chatId);
    const res = await dialogueEngine.process(chatId, { text: "1" }); // Resposta "1" para "Qual o tipo de local?"
    const updatedSession = await memoria.buscarSessao(chatId);
    if (updatedSession.property_type !== 'Casa') throw new Error(`Resposta '1' (Casa) não gravada. Gravado: ${updatedSession.property_type}`);
    if (res.response.includes("tipo de local")) throw new Error("Loop detectado: perguntou a mesma coisa");
  });

  // 4. Resposta textual equivalente (Bug: "Sim" não consumido)
  await test("Resposta Textual - 'Sim' consumido para acesso remoto", async () => {
    // Pular perguntas até chegar em acesso remoto (simulação controlada)
    let session = await memoria.buscarSessao(chatId);
    session.answered_families = ['property_type', 'camera_quantity', 'installation_environment', 'system_type', 'recording'];
    session.last_question_family = 'remote_access';
    await memoria.salvarSessao(chatId, session);

    const res = await dialogueEngine.process(chatId, { text: "Sim" });
    const updatedSession = await memoria.buscarSessao(chatId);
    if (updatedSession.remote_view !== 'Sim') throw new Error(`Resposta 'Sim' não gravada. Gravado: ${updatedSession.remote_view}`);
  });

  // 5. Manutenção do mesmo ID ao longo do fluxo
  await test("Manutenção de ID - ID permanece o mesmo até o fim", async () => {
    const session = await memoria.buscarSessao(chatId);
    const originalId = session.meta.draft_id;
    
    // Simular resposta para a próxima pergunta
    await dialogueEngine.process(chatId, { text: "Sim" }); 
    const updatedSession = await memoria.buscarSessao(chatId);
    if (updatedSession.meta.draft_id !== originalId) throw new Error(`ID mudou de ${originalId} para ${updatedSession.meta.draft_id}`);
  });

  // 6. Reset/Menu no meio do fluxo
  await test("Controle - 'Reiniciar' durante fluxo limpa contexto", async () => {
    const res = await dialogueEngine.process(chatId, { text: "reiniciar" });
    // Se houver dados, o bot pergunta se quer salvar rascunho (Smart Finalization v11)
    if (res.status === 'awaiting_save_confirm') {
       await dialogueEngine.process(chatId, { text: "2" }); // Não salvar
    }
    const session = await memoria.buscarSessao(chatId);
    if (session && session.active_flow !== null) throw new Error("Sessão não foi resetada corretamente");
  });

  // 7. Geração de Relatório e Orçamento (Modelo A e B)
  await test("Saída - Relatório e Propostas gerados corretamente", async () => {
    const fullSession = {
       ...qualificacao.DEFAULT_STATE,
       active_flow: 'client_quote',
       property_type: 'Casa',
       camera_quantity: 4,
       installation_environment: 'Externo',
       system_type: 'Analógico (HD)',
       recording_required: 'Sim',
       remote_view: 'Sim',
       material_source: 'NOCTUA fornece',
       client_name: 'Rafael Teste',
       answered_families: Object.keys(qualificacao.QUESTION_FAMILIES),
       last_question_family: 'MODEL_CHOICE',
       meta: { draft_id: 'ORC-999999' }
    };
    await memoria.salvarSessao(chatId, fullSession);

    const res = await dialogueEngine.process(chatId, { text: "3" }); // Gerar ambos
    if (!Array.isArray(res.response)) throw new Error("Resposta deveria ser um array de mensagens");
    
    const relatorio = res.response[0];
    const propostas = res.response[1];

    if (!relatorio.includes("RELATÓRIO OPERACIONAL")) throw new Error("Relatório não encontrado ou sem título");
    if (!propostas.includes("PROPOSTAS DO CLIENTE")) throw new Error("Propostas do cliente não encontradas");
    if (!propostas.includes("MODELO A") || !propostas.includes("MODELO B")) throw new Error("Modelos A e B não encontrados");
  });

  // 8. Formatação WhatsApp (Asteriscos literais)
  await test("Formatação - Cabeçalhos usam asteriscos literais", async () => {
     const session = await memoria.buscarSessao(chatId);
     const orcResult = await dialogueEngine.executeBudgetWorkflow(chatId, session);
     const clientText = orcResult.propostas.modelo_a;
     
     const headers = ["*NOCTUA*", "*ORÇAMENTO*", "*Itens/Serviços:*", "*Inclui:*", "*Condições:*", "*Observações:*", "*Contato: (21) 97421-3199*"];
     for (const h of headers) {
       if (!clientText.includes(h)) throw new Error(`Cabeçalho formatado '${h}' não encontrado na proposta`);
     }
  });

  // 9. Pedido duplicado de nome (Bug: pergunta nome mesmo já tendo)
  await test("Lógica - Não repete pergunta de nome se já preenchido", async () => {
    const session = await memoria.buscarSessao(chatId);
    session.client_name = "Rafael Já Existe";
    if (!session.answered_families.includes('client_name')) {
      session.answered_families.push('client_name');
    }
    await memoria.salvarSessao(chatId, session);
    
    const res = await qualificacao.decidirProximaAção(session, 'collecting');
    if (res.family === 'client_name') throw new Error("Repetiu pergunta de nome mesmo já preenchido");
  });

  // Relatório Final
  console.log("\n" + "=".repeat(40));
  console.log("📊 RELATÓRIO FINAL DE REGRESSÃO");
  console.log("=".repeat(40));
  results.forEach(r => console.log(`${r.status === 'PASS' ? '✅' : '❌'} [${r.status}] ${r.name}`));
  
  const allPass = results.every(r => r.status === 'PASS');
  console.log("\n" + "=".repeat(40));
  if (allPass) {
    console.log("🏆 VEREDITO: PRONTO PARA AVANÇAR (FORNECEDORES)");
  } else {
    console.error("🚨 VEREDITO: NÃO AVANÇAR. CORRIGIR FALHAS ACIMA.");
    process.exit(1);
  }
}

runRegression().catch(err => {
  console.error("Erro fatal na suíte de regressão:", err);
  process.exit(1);
});
