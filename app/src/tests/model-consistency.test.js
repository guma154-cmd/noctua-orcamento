const assert = require('node:assert');
const test = require('node:test');
const orcamento = require('../agents/orcamento');
const memoria = require('../agents/memoria');

test('Consistência de Modelo (BUG 2)', async (t) => {

    await t.test('Deve usar o modelo persistido para gerar a proposta final', async () => {
        // Mock do que o bot.js faz
        const orcData = {
            escopo: JSON.stringify({
                nome_cliente: 'Cliente Teste',
                property_type: 'Casa',
                camera_quantity: 4,
                budget_model: 'C' // Modelo persistido no DB
            }),
            budget_model: 'C' // Coluna salva no DB
        };
        
        // Simulação do `executeBudgetWorkflow` que o bot chama
        const escopo = JSON.parse(orcData.escopo);
        const result = await orcamento.calcularOrcamento(escopo, 'TEST-123');

        // Extrai a proposta correta com base no modelo do DB
        const model = orcData.budget_model || 'A';
        const propostaFinal = result.propostas[`modelo_${model.toLowerCase()}`];

        assert.ok(propostaFinal.includes('SOLUÇÃO MISTA'), "A proposta final deveria ser do Modelo C, conforme salvo no DB");
    });
});
