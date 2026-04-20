const orcamento = require('../app/src/agents/orcamento');

const mockEscopoC = {
    budget_model: 'C',
    camera_quantity: 8,
    system_type: 'IP (Cabo de Rede)',
    source_cameras: 'NOCTUA fornece',      // NOCTUA
    source_recorder: 'Cliente fornece',   // CLIENTE
    source_cables: 'NOCTUA fornece',       // NOCTUA
    source_infra: 'Cliente fornece',      // CLIENTE
    recording_required: 'Sim',
    installation_complexity: 'Parede normal',
    cable_path_complexity: 'Sobreposta',
    property_type: 'Casa',
    client_name: 'João Misto',
    technical_payload: {
        selected_camera: { produto: 'VIP 1230 B', preco_custo: 200 },
        selected_recorder: { produto: 'NVR 4108', preco_custo: 500 },
        resolved_items: [
            { categoria: 'Camera', produto: 'VIP 1230 B', preco_custo: 200, qtd: 8 },
            { categoria: 'Recorder', produto: 'NVR 4108', preco_custo: 500, qtd: 1 },
            { categoria: 'HD', produto: 'HD 2TB', preco_custo: 400, qtd: 1 },
            { categoria: 'Cabo', produto: 'Cabo CAT5e', preco_custo: 2, qtd: 100 },
            { categoria: 'Infra', produto: 'Eletroduto 3/4', preco_custo: 5, qtd: 20 }
        ],
        incompatibilities: [],
        retention_estimate: { days: 15, message: "📼 ESTIMATIVA: 15 dias" }
    }
};

async function testReport() {
    console.log("=== TESTANDO RELATÓRIO OPERACIONAL - MODELO C ===");
    
    // Mock de materiais (como se viesse do DB)
    const materiais = []; 

    const financeiro = orcamento.renderizarProposta ? 
        // Na verdade orcamento.js exporta calcularOrcamento que faz tudo.
        // Mas vamos testar direto a emissão do relatório para ver o texto.
        {} : {};

    // Vamos usar a função completa se possível, mas os mocks acima já simulam o cálculo.
    // Usando calcularDadosFinanceiros exportado? Não está exportado, mas o objeto financeiro pode ser simulado.
    
    // Simulação do resultado do cálculo financeiro para o Modelo C
    // Câmeras (8x200=1600) + Cabos (100x2=200). 
    // Gravador, HD e Infra são do CLIENTE (custo 0 para NOCTUA).
    // Total Material: 1800.
    // Instalação: 8 câmeras x (150 base + 0 + 20) = 1360.
    // Valor Final: (1800 + (1360/1.3)) * 1.3 ? Sim.
    
    const res = await orcamento.calcularOrcamento(mockEscopoC, "ORC-V5-C-001");
    
    console.log("\n--- Relatório Operacional ---");
    const rel = orcamento.gerarRelatorioOperacional('C', res);
    console.log(rel);

    console.log("\n--- Proposta de Texto (Modelo C) ---");
    console.log(res.propostas.modelo_c);
}

testReport();
