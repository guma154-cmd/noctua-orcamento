const memoria = require('./src/agents/memoria');
const { db } = require('./src/db/sqlite');

async function testStage4() {
    console.log("--- TESTANDO ETAPA 4: INTERVENÇÃO HUMANA ---");

    // 1. Criar um alerta artificial se não houver
    console.log("\n1. Criando alerta artificial...");
    await new Promise((resolve) => {
        db.run("INSERT INTO orcamentos (escopo, status_noctua, waiting_human, last_interaction_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)", 
        [JSON.stringify({msg: "Teste Alerta"}), 'intake_em_andamento', 1], function() {
            resolve(this.lastID);
        });
    });

    // 2. Listar alertas
    console.log("2. Listando alertas...");
    const alertas = await memoria.listarOrcamentosEmAlerta();
    console.log(`- Encontrados: ${alertas.length} alertas.`);
    
    if (alertas.length === 0) throw new Error("Falha ao listar alertas");
    
    const targetId = alertas[0].id;
    console.log(`- Primeiro ID em alerta: ${targetId}`);

    // 3. Resolver alerta
    console.log(`3. Resolvendo alerta ID ${targetId}...`);
    await memoria.resolverAlertaOrcamento(targetId);

    // 4. Verificar se sumiu
    const row = await new Promise((resolve) => {
        db.get("SELECT waiting_human FROM orcamentos WHERE id = ?", [targetId], (err, row) => resolve(row));
    });
    console.log(`- waiting_human no BD após resolver: ${row.waiting_human} (Esperado: 0)`);
    
    if (row.waiting_human !== 0) throw new Error("Falha ao resolver alerta no BD");

    console.log("\n✅ ETAPA 4 VALIDADA COM SUCESSO!");
    db.close();
}

testStage4().catch(err => {
    console.error(err);
    process.exit(1);
});
