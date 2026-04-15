const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(__dirname, '../../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

const initDb = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Tabela de Clientes
      db.run(`CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE,
        nome TEXT,
        contato TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Tabela de Sessões (Estado da Conversa)
      db.run(`CREATE TABLE IF NOT EXISTS sessoes (
        chat_id TEXT PRIMARY KEY,
        estado TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Tabela de Orçamentos
      db.run(`CREATE TABLE IF NOT EXISTS orcamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        escopo TEXT,
        valor_final REAL,
        status TEXT DEFAULT 'rascunho',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(cliente_id) REFERENCES clientes(id)
      )`);

      // Tabela de Cotações de Fornecedores (Fase 2A)
      db.run(`CREATE TABLE IF NOT EXISTS cotacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cotacao_id TEXT UNIQUE,
        fornecedor_nome TEXT,
        origem TEXT,
        payload_bruto TEXT,
        payload_estruturado TEXT,
        confidence_json TEXT,
        status TEXT DEFAULT 'rascunho_pendente',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Tabela de Fornecedores (Catálogo de Preços)
      // Recriada com UNIQUE(produto) para permitir INSERT OR REPLACE na sincronização
      db.run(`CREATE TABLE IF NOT EXISTS fornecedores_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto TEXT UNIQUE,
        preco_custo REAL,
        preco_anterior REAL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, () => {
        // Migrar dados da tabela antiga (se existir) para a nova
        db.run(`INSERT OR IGNORE INTO fornecedores_v2 (produto, preco_custo)
                SELECT produto, preco_custo FROM fornecedores WHERE produto IS NOT NULL`, () => {
          // Popular com defaults se ainda vazio
          db.get("SELECT COUNT(*) as count FROM fornecedores_v2", (err, row) => {
            if (row && row.count === 0) {
              db.run("INSERT OR IGNORE INTO fornecedores_v2 (produto, preco_custo) VALUES ('Camera 2MP', 150.00)");
              db.run("INSERT OR IGNORE INTO fornecedores_v2 (produto, preco_custo) VALUES ('DVR 4 Canais', 300.00)");
              db.run("INSERT OR IGNORE INTO fornecedores_v2 (produto, preco_custo) VALUES ('Cabo Coaxial (rolo)', 120.00)");
              db.run("INSERT OR IGNORE INTO fornecedores_v2 (produto, preco_custo) VALUES ('Fonte 12V', 45.00)");
            }
          });
        });
      });

      // Tabela legada (mantida por compatibilidade, mas não usada para escrita)
      db.run(`CREATE TABLE IF NOT EXISTS fornecedores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto TEXT,
        preco_custo REAL
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

module.exports = { db, initDb };
