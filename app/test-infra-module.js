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

async function testInfra() {
  console.log('🦉 NOCTUA INFRASTRUCTURE MODULE QA');
  console.log('==================================');

  const scenarios = [
    {
      id: 1,
      name: 'Infra Existente (Interno)',
      session: { camera_quantity: 4, installation_environment: 'Interno' },
      tech_scope: { infra_status: 'Sim (Existente)', estimated_cable_total_m: 100 }
    },
    {
      id: 2,
      name: 'Infra Nova (Interno)',
      session: { camera_quantity: 4, installation_environment: 'Interno' },
      tech_scope: { infra_status: 'Não (Nova)', estimated_cable_total_m: 100 }
    },
    {
      id: 3,
      name: 'Infra Nova (Externo)',
      session: { camera_quantity: 4, installation_environment: 'Externo' },
      tech_scope: { infra_status: 'Não (Nova)', estimated_cable_total_m: 100 }
    },
    {
      id: 4,
      name: 'Infra Parcial (Misto)',
      session: { camera_quantity: 10, installation_environment: 'Misto' },
      tech_scope: { infra_status: 'Parcial', estimated_cable_total_m: 300 }
    }
  ];

  for (const s of scenarios) {
    console.log(`\nScenario ${s.id}: ${s.name}`);
    const payload = await technicalScopeResolver.generateTechnicalPayload({ ...s.session, technical_scope: s.tech_scope });
    const result = await orcamento.calcularOrcamento({ ...s.session, technical_payload: payload }, 'ORC-INFRA');
    const report = orcamento.gerarRelatorioOperacional('B', result);
    
    console.log('--- Relatório (Resumo) ---');
    const lines = report.split('\n');
    const matLines = lines.filter(l => l.startsWith('•'));
    matLines.forEach(l => {
        if (l.includes('Canaleta') || l.includes('Eletroduto') || l.includes('Caixa de Passagem')) {
            console.log('✅ ' + l);
        }
    });

    if (s.tech_scope.infra_status.includes('Existente')) {
        const hasInfra = matLines.some(l => l.includes('Canaleta') || l.includes('Eletroduto'));
        if (!hasInfra) console.log('✅ Nenhuma infraestrutura de passagem adicionada (Correto).');
        else console.log('❌ Infraestrutura adicionada indevidamente.');
    }
  }
}

testInfra().catch(console.error);
