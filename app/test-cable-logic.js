// --- GLOBAL MOCK FOR SQLITE3 ---
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
  if (arguments[0] === 'sqlite3') {
    return { verbose: () => ({ Database: function() { return { 
      serialize: (fn) => fn(), 
      run: (q, p, cb) => { if (typeof p === 'function') p(null); else if (cb) cb(null); },
      get: (q, p, cb) => { if (typeof p === 'function') p(null, null); else if (cb) cb(null, null); },
      all: (q, p, cb) => { const callback = typeof p === 'function' ? p : cb; callback(null, []); }
    }; } }) };
  }
  return originalRequire.apply(this, arguments);
};

const technicalScopeResolver = require('./src/agents/technical_scope_resolver');

async function testCableUnit(scenario) {
  console.log(`\n[TEST] Scenario: ${scenario.name}`);

  const session = {
    property_type: scenario.property_type,
    camera_quantity: scenario.camera_quantity,
    system_type: scenario.system_type,
    technical_scope: scenario.technical_scope
  };

  const payload = await technicalScopeResolver.generateTechnicalPayload(session);

  console.log('Result Analysis:');
  console.log(`- Cable Mode: ${payload.cable_calc_mode}`);
  console.log(`- Total Cable: ${payload.estimated_cable_total_m}m`);
  console.log(`- Per Point: ${payload.estimated_cable_per_point_m}m`);
  console.log(`- Risk: ${payload.distance_risk} | Review: ${payload.requires_human_review}`);

  if (scenario.expected_total) {
    const ok = payload.estimated_cable_total_m === scenario.expected_total;
    console.log(`- Total Cable Expected (${scenario.expected_total}): ${ok ? '✅' : '❌ (' + payload.estimated_cable_total_m + ')'}`);
  }
  
  if (scenario.expect_risk !== undefined) {
    const ok = payload.distance_risk === scenario.expect_risk;
    console.log(`- Risk Expected (${scenario.expect_risk}): ${ok ? '✅' : '❌'}`);
  }
}

async function run() {
  // Cenário 1: Detalhado (4 câmeras, distâncias: 10, 20, 30, 40)
  // (10+4) + (20+4) + (30+4) + (40+4) = 14 + 24 + 34 + 44 = 116m
  await testCableUnit({
    name: 'Detalhado_4_Cameras',
    property_type: 'Casa',
    camera_quantity: 4,
    system_type: 'Analógico (HD)',
    technical_scope: {
      external_count: 0,
      infra_status: 'Sim (Existente)',
      cable_calc_mode: 'detalhado',
      route_type_label: 'Padrão',
      raw_distances: '10, 20, 30, 40'
    },
    expected_total: 116
  });

  // Cenário 2: Estimado (10 câmeras IP, média 30m, rota difícil fator 1.5)
  // per_point = (30 * 1.5) + 4 = 45 + 4 = 49m
  // total = 10 * 49 = 490m
  await testCableUnit({
    name: 'Estimado_IP_10_Dificil',
    property_type: 'Condomínio',
    camera_quantity: 10,
    system_type: 'IP (Digital)',
    technical_scope: {
      infra_status: 'Parcial',
      cable_calc_mode: 'estimado',
      route_type_label: 'Difícil',
      raw_distances: '30'
    },
    expected_total: 490
  });

  // Cenário 3: Alerta de Risco (Média 70m, rota difícil 1.5)
  // per_point = (70 * 1.5) + 4 = 105 + 4 = 109m (Review human!)
  await testCableUnit({
    name: 'Risco_Distancia_Longa',
    property_type: 'Outro',
    camera_quantity: 2,
    system_type: 'IP (Digital)',
    technical_scope: {
      infra_status: 'Não (Nova)',
      cable_calc_mode: 'estimado',
      route_type_label: 'Difícil',
      raw_distances: '70'
    },
    expect_risk: true
  });
}

run().catch(console.error);
