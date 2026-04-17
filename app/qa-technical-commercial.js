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
        const params = typeof p === 'function' ? [] : p;
        const sql = q.toLowerCase();

        // Mock para nova tabela catalogo_noctua
        if (sql.includes('catalogo_noctua') || sql.includes('fornecedores_v2')) {
          const search = params.find(p => typeof p === 'string') || "";
          
          if (search.includes('Cat5e') || sql.includes('cabo')) return callback(null, { sku: 'NTC-CAB-01', nome_comercial: 'Cabo UTP Cat5e', produto: 'Cabo UTP Cat5e', preco_custo: 3.50, categoria: 'Cabo', ativo: 1 });
          if (search.includes('32 Canais')) return callback(null, { sku: 'NTC-REC-32', nome_comercial: 'Gravador 32 Canais', produto: 'Gravador 32 Canais', preco_custo: 2400.00, categoria: 'Recorder', ativo: 1 });
          if (search.includes('16 Canais')) return callback(null, { sku: 'NTC-REC-16', nome_comercial: 'Gravador 16 Canais', produto: 'Gravador 16 Canais', preco_custo: 1200.00, categoria: 'Recorder', ativo: 1 });
          if (search.includes('8 Canais')) return callback(null, { sku: 'NTC-REC-08', nome_comercial: 'Gravador 8 Canais', produto: 'Gravador 8 Canais', preco_custo: 550.00, categoria: 'Recorder', ativo: 1 });
          if (search.includes('4 Canais')) return callback(null, { sku: 'NTC-REC-04', nome_comercial: 'Gravador 4 Canais', produto: 'Gravador 4 Canais', preco_custo: 350.00, categoria: 'Recorder', ativo: 1 });
          if (search.includes('Switch POE 16')) return callback(null, { sku: 'NTC-SW-16', nome_comercial: 'Switch 16 Portas', produto: 'Switch 16 Portas', preco_custo: 1100.00, categoria: 'Acessorio', ativo: 1 });
          if (search.includes('Switch POE 8')) return callback(null, { sku: 'NTC-SW-08', nome_comercial: 'Switch 8 Portas', produto: 'Switch 8 Portas', preco_custo: 520.00, categoria: 'Acessorio', ativo: 1 });
          if (search.includes('Switch POE 4')) return callback(null, { sku: 'NTC-SW-04', nome_comercial: 'Switch 4 Portas', produto: 'Switch 4 Portas', preco_custo: 280.00, categoria: 'Acessorio', ativo: 1 });
          if (search.includes('HD')) return callback(null, { sku: 'NTC-HD-01', nome_comercial: 'HD 1TB', produto: 'HD 1TB', preco_custo: 300.00, categoria: 'HD', ativo: 1 });
          if (search.includes('Bullet')) return callback(null, { sku: 'NTC-CAM-01', nome_comercial: 'Câmera Bullet', produto: 'Câmera Bullet', preco_custo: 120.00, categoria: 'Camera', ativo: 1 });
          if (search.includes('Dome')) return callback(null, { sku: 'NTC-CAM-02', nome_comercial: 'Câmera Dome', produto: 'Câmera Dome', preco_custo: 115.00, categoria: 'Camera', ativo: 1 });
        }
        
        // Mock para verificação de fallback proibido
        if (sql.includes('forbidden')) return callback(null, { forbidden: 0 });

        callback(null, null);
      },
      all: (q, p, cb) => { const callback = typeof p === 'function' ? p : cb; callback(null, []); }
    }; } }) };
  }
  return originalRequire.apply(this, arguments);
};

const technicalScopeResolver = require('./src/agents/technical_scope_resolver');
const orcamento = require('./src/agents/orcamento');

async function runQA() {
  console.log('🦉 NOCTUA HEAVY QA - BLOCO TÉCNICO-COMERCIAL (REFINED)');
  console.log('====================================================');

  const scenarios = [
    {
      id: 1,
      name: '2 Câmeras IP',
      session: { camera_quantity: 2, system_type: 'IP (Digital)', property_type: 'Casa' },
      tech_scope: { cable_calc_mode: 'detalhado', raw_distances: '10, 15', route_type_label: 'Padrão' },
      check: (res, payload) => payload.system_type === 'ip' && payload.selected_recorders[0].produto.includes('4 Canais')
    },
    {
      id: 2,
      name: '4 Câmeras Analógicas',
      session: { camera_quantity: 4, system_type: 'Analógico (HD)', property_type: 'Casa' },
      tech_scope: { cable_calc_mode: 'estimado', raw_distances: '20', route_type_label: 'Padrão' },
      check: (res, payload) => payload.system_type === 'analog' && payload.resolved_items.some(i => i.produto.includes('Câmera Bullet'))
    },
    {
      id: 3,
      name: '24 Câmeras IP (Divisão Multi-Switch)',
      session: { camera_quantity: 24, system_type: 'IP (Digital)', property_type: 'Comércio' },
      tech_scope: { cable_calc_mode: 'estimado', raw_distances: '25', route_type_label: 'Padrão' },
      check: (res, payload) => payload.resolved_items.some(i => i.produto.includes('Switch 16 Portas')) && payload.backbone_meterage > 0
    },
    {
      id: 4,
      name: '10 Câmeras IP (Metragem Estimada + Route Factor)',
      session: { camera_quantity: 10, system_type: 'IP (Digital)', property_type: 'Condomínio' },
      tech_scope: { cable_calc_mode: 'estimado', raw_distances: '30', route_type_label: 'Difícil' },
      check: (res, payload) => payload.estimated_cable_total_m >= 490 
    },
    {
      id: 5,
      name: '40 Câmeras IP (Divisão Multi-Gravador)',
      session: { camera_quantity: 40, system_type: 'IP (Digital)', property_type: 'Condomínio' },
      tech_scope: { cable_calc_mode: 'estimado', raw_distances: '20', route_type_label: 'Padrão' },
      check: (res, payload) => payload.selected_recorders.length === 2 && payload.incompatibilities.includes('ALERT_MULTI_RECORDER')
    }
  ];

  for (const s of scenarios) {
    process.stdout.write(`Scenario ${s.id}: ${s.name.padEnd(45)} ... `);
    try {
      const payload = await technicalScopeResolver.generateTechnicalPayload({ ...s.session, technical_scope: s.tech_scope });
      const result = await orcamento.calcularOrcamento({ ...s.session, technical_payload: payload }, 'QA-ID');
      
      if (s.check(result, payload)) {
        console.log('✅ PASS');
      } else {
        console.log('❌ FAIL');
      }
    } catch (err) {
      console.log('💥 ERROR:', err.message);
    }
  }

  console.log('\nValidation Complete.');
}

runQA().catch(console.error);
