/**
 * DICIONÁRIO DE ALIASES - NOCTUA
 * Mapeamento de variações de termos em documentos comerciais de fornecedores.
 */

const ALIASES = {
  quantidade: ['qtd', 'qtde', 'quant', 'qnt', 'q', 'un', 'un.', 'pcs', 'pçs', 'unidade', 'unid'],
  preco_unitario: ['valor', 'valor un', 'valor unit', 'vl unit', 'vl un', 'unitário', 'preço unitário', 'unit', 'vlr unit'],
  subtotal_item: ['subtotal', 'total item', 'valor item', 'total', 'vl total', 'valor total'],
  total_documento: ['valor líquido', 'total líquido', 'valor final', 'total geral', 'valor total', 'líquido', 'total nota'],
  numero_documento: ['orçamento nº', 'orçamento no', 'proposta nº', 'pedido nº', 'proposta', 'orçamento', 'pedido']
};

module.exports = { ALIASES };
