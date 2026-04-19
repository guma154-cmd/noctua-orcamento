const dialogue = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');
const qualificacao = require('./src/agents/qualificacao');
const { initDb } = require('./src/db/sqlite');

async function runHardeningValidation() {
    console.log("🛡️ INICIANDO VALIDAÇÃO DE HARDENING - NOCTUA 🛡️");
    await initDb();

    const results = [];
    const assert = (condition, scenario, step, message, actual = "") => {
        const res = condition ? "PASS" : "FAIL";
        results.push({ scenario, step, status: res, message });
        if (!condition) {
            console.error(`  [${res}] ${scenario} - ${step}: ${message} (Actual: ${actual})`);
        } else {
            console.log(`  [${res}] ${scenario} - ${step}: ${message}`);
        }
        return condition;
    };

    try {
        // --- TESTE 1: CONFIRMAÇÃO DE RESET ---
        console.log("\n--- Teste 1: Confirmação de Reset ---");
        const chatId1 = "HARD_1_" + Date.now();
        await dialogue.process(chatId1, { text: "oi" });
        await dialogue.process(chatId1, { text: "1" }); // Iniciar orçamento
        
        const resReset = await dialogue.process(chatId1, { text: "reset" });
        assert(resReset.status === 'awaiting_reset_confirmation', "Reset", "Interceptação", "Deve pedir confirmação", resReset.status);
        assert(resReset.response.toLowerCase().includes("certeza"), "Reset", "UI", "Deve mostrar mensagem de confirmação", resReset.response);

        const resCancel = await dialogue.process(chatId1, { text: "Não, continuar" });
        assert(resCancel.status !== 'awaiting_menu' && resCancel.status !== 'idle', "Reset", "Cancelamento", "Deve voltar ao fluxo", resCancel.status);

        // --- TESTE 2: PROTEÇÃO DE NÚMEROS ---
        console.log("\n--- Teste 2: Proteção de Números ---");
        const chatId2 = "HARD_2_" + Date.now();
        await dialogue.process(chatId2, { text: "1" }); 
        await dialogue.process(chatId2, { text: "Casa" });
        
        const resNum = await dialogue.process(chatId2, { text: "15" });
        assert(resNum.status === 'collecting', "Números", "15", "Número '15' deve ser aceito como resposta", resNum.status);
        
        const resUnit = await dialogue.process(chatId2, { text: "100m" });
        assert(resUnit.status === 'collecting', "Números", "100m", "'100m' deve ser aceito como resposta", resUnit.status);

        // --- TESTE 3: MATERIAL DO CLIENTE (TRAVA DE REVISÃO) ---
        console.log("\n--- Teste 3: Material do Cliente (Trava) ---");
        const chatId3 = "HARD_3_" + Date.now();
        let session3 = { ...qualificacao.getDefaultState(), 
            property_type: 'Casa', camera_quantity: 4, installation_environment: 'Interno',
            system_type: 'IP (Digital)', recording_required: 'Sim', remote_view: 'Sim',
            material_source: 'Cliente fornece', 
            answered_families: Object.keys(qualificacao.QUESTION_FAMILIES),
            flow_status: 'collecting_tech',
            meta: { draft_id: 'TST-MAT-CLI' }
        };
        await memoria.salvarSessao(chatId3, session3);
        
        await dialogue.process(chatId3, { text: "15" });
        await dialogue.process(chatId3, { text: "Existente" });
        await dialogue.process(chatId3, { text: "50" });
        await dialogue.process(chatId3, { text: "Não" }); 
        await dialogue.process(chatId3, { text: "Simples" }); 
        const resReview = await dialogue.process(chatId3, { text: "Padrão" });

        assert(resReview.status === 'tech_review', "Material Cliente", "Trava", "Deve forçar tech_review", resReview.status);
        assert(resReview.response.toLowerCase().includes("cliente"), "Material Cliente", "Mensagem", "Deve mostrar alerta de material do cliente", resReview.response);

    } catch (err) {
        console.error("Erro fatal na validação:", err);
    }

    const failed = results.filter(r => r.status === 'FAIL').length;
    console.log(`\n📊 RESULTADO: ${results.length - failed}/${results.length} PASS`);
    process.exit(failed > 0 ? 1 : 0);
}

runHardeningValidation();
