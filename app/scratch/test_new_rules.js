const { calcularOrcamento, gerarRelatorioOperacional } = require('../src/agents/orcamento');

async function testBudgetRules() {
  console.log("🧪 Testando Regras de Negócio (RF07 e RF06)...");
  
  const escopo = {
    perfil: "Residencial",
    quantidade: 1, // 1 câmera apenas para forçar o Ticket Mínimo
    installation_environment: "Externo",
    client_name: "Teste Rafael"
  };

  const res = await calcularOrcamento(escopo, "TEST-RULES-01");
  
  console.log("\n--- RESULTADOS ---");
  console.log("Custo Instalação (Piso 350?):", res.financeiro.custoInstalacao);
  console.log("Ticket Mínimo Aplicado?:", res.financeiro.isTicketMinimo);
  console.log("Valor Modelo A (MO * 1.3):", res.financeiro.valorModeloA);
  
  const relatorio = gerarRelatorioOperacional('A', res);
  console.log("\n--- RELATÓRIO OPERACIONAL ---");
  console.log(relatorio);
}

testBudgetRules();
