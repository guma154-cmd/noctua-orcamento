const DialogueEngine = require('./src/core/DialogueEngine');
const memoria = require('./src/agents/memoria');

async function testImportDecision() {
  console.log('🦉 NOCTUA IMPORT REVIEW QA');
  console.log('==========================\n');

  const chatId = 'QA-REVIEW-001';
  
  // 1. Simular Estado Pós-Ingestão (com itens mistos)
  const mockSession = {
      meta: {
          draft_id: 'DRAFT-001',
          raw_import_items: [
              { produto: 'Item Confiável', confidence: 1.0, preco_custo: 100 },
              { produto: 'Item Duvidoso', confidence: 0.3, preco_custo: 50 }
          ]
      },
      technical_payload: { requires_human_review: false, incompatibilities: [] },
      flow_status: 'awaiting_import_review'
  };

  await memoria.salvarSessao(chatId, mockSession);

  console.log('Cenário: Operador escolhe "Importar apenas confiáveis" (Opção 2)');
  const result = await DialogueEngine.process(chatId, { text: '2', type: 'text' });
  
  const updatedSession = await memoria.buscarSessao(chatId);
  const finalItems = updatedSession.technical_payload.resolved_items;

  console.log(`- Itens finais no payload: ${finalItems.length}`);
  finalItems.forEach(i => console.log(`  > ${i.produto} (Conf: ${i.confidence})`));

  if (finalItems.length === 1 && finalItems[0].confidence === 1.0) {
      console.log('\n✅ Filtro de confiança aplicado com sucesso.');
  } else {
      console.log('\n❌ Falha no filtro de confiança.');
  }

  if (updatedSession.flow_status === 'awaiting_model_choice') {
      console.log('✅ Transição para escolha de modelo OK.');
  }

  // Limpeza
  await memoria.limparSessao(chatId);
}

testImportDecision().catch(console.error);
