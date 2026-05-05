const assert = require('node:assert');
const test = require('node:test');
const { calcRetentionDays, calcHDForDays } = require('../utils/storage-calculator');

test('Cálculo de Storage - Bug Fixes', async (t) => {

  await t.test('BUG 1: Deve retornar erro em vez de NaN para HD de cliente não informado', () => {
    // Cenário: Cliente tem HD mas não informa o tamanho (`undefined`)
    const res = calcRetentionDays(undefined, 4, '2MP');
    assert.strictEqual(res.error, 'HD_INVALIDO', 'Deveria retornar um erro de HD inválido');
    assert.strictEqual(res.days, null, 'Os dias de retenção deveriam ser nulos');
  });

  await t.test('BUG 3: Deve dimensionar HD de 8TB para 8 câmeras 8MP por 30 dias', () => {
    // Cenário: 8 câmeras 8MP (32GB/dia/cam) = 256GB/dia
    // Para 30 dias = 7680 GB
    // Com overhead de 10% = 7680 / 0.9 = 8533 GB = ~8.33 TB
    const hdLabel = calcHDForDays(30, 8, '8MP');
    assert.strictEqual(hdLabel.includes('10TB'), true, 'Deveria selecionar um HD de 10TB para cobrir 8.33TB');
  });

  await t.test('BUG 3: Deve dimensionar HD maior que 12TB', () => {
    const hdLabel = calcHDForDays(30, 16, '8MP'); // Exigiria ~16.66 TB
    assert.strictEqual(hdLabel.includes('Múltiplos HDs'), true, 'Deveria alertar sobre múltiplos HDs');
  });

});
