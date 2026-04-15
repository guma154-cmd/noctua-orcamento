const { initDb, db } = require('./src/db/sqlite');

async function cleanup() {
  await initDb();
  console.log('--- LIMPANDO BANCO DE DADOS PARA ESTRESSE ---');
  
  const tables = ['cotacoes', 'fornecedores_v2', 'sessoes', 'historico_dialogo'];
  
  db.serialize(() => {
    tables.forEach(table => {
      db.run(`DELETE FROM ${table}`, (err) => {
        if (err) console.warn(`Erro ao limpar ${table}:`, err.message);
        else console.log(`Tabela ${table} limpa.`);
      });
    });
    
    db.run('VACUUM', (err) => {
      if (!err) console.log('Espaço otimizado (VACUUM).');
      console.log('--- LIMPEZA CONCLUÍDA ---');
      process.exit(0);
    });
  });
}

cleanup();