const { calcRetentionDays, parseCapacity } = require('./storage-calculator');

console.log("--- TESTES DE STORAGE ---");

const runTest = (hd, cams, res, expectedMin, expectedMax) => {
    const result = calcRetentionDays(hd, cams, res);
    if (result.error) {
        console.log(`[FAIL/ERR] HD:${hd}, Cams:${cams}, Res:${res} -> Error: ${result.error}`);
        return;
    }
    const pass = result.days >= expectedMin && result.days <= expectedMax;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] HD:${hd}, Cams:${cams}, Res:${res} -> Days: ${result.days} (Expect ${expectedMin}-${expectedMax})`);
};

// S015: Caso real 2TB, 8 cams 2MP (~24 dias)
runTest(2, 8, '2MP', 20, 28);

// S007: 2, 8, 2MP
runTest(2, 8, '2MP', 20, 28);

// S008: 1, 8, 2MP
runTest(1, 8, '2MP', 10, 14);

// S009: 4, 8, 2MP
runTest(4, 8, '2MP', 40, 56);

// S010: 0 cams
const r1 = calcRetentionDays(2, 0, '2MP');
console.log(`[${r1.error ? 'PASS' : 'FAIL'}] 0 Câmeras -> ${r1.error || 'Should have failed'}`);

// S011: 0 TB
const r2 = calcRetentionDays(0, 8, '2MP');
console.log(`[${r2.error ? 'PASS' : 'FAIL'}] 0 TB -> ${r2.error || 'Should have failed'}`);

// S012: Resolução desconhecida
runTest(2, 8, 'XPTO', 20, 28);

// Teste Vírgula BR e GB
console.log(`Parser '2,5TB': ${parseCapacity('2,5TB')} (Expect 2.5)`);
console.log(`Parser '500GB': ${parseCapacity('500GB')} (Expect ~0.48)`);

console.log("--- FIM ---");
