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

      // Tabela de Fornecedores (Simulação)
      db.run(`CREATE TABLE IF NOT EXISTS fornecedores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto TEXT,
        preco_custo REAL
      )`, () => {
        // Inserir alguns produtos de exemplo se a tabela estiver vazia
        db.get("SELECT COUNT(*) as count FROM fornecedores", (err, row) => {
          if (row && row.count === 0) {
            db.run("INSERT INTO fornecedores (produto, preco_custo) VALUES ('Camera 2MP', 150.00)");
            db.run("INSERT INTO fornecedores (produto, preco_custo) VALUES ('DVR 4 Canais', 300.00)");
            db.run("INSERT INTO fornecedores (produto, preco_custo) VALUES ('Cabo Coaxial (rolo)', 120.00)");
            db.run("INSERT INTO fornecedores (produto, preco_custo) VALUES ('Fonte 12V', 45.00)");
          }
        });
      });

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
        payload_bruto TEXT, -- Original Bruto solicitado
        payload_estruturado TEXT, -- supplier_quote_draft
        confidence_json TEXT, -- Confiança por item
        status TEXT DEFAULT 'rascunho_pendente',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

module.exports = { db, initDb };
