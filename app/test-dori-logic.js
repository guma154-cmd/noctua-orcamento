const { generateTechnicalPayload } = require("./src/agents/technical_scope_resolver");
const { DORI_LEVELS } = require("./src/catalog/dori-constants");

async function testDori() {
    console.log("🧪 TESTE DE LÓGICA DORI - NOCTUA");

    const mockSession = {
        property_type: 'Comércio',
        camera_quantity: 4,
        system_type: 'IP (Cabo de Rede)',
        budget_model: 'A',
        technical_scope: {
            dori_level: DORI_LEVELS.IDENTIFICATION,
            max_point_distance_m: 7 // 7 metros para identificação requer 8MP
        }
    };

    console.log(`\nInput: Objetivo = IDENTIFICAÇÃO, Distância = 7m`);
    const payload = await generateTechnicalPayload(mockSession);
    
    const camera = payload.resolved_items.find(i => i.categoria === 'Camera');
    console.log(`Câmera Selecionada: ${camera.produto} (SKU: ${camera.sku})`);
    
    if (camera.produto.includes('8MP')) {
        console.log("✅ SUCESSO: O sistema fez o upgrade para 8MP corretamente.");
    } else {
        console.log("❌ FALHA: O sistema não selecionou a resolução correta.");
    }

    // Teste 2: Detecção a 30m
    const mockSession2 = {
        ...mockSession,
        technical_scope: {
            dori_level: DORI_LEVELS.DETECTION,
            max_point_distance_m: 30 
        }
    };

    console.log(`\nInput: Objetivo = DETECÇÃO, Distância = 30m`);
    const payload2 = await generateTechnicalPayload(mockSession2);
    const camera2 = payload2.resolved_items.find(i => i.categoria === 'Camera');
    console.log(`Câmera Selecionada: ${camera2.produto} (SKU: ${camera2.sku})`);

    if (camera2.produto.includes('2MP')) {
        console.log("✅ SUCESSO: O sistema manteve 2MP para detecção estável.");
    } else {
        console.log("❌ FALHA: Mudança desnecessária de resolução.");
    }

    process.exit(0);
}

testDori().catch(console.error);
