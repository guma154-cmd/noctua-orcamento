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
        const sql = q; // Não converter para lower para manter 'SKU' as origin se necessário
        const params = p || [];

        // 1. Mock de SKU Exato (NTC-SKU-001) - Ativo
        if (sql.includes('sku = ?') && params[0] === 'NTC-SKU-001') {
          return callback(null, { sku: 'NTC-SKU-001', nome_comercial: 'Item via SKU', preco_custo: 100, ativo: 1, origin: 'SKU', categoria: 'Qualquer', unidade_compra: 'Unidade' });
        }

        // 2. Mock de Item Padrão Global (Camera/IP)
        if (sql.includes('GLOBAL_DEFAULT') && params[0] === 'Camera' && params[1] === 'ip') {
          return callback(null, { sku: 'NTC-CAM-001', nome_comercial: 'Câmera IP Padrão', preco_custo: 250, ativo: 1, origin: 'GLOBAL_DEFAULT', categoria: 'Camera', unidade_compra: 'Unidade' });
        }

        // 3. Mock de Fallback Proibido (Categoria: Recorder)
        if (sql.includes('forbidden') && params[0] === 'Recorder') {
          return callback(null, { forbidden: 1 });
        }

        // 4. Mock de Fallback Permitido (Categoria: Acessorio)
        if (sql.includes('forbidden') && params[0] === 'Acessorio') {
          return callback(null, { forbidden: 0 });
        }

        callback(null, null);
      },
      all: (q, p, cb) => { const callback = typeof p === 'function' ? p : cb; callback(null, []); }
    }; } }) };
  }
  return originalRequire.apply(this, arguments);
};

const technicalScopeResolver = require('./src/agents/technical_scope_resolver');

async function testResolution() {
  console.log('🦉 NOCTUA GOVERNANCE RESOLUTION QA (ETAPA 2)');
  console.log('============================================');

  // Teste 1: Prioridade 1 - SKU Exato
  console.log('\nTeste 1: Prioridade 1 - SKU Exato');
  const res1 = await technicalScopeResolver.findItemWithFallback('Qualquer', 'NTC-SKU-001', 0);
  if (res1.sku === 'NTC-SKU-001' && res1.origin === 'SKU') console.log('✅ Sucesso: Resolveu via SKU');
  else console.log('❌ Falha: Prioridade SKU falhou. SKU:', res1.sku, 'Origin:', res1.origin);

  // Teste 2: Item Inativo
  console.log('\nTeste 2: Item Inativo (NTC-INATIVO-001)');
  const res2 = await technicalScopeResolver.findItemWithFallback('Acessorio', 'NTC-INATIVO-001', 50);
  if (res2.sku === 'FALLBACK' && res2.origin === 'MANUAL') console.log('✅ Sucesso: Item inativo ignorado, seguiu para fallback manual');
  else console.log('❌ Falha: Item inativo não foi bloqueado. SKU:', res2.sku);

  // Teste 3: Prioridade 3 - Item Padrão Global
  console.log('\nTeste 3: Prioridade 3 - Item Padrão Global (Camera/IP)');
  const res3 = await technicalScopeResolver.findItemWithFallback('Camera', 'Nome Errado', 0, { tech: 'ip' });
  if (res3.sku === 'NTC-CAM-001' && res3.origin === 'GLOBAL_DEFAULT') console.log('✅ Sucesso: Resolveu via Padrão Global');
  else console.log('❌ Falha: Prioridade Padrão Global falhou. SKU:', res3.sku, 'Origin:', res3.origin);

  // Teste 4: Fallback Proibido
  console.log('\nTeste 4: Fallback Proibido (Categoria: Recorder)');
  const res4 = await technicalScopeResolver.findItemWithFallback('Recorder', 'Item Inexistente', 500);
  if (res4.sku === 'BLOCK' && res4.error === 'FALLBACK_FORBIDDEN') console.log('✅ Sucesso: Bloqueou fallback manual para categoria restrita');
  else console.log('❌ Falha: Não bloqueou fallback proibido. SKU:', res4.sku);

  // Teste 5: Fallback Permitido
  console.log('\nTeste 5: Fallback Permitido (Categoria: Acessorio)');
  const res5 = await technicalScopeResolver.findItemWithFallback('Acessorio', 'Item Inexistente', 25);
  if (res5.sku === 'FALLBACK' && res5.preco_custo === 25) console.log('✅ Sucesso: Permitiu fallback manual quando autorizado');
  else console.log('❌ Falha: Bloqueou fallback indevidamente. SKU:', res5.sku);
}

testResolution().catch(console.error);
