const dialogue = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');
const { db } = require('./src/db/sqlite');
const { STATUS_NOCTUA } = require('./src/utils/constants');

async function testStage2() {
    const chatId = "TEST_USER_STAGE_2_" + Date.now();
    
    console.log("--- TESTANDO ETAPA 2: RASTREIO DE TRANSIÇÃO ---");

    // 1. Simular início de orçamento
    console.log("\n1. Forçando Menu Principal e selecionando 'Novo'...");
    await dialogue.process(chatId, { text: "oi" }); // Garante que entra no MAIN_MENU
    const step1 = await dialogue.process(chatId, { text: "1" }); // Seleciona "Novo Orçamento"
    
    // Verificar se a sessão gravou o ID
    const session = await memoria.buscarSessao(chatId);
    const dbId = session.meta.current_orcamento_db_id;
    console.log(`- ID de Orçamento gerado no Banco: ${dbId}`);
    
    if (!dbId) throw new Error("Falha ao gerar ID de orçamento no BD");

    // Verificar status no banco
    const row = await new Promise((resolve) => {
        db.get("SELECT status_noctua, waiting_human FROM orcamentos WHERE id = ?", [dbId], (err, row) => resolve(row));
    });
    console.log(`- Status no BD: ${row.status_noctua} (Esperado: ${STATUS_NOCTUA.INTAKE})`);
    
    if (row.status_noctua !== STATUS_NOCTUA.INTAKE) throw new Error("Status inicial incorreto");

    // 2. Simular bloqueio (Modo Assistido)
    console.log("\n2. Testando detecção de bloqueio (WAITING_HUMAN)...");
    // Vamos responder a mesma coisa 3 vezes para o primeiro campo (property_type)
    await dialogue.process(chatId, { text: "blablabla" });
    await dialogue.process(chatId, { text: "blablabla" });
    const resultStall = await dialogue.process(chatId, { text: "blablabla" });
    
    console.log(`- Resposta do bot: ${resultStall.response.substring(0, 50)}...`);
    
    const rowStall = await new Promise((resolve) => {
        db.get("SELECT waiting_human FROM orcamentos WHERE id = ?", [dbId], (err, row) => resolve(row));
    });
    console.log(`- waiting_human no BD: ${rowStall.waiting_human} (Esperado: 1)`);
    
    if (rowStall.waiting_human !== 1) throw new Error("Falha ao ativar WAITING_HUMAN");

    console.log("\n✅ ETAPA 2 TESTADA COM SUCESSO!");
    db.close();
}

testStage2().catch(err => {
    console.error(err);
    process.exit(1);
});
