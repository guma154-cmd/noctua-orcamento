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
        callback(null, null); // Força fallbacks
      },
      all: (q, p, cb) => { const callback = typeof p === 'function' ? p : cb; callback(null, []); }
    }; } }) };
  }
  return originalRequire.apply(this, arguments);
};

const technicalScopeResolver = require('./src/agents/technical_scope_resolver');
const orcamento = require('./src/agents/orcamento');

async function testStorage() {
  console.log('🦉 NOCTUA STORAGE CALCULATOR QA');
  console.log('==============================');

  const scenarios = [
    {
      id: 1,
      name: '4 Câmeras Analógicas - 15 Dias (Padrão)',
      session: { camera_quantity: 4, system_type: 'Analógico (HD)' },
      tech_scope: { recording_days: 15 },
      expected_hd: 'HD 1TB'
    },
    {
      id: 2,
      name: '8 Câmeras IP - 15 Dias',
      session: { camera_quantity: 8, system_type: 'IP (Digital)' },
      tech_scope: { recording_days: 15 },
      expected_hd: 'HD 4TB' // 8 * 15 * 25 = 3000GB -> 4TB
    },
    {
      id: 3,
      name: '16 Câmeras Analógicas - 30 Dias (Longa Retenção)',
      session: { camera_quantity: 16, system_type: 'Analógico (HD)' },
      tech_scope: { recording_days: 30 },
      expected_hd: 'HD 8TB' // 16 * 30 * 15 = 7200GB -> 8TB
    },
    {
      id: 4,
      name: 'Cenário Crítico - Revisão Humana',
      session: { camera_quantity: 32, system_type: 'IP (Digital)' },
      tech_scope: { recording_days: 15 },
      expect_review: true // 32 * 15 * 25 = 12000GB > 8TB
    }
  ];

  for (const s of scenarios) {
    console.log(`\nScenario ${s.id}: ${s.name}`);
    const payload = await technicalScopeResolver.generateTechnicalPayload({ ...s.session, technical_scope: s.tech_scope });
    
    console.log(`- Resolved HD: ${payload.selected_hd.produto}`);
    console.log(`- Review Required: ${payload.requires_human_review}`);

    if (s.expected_hd) {
        if (payload.selected_hd.produto.includes(s.expected_hd)) console.log('✅ HD dimensionado corretamente.');
        else console.log(`❌ HD incorreto. Esperado: ${s.expected_hd}`);
    }

    if (s.expect_review) {
        if (payload.requires_human_review) console.log('✅ Alerta de revisão técnica acionado (Correto).');
        else console.log('❌ Alerta de revisão NÃO acionado.');
    }

    const result = await orcamento.calcularOrcamento({ ...s.session, technical_payload: payload }, 'ORC-STORAGE');
    if (result.financeiro.detalhes.hd.produto === payload.selected_hd.produto) {
        console.log('✅ Pricing consumiu o HD correto do payload.');
    } else {
        console.log('❌ Pricing falhou ao herdar HD do TSR.');
    }
  }
}

testStorage().catch(console.error);
