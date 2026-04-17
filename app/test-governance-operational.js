// --- NOCTUA OPERATIONAL GOVERNANCE VALIDATOR ---
const Module = require('module');
const originalRequire = Module.prototype.require;

// Mock Engine para controlar o estado do banco em cada teste
let mockDbState = []; 

Module.prototype.require = function() {
  if (arguments[0] === 'sqlite3') {
    return { verbose: () => ({ Database: function() { return { 
      serialize: (fn) => fn(), 
      run: (q, p, cb) => { if (typeof p === 'function') p(null); else if (cb) cb(null); },
      get: (q, p, cb) => { 
        const callback = typeof p === 'function' ? p : cb;
        const sql = q.toUpperCase();
        const params = p || [];

        // Procura no estado do mock por uma correspondência de SQL
        const match = mockDbState.find(m => sql.includes(m.pattern.toUpperCase()));
        if (match) return callback(null, match.result(params));
        
        callback(null, null);
      },
      all: (q, p, cb) => { const callback = typeof p === 'function' ? p : cb; callback(null, []); }
    }; } }) };
  }
  return originalRequire.apply(this, arguments);
};

const technicalScopeResolver = require('./src/agents/technical_scope_resolver');

async function runValidation() {
  console.log('🦉 NOCTUA OPERATIONAL GOVERNANCE VALIDATION');
  console.log('===========================================\n');

  const scenarios = [
    {
      id: 'SC-01',
      name: 'Item encontrado por SKU exato',
      setup: () => {
        mockDbState = [{ pattern: 'sku = ?', result: () => ({ sku: 'NTC-001', nome_comercial: 'Item SKU', preco_custo: 100, ativo: 1, origin: 'SKU' }) }];
      },
      exec: () => technicalScopeResolver.findItemWithFallback('Camera', 'NTC-001', 0),
      expected: (res) => res.origin === 'SKU' ? 'PASS' : 'FAIL'
    },
    {
      id: 'SC-02',
      name: 'Item padrão por perfil (Casa)',
      setup: () => {
        mockDbState = [
            { pattern: 'sku = ?', result: () => null },
            { pattern: 'perfil_noctua = ?', result: () => ({ sku: 'NTC-CASA', nome_comercial: 'Item Casa', preco_custo: 150, ativo: 1, origin: 'PROFILE_DEFAULT' }) }
        ];
      },
      exec: () => technicalScopeResolver.findItemWithFallback('Camera', 'Nome', 0, { profile: 'Casa', tech: 'analog' }),
      expected: (res) => res.origin === 'PROFILE_DEFAULT' ? 'PASS' : 'FAIL'
    },
    {
      id: 'SC-03',
      name: 'Item padrão global (Fallback de Perfil ausente)',
      setup: () => {
        mockDbState = [
            { pattern: 'sku = ?', result: () => null },
            { pattern: 'perfil_noctua = ?', result: () => null },
            { pattern: 'GLOBAL_DEFAULT', result: () => ({ sku: 'NTC-GLOBAL', nome_comercial: 'Item Global', preco_custo: 200, ativo: 1, origin: 'GLOBAL_DEFAULT' }) }
        ];
      },
      exec: () => technicalScopeResolver.findItemWithFallback('Camera', 'Nome', 0, { profile: 'Condomínio', tech: 'ip' }),
      expected: (res) => res.origin === 'GLOBAL_DEFAULT' ? 'PASS' : 'FAIL'
    },
    {
      id: 'SC-04',
      name: 'Item inativo sendo ignorado',
      setup: () => {
        mockDbState = [
            { pattern: 'sku = ?', result: () => null }, // Simula ativo=1 não retornando nada
            { pattern: 'GLOBAL_DEFAULT', result: () => ({ sku: 'NTC-OK', nome_comercial: 'Item Ativo', preco_custo: 80, ativo: 1, origin: 'GLOBAL_DEFAULT' }) }
        ];
      },
      exec: () => technicalScopeResolver.findItemWithFallback('Camera', 'SKU-INATIVO', 0),
      expected: (res) => res.sku === 'NTC-OK' ? 'PASS' : 'FAIL'
    },
    {
      id: 'SC-05',
      name: 'Item sem preço (preco_custo <= 0)',
      setup: () => {
        mockDbState = [
            { pattern: 'GLOBAL_DEFAULT', result: () => ({ sku: 'NTC-ZERO', nome_comercial: 'Sem Preço', preco_custo: 0, ativo: 1 }) },
            { pattern: 'LEGACY_CONTROLLED', result: () => ({ sku: 'NTC-LEGACY', nome_comercial: 'Item Legado', preco_custo: 50, ativo: 1, origin: 'LEGACY_CONTROLLED' }) }
        ];
      },
      exec: () => technicalScopeResolver.findItemWithFallback('Camera', 'Nome', 0),
      expected: (res) => res.origin === 'LEGACY_CONTROLLED' ? 'PASS' : 'FAIL'
    },
    {
      id: 'SC-06',
      name: 'Fallback PROIBIDO (Categoria Crítica)',
      setup: () => {
        mockDbState = [
            { pattern: 'FORBIDDEN', result: () => ({ forbidden: 1 }) }
        ];
      },
      exec: () => technicalScopeResolver.findItemWithFallback('Recorder', 'Inexistente', 500),
      expected: (res) => res.sku === 'BLOCK' ? 'BLOCK' : 'FAIL'
    },
    {
      id: 'SC-07',
      name: 'Fallback PERMITIDO (Acessórios)',
      setup: () => {
        mockDbState = [
            { pattern: 'FORBIDDEN', result: () => ({ forbidden: 0 }) }
        ];
      },
      exec: () => technicalScopeResolver.findItemWithFallback('Acessorio', 'Inexistente', 15),
      expected: (res) => res.sku === 'FALLBACK' ? 'FALLBACK' : 'FAIL'
    },
    {
      id: 'SC-08',
      name: 'Duplicidade de item padrão (Ambiguidade)',
      setup: () => {
        mockDbState = [
            // SQL ORDER e LIMIT 1 tratam isso, mas o risco é o item retornado ser o "primeiro" arbitrário
            { pattern: 'GLOBAL_DEFAULT', result: () => ({ sku: 'NTC-001', nome_comercial: 'Primeiro Padrão', preco_custo: 100, ativo: 1, origin: 'GLOBAL_DEFAULT' }) }
        ];
      },
      exec: () => technicalScopeResolver.findItemWithFallback('Camera', 'Nome', 0),
      expected: (res) => res.sku === 'NTC-001' ? 'RISK (Ambiguity)' : 'FAIL'
    }
  ];

  for (const s of scenarios) {
    s.setup();
    const result = await s.exec();
    const status = s.expected(result);
    console.log(`[${s.id}] ${s.name.padEnd(50)} -> ${status}`);
    if (status === 'FAIL') console.log(`      DADO: `, result);
  }
}

runValidation().catch(console.error);
