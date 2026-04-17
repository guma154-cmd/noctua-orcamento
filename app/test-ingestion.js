const XLSX = require('xlsx');
const fs = require('fs');
const ingestor = require('./src/agents/ingestor_planilha');

// Mock para technical_scope_resolver.findItemWithFallback
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
  if (arguments[0].includes('technical_scope_resolver')) {
    return { 
      findItemWithFallback: async (cat, name, price) => {
        const n = String(name || "").toLowerCase();
        // Simula diferentes origens para testar confiança
        if (n.includes('sku-exact')) return { sku: 'NTC-SKU-001', nome_comercial: 'Item SKU', preco_custo: 100, origin: 'SKU' };
        if (n.includes('profile')) return { sku: 'NTC-PROF-001', nome_comercial: 'Item Perfil', preco_custo: 150, origin: 'PROFILE_DEFAULT' };
        if (n.includes('legacy')) return { sku: 'NTC-LEGACY-001', nome_comercial: 'Item Legado', preco_custo: 80, origin: 'LEGACY_CONTROLLED' };
        return { sku: 'FALLBACK', produto: name, preco_custo: price, origin: 'MANUAL' };
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

async function testGovernanceNormalization() {
  console.log('🦉 NOCTUA GOVERNED SPREADSHEET QA');
  console.log('===================================\n');

  const data = [
    { item: 'Item sku-exact', qtd: 1, valor: '100,00' },
    { item: 'Item profile', qtd: 2, valor: 150 },
    { item: 'Item legacy', qtd: 5, valor: 80 },
    { item: 'Item totalmente novo', qtd: 1, valor: 500 }
  ];
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const filePath = './test_governance.xlsx';
  XLSX.writeFile(wb, filePath);

  console.log('Processando planilha com mapeamento governado...');
  const result = await ingestor.processFile(filePath, 'application/xlsx');
  
  console.log(`📊 Sumário: Total=${result.summary.total}, Mapeados=${result.summary.mapped}, Parciais=${result.summary.partial}, Desconhecidos=${result.summary.unknown}`);
  
  result.items.forEach(it => {
      console.log(`> [Conf: ${it.confidence}] ${it.normalized_description} -> SKU: ${it.mapped_sku} (Origem: ${it.source_type})`);
  });

  if (result.summary.mapped === 2) console.log('\n✅ Itens de alta confiança (SKU/Perfil) identificados.');
  if (result.summary.partial === 1) console.log('✅ Itens parciais (Legado) identificados.');
  if (result.summary.unknown === 1) console.log('✅ Itens desconhecidos (Fallback) identificados.');
  if (result.summary.requires_review) console.log('✅ Flag de revisão humana acionada corretamente.');

  fs.unlinkSync(filePath);
}

testGovernanceNormalization().catch(console.error);
