const assert = require('node:assert');
const test = require('node:test');
const orcamento = require('../agents/orcamento');

test('Segurança de Proposta - Story 4.3 (AC-06.1)', async (t) => {

  const mockDados = {
    orcamento_id: 'ORC-TESTE-123',
    escopo: {
      nome_cliente: 'Cliente Teste',
      property_type: 'Casa',
      camera_quantity: 4,
      budget_model: 'A'
    },
    financeiro: {
      custoMaterial: 1000,
      custoInstalacao: 500,
      valorMDO: 650,
      valorCompleto: 1950,
      isTicketMinimo: false,
      detalhes: {
        camera: { produto: 'Câmera Bullet', preco_custo: 100 },
        dvr: { produto: 'DVR 4 Canais', preco_custo: 300 },
        hd: { produto: 'HD 1TB', preco_custo: 250 },
        acessorios: [],
        cabo: { produto: 'Cabo Coaxial', preco_custo: 2 },
        infra: []
      }
    }
  };

  await t.test('Relatório Operacional DEVE conter métricas de custo e margem', () => {
    const rel = orcamento.gerarRelatorioOperacional('A', mockDados);
    // console.log('DEBUG REL:', rel);
    assert.ok(rel.includes('MÉTRICAS FINANCEIRAS') || rel.includes('METRICAS FINANCEIRAS'), 'Deveria conter seção financeira');
    assert.ok(rel.includes('30% (Fator 1.3)'), 'Deveria conter margem/fator');
  });

  await t.test('Proposta Comercial NÃO DEVE vazar dados internos (AC-06.1)', () => {
    const prop = orcamento.renderizarProposta('A', mockDados);
    // console.log('DEBUG PROP:', prop);
    
    const forbiddenTerms = [
      'custo', 'margem', 'markup', 'fator', 'ticket', 'unitário'
    ];

    forbiddenTerms.forEach(term => {
      assert.strictEqual(
        prop.toLowerCase().includes(term.toLowerCase()), 
        false, 
        `Proposta vazou o termo proibido: ${term}`
      );
    });

    // Check para valores de custo específicos (sem o R$ para evitar problemas de encoding no assert)
    assert.strictEqual(prop.includes(' 100,00'), false, 'Vazou custo unitário 100');
    assert.strictEqual(prop.includes(' 300,00'), false, 'Vazou custo unitário 300');

    // Valor final deve estar presente (formato amigável)
    assert.ok(prop.includes('1.950,00'), 'Deveria conter o valor final formatado');
  });
});
