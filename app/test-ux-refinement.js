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

async function testUX() {
  console.log('🦉 NOCTUA UX REFINEMENT QA');
  console.log('==========================');

  const scenarios = [
    {
      name: 'Resolução por Número (Opção 1)',
      questionId: 'infra_status',
      input: '1',
      expected: 'Sim (Existente)'
    },
    {
      name: 'Resolução por Texto Parcial',
      questionId: 'route_type',
      input: 'difícil',
      expected: 'Difícil'
    },
    {
      name: 'Dias de Gravação (Opção 2)',
      questionId: 'recording_days',
      input: '2',
      expected: '15'
    },
    {
      name: 'Dias de Gravação (Texto Livre/Outro)',
      questionId: 'recording_days',
      input: '45',
      expected: '45'
    },
    {
        name: 'Confirmação Padrão (Opção 1)',
        questionId: 'confirm_standard',
        input: '1',
        expected: 'padrão'
    }
  ];

  for (const s of scenarios) {
    const result = technicalScopeResolver.resolvePendingTechnicalAnswer(s.input, s.questionId);
    if (result === s.expected) {
      console.log(`✅ ${s.name}: OK ("${s.input}" -> "${result}")`);
    } else {
      console.log(`❌ ${s.name}: FALHOU ("${s.input}" -> Esperado: "${s.expected}", Obtido: "${result}")`);
    }
  }

  console.log('\nTestando Lógica Condicional (Cabo Estimado vs Detalhado)');
  const questions = technicalScopeResolver.GLOBAL_TECH_QUESTIONS;
  
  const scopeEstimado = { cable_calc_mode: 'estimado' };
  const distQuestion = questions.find(q => q.id === 'distances');
  
  if (distQuestion && distQuestion.condition && !distQuestion.condition(scopeEstimado)) {
    console.log('✅ Pergunta de distâncias OCULTADA em modo estimado.');
  } else {
    console.log('❌ Pergunta de distâncias DEVERIA estar oculta em modo estimado.');
  }

  const scopeDetalhado = { cable_calc_mode: 'detalhado' };
  if (distQuestion && distQuestion.condition && distQuestion.condition(scopeDetalhado)) {
    console.log('✅ Pergunta de distâncias EXIBIDA em modo detalhado.');
  } else {
    console.log('❌ Pergunta de distâncias DEVERIA estar visível em modo detalhado.');
  }
}

testUX().catch(console.error);
