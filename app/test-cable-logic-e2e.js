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

const dialogueEngine = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');

async function testCableE2E() {
  const chatId = 'test_cable_e2e_' + Date.now();
  console.log(`\n[TEST] E2E Cable Logic Flow`);

  const sessionData = {};
  memoria.buscarSessao = async (id) => sessionData[id] || null;
  memoria.salvarSessao = async (id, data) => { sessionData[id] = data; };
  memoria.limparSessao = async (id) => { delete sessionData[id]; };
  memoria.gerarProximoId = async () => 'ORC-E2E';
  memoria.salvarOrcamento = async () => 1;
  memoria.atualizarStatusOrcamento = async () => true;

  // 1. Início e Qualificação (Simulada para ir direto ao TSR)
  await dialogueEngine.process(chatId, { text: '1' }); 
  let session = await memoria.buscarSessao(chatId);
  session.property_type = 'Casa';
  session.camera_quantity = 2;
  session.system_type = 'Analógico (HD)';
  session.answered_families = ['property_type', 'camera_quantity', 'system_type', 'installation_environment', 'recording', 'remote_access', 'material_source', 'client_name', 'client_address', 'client_phone'];
  await memoria.salvarSessao(chatId, session);

  console.log('--- Iniciando Technical Scope ---');
  let res = await dialogueEngine.continueFlow(chatId, "", session);
  console.log('Q1 (Perfil):', res.response); // Esperado: externas

  res = await dialogueEngine.process(chatId, { text: '1' }); // Externas: 1
  res = await dialogueEngine.process(chatId, { text: '1' }); // Infra: Sim
  res = await dialogueEngine.process(chatId, { text: '1' }); // Modo: Estimado
  res = await dialogueEngine.process(chatId, { text: '2' }); // Rota: Padrão
  res = await dialogueEngine.process(chatId, { text: '100' }); // Distância Risco: 100m
  
  session = await memoria.buscarSessao(chatId);
  console.log('Q5 (Final Distances):', res.response.substring(0, 100) + '...'); 
  console.log('Final technical_scope:', JSON.stringify(session.technical_scope));
  
  if (session.technical_payload) {
    console.log('Technical Payload distance_risk:', session.technical_payload.distance_risk);
    console.log('Technical Payload requires_human_review:', session.technical_payload.requires_human_review);
  }

  if (res.response.includes('REVISÃO NECESSÁRIA')) {
    console.log('✅ Alerta de revisão humana acionado com sucesso.');
    res = await dialogueEngine.process(chatId, { text: '1' }); // Prosseguir
  }

  if (res.response.includes('Qual versão')) {
    console.log('✅ Fluxo completado com sucesso até precificação.');
  } else {
    console.log('❌ Falha ao completar fluxo. Res:', res.response);
  }
}

testCableE2E().catch(console.error);
