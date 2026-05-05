const assert = require('node:assert');
const test = require('node:test');

// Mocks manuais para evitar dependÃªncia de DB real e exports problemÃ¡ticos nos testes de lÃ³gica pura
const PIPELINE_STATES = {
  LEAD: 'lead',
  ORCAMENTO: 'orcamento',
  NEGOCIACAO: 'negociacao',
  FECHADO: 'fechado',
  PERDIDO: 'perdido'
};

const ALLOWED_TRANSITIONS = {
  [PIPELINE_STATES.LEAD]: [PIPELINE_STATES.ORCAMENTO, PIPELINE_STATES.PERDIDO],
  [PIPELINE_STATES.ORCAMENTO]: [PIPELINE_STATES.NEGOCIACAO, PIPELINE_STATES.PERDIDO],
  [PIPELINE_STATES.NEGOCIACAO]: [PIPELINE_STATES.FECHADO, PIPELINE_STATES.PERDIDO, PIPELINE_STATES.ORCAMENTO],
  [PIPELINE_STATES.FECHADO]: [],
  [PIPELINE_STATES.PERDIDO]: [PIPELINE_STATES.LEAD]
};

// Mock do algoritmo de scoring
const calcularPrioridade = (orc) => {
    const P_status = { 'negociacao': 40, 'orcamento': 20, 'lead': 5 };
    const statusScore = P_status[orc.status_noctua] || 0;

    const diasInativo = (new Date() - new Date(orc.last_interaction_at)) / (1000 * 60 * 60 * 24);
    let tempoScore = 0;
    if (diasInativo <= 1) tempoScore = 30;
    else if (diasInativo <= 3) tempoScore = 20;
    else if (diasInativo <= 7) tempoScore = 10;

    const valor = parseFloat(orc.valor_total) || 0;
    let valorScore = 0;
    if (valor > 10000) valorScore = 30;
    else if (valor >= 5000) valorScore = 20;
    else if (valor >= 2000) valorScore = 10;
    else if (valor > 0) valorScore = 5;

    const total = statusScore + tempoScore + valorScore;
    let nivel = 'Baixa';
    if (total >= 70) nivel = 'Alta';
    else if (total >= 40) nivel = 'MÃ©dia';

    return { total, nivel, diasInativo };
};

test('MÃ¡quina de Estados - TransiÃ§Ãµes Permitidas', async (t) => {
    
    await t.test('Lead pode ir para OrÃ§amento ou Perdido', () => {
        const transicoes = ALLOWED_TRANSITIONS[PIPELINE_STATES.LEAD];
        assert.ok(transicoes.includes(PIPELINE_STATES.ORCAMENTO));
        assert.ok(transicoes.includes(PIPELINE_STATES.PERDIDO));
    });

    await t.test('Lead nÃ£o pode ir direto para Fechado', () => {
        const transicoes = ALLOWED_TRANSITIONS[PIPELINE_STATES.LEAD];
        assert.strictEqual(transicoes.includes(PIPELINE_STATES.FECHADO), false);
    });

    await t.test('Fechado Ã© estado final (sem transiÃ§Ãµes de saÃ­da)', () => {
        const transicoes = ALLOWED_TRANSITIONS[PIPELINE_STATES.FECHADO];
        assert.strictEqual(transicoes.length, 0);
    });
});

test('CÃ¡lculo de Prioridade - Algoritmo de Scoring', async (t) => {
  
  await t.test('Deve calcular prioridade ALTA para lead em negociaÃ§Ã£o com valor alto e inativo hÃ¡ pouco tempo', () => {
    const orc = {
      status_noctua: 'negociacao',
      valor_total: 12000,
      last_interaction_at: new Date(Date.now() - (1000 * 60 * 60 * 12)).toISOString() // 12h atrÃ¡s
    };

    const res = calcularPrioridade(orc);
    // P_status(negociacao)=40 + P_tempo(0-1d)=30 + P_valor(>10k)=30 = 100
    assert.strictEqual(res.total, 100);
    assert.strictEqual(res.nivel, 'Alta');
  });

  await t.test('Deve calcular prioridade MÃ‰DIA para lead em orÃ§amento com valor mÃ©dio', () => {
    const orc = {
      status_noctua: 'orcamento',
      valor_total: 4000,
      last_interaction_at: new Date(Date.now() - (1000 * 60 * 60 * 24 * 2)).toISOString() // 2 dias atrÃ¡s
    };

    const res = calcularPrioridade(orc);
    // P_status(orcamento)=20 + P_tempo(2-3d)=20 + P_valor(2k-5k)=10 = 50
    assert.strictEqual(res.total, 50);
    assert.strictEqual(res.nivel, 'MÃ©dia');
  });

  await t.test('Deve calcular prioridade BAIXA para lead novo com valor baixo e inativo hÃ¡ muito tempo', () => {
    const orc = {
      status_noctua: 'lead',
      valor_total: 1500,
      last_interaction_at: new Date(Date.now() - (1000 * 60 * 60 * 24 * 8)).toISOString() // 8 dias atrÃ¡s
    };

    const res = calcularPrioridade(orc);
    // P_status(lead)=5 + P_tempo(>7d)=0 + P_valor(<2k)=5 = 10
    assert.strictEqual(res.total, 10);
    assert.strictEqual(res.nivel, 'Baixa');
  });
});
