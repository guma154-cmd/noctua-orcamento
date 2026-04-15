const { initDb, db } = require('./src/db/sqlite');

async function checkProgress() {
  await initDb();
  console.log('--- MONITORANDO PROGRESSO DO ESTRESSE ---');
  
  db.get("SELECT COUNT(*) as total FROM cotacoes", (err, row) => {
    if (err) console.error(err);
    else console.log(`Cotações registradas no banco: ${row.total} / 10`);
    
    db.all("SELECT cotacao_id, fornecedor_nome, status, created_at FROM cotacoes ORDER BY created_at DESC", (err, rows) => {
      if (!err && rows.length > 0) {
        console.log('\nÚltimos rascunhos criados:');
        rows.forEach(r => console.log(` - [${r.cotacao_id}] ${r.fornecedor_nome || 'Extraindo...'} | Status: ${r.status}`));
      }
      process.exit(0);
    });
  });
}

checkProgress();