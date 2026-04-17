// --- GLOBAL QA MOCK FOR SQLITE3 ---
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
  if (arguments[0] === 'sqlite3') {
    return { verbose: () => ({ Database: function() { return { 
      serialize: (fn) => fn(), 
      run: (q, p, cb) => { if (typeof p === 'function') p(null); else if (cb) cb(null); },
      get: (q, p, cb) => { 
        const callback = typeof p === 'function' ? p : cb;
        const text = p ? p[0] : "";

        // Cenário 1: SKU Exato no catálogo de governança
        if (q.includes('catalogo_noctua') && text === 'NTC-CAM-001') {
          return callback(null, { sku: 'NTC-CAM-001', produto: 'Câmera Bullet 2MP IR 20m', preco_custo: 120.00 });
        }
        
        // Cenário 2: Item Padrão por Categoria/Tecnologia (Recorder/Analog)
        if (q.includes('catalogo_noctua') && q.includes('item_padrao = 1') && p[2] === 'Recorder' && p[3] === 'analog') {
          return callback(null, { sku: 'NTC-REC-001', produto: 'DVR 4 Canais Multi-HD', preco_custo: 350.00 });
        }

        // Simular falha no catálogo novo para forçar fallback para V2 (Cenário 3)
        if (q.includes('catalogo_noctua')) return callback(null, null);
        
        // Cenário 3: Fallback para V2 (legada) via LIKE
        if (q.includes('fornecedores_v2') && text.includes('Item Legado')) {
          return callback(null, { produto: 'Item Legado', preco_custo: 100.00 });
        }
        
        callback(null, null);
      },
      all: (q, p, cb) => { const callback = typeof p === 'function' ? p : cb; callback(null, []); }
    }; } }) };
  }
  return originalRequire.apply(this, arguments);
};

const { findItemWithFallback } = require('./src/agents/technical_scope_resolver');

async function testGovernance() {
  console.log('🦉 NOCTUA GOVERNANCE QA');
  console.log('======================');

  // Teste 1: Busca por SKU exato
  console.log('\nTeste 1: Busca por SKU exato (NTC-CAM-001)');
  const res1 = await findItemWithFallback('Camera', 'NTC-CAM-001', 0);
  if (res1.sku === 'NTC-CAM-001') console.log('✅ Sucesso: Encontrou via SKU');
  else console.log('❌ Falha: Não encontrou via SKU');

  // Teste 2: Busca por Item Padrão
  console.log('\nTeste 2: Busca por Item Padrão (Recorder/Analog)');
  const res2 = await findItemWithFallback('Recorder', 'QUALQUER NOME', 0, { tech: 'analog' });
  if (res2.sku === 'NTC-REC-001') console.log('✅ Sucesso: Selecionou item padrão automaticamente');
  else console.log('❌ Falha: Não selecionou item padrão');

  // Teste 3: Fallback para V2 (Legada)
  console.log('\nTeste 3: Fallback para Catálogo Legado (V2)');
  const res3 = await findItemWithFallback('Acessorio', 'Item Legado', 0);
  if (res3.sku === 'LEGACY') console.log('✅ Sucesso: Fallback para catálogo legado funcionando');
  else console.log('❌ Falha: Fallback para legado falhou');

  // Teste 4: Fallback Final (Default Price)
  console.log('\nTeste 4: Fallback Final (Preço Manual)');
  const res4 = await findItemWithFallback('Desconhecido', 'Item Fantasma', 99.99);
  if (res4.sku === 'FALLBACK' && res4.preco_custo === 99.99) console.log('✅ Sucesso: Fallback final para preço manual funcionando');
  else console.log('❌ Falha: Fallback final falhou');
}

testGovernance().catch(console.error);
