const dialogue = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');
const { db } = require('./src/db/sqlite');
const { STATUS_NOCTUA } = require('./src/utils/constants');

async function runControlledTest() {
    console.log("=== TESTE CONTROLADO NOCTUA - FASE 1 (ETAPAS 1-3) ===\n");

    const chatId = "CTRL_TEST_" + Date.now();
    let report = "";

    try {
        // --- CENÁRIO 1: Novo orçamento completo ---
        console.log("Cenário 1: Iniciando orçamento completo...");
        await dialogue.process(chatId, { text: "oi" });
        const step1 = await dialogue.process(chatId, { text: "1" }); // Seleciona Novo
        
        // Simular fluxo de respostas
        await dialogue.process(chatId, { text: "O local é uma casa" });
        await dialogue.process(chatId, { text: "Será em ambiente externo" });
        await dialogue.process(chatId, { text: "A quantidade é de 4 câmeras" });
        const finalStep = await dialogue.process(chatId, { text: "Meu nome é Teste Silva" });

        const session1 = await memoria.buscarSessao(chatId);
        const orcId = session1.meta.current_orcamento_db_id;

        const row1 = await new Promise(r => db.get("SELECT status_noctua, last_interaction_at FROM orcamentos WHERE id = ?", [orcId], (e, row) => r(row)));
        
        console.log(`- ID: ${orcId} | Status: ${row1.status_noctua} | Last At: ${row1.last_interaction_at}`);
        
        // --- CENÁRIO 3: Waiting Human ---
        console.log("\nCenário 3: Testando trigger de intervenção humana...");
        const chatIdStall = "STALL_TEST_" + Date.now();
        await dialogue.process(chatIdStall, { text: "oi" });
        await dialogue.process(chatIdStall, { text: "1" });
        
        // 3 tentativas falhas
        await dialogue.process(chatIdStall, { text: "nao sei" });
        await dialogue.process(chatIdStall, { text: "nao sei" });
        const resultStall = await dialogue.process(chatIdStall, { text: "nao sei" });

        const session3 = await memoria.buscarSessao(chatIdStall);
        const orcId3 = session3.meta.current_orcamento_db_id;
        const row3 = await new Promise(r => db.get("SELECT waiting_human FROM orcamentos WHERE id = ?", [orcId3], (e, row) => r(row)));
        
        console.log(`- ID: ${orcId3} | Waiting Human: ${row3.waiting_human}`);
        console.log(`- Resposta do Bot: ${resultStall.response.substring(0, 100)}...`);

        // --- CENÁRIO 4: Branding ---
        console.log("\nCenário 4: Validando Identidade NOCTUA...");
        if (finalStep.response.includes("🦉 *NOCTUA")) {
            console.log("- Branding detectado com sucesso!");
        } else {
            console.log("- Branding NÃO detectado ou incompleto.");
        }

        console.log("\n=== FIM DO TESTE CONTROLADO ===");
    } catch (err) {
        console.error("Erro no teste:", err);
    } finally {
        db.close();
    }
}

runControlledTest();
