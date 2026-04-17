// --- GLOBAL MOCK FOR SQLITE3 ---
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
  if (arguments[0] === 'sqlite3') {
    return { verbose: () => ({ Database: function() { return { 
      serialize: (fn) => fn(), 
      run: (q, p, cb) => { if (typeof p === 'function') p(null); else if (cb) cb(null); },
      get: (q, p, cb) => { 
        const callback = typeof p === 'function' ? p : cb;
        const params = typeof p === 'function' ? [] : p;
        if (q.includes('fornecedores_v2')) {
          if (params[0] && params[0].includes('Cat6')) return callback(null, { produto: 'Cabo de Rede UTP Cat6', preco_custo: 6.00 });
          if (params[0] && params[0].includes('Cat5e')) return callback(null, { produto: 'Cabo de Rede UTP Cat5e', preco_custo: 3.80 });
          if (params[0] && params[0].includes('Coaxial')) return callback(null, { produto: 'Cabo Coaxial Flexível 4mm', preco_custo: 2.90 });
        }
        callback(null, null); 
      },
      all: (q, p, cb) => { const callback = typeof p === 'function' ? p : cb; callback(null, []); }
    }; } }) };
  }
  return originalRequire.apply(this, arguments);
};

const technicalScopeResolver = require('./src/agents/technical_scope_resolver');
const orcamento = require('./src/agents/orcamento');
const { db } = require('./src/db/sqlite');

async function testExternalPrices() {
  console.log('[TEST] External Cable Prices Logic');

  // Caso 1: Cat5e
  console.log('\n--- Cenário 1: IP Cat5e (Preço Mock 3.80) ---');
  const session1 = {
    camera_quantity: 4,
    system_type: 'IP',
    technical_scope: { estimated_cable_total_m: 100, cable_type: 'Cat5e' }
  };
  const payload1 = await technicalScopeResolver.generateTechnicalPayload(session1);
  console.log('Cabo Resolvido:', payload1.resolved_items.find(i => i.categoria === 'Cabo').produto);
  console.log('Preço Custo Cabo:', payload1.resolved_items.find(i => i.categoria === 'Cabo').preco_custo);
  
  if (payload1.resolved_items.find(i => i.categoria === 'Cabo').preco_custo === 3.80) {
    console.log('✅ Preço Cat5e capturado do banco (mock).');
  } else {
    console.log('❌ Preço Cat5e incorreto.');
  }

  // Caso 2: Cat6
  console.log('\n--- Cenário 2: IP Cat6 (Preço Mock 6.00) ---');
  const session2 = {
    camera_quantity: 4,
    system_type: 'IP',
    technical_scope: { estimated_cable_total_m: 100, cable_type: 'Cat6' }
  };
  const payload2 = await technicalScopeResolver.generateTechnicalPayload(session2);
  console.log('Cabo Resolvido:', payload2.resolved_items.find(i => i.categoria === 'Cabo').produto);
  console.log('Preço Custo Cabo:', payload2.resolved_items.find(i => i.categoria === 'Cabo').preco_custo);
  
  if (payload2.resolved_items.find(i => i.categoria === 'Cabo').preco_custo === 6.00) {
    console.log('✅ Preço Cat6 capturado do banco (mock).');
  } else {
    console.log('❌ Preço Cat6 incorreto.');
  }

  // Caso 3: Fallback REAL
  console.log('\n--- Cenário 3: Fallback (Preço não cadastrado no banco) ---');
  const session3 = {
    camera_quantity: 4,
    system_type: 'Analógico',
    technical_scope: { estimated_cable_total_m: 100, cable_type: 'AlgoQueNaoExiste' }
  };
  
  const originalGet = db.get;
  db.get = (q, p, cb) => cb(null, null);

  const payload3 = await technicalScopeResolver.generateTechnicalPayload(session3);
  console.log('Cabo Resolvido:', payload3.resolved_items.find(i => i.categoria === 'Cabo').produto);
  console.log('Preço Custo Cabo (Fallback esperado 2.80):', payload3.resolved_items.find(i => i.categoria === 'Cabo').preco_custo);
  
  if (payload3.resolved_items.find(i => i.categoria === 'Cabo').preco_custo === 2.80) {
    console.log('✅ Fallback de preço analógico aplicado corretamente.');
  } else {
    console.log('❌ Fallback falhou.');
  }
  
  db.get = originalGet;
}

testExternalPrices().catch(console.error);
