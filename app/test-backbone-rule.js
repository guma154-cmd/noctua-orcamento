// --- NOCTUA BACKBONE QA ---
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

        if (sql.includes('catalogo_noctua') || sql.includes('fornecedores_v2')) {
          return callback(null, { sku: 'MOCK', nome_comercial: 'Item Mock', preco_custo: 100, ativo: 1 });
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

async function testBackbone() {
  console.log('🦉 NOCTUA BACKBONE RULE QA');
  console.log('===========================\n');

  // Cenário: 24 Câmeras IP (Deve gerar 2 switches: 1x 16p + 1x 8p)
  console.log('Cenário 1: 24 Câmeras IP');
  const session = { 
    property_type: 'Comércio', 
    camera_quantity: 24, 
    system_type: 'IP (Digital)' 
  };
  
  const payload = await technicalScopeResolver.generateTechnicalPayload(session);
  
  console.log(`- Metragem Backbone: ${payload.backbone_meterage}m`);
  console.log(`- Alertas: ${payload.incompatibilities.join(', ')}`);

  if (payload.backbone_meterage === 15) {
    console.log('✅ Cálculo de backbone correto para 2 switches.');
  } else {
    console.log(`❌ Cálculo de backbone incorreto. Obtido: ${payload.backbone_meterage}`);
  }

  // Cenário 2: 32 Câmeras IP (2 switches de 16p)
  console.log('\nCenário 2: 32 Câmeras IP');
  const session2 = { ...session, camera_quantity: 32 };
  const payload2 = await technicalScopeResolver.generateTechnicalPayload(session2);
  console.log(`- Metragem Backbone: ${payload2.backbone_meterage}m`);
  if (payload2.backbone_meterage === 15) {
    console.log('✅ Cálculo de backbone correto para 2 switches (16+16).');
  }

  // Validação no Relatório Operacional
  const orcResult = {
    technical_payload: payload,
    financeiro: {
      custoTotal: 5000,
      custoMaterial: 4000,
      custoInstalacao: 1000,
      valorModeloA: 1500,
      valorModeloB: 6500,
      isTicketMinimo: false,
      detalhes: {
        camera: { produto: 'Cam IP', preco_custo: 100 },
        dvr: { produto: 'NVR 32', preco_custo: 100 },
        hd: { produto: 'HD 4TB', preco_custo: 100 },
        acessorios: [],
        cabo: { produto: 'Cabo UTP', qtd: 415, preco_custo: 3 }
      }
    },
    escopo: { ...session, technical_payload: payload },
    orcamento_id: 'QA-BK-001'
  };

  const report = orcamento.gerarRelatorioOperacional('B', orcResult);
  console.log('\nRelatório Operacional:');
  console.log(report);

  if (report.includes('Inclui 15m de cabo para backbone')) {
    console.log('✅ Nota técnica de backbone exibida no relatório.');
  } else {
    console.log('❌ Nota técnica de backbone AUSENTE no relatório.');
  }
}

testBackbone().catch(console.error);
