const { db } = require("../db/sqlite");
const { TEMPLATE_CANONICO_MODELO_A, TEMPLATE_CANONICO_MODELO_B, TEMPLATE_RELATORIO_OPERACIONAL } = require("../templates/propostas");

/**
 * MOTOR DE CÁLCULO E RENDERIZAÇÃO NOCTUA
 */

const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

const gerarRelatorioOperacional = (modelo, dados) => {
  const financeiro = dados.financeiro;
  const escopo = dados.escopo;
  const orcamento_id = dados.orcamento_id;

  const listaItens = [];
  if (modelo === 'B') {
    const { camera, dvr, hd } = financeiro.detalhes;
    const itens = [
      { nome: camera.produto, qtd: escopo.quantidade, custo: camera.preco_custo },
      { nome: dvr.produto, qtd: 1, custo: dvr.preco_custo },
      { nome: hd.produto, qtd: 1, custo: hd.preco_custo }
    ];

    itens.forEach(item => {
      listaItens.push(`• ${item.nome} — ${item.qtd} x ${formatarMoeda(item.custo)} = ${formatarMoeda(item.qtd * item.custo)}`);
    });
  } else {
    listaItens.push("• (Material fornecido pelo cliente)");
  }

  const subtotalMateriais = modelo === 'B' ? formatarMoeda(financeiro.custoMaterial) : "R$ 0,00";
  const valorFinal = modelo === 'A' ? financeiro.valorModeloA : financeiro.valorModeloB;
  const ticketMinimo = 350.0;

  let relatorio = TEMPLATE_RELATORIO_OPERACIONAL
    .replace('{{orcamento_id}}', orcamento_id)
    .replace('{{cliente_nome}}', escopo.nome_cliente || 'Rafael')
    .replace('{{modelo_gerado}}', modelo === 'A' ? 'Modelo A (Mão de Obra)' : 'Modelo B (Material + MDO)')
    .replace('{{nivel_preco}}', 'Standard')
    .replace('{{lista_materiais}}', listaItens.join('\n'))
    .replace('{{subtotal_materiais}}', subtotalMateriais)
    .replace('{{mao_obra_instalacao}}', formatarMoeda(financeiro.custoInstalacao))
    .replace('{{margem_percentual}}', '30% (Fator 1.3)')
    .replace('{{valor_final}}', formatarMoeda(valorFinal))
    .replace('{{ticket_minimo_aplicado}}', financeiro.isTicketMinimo ? 'SIM (Ajustado para R$ 350,00)' : 'NÃO (Valor acima do piso)');

  return relatorio;
};

const calcularDadosFinanceiros = (escopo, materiais) => {
  const camera = materiais.find(r => r.produto.toLowerCase().includes('camera')) || { preco_custo: 150 };
  const dvr = materiais.find(r => r.produto.toLowerCase().includes('dvr')) || { preco_custo: 350 };
  const hd = materiais.find(r => r.produto.toLowerCase().includes('hd')) || { preco_custo: 300 };
  
  const custoMaterial = (camera.preco_custo * escopo.quantidade) + dvr.preco_custo + hd.preco_custo;
  
  // Regra RF07: Ticket Mínimo R$ 350,00 como valor final de VENDA (piso absoluto)
  // O custo base da instalação é 150 por câmera
  const custoInstalacaoPuro = 150 * escopo.quantidade;
  const fatorMarkup = 1.3;

  // Cálculo inicial do valor de venda da Mão de Obra
  let valorModeloA = custoInstalacaoPuro * fatorMarkup;
  let isTicketMinimo = false;

  // Aplicação do piso absoluto de R$ 350,00 no valor de venda
  if (valorModeloA < 350) {
    valorModeloA = 350;
    isTicketMinimo = true;
  }

  // O custo operacional 'ajustado' para efeitos de cálculo do Modelo B 
  // será o valor de venda do Modelo A dividido pelo markup, mantendo a coerência.
  const custoInstalacaoEfetivo = valorModeloA / fatorMarkup;
  
  // Modelo B: Material + Mão de Obra (ambos com fator 1.3)
  const valorModeloB = (custoMaterial + custoInstalacaoEfetivo) * fatorMarkup;

  return {
    custoMaterial,
    custoInstalacao: custoInstalacaoEfetivo,
    valorModeloA,
    valorModeloB,
    isTicketMinimo,
    detalhes: {
      camera,
      dvr,
      hd
    }
  };
};

const renderizarProposta = (modelo, dados) => {
  const template = modelo === 'A' ? TEMPLATE_CANONICO_MODELO_A : TEMPLATE_CANONICO_MODELO_B;
  const valor = modelo === 'A' ? formatarMoeda(dados.financeiro.valorModeloA) : formatarMoeda(dados.financeiro.valorModeloB);
  
  let texto = template
    .replace('{{cliente_nome}}', dados.escopo.nome_cliente || 'Cliente')
    .replace('{{local_instalacao}}', dados.escopo.perfil || 'Não informado')
    .replace('{{data_orcamento}}', new Date().toLocaleDateString('pt-BR'))
    .replace('{{orcamento_id}}', dados.orcamento_id)
    .replace('{{quantidade_cameras}}', dados.escopo.quantidade)
    .replace('{{descricao_cameras}}', '2MP Full HD')
    .replace('{{quantidade_gravador}}', '1 gravador')
    .replace('{{descricao_gravador}}', 'Multi-HD 4 canais')
    .replace('{{quantidade_hd}}', '1 unidade')
    .replace('{{descricao_hd}}', '1TB específico para CFTV')
    .replace('{{valor_modelo_a}}', valor)
    .replace('{{valor_modelo_b}}', valor)
    .replace('{{forma_pagamento}}', 'A combinar (Pix / Cartão)')
    .replace(/{{linha_extra_.*?}}/g, ''); // Limpa placeholders extras

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
