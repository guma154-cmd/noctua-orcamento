const intake = require('./src/agents/intake');
const qualificacao = require('./src/agents/qualificacao');
const orcamento = require('./src/agents/orcamento');
const memoria = require('./src/agents/memoria');
const { initDb } = require('./src/db/sqlite');

async function test() {
  await initDb();
  console.log('--- INICIANDO TESTE DE FLUXO ---');

  const mensagemOriginal = "4 câmeras para apartamento";
  const user = { id: '12345', first_name: 'Rafael' };

  // 1. Intake
  console.log('1. Intake...');
  const intakeIntent = intake.classificarIntencao(mensagemOriginal);
  console.log('   Intenção:', intakeIntent);

  // 2. Qualificação
  console.log('2. Qualificação...');
  const qualResult = await qualificacao.qualificarSolicitacao(mensagemOriginal);
  console.log('   Status:', qualResult.status);
  if (qualResult.perguntas) {
    console.log('   Perguntas pendentes:', qualResult.perguntas);
  }

  // Simular resposta do operador para as perguntas
  console.log('3. Simulando resposta do operador...');
  const escopoFinal = {
    nome_cliente: 'João Silva',
    perfil: 'residencial',
    quantidade: 4,
    ambiente: 'interno',
    noturno: true,
    especificacoes: {
      resolucao: '2MP Padrão Full HD',
      infravermelho: 'Sim, IR 30m'
    }
  };

  // 4. Orçamento
  console.log('4. Gerando Orçamento...');
  const orcResult = await orcamento.calcularOrcamento(escopoFinal);
  console.log('   Relatório Interno:', JSON.stringify(orcResult.relatorioInterno, null, 2));
  
  if (orcResult.valor_final >= 450) {
    console.log('5. Mensagem Final para o Cliente:\n', orcResult.mensagemCliente);
    
    // 6. Memória
    console.log('6. Registrando na Memória...');
    const clienteId = await memoria.registrarCliente(user.id, user.first_name);
    await memoria.salvarOrcamento(clienteId, escopoFinal, orcResult.valor_final);
    console.log('   Orcamento salvo no banco de dados.');
  } else {
    console.log('   ALERTA: Ticket abaixo do mínimo!');
  }

  console.log('--- TESTE CONCLUÍDO ---');
}

test().catch(err => console.error(err));
