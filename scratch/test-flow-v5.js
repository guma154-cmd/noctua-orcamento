const qualificacao = require('../app/src/agents/qualificacao');

async function testFlow(model) {
    console.log(`\n=== TESTANDO FLUXO: MODELO ${model} ===`);
    let session = qualificacao.getDefaultState();
    session.meta.draft_id = "ORC-TEST-" + model;

    // 1. Iniciar fluxo
    let decision = await qualificacao.decidirProximaAção(session, 'client_budget_start');
    console.log(`Próxima Pergunta: ${decision.family} - ${decision.text}`);

    // 2. Responder Modelo
    session = await qualificacao.atualizarEstado(model, session);
    console.log(`Respondido: budget_model = ${session.budget_model}, material_source = ${session.material_source}`);

    // 3. Loop de perguntas
    let loopCount = 0;
    while (loopCount < 30) {
        decision = await qualificacao.decidirProximaAção(session, 'answer_pending');
        if (decision.action === 'resolve_technical_scope') {
            console.log("✅ FLUXO FINALIZADO COM SUCESSO!");
            console.log("Estado Final:", JSON.stringify(session, null, 2));
            break;
        }

        const family = decision.family;
        let mockResponse = "";
        
        // Mock de respostas para avançar
        if (family === 'property_type') mockResponse = "Casa";
        if (family === 'system_type') mockResponse = "IP (Cabo de Rede)";
        if (family === 'poe_mode') mockResponse = "NVR com PoE integrado (Direto no gravador)";
        if (family === 'camera_quantity') mockResponse = "8 câmeras";
        if (family === 'installation_environment') mockResponse = "Misto";
        if (family === 'recording') mockResponse = "Sim";
        if (family === 'recording_days') mockResponse = "30 dias";
        if (family === 'remote_access') mockResponse = "Sim";
        if (family === 'installation_type') mockResponse = "Parede normal";
        if (family === 'cable_path_type') mockResponse = "Sobreposta";
        if (family === 'category_allocation_cameras') mockResponse = "NOCTUA fornece";
        if (family === 'category_allocation_recorder') mockResponse = "Cliente fornece";
        if (family === 'category_allocation_cables') mockResponse = "NOCTUA fornece";
        if (family === 'category_allocation_infra') mockResponse = "Cliente fornece";
        if (family === 'client_name') mockResponse = "João Teste";
        if (family === 'client_address') mockResponse = "Rua Teste, 123";
        if (family === 'client_phone') mockResponse = "11999999999";

        console.log(`Pergunta: ${family} -> Resposta: ${mockResponse}`);
        session = await qualificacao.atualizarEstado(mockResponse, session);
        loopCount++;
    }
}

async function run() {
    await testFlow('A');
    await testFlow('C');
}

run();
