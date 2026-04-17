/**
 * Memória Agent
 * Lida com as operações de persistência no SQLite.
 */
const { db } = require('../db/sqlite');

const registrarCliente = (telegram_id, nome) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR IGNORE INTO clientes (telegram_id, nome) VALUES (?, ?)",
      [telegram_id, nome],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

const buscarCliente = (telegram_id) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM clientes WHERE telegram_id = ?", [telegram_id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const salvarOrcamento = (cliente_id, escopo, valor_final, metadata = {}) => {
  return new Promise((resolve, reject) => {
    const { status_noctua, waiting_human, metadata_json } = metadata;
    db.run(
      `INSERT INTO orcamentos (cliente_id, escopo, valor_final, status_noctua, waiting_human, last_interaction_at, metadata_json) 
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
      [
        cliente_id, 
        JSON.stringify(escopo), 
        valor_final, 
        status_noctua || null, 
        waiting_human || 0, 
        metadata_json ? JSON.stringify(metadata_json) : null
      ],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

const atualizarStatusOrcamento = (orcId, status, waitingHuman = 0, metadata = null) => {
  return new Promise((resolve, reject) => {
    const query = metadata 
      ? "UPDATE orcamentos SET status_noctua = ?, waiting_human = ?, metadata_json = ?, last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?"
      : "UPDATE orcamentos SET status_noctua = ?, waiting_human = ?, last_interaction_at = CURRENT_TIMESTAMP WHERE id = ?";
    
    const params = metadata 
      ? [status, waitingHuman, JSON.stringify(metadata), orcId]
      : [status, waitingHuman, orcId];

    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve(true);
    });
  });
};

const buscarHistorico = (cliente_id) => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM orcamentos WHERE cliente_id = ? ORDER BY created_at DESC",
      [cliente_id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

const salvarSessao = (chat_id, estado) => {
  return new Promise((resolve, reject) => {
    const currentOrcId = estado.meta ? estado.meta.current_orcamento_id : null;
    db.run(
      "INSERT OR REPLACE INTO sessoes (chat_id, estado, current_orcamento_id, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
      [chat_id.toString(), JSON.stringify(estado), currentOrcId],
      function(err) {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
};

const buscarSessao = (chat_id) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT estado, current_orcamento_id FROM sessoes WHERE chat_id = ?", [chat_id.toString()], (err, row) => {
      if (err) reject(err);
      else if (row) {
        const estado = JSON.parse(row.estado);
        if (row.current_orcamento_id) {
          estado.meta = estado.meta || {};
          estado.meta.current_orcamento_id = row.current_orcamento_id;
        }
        resolve(estado);
      } else {
        resolve(null);
      }
    });
  });
};

const limparSessao = (chat_id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM sessoes WHERE chat_id = ?", [chat_id.toString()], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
};

/**
 * GERA ID CURTO SEQUENCIAL
 */
const gerarProximoId = () => {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as total FROM orcamentos", (err, row) => {
      if (err) reject(err);
      else {
        const next = (row.total + 1).toString().padStart(6, '0');
        resolve(`ORC-${next}`);
      }
    });
  });
};

let lastSequence = 0;
const gerarProximoIdCotacao = () => {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as total FROM cotacoes", (err, row) => {
      if (err) reject(err);
      else {
        // Garantir que mesmo se o count vier igual, o ID seja diferente no mesmo tick
        const count = row.total + 1;
        const sequence = Math.max(count, lastSequence + 1);
        lastSequence = sequence;
        const formatted = sequence.toString().padStart(6, '0');
        resolve(`COT-${formatted}`);
      }
    });
  });
};

const salvarCotacao = (dados) => {
  return new Promise((resolve, reject) => {
    const { cotacao_id, fornecedor_nome, origem, payload_bruto, payload_estruturado, confidence_json, status } = dados;
    
    // Usar INSERT OR REPLACE para permitir atualização do draft para confirmed
    db.run(
      `INSERT OR REPLACE INTO cotacoes (cotacao_id, fornecedor_nome, origem, payload_bruto, payload_estruturado, confidence_json, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cotacao_id, 
        fornecedor_nome || 'Pendente', 
        origem, 
        JSON.stringify(payload_bruto), 
        JSON.stringify(payload_estruturado), 
        JSON.stringify(confidence_json),
        status || 'draft'
      ],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

const atualizarStatusCotacao = (cotacao_id, novoStatus) => {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE cotacoes SET status = ? WHERE cotacao_id = ?",
      [novoStatus, cotacao_id],
      function(err) {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
};

const atualizarNomeFornecedorCotacao = (cotacao_id, novoNome) => {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE cotacoes SET fornecedor_nome = ? WHERE cotacao_id = ?",
      [novoNome, cotacao_id],
      function(err) {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
};

/**
 * SINCRONIZAR PREÇOS (RF07)
 * Transfere o preço da cotação confirmada para a tabela mestre de fornecedores.
 */
const sincronizarPrecosFornecedor = (cotacao_id) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT payload_estruturado FROM cotacoes WHERE cotacao_id = ?", [cotacao_id], async (err, row) => {
      if (err || !row) return reject(err || new Error("Cotação não encontrada"));
      
      let payload;
      try {
        payload = JSON.parse(row.payload_estruturado);
      } catch (e) {
        return reject(new Error("Erro ao processar dados da cotação"));
      }

      const itens = payload.itens || [];
      if (itens.length === 0) return resolve({ atualizados: 0, alertas: [] });

      const alertas = [];
      let atualizados = 0;

      const syncTasks = itens.map(item => {
        return new Promise((resTask) => {
          const preco = item.preco_unitario;
          const nome = item.descricao_bruta || item.descricao;
          
          if (!preco || !nome) return resTask();

          // Busca preço anterior para gerar alerta de variação
          db.get("SELECT preco_custo FROM fornecedores_v2 WHERE produto = ?", [nome], (err, existing) => {
            if (existing && existing.preco_custo) {
              const variacao = ((preco - existing.preco_custo) / existing.preco_custo) * 100;
              if (Math.abs(variacao) >= 10) {
                alertas.push({ 
                  produto: nome, 
                  de: existing.preco_custo, 
                  para: preco, 
                  variacao: `${variacao > 0 ? '+' : ''}${variacao.toFixed(1)}%` 
                });
              }
            }

            db.run(
              `INSERT INTO fornecedores_v2 (produto, preco_custo, preco_anterior, updated_at)
               VALUES (?, ?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(produto) DO UPDATE SET
                 preco_anterior = preco_custo,
                 preco_custo = excluded.preco_custo,
                 updated_at = CURRENT_TIMESTAMP`,
              [nome, preco, existing ? existing.preco_custo : null],
              function(err) {
                if (!err) atualizados++;
                resTask();
              }
            );
          });
        });
      });

      await Promise.all(syncTasks);
      resolve({ atualizados, alertas });
    });
  });
};

const resolverAlertaOrcamento = (orcId) => {
  return new Promise((resolve, reject) => {
    db.run("UPDATE orcamentos SET waiting_human = 0 WHERE id = ?", [orcId], (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
};

const listarOrcamentosEmAlerta = () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM orcamentos WHERE waiting_human = 1 ORDER BY last_interaction_at DESC", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const listarOrcamentosParaFollowUp = (horasInatividade = 24) => {
  return new Promise((resolve, reject) => {
    // Para SQLite, usamos datetime('now', '-X hours')
    const params = [`-${horasInatividade} hours`];
    db.all(`
      SELECT * FROM orcamentos 
      WHERE (status_noctua = 'proposta_enviada' OR status_noctua = 'lead_qualificado' OR status_noctua = 'followup_24h')
      AND waiting_human = 0 
      AND datetime(last_interaction_at) <= datetime('now', ?)
      ORDER BY last_interaction_at ASC
    `, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = { 
  registrarCliente, 
  buscarCliente, 
  salvarOrcamento, 
  atualizarStatusOrcamento,
  buscarHistorico, 
  salvarSessao, 
  buscarSessao, 
  limparSessao, 
  gerarProximoId, 
  gerarProximoIdCotacao, 
  salvarCotacao,
  atualizarStatusCotacao,
  atualizarNomeFornecedorCotacao,
  sincronizarPrecosFornecedor,
  listarOrcamentosEmAlerta,
  resolverAlertaOrcamento,
  listarOrcamentosParaFollowUp
};

