// --- NOCTUA HEAVY TOPOLOGY VALIDATOR ---
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function() {
  if (arguments[0] === 'sqlite3') {
    return { verbose: () => ({ Database: function() { return { 
      serialize: (fn) => fn(), 
      run: (q, p, cb) => { if (typeof p === 'function') p(null); else if (cb) cb(null); },
      get: (q, p, cb) => { 
        const callback = typeof p === 'function' ? p : cb;
        const params = p || [];
        const search = params.find(param => typeof param === 'string') || "";

        // Mock de Itens do Catálogo (Conforme Etapa 4)
        if (search.includes('32 Canais')) return callback(null, { sku: 'NTC-REC-32', nome_comercial: search, preco_custo: 3000, ativo: 1 });
        if (search.includes('16 Canais')) return callback(null, { sku: 'NTC-REC-16', nome_comercial: search, preco_custo: 1500, ativo: 1 });
        if (search.includes('8 Canais')) return callback(null, { sku: 'NTC-REC-08', nome_comercial: search, preco_custo: 800, ativo: 1 });
        if (search.includes('Switch POE 16')) return callback(null, { sku: 'NTC-SW-16', nome_comercial: 'Switch 16 Portas', preco_custo: 1100, ativo: 1 });
        if (search.includes('Switch POE 8')) return callback(null, { sku: 'NTC-SW-8', nome_comercial: 'Switch 8 Portas', preco_custo: 520, ativo: 1 });
        if (search.includes('Switch POE 4')) return callback(null, { sku: 'NTC-SW-4', nome_comercial: 'Switch 4 Portas', preco_custo: 280, ativo: 1 });
        
        // Simular falha para gravadores > 32 canais (Gatilho de Bloqueio)
        if (search.includes('64 Canais')) return callback(null, null);

        callback(null, { sku: 'GENERIC', nome_comercial: 'Item Genérico', preco_custo: 10, ativo: 1 });
      },
      all: (q, p, cb) => { const callback = typeof p === 'function' ? p : cb; callback(null, []); }
    }; } }) };
  }
  return originalRequire.apply(this, arguments);
};

const technicalScopeResolver = require('./src/agents/technical_scope_resolver');

async function heavyValidation() {
  console.log('🦉 NOCTUA HEAVY TOPOLOGY VALIDATION');
  console.log('====================================\n');

  const scenarios = [
    { id: 'HV-01', name: '20 Câmeras IP', qty: 20, tech: 'IP (Digital)' },
    { id: 'HV-02', name: '24 Câmeras IP', qty: 24, tech: 'IP (Digital)' },
    { id: 'HV-03', name: '32 Câmeras IP', qty: 32, tech: 'IP (Digital)' },
    { id: 'HV-04', name: '20 Câmeras Analógicas', qty: 20, tech: 'Analógico (HD)' },
    { id: 'HV-05', name: '32 Câmeras Analógicas', qty: 32, tech: 'Analógico (HD)' },
    { id: 'HV-06', name: 'Acima de 32 Câmeras (40 cams)', qty: 40, tech: 'IP (Digital)' },
    { id: 'HV-07', name: 'Topologia > 3 Switches (28 IP)', qty: 28, tech: 'IP (Digital)' },
    { id: 'HV-08', name: 'Longa Distância + Topologia Grande (20 IP / 100m)', qty: 20, tech: 'IP (Digital)', distances: '100, 100, 100' },
    { id: 'HV-09', name: 'Revisão Obrigatória (> 16 câmeras)', qty: 17, tech: 'Analógico (HD)' },
    { id: 'HV-10', name: 'Padrão Simples (4 IP)', qty: 4, tech: 'IP (Digital)' }
  ];

  for (const s of scenarios) {
    const session = { 
        property_type: 'Comércio', 
        camera_quantity: s.qty, 
        system_type: s.tech,
        technical_scope: s.distances ? { cable_calc_mode: 'detalhado', raw_distances: s.distances } : {}
    };
    
    const payload = await technicalScopeResolver.generateTechnicalPayload(session);
    
    let verdict = 'PASS';
    if (payload.requires_human_review) verdict = 'HUMAN_REVIEW';
    if (payload.selected_recorder.sku === 'BLOCK' || payload.selected_recorder.sku === 'FALLBACK') verdict = 'BLOCK';
    if (payload.incompatibilities.length > 0) verdict = 'RISK/REVIEW';

    console.log(`[${s.id}] ${s.name.padEnd(50)} -> ${verdict}`);
    console.log(`      Recorder: ${payload.selected_recorder.produto || 'NÃO ENCONTRADO'}`);
    const switches = payload.resolved_items.filter(i => i.produto && i.produto.includes('Switch'));
    if (switches.length > 0) {
        console.log(`      Switches: ${switches.map(sw => `${sw.qtd}x ${sw.produto}`).join(', ')}`);
    }
    if (payload.incompatibilities.length > 0) {
        console.log(`      Alertas: ${payload.incompatibilities.join(' | ')}`);
    }
    console.log('--------------------------------------------------------------------');
  }
}

heavyValidation().catch(console.error);
