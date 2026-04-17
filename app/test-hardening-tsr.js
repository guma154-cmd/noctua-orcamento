// --- GLOBAL MOCK FOR SQLITE3 ---
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
  if (arguments[0] === 'sqlite3') {
    return { verbose: () => ({ Database: function() { return { 
      serialize: (fn) => fn(), 
      run: (q, p, cb) => { if (typeof p === 'function') p(null); else if (cb) cb(null); },
      get: (q, p, cb) => { if (typeof p === 'function') p(null, null); else if (cb) cb(null, null); },
      all: (q, p, cb) => { const callback = typeof p === 'function' ? p : cb; callback(null, []); },
      prepare: () => ({ run: () => {}, finalize: () => {} })
    }; } }) };
  }
  return originalRequire.apply(this, arguments);
};

const dialogueEngine = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');

async function testHarden(scenario) {
  const chatId = 'test_harden_' + scenario.name + '_' + Date.now();
  console.log(`\n[TEST] Scenario: ${scenario.name}`);

  const sessionData = {};
  memoria.buscarSessao = async (id) => sessionData[id] || null;
  memoria.salvarSessao = async (id, data) => { sessionData[id] = data; };
  memoria.limparSessao = async (id) => { delete sessionData[id]; };
  memoria.gerarProximoId = async () => 'ORC-H' + Date.now();
  memoria.salvarOrcamento = async () => 1;
  memoria.atualizarStatusOrcamento = async () => true;

  // Iniciar e Qualificar (FORÇANDO ESTADO PARA EVITAR ERRO DE IA NO TESTE)
  await dialogueEngine.process(chatId, { text: '1' }); 
  let session = await memoria.buscarSessao(chatId);
  session.property_type = scenario.property_type;
  session.camera_quantity = scenario.camera_quantity;
  session.system_type = scenario.system_type;
  session.answered_families = ['property_type', 'camera_quantity', 'system_type', 'installation_environment', 'recording', 'remote_access', 'material_source', 'client_name', 'client_address', 'client_phone'];
  await memoria.salvarSessao(chatId, session);

  // Trigger technical scope
  let res = await dialogueEngine.continueFlow(chatId, "", session);

  // Responder perguntas técnicas se houver
  if (scenario.tech_steps) {
    for (const tech of scenario.tech_steps) {
      res = await dialogueEngine.process(chatId, { text: tech });
    }
  }

  // Gerar Modelo B para ver detalhes
  res = await dialogueEngine.process(chatId, { text: '2' });
  const report = Array.isArray(res.response) ? res.response[0] : res.response;
  
  console.log('Result Summary:');
  const hasRecorder = report.includes(scenario.expected_recorder);
  const hasSmallMat = report.includes(scenario.expected_small_mat);
  
  console.log(`- Expected Recorder (${scenario.expected_recorder}): ${hasRecorder ? '✅' : '❌'}`);
  console.log(`- Expected Small Mat (${scenario.expected_small_mat}): ${hasSmallMat ? '✅' : '❌'}`);

  session = await memoria.buscarSessao(chatId);
  console.log('- Operational Flags:', JSON.stringify(session.technical_payload.operational_flags));
}

async function run() {
  await testHarden({
    name: 'Analog_Residencial_Casa',
    property_type: 'Casa',
    camera_quantity: 4,
    system_type: 'Analógico (HD)',
    expected_recorder: 'DVR 4 Canais',
    expected_small_mat: 'Balun de Vídeo',
    tech_steps: ['2', '1']
  });

  await testHarden({
    name: 'IP_Condominio_Complex',
    property_type: 'Condomínio',
    camera_quantity: 10,
    system_type: 'IP (Digital)',
    expected_recorder: 'NVR 16 Canais',
    expected_small_mat: 'Switch POE',
    tech_steps: ['50']
  });
}

run().catch(console.error);
