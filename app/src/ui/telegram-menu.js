/**
 * NOCTUA TELEGRAM MENU SYSTEM
 * @uma (UX Design Expert) - Delegado por @orion (aiox-master)
 *
 * Atomic Design para Telegram:
 *  - Átomo:     Botão individual { text, callback_data }
 *  - Molécula:  Linha de botões  [Átomo, Átomo]
 *  - Organismo: Menu completo    { header, keyboard }
 */

const { Markup } = require('telegraf');

// ────────────────────────
// ÁTOMOS (Botões)
// ────────────────────────
const BTN = {
  // Menu Principal
  NOVO_ORCAMENTO:    { text: '📋 Novo Orçamento',          callback_data: 'menu:novo_orcamento' },
  CONTINUAR_ORC:     { text: '🔄 Continuar Orçamento',     callback_data: 'menu:continuar_orcamento' },
  SALVAR_COTACAO:    { text: '📦 Cotação de Fornecedor',   callback_data: 'menu:salvar_cotacao' },
  CONSULTAR:         { text: '🔍 Consultar',               callback_data: 'menu:consultar' },
  LIMPAR:            { text: '🗑️ Limpar Sessão',            callback_data: 'menu:limpar' },

  // Sub-menu: Tipo de Mídia do Fornecedor
  MIDIA_TEXTO:       { text: '📝 Texto',                   callback_data: 'supplier_midia:texto' },
  MIDIA_IMAGEM:      { text: '🖼️ Imagem',                  callback_data: 'supplier_midia:imagem' },
  MIDIA_PDF:         { text: '📄 PDF',                     callback_data: 'supplier_midia:pdf' },
  MIDIA_AUDIO:       { text: '🎤 Áudio',                   callback_data: 'supplier_midia:audio' },

  // Sub-menu: Revisão de Cotação
  CONFIRMAR_COT:     (id) => ({ text: '✅ Confirmar',       callback_data: `confirm_quote:${id}` }),
  EDITAR_NOME_COT:   (id) => ({ text: '✏️ Editar Nome',    callback_data: `edit_name_quote:${id}` }),
  CANCELAR_COT:      (id) => ({ text: '❌ Cancelar',        callback_data: `cancel_quote:${id}` }),

  // Sub-menu: Modelo de Orçamento
  MODELO_A:          { text: '🔧 Modelo A — Só MDO',       callback_data: 'model:A' },
  MODELO_B:          { text: '📦 Modelo B — Mat + MDO',    callback_data: 'model:B' },
  MODELO_AMBOS:      { text: '📊 Gerar os Dois',           callback_data: 'model:ambos' },

  // Ações de Confirmação Genéricas
  SIM:               { text: '✅ Sim, salvar',             callback_data: 'confirm:sim' },
  NAO:               { text: '❌ Não, descartar',          callback_data: 'confirm:nao' },

  // Navegação
  VOLTAR_MENU:       { text: '🏠 Menu Principal',          callback_data: 'menu:main' },
};

// ────────────────────────
// MOLÉCULAS (Linhas de botões)
// ────────────────────────
const LINHAS = {
  principal_1:     [BTN.NOVO_ORCAMENTO, BTN.CONTINUAR_ORC],
  principal_2:     [BTN.SALVAR_COTACAO, BTN.CONSULTAR],
  principal_3:     [BTN.LIMPAR],

  midia_1:         [BTN.MIDIA_TEXTO, BTN.MIDIA_IMAGEM],
  midia_2:         [BTN.MIDIA_PDF, BTN.MIDIA_AUDIO],

  modelo:          [BTN.MODELO_A, BTN.MODELO_B, BTN.MODELO_AMBOS],
  confirmacao:     [BTN.SIM, BTN.NAO],
  voltar:          [BTN.VOLTAR_MENU],
};

// ────────────────────────
// ORGANISMOS (Menus Completos)
// ────────────────────────

/**
 * Menu principal do bot — Organismo raiz.
 */
const menuPrincipal = (session = {}) => {
  const draftInfo = session.meta?.draft_id
    ? `\n_Rascunho ativo: \`${session.meta.draft_id}\`_`
    : '';

  const header = `🦅 *Noctua — Central de Operações*${draftInfo}\n\nO que você quer fazer?`;

  const keyboard = Markup.inlineKeyboard([
    LINHAS.principal_1,
    LINHAS.principal_2,
    LINHAS.principal_3,
  ]);

  return { text: header, keyboard, parse_mode: 'Markdown' };
};

/**
 * Sub-menu para escolha do tipo de mídia do fornecedor.
 */
const menuMidiaFornecedor = (draftId) => {
  const header = `📦 *Cotação de Fornecedor* [\`${draftId}\`]\n\nComo você quer enviar a cotação?`;

  const keyboard = Markup.inlineKeyboard([
    LINHAS.midia_1,
    LINHAS.midia_2,
    LINHAS.voltar,
  ]);

  return { text: header, keyboard, parse_mode: 'Markdown' };
};

/**
 * Menu de revisão pós-extração de fornecedor.
 */
const menuRevisaoCotacao = (draftId, extraido) => {
  const nfornecedor = extraido.fornecedor_nome || 'Não identificado';
  const itens = extraido.itens || [];
  const total = extraido.total_identificado
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(extraido.total_identificado)
    : 'R$ 0,00';

  const confianca = extraido.confianca_global >= 0.9
    ? '🟢 Alta'
    : extraido.confianca_global >= 0.7
      ? '🟡 Média'
      : '🔴 Baixa';

  // Lista de itens (máximo 10 para não estourar o limite de 4096 chars do Telegram)
  const MAX_ITENS = 10;
  const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const itensListados = itens.slice(0, MAX_ITENS).map((it, i) => {
    const desc = it.descricao_bruta || it.descricao || 'Item sem descrição';
    const qtd = it.quantidade || 0;
    const pu = it.preco_unitario || 0;
    const pt = it.preco_total || (qtd * pu);
    // Truncar descrição para não estourar linha
    const descTrunc = desc.length > 50 ? desc.substring(0, 48) + '…' : desc;
    return `  ${i + 1}. ${descTrunc}\n      ${qtd}x ${brl(pu)} = ${brl(pt)}`;
  }).join('\n');

  const rodapeItens = itens.length > MAX_ITENS
    ? `\n  ... e mais ${itens.length - MAX_ITENS} item(s)`
    : '';

  const header =
    `📄 Rascunho de Cotação [${draftId}]\n\n` +
    `🏭 Fornecedor: ${nfornecedor}\n` +
    `📦 Itens identificados: ${itens.length}\n` +
    `💰 Total: ${total}\n` +
    `🎯 Confiança: ${confianca}\n\n` +
    `📋 Itens:\n${itensListados || '  (Nenhum item identificado)'}${rodapeItens}\n\n` +
    `Confirme ou ajuste antes de salvar:`;

  const keyboard = Markup.inlineKeyboard([
    [BTN.CONFIRMAR_COT(draftId), BTN.EDITAR_NOME_COT(draftId)],
    [BTN.CANCELAR_COT(draftId), BTN.VOLTAR_MENU],
  ]);

  // Nota: parse_mode omitido intencionalmente para evitar falha de Markdown
  // com caracteres especiais vindos de nomes de produtos (hifens, parênteses, etc.)
  return { text: header, keyboard };
};

/**
 * Menu de escolha de modelo de orçamento.
 */
const menuEscolhaModelo = (draftId) => {
  const header =
    `📋 *Orçamento \`${draftId}\` — Pronto!*\n\n` +
    `Qual versão você quer gerar para o cliente?`;

  const keyboard = Markup.inlineKeyboard([
    LINHAS.modelo,
    LINHAS.voltar
  ]);

  return { text: header, keyboard, parse_mode: 'Markdown' };
};

const menuConfirmacao = (mensagem) => {
  const keyboard = Markup.inlineKeyboard([
    LINHAS.confirmacao,
    LINHAS.voltar
  ]);
  return { text: mensagem, keyboard, parse_mode: 'Markdown' };
};

/**
 * Menu dinâmico de opções (Usado no Intake/Qualificação)
 */
const menuOpcoes = (header, opcoes) => {
  const buttons = [];
  for (let i = 0; i < opcoes.length; i += 2) {
    const row = opcoes.slice(i, i + 2).map((opt) => {
      return { text: opt, callback_data: opt };
    });
    buttons.push(row);
  }

  // Linha de navegação
  buttons.push([
    { text: '⬅ Voltar', callback_data: 'menu:voltar' },
    { text: '🏠 Menu', callback_data: 'menu:main' }
  ]);

  const keyboard = Markup.inlineKeyboard(buttons);
  return { text: header, keyboard, parse_mode: 'Markdown' };
};

/**
 * Menu de revisão assistida para importação de planilhas
 */
const menuRevisaoImportacao = (newId) => {
    const header = `📋 *REVISÃO DE IMPORTAÇÃO* [${newId}]\n\nComo deseja prosseguir com os itens identificados?`;
    
    // As opções para revisão de importação serão sempre Inline, mas podemos usar o BTN helper
    const keyboard = Markup.inlineKeyboard([
        [{ text: "1. Importar Tudo (Com Alertas)", callback_data: "1. Importar Tudo (Com Alertas)" }],
        [{ text: "2. Apenas Itens Confiáveis", callback_data: "2. Apenas Itens Confiáveis" }],
        [{ text: "3. Marcar para Revisão Manual", callback_data: "3. Marcar para Revisão Manual" }],
        [{ text: "4. Cancelar Importação", callback_data: "4. Cancelar Importação" }]
    ]);

    return { 
        text: header, 
        keyboard: keyboard,
        parse_mode: 'Markdown'
    };
};

module.exports = {
  BTN,
  menuPrincipal,
  menuMidiaFornecedor,
  menuRevisaoCotacao,
  menuEscolhaModelo,
  menuConfirmacao,
  menuOpcoes,
  menuRevisaoImportacao // Removido menuOpcoesTeclado
};
