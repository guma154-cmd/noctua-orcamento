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

const orcamento = require('./src/agents/orcamento');

async function testCommercial() {
  console.log('[TEST] Commercial Cable Conversion');

  const escopo = {
    quantidade: 4,
    technical_payload: {
      system_type: 'ip',
      estimated_cable_total_m: 116,
      resolved_items: [
        { categoria: 'Camera', produto: 'Câmera Bullet 2MP (IP)', preco_custo: 250 },
        { categoria: 'Recorder', produto: 'NVR 4 Canais', preco_custo: 650 },
        { categoria: 'Acessorio', produto: 'Conector RJ45', qtd: 8, preco_custo: 1.5 }
      ]
    }
  };

  const result = await orcamento.calcularOrcamento(escopo, 'ORC-COMM');
  
  console.log('--- Relatório Operacional ---');
  const report = orcamento.gerarRelatorioOperacional('B', result);
  console.log(report);

  if (report.includes('Cabo de Rede UTP Cat5e — 116')) {
    console.log('✅ Metragem exata incluída no relatório.');
  } else {
    console.log('❌ Metragem não encontrada no relatório.');
  }

  if (report.includes('Arredondar para 120m')) {
    console.log('✅ Nota de arredondamento para compra incluída.');
  } else {
    console.log('❌ Nota de arredondamento não encontrada.');
  }

  const custoTotal = result.financeiro.custoMaterial;
  // Cálculo esperado: (250*4) + 650 + 300 (HD fallback) + (8*1.5) + (116*3.5)
  // 1000 + 650 + 300 + 12 + 406 = 2368
  console.log(`Custo Material: ${custoTotal}`);
  if (custoTotal === 2368) {
    console.log('✅ Custo total de materiais validado.');
  } else {
    console.log('❌ Custo total divergente.');
  }
}

testCommercial().catch(console.error);
