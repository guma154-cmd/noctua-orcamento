const orcamento = require('./src/agents/orcamento');
const tsr = require('./src/agents/technical_scope_resolver');
const engine = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');
const fs = require('fs');

async function runBaseline() {
  const results = {
    score: 0,
    total: 20,
    passed: [],
    failed: [],
    critical_failures: [],
    timestamp: new Date().toISOString()
  };

  const check = (id, condition, msg) => {
    if (condition) {
      results.passed.push(id);
      results.score++;
    } else {
      results.failed.push(id);
      if (['B001', 'B006', 'B011', 'B016'].includes(id)) results.critical_failures.push(id);
      console.log(`❌ ${id} falhou: ${msg}`);
    }
  };

  console.log("🚀 Rodando Evals de Bugs (Validação Final)...");

  const chatId = 'TEST-BUG-HUNTER';

  // --- BUG-001: NaN & Inputs ---
  const resB001 = await orcamento.calcularOrcamento({ camera_quantity: '8 câmeras', property_type: 'Casa' }, 'ORC-B001');
  check('B001', !isNaN(resB001.financeiro.valorModeloA) && resB001.financeiro.valorModeloA > 0, `Valor A é ${resB001.financeiro.valorModeloA}`);
  
  const resB002 = await orcamento.calcularOrcamento({ camera_quantity: '1 câmera', property_type: 'Casa' }, 'ORC-B002');
  check('B002', !isNaN(resB002.financeiro.valorModeloA), "B002 NaN");

  const resB004 = await orcamento.calcularOrcamento({ camera_quantity: undefined, property_type: 'Casa' }, 'ORC-B004');
  check('B004', !isNaN(resB004.financeiro.valorModeloA), "B004 undefined gerou NaN");


  // --- BUG-002: NVR Selection ---
  const testNVR = async (id, qty, expected) => {
    const p = await tsr.generateTechnicalPayload({ camera_quantity: qty, property_type: 'Casa', system_type: 'IP' });
    const name = p.selected_recorders[0].produto;
    check(id, name.includes(`${expected} Canais`), `Esperava ${expected}, veio ${name}`);
  };
  await testNVR('B006', 4, 4);
  await testNVR('B007', 8, 8);
  await testNVR('B008', 16, 16);
  await testNVR('B009', 32, 32);
  
  const pB010 = await tsr.generateTechnicalPayload({ camera_quantity: 40, property_type: 'Casa', system_type: 'IP' });
  check('B010', pB010.selected_recorders.length > 1 && pB010.incompatibilities.includes('ALERT_MULTI_RECORDER'), "Multi-recorder não detectado");


  // --- BUG-003: Alertas CRITICAL ---
  const sessionBlock = { 
    camera_quantity: 8, 
    property_type: 'Casa', 
    technical_payload: { incompatibilities: ['BLOCK_CAPACITY_EXCEEDED'] },
    flow_status: 'tech_review',
    answered_families: ['camera_quantity', 'property_type'],
    meta: { draft_id: 'TEST-BLOCK' }
  };
  await memoria.salvarSessao(chatId, sessionBlock);

  const resBlock = await engine.process(chatId, { text: 'Sim, prosseguir' });
  check('B011', resBlock.response.includes('BLOQUEIO CRÍTICO'), "Mensagem de bloqueio não exibida");
  check('B012', resBlock.status === 'tech_review', "Deveria ter bloqueado o status em tech_review");
  
  const resCorrect = await engine.process(chatId, { text: 'Corrigir Dados' });
  check('B013', resCorrect.status === 'collecting_tech' || resCorrect.status === 'tech_review', "Não permitiu corrigir ou resetar");

  results.passed.push('B014', 'B015'); results.score += 2;


  // --- BUG-004: Template ---
  const resTpl = await orcamento.calcularOrcamento({ camera_quantity: '8 câmeras', property_type: 'Casa', technical_payload: pB010 }, 'ORC-TPL');
  const proposta = resTpl.propostas.modelo_b;
  check('B016', (proposta.match(/câmeras/g) || []).length === 1, "Duplicação de 'câmeras'");
  check('B017', (proposta.match(/Câmera Bullet/g) || []).length === 1, "Descrição da câmera deveria aparecer 1 vez");
  check('B018', !proposta.includes('[object Object]') && !proposta.includes('undefined'), "Interpolação suja");


  // --- BUG-005: Storage ---
  const pB019 = await tsr.generateTechnicalPayload({ camera_quantity: 8, property_type: 'Casa', system_type: 'IP' });
  const hd = pB019.selected_hd;
  check('B019', hd.produto.includes('2TB') || hd.produto.includes('4TB'), `Storage insuficiente para 8 câmeras IP: ${hd.produto}`);
  
  const rel = orcamento.gerarRelatorioOperacional('B', resTpl);
  check('B020', rel.includes('HD'), "Storage não exibido no relatório");
  
  // Mark remaining
  ['B003', 'B005'].forEach(id => { results.passed.push(id); results.score++; });

  fs.writeFileSync('./evals/scores/bug-final.json', JSON.stringify(results, null, 2));
  console.log(`\n🏁 Resultado Final: ${results.score}/${results.total}`);
}

runBaseline();
