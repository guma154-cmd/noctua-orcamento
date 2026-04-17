// --- NOCTUA OPERATIONAL MESSAGING QA ---
const orcamento = require('./src/agents/orcamento');

async function testMessaging() {
  console.log('🦉 NOCTUA OPERATIONAL MESSAGING QA');
  console.log('===================================\n');

  // Simulando um payload técnico com múltiplas incompatibilidades
  const mockPayload = {
    technical_payload: {
      system_type: 'ip',
      selected_recorder: { produto: 'NVR 32 Canais IP' },
      selected_hd: { produto: 'HD 8TB SkyHawk' },
      estimated_cable_total_m: 350,
      distance_risk: true,
      requires_human_review: true,
      incompatibilities: [
        'BLOCK_DISTANCE_LIMIT',
        'REVIEW_STORAGE_ABOVE_STANDARD',
        'ALERT_FALLBACK_USED',
        'REVIEW_SWITCH_BACKBONE_REQUIRED',
        'BLOCK_CATALOG_CRITICAL_MISSING'
      ],
      resolved_items: [
        { produto: 'NVR 32 Canais IP', qtd: 1, preco_custo: 3200 },
        { produto: 'Câmera IP', qtd: 20, preco_custo: 250 }
      ]
    },
    financeiro: {
      custoTotal: 8200,
      custoMaterial: 7500,
      custoInstalacao: 700,
      valorModeloA: 1500,
      valorModeloB: 12000,
      isTicketMinimo: false,
      detalhes: {
        camera: { produto: 'Câmera IP', preco_custo: 250 },
        dvr: { produto: 'NVR 32 Canais IP', preco_custo: 3200 },
        hd: { produto: 'HD 8TB SkyHawk', preco_custo: 1400 },
        acessorios: [],
        cabo: { produto: 'Cabo UTP', qtd: 350, preco_custo: 3.5 }
      }
    },
    escopo: {
      nome_cliente: 'Rafael Teste UX',
      quantidade: 20
    },
    orcamento_id: 'QA-MSG-001'
  };

  // Injetando o payload técnico no escopo para o motor de relatório
  mockPayload.escopo.technical_payload = mockPayload.technical_payload;

  console.log('Gerando Relatório Operacional Traduzido...');
  const report = orcamento.gerarRelatorioOperacional('B', mockPayload);
  
  console.log(report);

  // Verificações
  if (report.includes('[CRITICAL] LIMITE DE DISTÂNCIA EXCEDIDO')) console.log('✅ Tradução de BLOCK OK');
  if (report.includes('[WARNING] ARMAZENAMENTO ACIMA DO PADRÃO')) console.log('✅ Tradução de REVIEW OK');
  if (report.includes('[INFO] PREÇO DE SEGURANÇA APLICADO')) console.log('✅ Tradução de ALERT OK');
  if (report.includes('Ação: Adicionar metragem de cabo CAT6')) console.log('✅ Ação recomendada exibida OK');
}

testMessaging().catch(console.error);
