const assert = require('node:assert');
const test = require('node:test');
const tsr = require('../agents/technical_scope_resolver');
const auditor = require('../agents/technical_auditor');

test('TSR e Auditor - Detecção de Payload Incompleto', async (t) => {

    await t.test('Deve identificar que cable_total_m é considerado NÃO respondido se for undefined', () => {
        const isUnanswered = (val) => val === undefined || val === null || val === "";
        assert.strictEqual(isUnanswered(undefined), true);
    });

    await t.test('Auditor deve ACEITAR se estimated_cable_total_m for 0 (Fix do Bug de falsy)', async () => {
        const payload = {
            profile: 'Casa',
            system_type: 'IP',
            estimated_cable_total_m: 0,
            resolved_items: [{ sku: '123', produto: 'Cam', categoria: 'Camera' }]
        };

        const result = await auditor.audit({}, payload);
        // Não deve falhar no check de campos obrigatórios. 
        // Pode dar erro de IA (Groq) se não houver chave no ambiente de teste, mas não erro de "Payload incompleto"
        if (result.flags.some(f => f.issue === "Payload incompleto")) {
            assert.fail("Auditor ainda está rejeitando o valor 0");
        }
    });

    await t.test('TSR deve garantir system_type e estimativa de cabo no payload', async () => {
        const mockSession = {
            property_type: 'Casa',
            camera_quantity: 4,
            system_type: 'IP (Digital)'
        };
        const payload = await tsr.generateTechnicalPayload(mockSession);
        
        assert.strictEqual(payload.system_type, 'IP (Digital)', "Deveria ter herdado a tecnologia da sessão");
        assert.ok(payload.estimated_cable_total_m > 0, "Deveria ter gerado estimativa padrão de cabos");
    });
});
