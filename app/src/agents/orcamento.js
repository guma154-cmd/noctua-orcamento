const { db } = require("../db/sqlite");
const { TEMPLATE_CANONICO_MODELO_A, TEMPLATE_CANONICO_MODELO_B, TEMPLATE_RELATORIO_OPERACIONAL } = require("../templates/propostas");
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

  // Tradução de Alertas do Sistema
  let alertasFormatados = "• Nenhum alerta técnico detectado.";
  if (escopo.technical_payload && escopo.technical_payload.incompatibilities.length > 0) {
    const uniqueCodes = [...new Set(escopo.technical_payload.incompatibilities)];
    alertasFormatados = uniqueCodes.map(code => {
      const msg = translate(code);
      return `[${msg.severity}] ${msg.title}\n  > ${msg.message}\n  > Ação: ${msg.recommended_action}`;
    }).join('\n\n');
  }

  const listaItens = [];
  if (modelo === 'B') {
    const { camera, dvr, hd, acessorios, cabo } = financeiro.detalhes;
    const infraItems = escopo.technical_payload ? escopo.technical_payload.resolved_items.filter(i => i.categoria === 'Infra') : [];

    const itens = [
      { nome: camera.produto, qtd: qtdCameras, custo: parseFloat(camera.preco_custo) || 0 },
      { nome: dvr.produto, qtd: 1, custo: parseFloat(dvr.preco_custo) || 0 },
      { nome: hd.produto, qtd: 1, custo: parseFloat(hd.preco_custo) || 0 },
      ...(acessorios || []).map(a => ({ nome: a.produto, qtd: parseFloat(a.qtd) || 0, custo: parseFloat(a.preco_custo) || 0 })),
      ...infraItems.map(i => ({ nome: i.produto, qtd: parseFloat(i.qtd) || 0, custo: parseFloat(i.preco_custo) || 0 }))
    ];

    if (cabo) {
      itens.push({ nome: cabo.produto, qtd: parseFloat(cabo.qtd) || 0, custo: parseFloat(cabo.preco_custo) || 0 });
    }

    itens.forEach(item => {
      const custoTotal = (item.qtd * item.custo);
      const origin = item.supplied_by === 'Cliente' ? ' (Cliente)' : '';
      listaItens.push(`• ${item.nome}${origin} — ${item.qtd} x ${formatarMoeda(item.custo)} = ${formatarMoeda(custoTotal)}`);
    });
    
    if (cabo && cabo.qtd_compra > cabo.qtd) {
      listaItens.push(`_Nota: Arredondar para ${cabo.qtd_compra}m para compra._`);
    }

    if (escopo.technical_payload && escopo.technical_payload.backbone_meterage > 0) {
      listaItens.push(`_Nota Técnica: Inclui ${escopo.technical_payload.backbone_meterage}m de cabo para backbone entre switches._`);
    }
  } else {
    listaItens.push("• (Material fornecido pelo cliente)");
  }

  const subtotalMateriais = modelo === 'A' ? formatarMoeda(financeiro.custoMaterial) : "R$ 0,00";
  const valorFinal = modelo === 'A' ? financeiro.valorCompleto : financeiro.valorMDO;
  
  let relatorio = TEMPLATE_RELATORIO_OPERACIONAL
    .replace('{{orcamento_id}}', orcamento_id)
    .replace('{{cliente_nome}}', escopo.nome_cliente || 'Rafael')
    .replace('{{alertas_sistema}}', alertasFormatados)
    .replace('{{modelo_gerado}}', modelo === 'A' ? 'Modelo A (Fornecimento Completo)' : 'Modelo B (Mão de Obra)')
    .replace('{{lista_materiais}}', listaItens.join('\n'))
    .replace('{{subtotal_materiais}}', subtotalMateriais)
    .replace('{{mao_obra_instalacao}}', formatarMoeda(financeiro.custoInstalacao))
    .replace('{{margem_percentual}}', '30% (Fator 1.3)')
    .replace('{{valor_final}}', formatarMoeda(valorFinal))
    .replace('{{ticket_minimo_aplicado}}', financeiro.isTicketMinimo ? 'SIM (Ajustado para R$ 350,00)' : 'NÃO');

  return relatorio;
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
  
  const custoAcessorios = acessorios.reduce((acc, a) => acc + ((parseFloat(a.preco_custo) || 0) * (parseFloat(a.qtd) || 0)), 0);
  
  // Regra de Infraestrutura
  let custoInfra = 0;
  if (escopo.technical_payload) {
    const infraItems = escopo.technical_payload.resolved_items.filter(i => i.categoria === 'Infra');
    custoInfra = infraItems.reduce((acc, i) => acc + ((parseFloat(i.preco_custo) || 0) * (parseFloat(i.qtd) || 0)), 0);
  }

  // Regra de Cabos Comercial NOCTUA
  let custoCabo = 0;
  let caboItem = null;
  const estimatedCable = escopo.technical_payload ? parseFloat(escopo.technical_payload.estimated_cable_total_m) || 0 : 0;

  if (estimatedCable > 0) {
    const payload = escopo.technical_payload;
    const metragem = estimatedCable;
    
    // O cabo já vem resolvido do TSR com o preço correto (do banco ou fallback)
    const caboResolvido = payload.resolved_items.find(i => i.categoria === 'Cabo');
    
    if (caboResolvido) {
      const precoMetro = parseFloat(caboResolvido.preco_custo) || 0;
      const metragemCompra = Math.ceil(metragem / 10) * 10;
      custoCabo = metragem * precoMetro;
      caboItem = { 
        ...caboResolvido,
        qtd: metragem, 
        qtd_compra: metragemCompra,
        is_box: metragem > 250
      };
    }
  }

  // 1. CÁLCULO DE MÃO DE OBRA POR COMPLEXIDADE (MODELO B)
  const complexityBase = 150; // Preço base por ponto
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
  const custoMaterial = ((parseFloat(camera.preco_custo) || 0) * qtdCameras) + 
                        (parseFloat(dvr.preco_custo) || 0) + 
                        (parseFloat(hd.preco_custo) || 0) + 
                        custoAcessorios + custoCabo + custoInfra;

  const valorCompleto = (custoMaterial + custoInstalacaoEfetivo) * fatorMarkup;

  return {
    custoMaterial: isNaN(custoMaterial) ? 0 : custoMaterial,
    custoInstalacao: isNaN(custoInstalacaoEfetivo) ? 0 : custoInstalacaoEfetivo,
    valorMDO: isNaN(valorMDO) ? 0 : valorMDO,
    valorCompleto: isNaN(valorCompleto) ? 0 : valorCompleto,
    isTicketMinimo,
    detalhes: {
      camera,
      dvr,
      hd,
      acessorios,
      cabo: caboItem
    }
  };
};

const renderizarProposta = (modelo, dados) => {
  const valorMDO = formatarMoeda(dados.financeiro.valorMDO);
  const valorCompleto = formatarMoeda(dados.financeiro.valorCompleto);
  const { camera, dvr, hd } = dados.financeiro.detalhes;
  
  const rawQty = dados.escopo.quantidade || dados.escopo.camera_quantity || 0;
  const qtdNum = parseInt(rawQty) || 0;
  const labelCameras = qtdNum === 1 ? 'câmera' : 'câmeras';

  let texto = template
    .replace('{{cliente_nome}}', dados.escopo.nome_cliente || 'Cliente')
    .replace('{{local_instalacao}}', dados.escopo.perfil || 'Não informado')
    .replace('{{data_orcamento}}', new Date().toLocaleDateString('pt-BR'))
    .replace('{{orcamento_id}}', dados.orcamento_id)
    .replace('{{quantidade_cameras}}', `${qtdNum} ${labelCameras}`)
    .replace('{{descricao_cameras}}', camera.produto)
    .replace('{{quantidade_gravador}}', '1 unidade')
    .replace('{{descricao_gravador}}', dvr.produto)
    .replace('{{quantidade_hd}}', '1 unidade')
    .replace('{{descricao_hd}}', hd.produto)
    .replace('{{periodo_gravacao}}', dados.escopo.technical_payload && dados.escopo.technical_payload.retention_days_estimate ? `${dados.escopo.technical_payload.retention_days_estimate} dias (Baseado no HD do cliente)` : `${dados.escopo.recording_days || 15} dias (Dimensionamento Noctua)`)
    .replace('{{valor_modelo_a}}', valorCompleto) // NOVO PADRÃO: A = COMPLETO
    .replace('{{valor_modelo_b}}', valorMDO)      // NOVO PADRÃO: B = MDO
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
          modelo_b: renderizarProposta('B', { escopo, orcamento_id, financeiro })
        }
      };

      resolve(payload);
    });
  });
};

module.exports = { calcularOrcamento, renderizarProposta, gerarRelatorioOperacional };
