const fornecedor = require('./src/agents/fornecedor');
const { initDb } = require("./src/db/sqlite");

async function runSupplierTests() {
  console.log("🧪 Iniciando Testes de Extração Tabular (Fase 2A)...");
  await initDb();

  const assert = (condition, message) => {
    if (condition) console.log(`✅ PASS: ${message}`);
    else {
      console.error(`❌ FAIL: ${message}`);
      process.exit(1);
    }
  };

  // CENÁRIO 1: Documento com 1 item + tabela (Caso Real Make Distribuidora)
  console.log("\n--- Teste 1: Caso Real Make Distribuidora ---");
  const rawTextMake = `
    MAKE DISTRIBUIDORA - Proposta 30283538
    Cliente: Rafael Moura Henriques
    Item | Descrição | Qtd | Valor Unit | Subtotal
    4565611 | CÂMERA DE VÍDEO WI-FI FULL HD IM5 | 4 | 391,22 | 1564,88
    Total Líquido: 1564,88
  `;
  const result1 = await fornecedor.extrairCotaçãoEstruturada(rawTextMake, "imagem");
  assert(result1.fornecedor_nome === "MAKE DISTRIBUIDORA", "Deve identificar fornecedor no cabeçalho");
  assert(result1.itens[0].quantidade === 4, "Deve extrair quantidade 4 (não defaultar para 1)");
  assert(result1.itens[0].preco_unitario === 391.22, "Deve extrair preço unitário correto");
  assert(result1.total_identificado === 1564.88, "Deve extrair total do rodapé");

  // CENÁRIO 2: Inconsistência de Valores (Bloqueio)
  console.log("\n--- Teste 2: Bloqueio por Inconsistência ---");
  const rawTextErro = `
    FORNECEDOR X
    Item A | 2un | R$ 100,00 | R$ 500,00 (Erro proposital: 2*100 != 500)
  `;
  const result2 = await fornecedor.extrairCotaçãoEstruturada(rawTextErro, "texto");
  assert(result2.status_rascunho === "bloqueado_para_revisao", "Deve bloquear rascunho inconsistente");
  assert(result2.pendencias.some(p => /matemático|inconsistência/i.test(p)), "Deve listar pendência de cálculo");

  // CENÁRIO 3: Valores Zerados (Bloqueio)
  console.log("\n--- Teste 3: Bloqueio por Preço Zerado ---");
  const rawTextZero = `
    FORNECEDOR Y
    Câmera Dome | 1un | R$ 0,00
  `;
  const result3 = await fornecedor.extrairCotaçãoEstruturada(rawTextZero, "pdf");
  assert(result3.status_rascunho === "bloqueado_para_revisao", "Deve bloquear item com preço zero");

  console.log("\n🚀 Todos os testes de extração tabular passaram!");
}

runSupplierTests().catch(console.error);
