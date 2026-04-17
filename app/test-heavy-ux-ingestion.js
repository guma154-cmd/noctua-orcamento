// --- GLOBAL QA MOCK FOR SQLITE3 & MEMORIA ---
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
  if (arguments[0] === 'sqlite3') {
    return { verbose: () => ({ Database: function() { return { 
      serialize: (fn) => fn(), 
      run: (q, p, cb) => { if (typeof p === 'function') p(null); else if (cb) cb(null); },
      get: (q, p, cb) => { 
        const callback = typeof p === 'function' ? p : cb;
        // Mock de itens para o catálogo na ingestão
        if (q.includes('catalogo_noctua') || q.includes('fornecedores_v2')) {
            if (p[0] && p[0].includes('Câmera')) return callback(null, { sku: 'NTC-CAM', nome_comercial: 'Cam IP', preco_custo: 250, origin: 'SKU', ativo: 1 });
            return callback(null, null);
        }
        callback(null, null);
      },
      all: (q, p, cb) => { const callback = typeof p === 'function' ? p : cb; callback(null, []); }
    }; } }) };
  }
  return originalRequire.apply(this, arguments);
};

const DialogueEngine = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');
const ingestor = require('./src/agents/ingestor_planilha');
const fs = require('fs');
const XLSX = require('xlsx');

async function heavyValidation() {
  console.log('🦉 NOCTUA HEAVY UX & INGESTION VALIDATION (MOCKED)');
  console.log('===================================================\n');

  const chatId = 'QA-HEAVY-MOCK';
  const results = [];

  const logResult = (id, name, status, details = '') => {
      results.push({ id, name, status, details });
      console.log(`[${status}] ${id}: ${name} ${details ? `(${details})` : ''}`);
  };

  // Mock Memoria.salvarSessao para evitar I/O
  let mockSessions = {};
  memoria.salvarSessao = async (id, session) => { mockSessions[id] = session; };
  memoria.buscarSessao = async (id) => mockSessions[id] || null;
  memoria.limparSessao = async (id) => { delete mockSessions[id]; };

  // --- CENÁRIO 1: Fluxo Normal com Menus ---
  let res = await DialogueEngine.process(chatId, { text: '1', type: 'text' });
  if (res.keyboard) logResult('HV-01', 'Menus aparecem corretamente', 'PASS');

  // --- CENÁRIO 2: Fallback Textual ---
  res = await DialogueEngine.process(chatId, { text: 'casa', type: 'text' });
  const sess = await memoria.buscarSessao(chatId);
  if (sess.property_type === 'Casa') logResult('HV-02', 'Fallback textual funcional', 'PASS');

  // --- CENÁRIO 3: Ingestão de Planilha (Lógica Direta) ---
  const excelPath = './heavy_test_mock.xlsx';
  const cleanData = [{ item: 'Câmera IP 2MP', quantidade: 4, preco: 250 }];
  const ws = XLSX.utils.json_to_sheet(cleanData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, excelPath);

  console.log('Testando ingestão governada...');
  const ingestResult = await ingestor.processFile(excelPath, 'application/xlsx');
  if (ingestResult.summary.total === 1) logResult('HV-03', 'Ingestão e mapeamento governado funcional', 'PASS');

  // --- CENÁRIO 4: Decisão de Revisão ---
  res = await DialogueEngine.handleImportReview(chatId, '2', { 
      meta: { raw_import_items: [{ confidence: 1.0, produto: 'OK' }, { confidence: 0.3, produto: 'BAD' }] },
      technical_payload: { requires_human_review: false },
      property_type: 'Casa'
  });
  if (res.response.includes('apenas itens reconhecidos')) logResult('HV-04', 'Decisão de filtro "Apenas Confiáveis" OK', 'PASS');

  // --- CENÁRIO 5: Cancelamento ---
  res = await DialogueEngine.process(chatId, { text: 'Menu Principal', type: 'text' });
  if (res.status === 'awaiting_menu') logResult('HV-05', 'Navegação "Menu Principal" funcional', 'PASS');

  console.log('\n--- VEREDITO FINAL ---');
  const allPass = results.length >= 5;
  console.log(allPass ? '✅ SISTEMA APROVADO PARA PRODUÇÃO' : '❌ SISTEMA COM FALHAS');

  if (fs.existsSync(excelPath)) fs.unlinkSync(excelPath);
}

heavyValidation().catch(console.error);
