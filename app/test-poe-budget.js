const technicalScopeResolver = require('./src/agents/technical_scope_resolver');

// Mock SQLITE3
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

async function testPoEBudget() {
  console.log('🦉 NOCTUA POE BUDGET TEST');
  console.log('========================');

  // Cenário 1: 16 Câmeras IP (160W) em Switch 16p (150W) -> DEVE FALHAR/ALERTA
  console.log('\nCenário 1: 16 Câmeras IP (Sobrecarga de 160W em Switch 150W)');
  const session1 = {
    camera_quantity: 16,
    system_type: 'IP (Digital)',
    technical_scope: { cable_calc_mode: 'total', cable_total_m: 100 }
  };
  const payload1 = await technicalScopeResolver.generateTechnicalPayload(session1);
  const hasAlert = payload1.incompatibilities.includes('ALERT_POE_OVERLOAD_RISK');
  console.log(`- Alerta detectado: ${hasAlert ? '✅' : '❌'}`);

  // Cenário 2: 4 Câmeras IP (40W) em Switch 4p (60W) -> OK
  console.log('\nCenário 2: 4 Câmeras IP (Seguro: 40W em Switch 60W)');
  const session2 = {
    camera_quantity: 4,
    system_type: 'IP (Digital)',
    technical_scope: { cable_calc_mode: 'total', cable_total_m: 100 }
  };
  const payload2 = await technicalScopeResolver.generateTechnicalPayload(session2);
  const noAlert = !payload2.incompatibilities.includes('ALERT_POE_OVERLOAD_RISK');
  console.log(`- Sem alerta (Seguro): ${noAlert ? '✅' : '❌'}`);
}

testPoEBudget().catch(console.error);
