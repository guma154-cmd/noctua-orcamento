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
        callback(null, null); // Força fallbacks
      },
      all: (q, p, cb) => { const callback = typeof p === 'function' ? p : cb; callback(null, []); }
    }; } }) };
  }
  return originalRequire.apply(this, arguments);
};

const technicalScopeResolver = require('./src/agents/technical_scope_resolver');
const orcamento = require('./src/agents/orcamento');

async function testSmallMaterials() {
  console.log('[TEST] Standardized Small Materials');

  // Caso 1: Analógico (HD)
  console.log('\n--- Cenário 1: Analógico (4 câmeras) ---');
  const session1 = {
    camera_quantity: 4,
    system_type: 'Analógico (HD)',
    property_type: 'Casa',
    technical_scope: { estimated_cable_total_m: 100 }
  };
  const payload1 = await technicalScopeResolver.generateTechnicalPayload(session1);
  const result1 = await orcamento.calcularOrcamento({ ...session1, technical_payload: payload1 }, 'ORC-ANALOG');
  
  console.log('Relatório Operacional (Itens):');
  const report1 = orcamento.gerarRelatorioOperacional('B', result1);
  console.log(report1);

  const expectedAnalog = ['Balun de Vídeo', 'Fonte 12V', 'Conector P4', 'Caixa de Proteção', 'Kit Fixação'];
  expectedAnalog.forEach(item => {
    if (report1.includes(item)) console.log(`✅ ${item} presente.`);
    else console.log(`❌ ${item} AUSENTE.`);
  });

  // Caso 2: IP (Digital)
  console.log('\n--- Cenário 2: IP (2 câmeras) ---');
  const session2 = {
    camera_quantity: 2,
    system_type: 'IP (Digital)',
    property_type: 'Comércio',
    technical_scope: { estimated_cable_total_m: 50 }
  };
  const payload2 = await technicalScopeResolver.generateTechnicalPayload(session2);
  const result2 = await orcamento.calcularOrcamento({ ...session2, technical_payload: payload2 }, 'ORC-IP');
  
  console.log('Relatório Operacional (Itens):');
  const report2 = orcamento.gerarRelatorioOperacional('B', result2);
  console.log(report2);

  const expectedIP = ['Conector RJ45', 'Switch POE', 'Caixa de Proteção', 'Kit Fixação'];
  expectedIP.forEach(item => {
    if (report2.includes(item)) console.log(`✅ ${item} presente.`);
    else console.log(`❌ ${item} AUSENTE.`);
  });
}

testSmallMaterials().catch(console.error);
