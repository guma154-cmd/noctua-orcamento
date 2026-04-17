// --- GLOBAL MOCK FOR SQLITE3 ---
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function() {
  if (arguments[0] === 'sqlite3') {
    return {
      verbose: () => ({
        Database: function() {
          return {
            serialize: (fn) => fn(),
            run: function(q, p, cb) { if (typeof p === 'function') p(null); else if (cb) cb(null); },
            get: function(q, p, cb) { if (typeof p === 'function') p(null, {count:1}); else if (cb) cb(null, {count:1}); },
            all: function(q, p, cb) { 
              const callback = typeof p === 'function' ? p : cb;
              if (q.includes('fornecedores_v2')) {
                callback(null, [
                  { id: 1, produto: 'Câmera Bullet 2MP IR 20m', preco_custo: 120.00 },
                  { id: 2, produto: 'Câmera Dome 2MP IR 20m', preco_custo: 115.00 },
                  { id: 3, produto: 'DVR 4 Canais Multi-HD', preco_custo: 350.00 },
                  { id: 4, produto: 'DVR 8 Canais Multi-HD', preco_custo: 550.00 },
                  { id: 5, produto: 'HD 1TB SkyHawk (p/ CFTV)', preco_custo: 280.00 }
                ]);
              } else {
                callback(null, []);
              }
            },
            prepare: () => ({ run: () => {}, finalize: () => {} })
          };
        }
      })
    };
  }
  return originalRequire.apply(this, arguments);
};
// -------------------------------

const dialogueEngine = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');
const { STATUS_NOCTUA } = require('./src/utils/constants');

async function runTest() {
  const chatId = 'test_tech_user_' + Date.now();
  console.log(`[TEST] Iniciando teste de Technical Scope Resolver... ChatID: ${chatId}`);

  // Mock de memória para não depender do banco real
  const sessionData = {};
  memoria.buscarSessao = async (id) => sessionData[id] || null;
  memoria.salvarSessao = async (id, data) => { sessionData[id] = data; };
  memoria.limparSessao = async (id) => { delete sessionData[id]; };
  memoria.gerarProximoId = async () => 'ORC-123456';
  memoria.salvarOrcamento = async () => 1;
  memoria.atualizarStatusOrcamento = async () => true;

  // 1. Iniciar Novo Orçamento
  console.log('\n--- ETAPA 1: INÍCIO ---');
  let res = await dialogueEngine.process(chatId, { text: '1' }); 
  console.log('Response:', res.response);

  // 2. Qualificação Rápida
  console.log('\n--- ETAPA 2: QUALIFICAÇÃO ---');
  const steps = [
    'Casa',
    '4',
    'Externo',
    'IP',
    'Sim',
    'Sim',
    'NOCTUA',
    'Cliente Teste Tech',
    'Rua das Palmeiras, 100',
    '21999999999'
  ];

  for (const step of steps) {
    res = await dialogueEngine.process(chatId, { text: step });
    const responseText = Array.isArray(res.response) ? res.response.join('\n') : res.response;
    console.log(`Input: "${step}" -> Response Snippet: ${responseText.substring(0, 80)}...`);
  }

  // 3. Technical Scope
  console.log('\n--- ETAPA 3: TECHNICAL SCOPE ---');
  if (res.response && res.response.includes('área externa')) {
    console.log('✅ Acionou pergunta técnica do perfil Casa.');
  } else {
    console.log('❌ NÃO acionou pergunta técnica. Response:', res.response);
  }

  // Responder pergunta técnica
  res = await dialogueEngine.process(chatId, { text: '2' });
  console.log('Input: "2" -> Response:', res.response);

  // Deve agora oferecer a escolha de modelo
  if (res.response && (res.response.includes('Qual versão deseja gerar') || res.response.includes('Qual versão você quer gerar'))) {
    console.log('✅ Prosseguiu para escolha de modelo.');
  } else {
    console.log('❌ NÃO prosseguiu para escolha de modelo.');
  }

  // 4. Escolha de Modelo e Verificação de Payload
  console.log('\n--- ETAPA 4: PRICING & PAYLOAD ---');
  res = await dialogueEngine.process(chatId, { text: '2' }); // Modelo B
  
  const report = Array.isArray(res.response) ? res.response[0] : res.response;
  // console.log('Relatório Operacional:\n', report);

  if (report.includes('DVR 4 Canais') && report.includes('Câmera Bullet 2MP')) {
    console.log('✅ Relatório contém itens selecionados pelo Technical Resolver.');
  } else {
    console.log('❌ Itens técnicos não encontrados no relatório.');
  }

  const session = await memoria.buscarSessao(chatId);
  if (session.technical_payload && session.technical_payload.external_count === 2) {
    console.log('✅ Payload técnico persistido com sucesso na sessão.');
  } else {
    console.log('❌ Payload técnico ausente ou incorreto na sessão.');
  }

  console.log('\n[TEST] Concluído.');
}

runTest().catch(console.error);
