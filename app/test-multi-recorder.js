// --- NOCTUA MULTI-RECORDER QA ---
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function() {
  if (arguments[0] === 'sqlite3') {
    return { verbose: () => ({ Database: function() { return { 
      serialize: (fn) => fn(), 
      run: (q, p, cb) => { if (typeof p === 'function') p(null); else if (cb) cb(null); },
      get: (q, p, cb) => { 
        const callback = typeof p === 'function' ? p : cb;
        const sql = q.toUpperCase();
        const params = p || [];
        const search = params.find(p => typeof p === 'string' && (p.includes('Canais') || p.includes('Switch'))) || "";

        if (sql.includes('CATALOGO_NOCTUA') || sql.includes('FORNECEDORES_V2')) {
          return callback(null, { sku: 'MOCK', nome_comercial: search, preco_custo: 100, ativo: 1, produto: search });
        }
        callback(null, null);
      },
      all: (q, p, cb) => { const callback = typeof p === 'function' ? p : cb; callback(null, []); }
    }; } }) };
  }
  return originalRequire.apply(this, arguments);
};

const technicalScopeResolver = require('./src/agents/technical_scope_resolver');

async function testMultiRecorder() {
  console.log('🦉 NOCTUA MULTI-RECORDER DIVISION QA');
  console.log('=====================================\n');

  const scenarios = [
    { id: 'SC-1', name: '32 Câmeras (Limite Single)', qty: 32 },
    { id: 'SC-2', name: '40 Câmeras (1x32 + 1x8)', qty: 40 },
    { id: 'SC-3', name: '64 Câmeras (2x32)', qty: 64 },
    { id: 'SC-4', name: '70 Câmeras (Acima do Limite)', qty: 70 }
  ];

  for (const s of scenarios) {
    console.log(`Cenário: ${s.name}`);
    const payload = await technicalScopeResolver.generateTechnicalPayload({ property_type: 'Comércio', camera_quantity: s.qty, system_type: 'IP (Digital)' });
    
    console.log(`- Gravadores: ${payload.selected_recorders.map(r => r.produto).join(', ')}`);
    const hds = payload.resolved_items.find(i => i.categoria === 'HD');
    console.log(`- Qtd HDs: ${hds ? hds.qtd : 0}`);
    console.log(`- Alertas: ${payload.incompatibilities.join(', ')}`);
    console.log(`- Revisão Humana: ${payload.requires_human_review}`);
    
    if (s.qty > 32 && payload.selected_recorders.length > 1) {
        console.log('✅ Divisão realizada com sucesso.');
    } else if (s.qty <= 32 && payload.selected_recorders.length === 1) {
        console.log('✅ Gravador único mantido corretamente.');
    }

    if (s.qty > 32 && payload.requires_human_review) {
        console.log('✅ Revisão humana acionada corretamente para multi-gravador.');
    }

    if (s.qty > 64 && payload.incompatibilities.includes('BLOCK_CAPACITY_EXCEEDED')) {
        console.log('✅ Bloqueio de capacidade excedida acima de 64 cams.');
    }
    console.log('--------------------------------------------------');
  }
}

testMultiRecorder().catch(console.error);
