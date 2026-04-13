const orcamento = require('./src/agents/orcamento');

const escopo = {
  perfil: 'Casa',
  quantidade: 4,
  ambiente: 'Externo',
  nome_cliente: 'Teste'
};

const orcamento_id = 'ORC-123456';

async function test() {
  const result = await orcamento.calcularOrcamento(escopo, orcamento_id);
  console.log('--- MODELO A ---');
  console.log(result.propostas.modelo_a);
  console.log('\n--- MODELO B ---');
  console.log(result.propostas.modelo_b);
  
  const relatorio = orcamento.gerarRelatorioOperacional('B', result);
  console.log('\n--- RELATORIO OPERACIONAL B ---');
  console.log(relatorio);
}

test().catch(console.error);
