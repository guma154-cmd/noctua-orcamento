const orcamento = require('./src/agents/orcamento');

async function testBranding() {
    console.log("--- TESTANDO ETAPA 3: BRANDING NOCTUA ---");

    const escopoSimulado = {
        nome_cliente: "Rafael Bot",
        perfil: "Apartamento Térreo",
        quantidade: 3,
        installation_environment: "Misto"
    };

    const orcamentoId = "ORC-TEST-BRAND";
    
    const resultado = await orcamento.calcularOrcamento(escopoSimulado, orcamentoId);

    console.log("\n--- MODELO A (MDO ONLY) ---");
    console.log(resultado.propostas.modelo_a);
    
    console.log("\n--- MODELO B (FULL) ---");
    console.log(resultado.propostas.modelo_b);

    console.log("\n--- RELATÓRIO OPERACIONAL ---");
    const relatorio = orcamento.gerarRelatorioOperacional('B', resultado);
    console.log(relatorio);

    console.log("\n✅ ETAPA 3 VALIDADA VISUALMENTE!");
}

testBranding().catch(console.error);
