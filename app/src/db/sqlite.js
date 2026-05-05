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

      // Tabela de OrÃ§amentos
      db.run(`CREATE TABLE IF NOT EXISTS orcamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        escopo TEXT,
        valor_final REAL,
        status TEXT DEFAULT 'rascunho',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(cliente_id) REFERENCES clientes(id)
      )`);

      // Tabela de VersÃµes de OrÃ§amentos (Story 4.3)
      db.run(`CREATE TABLE IF NOT EXISTS orcamentos_versoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orcamento_id TEXT,
        versao INTEGER,
        payload TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Tabela de Timeline ImutÃ¡vel (Story 5.1)
      db.run(`CREATE TABLE IF NOT EXISTS timeline_eventos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER,
        evento TEXT,
        payload_snapshot TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Tabela de PrÃ³ximas AÃ§Ãµes (Story 5.3)
      db.run(`CREATE TABLE IF NOT EXISTS proximas_acoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER,
        tipo TEXT, -- ligacao | reuniao | envio_proposta | visita | contrato | outro
        descricao TEXT,
        data_prevista DATETIME,
        concluida INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(lead_id) REFERENCES orcamentos(id)
      )`);

      // === GOVERNANÃ‡A DO CATÃLOGO NOCTUA (FASE 3 - ETAPA 1) ===
      db.run(`CREATE TABLE IF NOT EXISTS catalogo_noctua (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT UNIQUE,
        nome_comercial TEXT,
        categoria TEXT,
        subcategoria TEXT,
        tecnologia TEXT,
        perfil_noctua TEXT,
        unidade_compra TEXT DEFAULT 'Unidade',
        preco_custo REAL,
        ativo INTEGER DEFAULT 1,
        item_padrao INTEGER DEFAULT 0,
        fallback_permitido INTEGER DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      )`);

      // === BASE DE DADOS DE FORNECEDORES (NOCTUA) ===
      db.run(`CREATE TABLE IF NOT EXISTS base_fornecedores_noctua (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fornecedor_nome TEXT,
        item_codigo TEXT, -- SKU / Código do Fornecedor
        marca TEXT,
        categoria TEXT,
        subcategoria TEXT,
        modelo TEXT,
        descricao_padronizada TEXT,
        descricao_original TEXT,
        unidade_medida TEXT,
        preco_unitario REAL,
        moeda TEXT,
        origem_preco_tipo TEXT,
        origem_preco_referencia TEXT,
        data_coleta DATETIME,
        confianca_extracao REAL,
        status_registro TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // === MIGRAÇÕES FASE 1 NOCTUA (ADITIVAS) ===
      
      // Colunas para a tabela de OrÃ§amentos
      const colunasOrcamento = [
        "status_noctua TEXT",
        "waiting_human INTEGER DEFAULT 0",
        "last_interaction_at DATETIME",
        "metadata_json TEXT",
        "confidence_score REAL",
        "valor_total REAL",
        "followup_count INTEGER DEFAULT 0",
        "last_followup_at DATETIME",
        "budget_model TEXT"
      ];

      colunasOrcamento.forEach(col => {
        db.run(`ALTER TABLE orcamentos ADD COLUMN ${col}`, (err) => {
          // Ignora erro se a coluna já existir
          if (err && !err.message.includes("duplicate column name")) {
            console.warn(`[DB Migration] Aviso na coluna orcamentos.${col.split(' ')[0]}:`, err.message);
          }
        });
      });

      // Vínculo da Sessão com o Orçamento Ativo
      db.run(`ALTER TABLE sessoes ADD COLUMN current_orcamento_id INTEGER`, (err) => {
        if (err && !err.message.includes("duplicate column name")) {
          console.warn(`[DB Migration] Aviso na coluna sessoes.current_orcamento_id:`, err.message);
        }
      });

      // Finalização bem-sucedida do Promise
      db.serialize(() => {
        resolve();
      });
    });
  });
};

module.exports = { db, initDb };
