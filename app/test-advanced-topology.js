// --- NOCTUA TOPOLOGY QA ---
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

        // Mock de busca para itens de topologia
        if (params.some(p => typeof p === 'string' && p.includes('32 Canais'))) {
          return callback(null, { sku: 'NTC-REC-32', nome_comercial: 'Gravador 32 Canais', preco_custo: 3000, categoria: 'Recorder', ativo: 1 });
        }
        if (params.some(p => typeof p === 'string' && p.includes('16 Canais'))) {
            return callback(null, { sku: 'NTC-REC-16', nome_comercial: 'Gravador 16 Canais', preco_custo: 1500, categoria: 'Recorder', ativo: 1 });
        }
        if (params.some(p => typeof p === 'string' && p.includes('Switch POE 16 Portas'))) {
          return callback(null, { sku: 'NTC-SW-16', nome_comercial: 'Switch 16 Portas', preco_custo: 1100, categoria: 'Acessorio', ativo: 1 });
        }
        if (params.some(p => typeof p === 'string' && p.includes('Switch POE 8 Portas'))) {
            return callback(null, { sku: 'NTC-SW-8', nome_comercial: 'Switch 8 Portas', preco_custo: 520, categoria: 'Acessorio', ativo: 1 });
        }
        if (params.some(p => typeof p === 'string' && p.includes('Switch POE 4 Portas'))) {
          return callback(null, { sku: 'NTC-SW-4', nome_comercial: 'Switch 4 Portas', preco_custo: 280, categoria: 'Acessorio', ativo: 1 });
        }

        callback(null, { sku: 'GENERIC', nome_comercial: 'Item Genérico', preco_custo: 10, categoria: 'Outro', ativo: 1 });
      },
      all: (q, p, cb) => { const callback = typeof p === 'function' ? p : cb; callback(null, []); }
    }; } }) };
  }
  return originalRequire.apply(this, arguments);
};

const technicalScopeResolver = require('./src/agents/technical_scope_resolver');

async function testTopology() {
  console.log('🦉 NOCTUA ADVANCED TOPOLOGY QA');
  console.log('==============================\n');

  const scenarios = [
    {
      name: 'Projeto 20 Câmeras IP',
      qty: 20,
      tech: 'IP (Digital)',
      expected: { recorder: '32 Canais', switches: ['16 Portas', '4 Portas'] }
    },
    {
      name: 'Projeto 32 Câmeras Analógicas',
      qty: 32,
      tech: 'Analógico (HD)',
      expected: { recorder: '32 Canais' }
    },
    {
        name: 'Projeto 10 Câmeras IP',
        qty: 10,
        tech: 'IP (Digital)',
        expected: { recorder: '16 Canais', switches: ['8 Portas', '4 Portas'] }
    }
  ];

  for (const s of scenarios) {
    console.log(`Testing: ${s.name}`);
    const payload = await technicalScopeResolver.generateTechnicalPayload({ property_type: 'Comércio', camera_quantity: s.qty, system_type: s.tech });
    
    console.log(`- Recorder: ${payload.selected_recorder.produto}`);
    const switches = payload.resolved_items.filter(i => i.produto && i.produto.includes('Switch'));
    switches.forEach(sw => console.log(`- Switch: ${sw.produto} (Qtd: ${sw.qtd})`));
    console.log(`- Review Required: ${payload.requires_human_review}`);

    if (payload.requires_human_review && s.qty > 16) console.log('✅ Revisão técnica acionada corretamente para projeto grande.');
  }
}

testTopology().catch(console.error);
