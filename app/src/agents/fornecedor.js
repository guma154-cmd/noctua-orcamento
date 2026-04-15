const { askGemini } = require("../services/ai");
const { db } = require('../db/sqlite');

/**
 * FUNÇÕES AUXILIARES
 */

// Função para buscar produtos canônicos da tabela fornecedores
const buscarProdutosCanonicos = () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT id, produto, preco_custo FROM fornecedores", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Função para comparar e sugerir atualizações
const gerarSugestoesDeAtualizacao = async (itensCotacao, produtosCanonicos) => {
  const sugestoes = [];

  for (const itemCotacao of itensCotacao) {
    const prompt = `
      Você é um especialista em correspondência de produtos para orçamentos de CFTV.
      Analise a descrição de um item de cotação e encontre o produto canônico mais provável na sua lista de produtos.
      
      Item da Cotação:
      Descrição Bruta: "${itemCotacao.descricao_bruta}"
      Quantidade: ${itemCotacao.quantidade}
      Preço Unitário: ${itemCotacao.preco_unitario}
      Preço Total: ${itemCotacao.preco_total}

      Lista de Produtos Canônicos (id, produto, preco_custo):
      ${produtosCanonicos.map(p => `- ${p.id}: "${p.produto}" (Preço atual: ${p.preco_custo})`).join('\n')}

      Instruções:
      1. Retorne um objeto JSON apenas se houver uma correspondência clara (confiança > 0.7).
      2. Priorize correspondências por nome de produto, ignorando variações de especificações menores (ex: megapixel, infravermelho, marca).
      3. Se o preço na cotação for significativamente diferente do preço canônico (mais de 15% de variação), retorne a sugestão de atualização do preço.
      4. Se encontrar um produto correspondente, mas com preço menor na cotação, a sugestão deve ser para atualizar o preço canônico para o da cotação.
      5. Se não encontrar correspondência clara, retorne null.

      Formato JSON de Saída (se houver correspondência):
      {
        "cotacao_item_descricao_bruta": "...",
        "produto_canonicoid": número,
        "produto_canonicodescricao": "...",
        "confianca_match": número, // 0.0 a 1.0
        "sugestao_atualizacao": {
          "novo_preco_custo": número, // O preço da cotação ou o preço canônico se a cotação for maior e não for atualizada
          "acao": "nenhuma" // "atualizar_preco", "sugerir_novo_produto"
        },
        "preco_cotacao": número
      }
      Se não houver correspondência, retorne apenas null.
    `;

    try {
      const response = await askGemini(prompt, "Identifique correspondências de produtos e sugira atualizações de preço.");
      
      if (!response) continue; // IA não retornou resposta

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue; // Não encontrou JSON

      const matchData = JSON.parse(jsonMatch[0]);
      
      if (matchData && matchData.produto_canonicoid) {
        let acao = "nenhuma";
        let novoPreco = matchData.produto_canonicoid.preco_custo; // Começa com o preço canônico

        const precoCotacao = itemCotacao.preco_total;
        const precoCanonicoid = produtosCanonicos.find(p => p.id === matchData.produto_canonicoid)?.preco_custo;

        if (precoCanonicoid) {
          const variacao = Math.abs(precoCotacao - precoCanonicoid) / precoCanonicoid;
          if (variacao > 0.15) { // Mais de 15% de variação
            if (precoCotacao < precoCanonicoid) {
              acao = "atualizar_preco";
              novoPreco = precoCotacao;
            } else {
              // Preço da cotação é maior, mas não necessariamente atualiza, pode ser oferta
              // Por enquanto, apenas sinaliza que o preço é maior
              acao = "preco_cotacao_maior";
              novoPreco = precoCanonicoid; // Mantém o canônico, mas marca a diferença
            }
          } else {
            acao = "nenhuma"; // Preços similares
            novoPreco = precoCanonicoid;
          }
        } else {
          // Produto canônico não encontrado (o que não deveria acontecer se produto_canonicoid foi retornado)
          acao = "sugerir_novo_produto"; 
          novoPreco = precoCotacao;
        }

        sugestoes.push({
          ...matchData,
          sugestao_atualizacao: {
            novo_preco_custo: novoPreco,
            acao: acao
          },
          preco_cotacao: precoCotacao // Salva para referência
        });
      }
    } catch (e) {
      console.error(`Erro ao processar sugestão para item: ${itemCotacao.descricao_bruta}`, e);
    }
  }
  return sugestoes;
};

/**
 * FUNÇÃO PRINCIPAL PARA GERAR SUGESTÕES DE ATUALIZAÇÃO
 * Recebe o ID de uma cotação confirmada e retorna sugestões de atualização para a tabela fornecedores.
 */
const sugerirAtualizacaoPrecos = async (cotacao_id) => {
  // 1. Buscar dados da cotação confirmada
  const cotacao = await new Promise((resolve, reject) => {
    db.get("SELECT payload_estruturado FROM cotacoes WHERE cotacao_id = ? AND status = 'confirmed'", [cotacao_id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!cotacao || !cotacao.payload_estruturado) {
    return { error: "Cotação não encontrada ou não confirmada." };
  }

  const { itens } = JSON.parse(cotacao.payload_estruturado);

  // 2. Buscar produtos canônicos
  const produtosCanonicos = await buscarProdutosCanonicos();

  // 3. Gerar sugestões de atualização
  const sugestoes = await gerarSugestoesDeAtualizacao(itens, produtosCanonicos);

  return { sugestoes };
};

const extrairCotaçãoEstruturada = async (textoBruto, tipoMidia) => {
  // Se o texto já parece ser um JSON estruturado vindo de um Squad, tentamos o parse direto
  if (textoBruto && textoBruto.trim().startsWith('{')) {
    try {
      const cleaned = textoBruto.replace(/```json|```/g, "").trim();
      const directParse = JSON.parse(cleaned);
      // Se já tem fornecedor_nome preenchido, retornamos direto. Se for null/vazio, procedemos com IA para tentar achar.
      if (directParse.itens && directParse.fornecedor_nome && directParse.fornecedor_nome !== "Pendente") {
        console.log("[Fornecedor] Texto já estruturado com nome. Ignorando re-extração.");
        return directParse;
      }
    } catch (e) {
      console.log("[Fornecedor] Falha no parse de JSON prévio. Tentando IA.");
    }
  }

  const prompt = `Você é um analisador fiscal especializado em distribuidoras de segurança eletrônica (Intelbras, Hikvision, etc).
Sua missão é extrair os itens e IDENTIFICAR O FORNECEDOR (quem está vendendo) a partir do texto/OCR.

REGRAS PARA NOME DO FORNECEDOR:
1. Procure no TOPO do documento (Cabeçalhos).
2. Procure por termos como "Emitente", "Vendedor", "Distribuidora", "Razão Social".
3. Se houver um e-mail (ex: vendas@distribuidorax.com.br), use o domínio para sugerir o nome.
4. Se identificar um logotipo escrito em ASCII ou texto isolado no início, use-o.
5. Se não encontrar de jeito nenhum, retorne "Não identificado".

Formato de Saída (JSON):
{
  "fornecedor_nome": "Nome extraído aqui",
  "itens": [
    {
      "descricao_bruta": "Câmera Bullet...",
      "quantidade": 1,
      "preco_unitario": 100.00,
      "preco_total": 100.00,
      "confianca_item": 0.9
    }
  ],
  "total_identificado": 100.00,
  "status_rascunho": "valid",
  "confianca_global": 0.9
}

Texto Bruto / Transcrição:
${textoBruto}`;
  
  const response = await askGemini(prompt, "Responda apenas com o objeto JSON final, sem marcações markdown na medida do possível.");
  if (!response) return null;
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Erro no Parse JSON da cotação", e);
      return null;
    }
  }
  return null;
};

const renderizarRascunhoTelegram = (draftId, extraido) => {
  let msg = `[${draftId}] 📄 *Rascunho: ${extraido.fornecedor_nome || 'Desconhecido'}*\n\n`;
  if (extraido.itens) {
    extraido.itens.forEach((it, i) => {
      msg += `🔹 ${it.quantidade}x ${it.descricao_bruta}\n    (Un: R$ ${it.preco_unitario} -> R$ ${it.preco_total})\n`;
    });
  }
  msg += `\n💰 Total Lido: R$ ${extraido.total_identificado || 0}\n\n`;
  if (extraido.bloqueado_para_salvamento) {
    msg += `⚠️ Atenção: Rascunho inconsistente.\n`;
  }
  return msg;
};

module.exports = { sugerirAtualizacaoPrecos, extrairCotaçãoEstruturada, renderizarRascunhoTelegram };
