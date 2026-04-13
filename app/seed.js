const { db, initDb } = require('./src/db/sqlite');

async function seed() {
  console.log('Inicializando banco de dados...');
  await initDb();
  
  console.log('Populando banco de dados com produtos iniciais...');
  
  const produtos = [
    ['Câmera Bullet 2MP IR 20m', 120.00],
    ['Câmera Dome 2MP IR 20m', 115.00],
    ['DVR 4 Canais Multi-HD', 350.00],
    ['DVR 8 Canais Multi-HD', 550.00],
    ['HD 1TB SkyHawk (p/ CFTV)', 280.00],
    ['HD 2TB SkyHawk (p/ CFTV)', 420.00],
    ['Fonte 12V 5A p/ Câmeras', 45.00],
    ['Balun de Vídeo (Par)', 15.00],
    ['Cabo Coaxial Flexível (Rolo 100m)', 110.00]
  ];

  db.serialize(() => {
    const stmt = db.prepare("INSERT INTO fornecedores (produto, preco_custo) VALUES (?, ?)");
    produtos.forEach(p => stmt.run(p));
    stmt.finalize();
  });

  console.log('Seed concluído.');
}

seed().catch(err => console.error('Erro no seed:', err));
