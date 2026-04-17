const { initDb, db } = require('./src/db/sqlite');

async function validateMigration() {
  try {
    console.log("--- Iniciando Validação de Migração ---");
    await initDb();
    console.log("Banco de dados inicializado.");

    const checkTable = (tableName) => {
      return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    };

    const orcamentoCols = await checkTable('orcamentos');
    const colNamesOrcamento = orcamentoCols.map(r => r.name);
    console.log(`Colunas em 'orcamentos':`, colNamesOrcamento);

    const expectedOrcamento = ['status_noctua', 'waiting_human', 'last_interaction_at', 'metadata_json'];
    const missingOrcamento = expectedOrcamento.filter(c => !colNamesOrcamento.includes(c));

    if (missingOrcamento.length === 0) {
      console.log("✅ Todas as colunas novas existem em 'orcamentos'.");
    } else {
      console.error("❌ Faltam colunas em 'orcamentos':", missingOrcamento);
    }

    const sessaoCols = await checkTable('sessoes');
    const colNamesSessao = sessaoCols.map(r => r.name);
    console.log(`Colunas em 'sessoes':`, colNamesSessao);

    if (colNamesSessao.includes('current_orcamento_id')) {
      console.log("✅ Coluna 'current_orcamento_id' existe em 'sessoes'.");
    } else {
      console.error("❌ Faltam colunas em 'sessoes': current_orcamento_id");
    }

    db.close();
  } catch (err) {
    console.error("Erro na validação:", err);
    process.exit(1);
  }
}

validateMigration();
