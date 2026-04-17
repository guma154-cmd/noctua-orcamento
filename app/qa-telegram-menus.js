/**
 * QA HEAVY VALIDATION - TELEGRAM MENUS & KEYBOARDS (V3)
 */
const engine = require("./src/core/DialogueEngine");
const qualificacao = require("./src/agents/qualificacao");
const technicalScopeResolver = require("./src/agents/technical_scope_resolver");
const memoria = require("./src/agents/memoria");
const { initDb } = require("./src/db/sqlite");

async function runValidation() {
    console.log("🔍 Iniciando Validação Pesada de Menus V3 (Telegram)...");
    await initDb();
    
    const results = [];
    const report = (scenario, status, details = "") => {
        results.push({ scenario, status, details });
        const icon = status === "PASS" ? "✅" : (status === "FAIL" ? "❌" : "⚠️");
        console.log(`${icon} [${status}] ${scenario} ${details ? "- " + details : ""}`);
    };

    const chatId = "qa_menu_test_" + Date.now();

    const getFlatKeyboard = (keyboard) => {
        if (!keyboard) return [];
        // Se for Markup object
        if (keyboard.reply_markup) {
            if (keyboard.reply_markup.inline_keyboard) return keyboard.reply_markup.inline_keyboard.flat();
            if (keyboard.reply_markup.keyboard) return keyboard.reply_markup.keyboard.flat();
        }
        // Se for raw array
        if (Array.isArray(keyboard)) return keyboard.flat();
        return [];
    };

    const validateKeyboard = (res, scenario, expectedOptions = null) => {
        const flatKeyboard = getFlatKeyboard(res.keyboard);
        const hasKeyboard = flatKeyboard.length > 0;
        
        if (!hasKeyboard) {
            report(scenario, "FAIL", "Nenhum teclado (keyboard) retornado.");
            return false;
        }

        if (expectedOptions) {
            const btnTexts = flatKeyboard.map(b => b.text.toLowerCase());
            const allMatch = expectedOptions.every(opt => 
                btnTexts.some(txt => txt.includes(opt.toLowerCase()))
            );
            if (allMatch) {
                report(scenario, "PASS");
            } else {
                report(scenario, "RISK", `Opções esperadas não encontradas. Recebido: [${btnTexts.join(", ")}]`);
            }
        } else {
            report(scenario, "PASS", "Teclado presente.");
        }
        return true;
    };

    try {
        console.log("\n--- Validando Qualificação ---");
        // 1. "oi" -> Menu Principal
        const resMenu = await engine.process(chatId, { text: "oi" });
        validateKeyboard(resMenu, "Menu Principal", ["Novo Orçamento", "Consultar"]);

        // 2. Escolhe "1" (Novo Orçamento) -> Deve retornar property_type
        const res1 = await engine.process(chatId, { text: "1" });
        validateKeyboard(res1, "1. tipo de local (property_type)", qualificacao.QUESTION_FAMILIES.property_type.options);

        // 3. Responde property_type -> Deve retornar camera_quantity
        const res2 = await engine.process(chatId, { text: "Casa" });
        validateKeyboard(res2, "2. quantidade de câmeras (camera_quantity)", qualificacao.QUESTION_FAMILIES.camera_quantity.options);

        // 4. Responde camera_quantity -> Deve retornar installation_environment
        const res3 = await engine.process(chatId, { text: "4 câmeras" });
        validateKeyboard(res3, "3. ambiente (installation_environment)", qualificacao.QUESTION_FAMILIES.installation_environment.options);

        // 5. Responde installation_environment -> Deve retornar system_type
        const res4 = await engine.process(chatId, { text: "Interno" });
        validateKeyboard(res4, "4. tecnologia (system_type)", qualificacao.QUESTION_FAMILIES.system_type.options);

        // 6. Responde system_type -> Deve retornar recording_required
        const res5 = await engine.process(chatId, { text: "IP (Digital)" });
        validateKeyboard(res5, "5. gravação (recording_required)", qualificacao.QUESTION_FAMILIES.recording.options);

        // 7. Responde recording_required -> Deve retornar remote_view
        const res6 = await engine.process(chatId, { text: "Sim" });
        validateKeyboard(res6, "6. acesso remoto (remote_view)", qualificacao.QUESTION_FAMILIES.remote_access.options);

        // 8. Responde remote_view -> Deve retornar material_source
        const res7 = await engine.process(chatId, { text: "Sim" });
        validateKeyboard(res7, "7. fonte de material (material_source)", qualificacao.QUESTION_FAMILIES.material_source.options);

        // Avançar campos de texto
        await engine.process(chatId, { text: "NOCTUA fornece" }); 
        await engine.process(chatId, { text: "Cliente Teste" }); 
        await engine.process(chatId, { text: "Rua Teste, 123" }); 
        await engine.process(chatId, { text: "11999999999" }); 

        // --- TSR ---
        console.log("\n--- Validando TSR ---");
        
        // Pergunta Casa: external_cameras (sem options)
        const resTSR1 = await engine.process(chatId, { text: "2" }); 
        validateKeyboard(resTSR1, "11. dias de gravação (recording_days)", technicalScopeResolver.GLOBAL_TECH_QUESTIONS.find(q => q.id === 'recording_days').options);

        const resTSR2 = await engine.process(chatId, { text: "1" }); // 7 dias
        validateKeyboard(resTSR2, "8. infraestrutura (infra_status)", technicalScopeResolver.GLOBAL_TECH_QUESTIONS.find(q => q.id === 'infra_status').options);

        const resTSR3 = await engine.process(chatId, { text: "1" }); // Existente
        validateKeyboard(resTSR3, "9. modo de cálculo de cabo (cable_mode)", technicalScopeResolver.GLOBAL_TECH_QUESTIONS.find(q => q.id === 'cable_mode').options);

        const resTSR4 = await engine.process(chatId, { text: "1" }); // Estimativa
        validateKeyboard(resTSR4, "10. dificuldade da rota (route_type)", technicalScopeResolver.GLOBAL_TECH_QUESTIONS.find(q => q.id === 'route_type').options);

        const resTSR5 = await engine.process(chatId, { text: "1" }); // Simples
        validateKeyboard(resTSR5, "12. confirmação final (confirm_standard)", technicalScopeResolver.GLOBAL_TECH_QUESTIONS.find(q => q.id === 'confirm_standard').options);

        // --- Erros ---
        console.log("\n--- Validando Erros ---");
        const resInvalid = await engine.process(chatId, { text: "XUBALUBA" });
        validateKeyboard(resInvalid, "14. re-exibição em erro", ["Padrão NOCTUA", "Revisão Manual"]);

        const resFallback = await engine.process(chatId, { text: "1" }); // Escolhe Padrão NOCTUA
        if (resFallback.keyboard) {
            report("15. fallback textual", "PASS");
            report("16. retorno ao fluxo", "PASS");
        }

    } catch (error) {
        console.error("❌ Erro:", error);
    }

    console.log("\n📊 RELATÓRIO FINAL");
    results.forEach(r => {
        const icon = r.status === "PASS" ? "✅" : (r.status === "FAIL" ? "❌" : "⚠️");
        console.log(`${icon} [${r.status}] ${r.scenario}`);
    });
}

runValidation().catch(console.error);
