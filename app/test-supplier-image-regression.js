const fornecedor = require('./src/agents/fornecedor');
const { initDb } = require("./src/db/sqlite");

async function runRegression() {
  console.log("🧪 Iniciando Regressão de Extração de Imagem (Make Distribuidora)...");
  await initDb();

  const assert = (condition, message) => {
    if (condition) console.log(`✅ PASS: ${message}`);
    else {
      console.error(`❌ FAIL: ${message}`);
      process.exit(1);
    }
  };

  // Simular o texto que o OCR Integral (ajustado no Intake) retornaria para a imagem da Make
  const ocrBrutoMake = `
    LOGO: MAKE DISTRIBUIDORA
    Rio de Janeiro, 09 de Abril de 2026
    Orçamento nº.: 30283538
    Cliente: 230165 - RAFAEL MOURA HENRIQUES
    
    Tabela de Produtos:
    Item | Descrição | Un. | Valor | Qtd. | Subtotal
    4565611 | CÂMERA DE VÍDEO WI-FI FULL HD IM5 SC C/ MICROSD 32GB | PC | 391,22 | 4,00 | 1.564,88
    
    Rodapé:
    Total dos Serviços: R$ 0,00
    VALOR LÍQUIDO: R$ 1.564,88
  `;

  console.log("\n--- Rodando Extração Especializada ---");
  const result = await fornecedor.extrairCotaçãoEstruturada(ocrBrutoMake, "imagem");

  if (!result) {
    console.error("Erro: A IA não retornou nenhum dado.");
    process.exit(1);
  }

  assert(result.fornecedor_nome === "MAKE DISTRIBUIDORA", "Deve identificar o fornecedor corretamente");
  assert(result.itens.length > 0, "Deve encontrar ao menos um item");
  
  const item = result.itens[0];
  assert(item.quantidade === 4, `Quantidade deve ser 4 (Lido: ${item.quantidade})`);
  assert(item.preco_unitario === 391.22, `Preço unitário deve ser 391.22 (Lido: ${item.preco_unitario})`);
  assert(result.total_identificado === 1564.88, `Total identificado deve ser 1564.88 (Lido: ${result.total_identificado})`);
  assert(result.status_rascunho === "draft_persisted", "Rascunho deve estar liberado para confirmação (não bloqueado)");

  console.log("\n🚀 Regressão concluída com sucesso!");
}

runRegression().catch(console.error);
