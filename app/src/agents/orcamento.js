const { db } = require("../db/sqlite");
const { TEMPLATE_CANONICO_MODELO_A, TEMPLATE_CANONICO_MODELO_B, TEMPLATE_CANONICO_MODELO_C, TEMPLATE_RELATORIO_OPERACIONAL } = require("../templates/propostas");
const { translate } = require("../utils/operational_messages");

/**
 * MOTOR DE CÁLCULO E RENDERIZAÇÃO NOCTUA
 */

const formatarMoeda = (valor) => {
  const num = parseFloat(valor);
  if (isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

const gerarRelatorioOperacional = (modelo, dados) => {
  const financeiro = dados.financeiro;
  const escopo = dados.escopo;
  const orcamento_id = dados.orcamento_id;
  const rawQty = escopo.quantidade || escopo.camera_quantity || 0;
  const qtdCameras = parseInt(rawQty) || 0;

  // SEÇÃO: COMPOSIÇÃO TÉCNICA (V5)
  let composiçãoTecnica = "══════════════════════════════════════\n🔧 COMPOSIÇÃO TÉCNICA\n══════════════════════════════════════\n";
  if (escopo.technical_payload) {
    const payload = escopo.technical_payload;
    composiçãoTecnica += `Tecnologia:  ${(escopo.system_type || "Não definida").split(' ')[0]}\n`;
    composiçãoTecnica += `Gravador:    ${payload.selected_recorder?.produto || "Não definido"}\n`;
    composiçãoTecnica += `Câmeras:     ${qtdCameras} x ${payload.selected_camera?.produto || "Câmera Padrão"}\n`;
    composiçãoTecnica += `Cabo:        ${payload.resolved_items.find(i => i.categoria === 'Cabo')?.produto || "Cabo Padrão"}\n`;
    if (payload.network_topology) {
        composiçãoTecnica += `Topologia:   ${payload.network_topology}\n`;
    }
  } else {
    composiçãoTecnica += "Composição técnica não gerada automaticamente.\n";
  }
  composiçãoTecnica += "══════════════════════════════════════\n\n";

  // Tradução de Alertas do Sistema
  let alertasFormatados = "• Nenhum alerta técnico detectado.";
  if (escopo.technical_payload && escopo.technical_payload.incompatibilities.length > 0) {
    const uniqueCodes = [...new Set(escopo.technical_payload.incompatibilities)];
    alertasFormatados = uniqueCodes.map(code => {
      const msg = translate(code);
      return `[${msg.severity}] ${msg.title}\n  > ${msg.message}\n  > Ação: ${msg.recommended_action}`;
    }).join('\n\n');
  }

  const { camera, dvr, hd, acessorios, cabo, infra } = financeiro.detalhes;
  const listaItens = [];

  const addToList = (item, qtd) => {
    if (!item) return;
    const origin = item.supplied_by === 'Cliente fornece' ? ' (CLIENTE)' : '';
    const valorItem = item.supplied_by === 'Cliente fornece' ? 'R$ 0,00' : formatarMoeda(item.preco_custo);
    const custoTotal = item.supplied_by === 'Cliente fornece' ? 0 : (qtd * (parseFloat(item.preco_custo) || 0));
    listaItens.push(`• ${item.produto}${origin} — ${qtd} x ${valorItem} = ${formatarMoeda(custoTotal)}`);
  };

  addToList(camera, qtdCameras);
  addToList(dvr, 1);
  addToList(hd, 1);
  (acessorios || []).forEach(a => addToList(a, a.qtd));
  if (cabo) addToList(cabo, cabo.qtd);
  (infra || []).forEach(i => addToList(i, i.qtd));

  if (cabo && cabo.qtd_compra > cabo.qtd && cabo.supplied_by !== 'Cliente fornece') {
    listaItens.push(`_Nota: Arredondar para ${cabo.qtd_compra}m para compra._`);
  }

  const subtotalMateriais = formatarMoeda(financeiro.custoMaterial);
  const valorFinal = modelo === 'B' ? financeiro.valorMDO : financeiro.valorCompleto;
  
  const labelsModelo = {
      'A': 'Modelo A (Fornecimento Completo)',
      'B': 'Modelo B (Mão de Obra Pura)',
      'C': 'Modelo C (Fornecimento Misto)'
  };

  // SEÇÃO: ESTIMATIVA DE GRAVAÇÃO (V5)
  let storageMessage = "\n══════════════════════════════════════\n";
  const retention = escopo.technical_payload?.retention_estimate;
  
  if (retention && !retention.error) {
    storageMessage += retention.message;
  } else {
    storageMessage += `📼 ESTIMATIVA DE GRAVAÇÃO\nHD não informado — estimativa indisponível.\nSolicite ao cliente a capacidade do HD para\ncalcular o tempo de gravação.`;
  }
  storageMessage += "\n══════════════════════════════════════\n";

  let relatorio = TEMPLATE_RELATORIO_OPERACIONAL
    .replace('{{orcamento_id}}', orcamento_id)
    .replace('{{cliente_nome}}', escopo.nome_cliente || 'Rafael')
    .replace('{{alertas_sistema}}', alertasFormatados)
    .replace('{{modelo_gerado}}', labelsModelo[modelo] || labelsModelo[escopo.budget_model] || 'Modelo Personalizado')
    .replace('{{lista_materiais}}', listaItens.join('\n'))
    .replace('{{subtotal_materiais}}', subtotalMateriais)
    .replace('{{mao_obra_instalacao}}', formatarMoeda(financeiro.custoInstalacao))
    .replace('{{margem_percentual}}', '30% (Fator 1.3)')
    .replace('{{valor_final}}', formatarMoeda(valorFinal))
    .replace('{{ticket_minimo_aplicado}}', financeiro.isTicketMinimo ? 'SIM (Ajustado para R$ 350,00)' : 'NÃO');

  return composiçãoTecnica + relatorio + storageMessage;
};

const calcularDadosFinanceiros = (escopo, materiais) => {
  let camera, dvr, hd, acessorios = [];
  const rawQty = escopo.quantidade || escopo.camera_quantity || 0;
  const qtdCameras = parseInt(rawQty) || 0;

  if (escopo.technical_payload) {
    const payload = escopo.technical_payload;
    camera = payload.resolved_items.find(i => i.categoria === 'Camera') || { preco_custo: 150, produto: 'Camera 2MP' };
    dvr = payload.resolved_items.find(i => i.categoria === 'Recorder') || { preco_custo: 350, produto: 'DVR 4 Canais' };
    hd = payload.resolved_items.find(i => i.categoria === 'HD') || { preco_custo: 300, produto: 'HD 1TB' };
    acessorios = payload.resolved_items.filter(i => i.categoria === 'Acessorio');
  } else {
    camera = materiais.find(r => r.produto.toLowerCase().includes('camera')) || { preco_custo: 150, produto: 'Camera 2MP' };
    dvr = materiais.find(r => r.produto.toLowerCase().includes('dvr')) || { preco_custo: 350, produto: 'DVR 4 Canais' };
    hd = materiais.find(r => r.produto.toLowerCase().includes('hd')) || { preco_custo: 300, produto: 'HD 1TB' };
  }
  
  // Função auxiliar para determinar fonte por categoria
  const getSource = (category) => {
    if (escopo.budget_model === 'A') return 'NOCTUA fornece';
    if (escopo.budget_model === 'B') return 'Cliente fornece';
    if (category === 'Camera') return escopo.source_cameras || 'NOCTUA fornece';
    if (category === 'Recorder') return escopo.source_recorder || 'NOCTUA fornece';
    if (category === 'Cabo') return escopo.source_cables || 'NOCTUA fornece';
    if (category === 'Infra') return escopo.source_infra || 'NOCTUA fornece';
    if (category === 'HD') return (escopo.recording_required === 'Já possuo o HD' || escopo.source_recorder === 'Cliente fornece') ? 'Cliente fornece' : 'NOCTUA fornece';
    return 'NOCTUA fornece';
  };

  const isClient = (cat) => getSource(cat) === 'Cliente fornece';

  const custoAcessorios = acessorios.reduce((acc, a) => {
    // Acessórios seguem a fonte das Câmeras por padrão
    if (isClient('Camera')) return acc;
    return acc + ((parseFloat(a.preco_custo) || 0) * (parseFloat(a.qtd) || 0));
  }, 0);
  
  // Regra de Infraestrutura
  let custoInfra = 0;
  let infraItems = [];
  if (escopo.technical_payload) {
    infraItems = escopo.technical_payload.resolved_items.filter(i => i.categoria === 'Infra');
    if (!isClient('Infra')) {
        custoInfra = infraItems.reduce((acc, i) => acc + ((parseFloat(i.preco_custo) || 0) * (parseFloat(i.qtd) || 0)), 0);
    }
  }

  // Regra de Cabos
  let custoCabo = 0;
  let caboItem = null;
  const estimatedCable = escopo.technical_payload ? parseFloat(escopo.technical_payload.estimated_cable_total_m) || 0 : 0;

  if (estimatedCable > 0) {
    const payload = escopo.technical_payload;
    const caboResolvido = payload.resolved_items.find(i => i.categoria === 'Cabo');
    
    if (caboResolvido) {
      const precoMetro = parseFloat(caboResolvido.preco_custo) || 0;
      const metragemCompra = Math.ceil(estimatedCable / 10) * 10;
      if (!isClient('Cabo')) {
          custoCabo = estimatedCable * precoMetro;
      }
      caboItem = { 
        ...caboResolvido,
        qtd: estimatedCable, 
        qtd_compra: metragemCompra,
        is_box: estimatedCable > 250,
        supplied_by: getSource('Cabo')
      };
    }
  }

  // Marcar outros itens com fonte
  camera.supplied_by = getSource('Camera');
  dvr.supplied_by = getSource('Recorder');
  hd.supplied_by = getSource('HD');

  // 1. CÁLCULO DE MÃO DE OBRA POR COMPLEXIDADE
  const complexityBase = 150; 
  const factors = {
    installation: { 'Parede normal': 0, 'Teto': 30, 'Altura > 3m': 80, 'Fachada': 150 },
    path: { 'Embutida existente': 0, 'Calha/Eletroduto': 40, 'Sobreposta': 20, 'Requer quebra de alvenaria': 120 }
  };

  const addInst = factors.installation[escopo.installation_complexity] || 0;
  const addPath = factors.path[escopo.cable_path_complexity] || 0;
  const extraConfig = (escopo.include_remote_config === 'Sim' ? 100 : 0);
  const extraTraining = (escopo.include_training === 'Sim' ? 50 : 0);

  const custoInstalacaoPuro = (qtdCameras * (complexityBase + addInst + addPath)) + extraConfig + extraTraining;
  const fatorMarkup = 1.3;

  let valorMDO = custoInstalacaoPuro * fatorMarkup;
  let isTicketMinimo = false;

  if (valorMDO < 350) {
    valorMDO = 350;
    isTicketMinimo = true;
  }

  const custoInstalacaoEfetivo = valorMDO / fatorMarkup;

  // 2. CÁLCULO DE MATERIAL (MODELO A / C)
  let custoMaterialTotal = 0;
  if (!isClient('Camera')) custoMaterialTotal += (parseFloat(camera.preco_custo) || 0) * qtdCameras;
  if (!isClient('Recorder')) custoMaterialTotal += (parseFloat(dvr.preco_custo) || 0);
  if (!isClient('HD')) custoMaterialTotal += (parseFloat(hd.preco_custo) || 0);
  custoMaterialTotal += custoAcessorios + custoCabo + custoInfra;

  const valorCompleto = (custoMaterialTotal + custoInstalacaoEfetivo) * fatorMarkup;

  return {
    custoMaterial: isNaN(custoMaterialTotal) ? 0 : custoMaterialTotal,
    custoInstalacao: isNaN(custoInstalacaoEfetivo) ? 0 : custoInstalacaoEfetivo,
    valorMDO: isNaN(valorMDO) ? 0 : valorMDO,
    valorCompleto: isNaN(valorCompleto) ? 0 : valorCompleto,
    isTicketMinimo,
    detalhes: {
      camera,
      dvr,
      hd,
      acessorios: acessorios.map(a => ({ ...a, supplied_by: getSource('Camera') })),
      cabo: caboItem,
      infra: infraItems.map(i => ({ ...i, supplied_by: getSource('Infra') }))
    }
  };
};

const renderizarProposta = (modelo, dados) => {
  const templates = {
    'A': TEMPLATE_CANONICO_MODELO_A,
    'B': TEMPLATE_CANONICO_MODELO_B,
    'C': TEMPLATE_CANONICO_MODELO_C
  };
  
  const template = templates[modelo] || TEMPLATE_CANONICO_MODELO_A;
  const valorMDO = formatarMoeda(dados.financeiro.valorMDO);
  const valorCompleto = formatarMoeda(dados.financeiro.valorCompleto);
  const { camera, dvr, hd } = dados.financeiro.detalhes;
  
  const rawQty = dados.escopo.quantidade || dados.escopo.camera_quantity || 0;
  const qtdNum = parseInt(rawQty) || 0;
  const labelCameras = qtdNum === 1 ? 'câmera' : 'câmeras';

  let texto = template
    .replace('{{cliente_nome}}', dados.escopo.nome_cliente || 'Cliente')
    .replace('{{local_instalacao}}', dados.escopo.perfil || dados.escopo.property_type || 'Não informado')
    .replace('{{data_orcamento}}', new Date().toLocaleDateString('pt-BR'))
    .replace('{{orcamento_id}}', dados.orcamento_id)
    .replace('{{quantidade_cameras}}', `${qtdNum} ${labelCameras}`)
    .replace('{{descricao_cameras}}', camera.produto)
    .replace('{{quantidade_gravador}}', '1 unidade')
    .replace('{{descricao_gravador}}', dvr.produto)
    .replace('{{quantidade_hd}}', '1 unidade')
    .replace('{{descricao_hd}}', hd.produto)
    .replace('{{periodo_gravacao}}', (dados.escopo.technical_payload && dados.escopo.technical_payload.retention_estimate && !dados.escopo.technical_payload.retention_estimate.error) 
        ? `${dados.escopo.technical_payload.retention_estimate.days} dias` 
        : `${dados.escopo.recording_days || 15} dias`)
    .replace('{{valor_modelo_a}}', valorCompleto)
    .replace('{{valor_modelo_b}}', valorMDO)
    .replace('{{valor_modelo_c}}', valorCompleto) // No modelo C, valorCompleto já desconta itens do cliente
    .replace('{{forma_pagamento}}', 'A combinar (Pix / Cartão)')
    .replace(/{{linha_extra_.*?}}/g, '');

  return texto;
};

const calcularOrcamento = async (escopo, orcamento_id) => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM fornecedores_v2", async (err, rows) => {
      if (err) return reject(err);

      const financeiro = calcularDadosFinanceiros(escopo, rows);
      
      const payload = {
        escopo,
        orcamento_id,
        financeiro,
        propostas: {
          modelo_a: renderizarProposta('A', { escopo, orcamento_id, financeiro }),
          modelo_b: renderizarProposta('B', { escopo, orcamento_id, financeiro }),
          modelo_c: renderizarProposta('C', { escopo, orcamento_id, financeiro })
        }
      };

      resolve(payload);
    });
  });
};

module.exports = { calcularOrcamento, renderizarProposta, gerarRelatorioOperacional };
