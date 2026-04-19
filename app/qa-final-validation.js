const dialogue = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');
const qualificacao = require('./src/agents/qualificacao');
const technicalAuditor = require('./src/agents/technical_auditor');
const listDir = require('fs').readdirSync;
const { initDb, db } = require('./src/db/sqlite');
const { STATUS_NOCTUA } = require('./src/utils/constants');

async function runValidation() {
    console.log("🛡️ INICIANDO VALIDAÇÃO OPERACIONAL FINAL - NOCTUA PT-BR 🛡️");
    await initDb();

    // Mock Technical Auditor to avoid flakiness of external AI
    const originalAudit = technicalAuditor.audit;
    technicalAuditor.audit = async (session, payload) => {
        if (payload.max_point_distance_m > 100) {
             return { audit_state: 'MANDATORY_REVIEW', ai_observations: 'Bloqueio: Distância crítica.', flags: [{severity:'HIGH', issue:'BLOCK_DISTANCE_LIMIT'}], recommendation: 'Ajustar projeto.' };
        }
        if (payload.max_point_distance_m > 90) {
             return { audit_state: 'SUSPECT', ai_observations: 'Aviso: Ponto longo.', flags: [{severity:'MEDIUM', issue:'ALERT_LONG_DISTANCE'}], recommendation: 'Validar cabo.' };
        }
        if (payload.profile === 'Condomínio' && session.camera_quantity > 16) {
             return { audit_state: 'SUSPECT', ai_observations: 'Topologia complexa.', flags: [{severity:'MEDIUM', issue:'REVIEW_TOPOLOGY_COMPLEX'}], recommendation: 'Validar switch.' };
        }
        return { audit_state: 'APPROVED', ai_observations: 'Tudo OK.', flags: [], recommendation: 'Seguir.' };
    };

    const results = [];

    const assert = (condition, scenario, step, message) => {
        const res = condition ? "PASS" : "FAIL";
        results.push({ scenario, step, status: res, message });
        if (!condition) {
            console.error(`  ❌ [${res}] ${scenario} - ${step}: ${message}`);
        } else {
            console.log(`  ✅ [${res}] ${scenario} - ${step}: ${message}`);
        }
        return condition;
    };

    try {
        // --- CENÁRIO A: Orçamento simples residencial ---
        console.log("\n--- Cenário A: Simples Residencial (4 cams, interno) ---");
        const chatIdA = "QA_A_" + Date.now();
        await dialogue.process(chatIdA, { text: "oi" });
        await dialogue.process(chatIdA, { text: "1" }); 
        await dialogue.process(chatIdA, { text: "Casa" });
        await dialogue.process(chatIdA, { text: "4" });
        await dialogue.process(chatIdA, { text: "Interno" });
        await dialogue.process(chatIdA, { text: "IP (Digital)" });
        await dialogue.process(chatIdA, { text: "Sim" });
        await dialogue.process(chatIdA, { text: "Sim" });
        await dialogue.process(chatIdA, { text: "NOCTUA fornece" });
        await dialogue.process(chatIdA, { text: "Rafael QA" });
        await dialogue.process(chatIdA, { text: "Rua do QA, 100" });
        await dialogue.process(chatIdA, { text: "11999999999" });
        
        await dialogue.process(chatIdA, { text: "0" }); 
        await dialogue.process(chatIdA, { text: "15" }); 
        await dialogue.process(chatIdA, { text: "Existente" }); 
        await dialogue.process(chatIdA, { text: "160" }); 
        await dialogue.process(chatIdA, { text: "Não" }); 
        await dialogue.process(chatIdA, { text: "Simples" }); 
        const resA = await dialogue.process(chatIdA, { text: "Padrão" }); 

        assert(resA.status === 'awaiting_model_choice', "Cenário A", "Fluxo", "Deve chegar na escolha de modelo");
        assert(resA.response.includes("modelo"), "Cenário A", "UI", "Deve mostrar menu de modelos");

        // --- CENÁRIO B: 8 câmeras ---
        console.log("\n--- Cenário B: 8 câmeras (2 externas, cabo livre) ---");
        const chatIdB = "QA_B_" + Date.now();
        await dialogue.process(chatIdB, { text: "oi" });
        await dialogue.process(chatIdB, { text: "1" });
        await dialogue.process(chatIdB, { text: "Casa" });
        await dialogue.process(chatIdB, { text: "8" });
        await dialogue.process(chatIdB, { text: "Misto" });
        await dialogue.process(chatIdB, { text: "Analógico" });
        await dialogue.process(chatIdB, { text: "Sim" });
        await dialogue.process(chatIdB, { text: "Sim" });
        await dialogue.process(chatIdB, { text: "NOCTUA" });
        await dialogue.process(chatIdB, { text: "Cliente B" });
        await dialogue.process(chatIdB, { text: "Endereço B" });
        await dialogue.process(chatIdB, { text: "11888888888" });
        
        await dialogue.process(chatIdB, { text: "2" }); 
        await dialogue.process(chatIdB, { text: "15" }); 
        await dialogue.process(chatIdB, { text: "Nova" }); 
        await dialogue.process(chatIdB, { text: "Eletroduto" }); 
        await dialogue.process(chatIdB, { text: "100" }); 
        await dialogue.process(chatIdB, { text: "300" }); 
        await dialogue.process(chatIdB, { text: "Não" }); 
        await dialogue.process(chatIdB, { text: "Padrão" }); 
        const resB = await dialogue.process(chatIdB, { text: "Padrão" });

        assert(resB.status === 'awaiting_model_choice', "Cenário B", "Fluxo", "Deve chegar na escolha de modelo");

        // --- CENÁRIO C: Risco de Distância (>90m) ---
        console.log("\n--- Cenário C: Risco de Distância (95m) ---");
        const chatIdC = "QA_C_" + Date.now();
        await dialogue.process(chatIdC, { text: "oi" });
        await dialogue.process(chatIdC, { text: "1" });
        await dialogue.process(chatIdC, { text: "Casa" });
        await dialogue.process(chatIdC, { text: "1" });
        await dialogue.process(chatIdC, { text: "Externo" });
        await dialogue.process(chatIdC, { text: "IP" });
        await dialogue.process(chatIdC, { text: "Sim" });
        await dialogue.process(chatIdC, { text: "Sim" });
        await dialogue.process(chatIdC, { text: "NOCTUA" });
        await dialogue.process(chatIdC, { text: "C" });
        await dialogue.process(chatIdC, { text: "C" });
        await dialogue.process(chatIdC, { text: "C" });
        
        await dialogue.process(chatIdC, { text: "1" }); 
        await dialogue.process(chatIdC, { text: "15" });
        await dialogue.process(chatIdC, { text: "Existente" });
        await dialogue.process(chatIdC, { text: "100" });
        await dialogue.process(chatIdC, { text: "Sim, acima de 90 m" }); 
        await dialogue.process(chatIdC, { text: "1" }); 
        await dialogue.process(chatIdC, { text: "Informar uma por uma" }); 
        await dialogue.process(chatIdC, { text: "95" }); 
        await dialogue.process(chatIdC, { text: "Simples" }); 
        const resC = await dialogue.process(chatIdC, { text: "Padrão" });

        assert(resC.status === 'tech_review', "Cenário C", "Audit", "Deve acionar revisão por risco de distância (95m)");
        assert(resC.response.includes("REVISÃO NECESSÁRIA"), "Cenário C", "Mensagem", "Deve mostrar menu de revisão");

        // --- CENÁRIO D: Bloqueio Distância (>100m) ---
        console.log("\n--- Cenário D: Bloqueio Distância (105m) ---");
        const chatIdD = "QA_D_" + Date.now();
        let sessionD = { ...qualificacao.getDefaultState(), 
            property_type: 'Casa', camera_quantity: 4, installation_environment: 'Interno',
            system_type: 'IP (Digital)', recording_required: 'Sim', remote_view: 'Sim',
            material_source: 'NOCTUA fornece', client_name: 'D', client_address: 'D', client_phone: 'D',
            answered_families: Object.keys(qualificacao.QUESTION_FAMILIES),
            flow_status: 'collecting_tech'
        };
        await memoria.salvarSessao(chatIdD, sessionD);
        
        await dialogue.process(chatIdD, { text: "0" }); 
        await dialogue.process(chatIdD, { text: "15" }); 
        await dialogue.process(chatIdD, { text: "Existente" }); 
        await dialogue.process(chatIdD, { text: "100" });
        await dialogue.process(chatIdD, { text: "Sim, acima de 100 m" }); 
        await dialogue.process(chatIdD, { text: "1" }); 
        await dialogue.process(chatIdD, { text: "1" }); 
        await dialogue.process(chatIdD, { text: "105" }); 
        await dialogue.process(chatIdD, { text: "1" }); 
        const resD = await dialogue.process(chatIdD, { text: "1" });

        assert(resD.status === 'tech_review', "Cenário D", "Audit", "Deve acionar revisão por bloqueio de distância (>100m)");

        // --- CENÁRIO E: Material do Cliente ---
        console.log("\n--- Cenário E: Material do Cliente ---");
        const chatIdE = "QA_E_" + Date.now();
        let sessionE = { ...qualificacao.getDefaultState(), 
            property_type: 'Apartamento', camera_quantity: 4, installation_environment: 'Interno',
            system_type: 'Analógico (HD)', recording_required: 'Sim', remote_view: 'Sim',
            material_source: 'Cliente fornece', client_name: 'E', client_address: 'E', client_phone: 'E',
            answered_families: Object.keys(qualificacao.QUESTION_FAMILIES),
            flow_status: 'collecting_tech'
        };
        await memoria.salvarSessao(chatIdE, sessionE);
        
        await dialogue.process(chatIdE, { text: "15" });
        await dialogue.process(chatIdE, { text: "Existente" });
        await dialogue.process(chatIdE, { text: "50" });
        await dialogue.process(chatIdE, { text: "Não" }); 
        await dialogue.process(chatIdE, { text: "Simples" }); 
        const resE = await dialogue.process(chatIdE, { text: "Padrão" });

        assert(resE.status === 'tech_review', "Cenário E", "Audit", "Deve acionar revisão por material do cliente");

        // --- CENÁRIO F: Planilha ---
        console.log("\n--- Cenário F: Importação Planilha ---");
        const chatIdF = "QA_F_" + Date.now();
        const mockItems = [
            { normalized_description: 'Câmera Bullet 2MP', quantity: 4, unit_price: 100, mapped_sku: 'CAM-001', confidence: 1.0, source_type: 'CATALOGO' },
            { normalized_description: 'Item Desconhecido X', quantity: 1, unit_price: 50, mapped_sku: 'FALLBACK', confidence: 0.3, source_type: 'PLANILHA' }
        ];
        let sessionF = { ...qualificacao.getDefaultState(),
            flow_status: 'awaiting_import_review',
            meta: { 
                draft_id: 'IMPORT-TST',
                raw_import_items: mockItems.map(i => ({ 
                    produto: i.normalized_description, qtd: i.quantity, preco_custo: i.unit_price, 
                    sku: i.mapped_sku, confidence: i.confidence, origin: i.source_type 
                }))
            },
            technical_payload: { requires_human_review: true, incompatibilities: ['ALERT_LEGACY_SOURCE_USED'] }
        };
        await memoria.salvarSessao(chatIdF, sessionF);
        const resF = await dialogue.process(chatIdF, { text: "2" }); 
        assert(resF.status === 'awaiting_model_choice', "Cenário F", "Import", "Deve seguir para modelos");

        // --- CENÁRIO G: Topologia >16 ---
        console.log("\n--- Cenário G: Topologia >16 câmeras ---");
        const chatIdG = "QA_G_" + Date.now();
        let sessionG = { ...qualificacao.getDefaultState(), 
            property_type: 'Condomínio', camera_quantity: 20, installation_environment: 'Misto',
            system_type: 'IP (Digital)', recording_required: 'Sim', remote_view: 'Sim',
            material_source: 'NOCTUA fornece', client_name: 'G', client_address: 'G', client_phone: 'G',
            answered_families: Object.keys(qualificacao.QUESTION_FAMILIES),
            flow_status: 'collecting_tech'
        };
        await memoria.salvarSessao(chatIdG, sessionG);
        
        await dialogue.process(chatIdG, { text: "15" });
        await dialogue.process(chatIdG, { text: "Nova" }); 
        await dialogue.process(chatIdG, { text: "Eletroduto" }); 
        await dialogue.process(chatIdG, { text: "200" });
        await dialogue.process(chatIdG, { text: "1000" });
        await dialogue.process(chatIdG, { text: "Não" }); 
        await dialogue.process(chatIdG, { text: "Difícil" }); 
        const resG = await dialogue.process(chatIdG, { text: "Padrão" });

        assert(resG.status === 'tech_review', "Cenário G", "Audit", "Deve acionar revisão por complexidade");

    } catch (err) {
        console.error("Erro no QA:", err);
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 RESUMO DOS TESTES");
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    console.log(`TOTAL: ${results.length} | PASS: ${passed} | FAIL: ${failed}`);
    
    if (failed === 0) {
        console.log("\n🏆 VEREDITO: SISTEMA PRONTO PARA OPERAÇÃO CONTROLADA!");
    } else {
        console.error("\n🚨 VEREDITO: SISTEMA POSSUI FALHAS. NÃO ESTÁ PRONTO.");
    }
    process.exit(failed > 0 ? 1 : 0);
}

runValidation();
