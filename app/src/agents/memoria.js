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

const salvarOrcamento = (cliente_id, escopo, valor_final) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO orcamentos (cliente_id, escopo, valor_final) VALUES (?, ?, ?)",
      [cliente_id, JSON.stringify(escopo), valor_final],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
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
    db.run(
      "INSERT OR REPLACE INTO sessoes (chat_id, estado, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
      [chat_id.toString(), JSON.stringify(estado)],
      function(err) {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
};

const buscarSessao = (chat_id) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT estado FROM sessoes WHERE chat_id = ?", [chat_id.toString()], (err, row) => {
      if (err) reject(err);
      else resolve(row ? JSON.parse(row.estado) : null);
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

const gerarProximoIdCotacao = () => {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as total FROM cotacoes", (err, row) => {
      if (err) reject(err);
      else {
        const next = (row.total + 1).toString().padStart(6, '0');
        resolve(`COT-${next}`);
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

module.exports = { 
  registrarCliente, 
  buscarCliente, 
  salvarOrcamento, 
  buscarHistorico, 
  salvarSessao, 
  buscarSessao, 
  limparSessao, 
  gerarProximoId, 
  gerarProximoIdCotacao, 
  salvarCotacao,
  atualizarStatusCotacao
};
