const { db, initDb } = require('./src/db/sqlite');

async function seed() {
  console.log('🚀 NOCTUA CATALOG GOVERNANCE - SEEDING (V2 - TOPOLOGY READY)');
  await initDb();
  
  const catalogo_items = [
    // RECORDERS
    { sku: 'NTC-REC-001', nome: 'DVR 4 Canais Multi-HD', cat: 'Recorder', sub: 'Analog', tech: 'analog', preco: 350.00, padrao: 1 },
    { sku: 'NTC-REC-002', nome: 'DVR 8 Canais Multi-HD', cat: 'Recorder', sub: 'Analog', tech: 'analog', preco: 550.00, padrao: 1 },
    { sku: 'NTC-REC-003', nome: 'DVR 16 Canais Multi-HD', cat: 'Recorder', sub: 'Analog', tech: 'analog', preco: 1200.00, padrao: 1 },
    { sku: 'NTC-REC-004', nome: 'DVR 32 Canais Multi-HD', cat: 'Recorder', sub: 'Analog', tech: 'analog', preco: 2400.00, padrao: 1 },
    { sku: 'NTC-REC-005', nome: 'NVR 4 Canais IP', cat: 'Recorder', sub: 'IP', tech: 'ip', preco: 650.00, padrao: 1 },
    { sku: 'NTC-REC-006', nome: 'NVR 8 Canais IP', cat: 'Recorder', sub: 'IP', tech: 'ip', preco: 950.00, padrao: 1 },
    { sku: 'NTC-REC-007', nome: 'NVR 16 Canais IP', cat: 'Recorder', sub: 'IP', tech: 'ip', preco: 1800.00, padrao: 1 },
    { sku: 'NTC-REC-008', nome: 'NVR 32 Canais IP', cat: 'Recorder', sub: 'IP', tech: 'ip', preco: 3200.00, padrao: 1 },

    // CAMERAS
    { sku: 'NTC-CAM-001', nome: 'Câmera Bullet 2MP IR 20m', cat: 'Camera', sub: 'Bullet', tech: 'analog', preco: 120.00, padrao: 1 },
    { sku: 'NTC-CAM-002', nome: 'Câmera Dome 2MP IR 20m', cat: 'Camera', sub: 'Dome', tech: 'analog', preco: 115.00, padrao: 1 },
    { sku: 'NTC-CAM-003', nome: 'Câmera Bullet 2MP (IP)', cat: 'Camera', sub: 'Bullet', tech: 'ip', preco: 250.00, padrao: 1 },
    { sku: 'NTC-CAM-004', nome: 'Câmera Dome 2MP (IP)', cat: 'Camera', sub: 'Dome', tech: 'ip', preco: 240.00, padrao: 1 },

    // STORAGE
    { sku: 'NTC-HD-001', nome: 'HD 1TB SkyHawk', cat: 'HD', sub: 'SkyHawk', tech: 'universal', preco: 300.00, padrao: 1 },
    { sku: 'NTC-HD-002', nome: 'HD 2TB SkyHawk', cat: 'HD', sub: 'SkyHawk', tech: 'universal', preco: 450.00, padrao: 1 },
    { sku: 'NTC-HD-004', nome: 'HD 4TB SkyHawk', cat: 'HD', sub: 'SkyHawk', tech: 'universal', preco: 750.00, padrao: 1 },
    { sku: 'NTC-HD-008', nome: 'HD 8TB SkyHawk', cat: 'HD', sub: 'SkyHawk', tech: 'universal', preco: 1400.00, padrao: 1 },

    // CABLES
    { sku: 'NTC-CAB-001', nome: 'Cabo Coaxial Flexível 4mm', cat: 'Cabo', sub: 'Coaxial', tech: 'analog', unit: 'Metro', preco: 2.80, padrao: 1 },
    { sku: 'NTC-CAB-002', nome: 'Cabo de Rede UTP Cat5e', cat: 'Cabo', sub: 'UTP', tech: 'ip', unit: 'Metro', preco: 3.50, padrao: 1 },
    { sku: 'NTC-CAB-003', nome: 'Cabo de Rede UTP Cat6', cat: 'Cabo', sub: 'UTP', tech: 'ip', unit: 'Metro', preco: 5.50, padrao: 0 },

    // INFRA
    { sku: 'NTC-INF-001', nome: 'Eletroduto Corrugado 3/4 (Metro)', cat: 'Infra', sub: 'Eletroduto', tech: 'universal', unit: 'Metro', preco: 4.50, padrao: 1 },
    { sku: 'NTC-INF-002', nome: 'Canaleta com Adesivo 20x10mm (Metro)', cat: 'Infra', sub: 'Canaleta', tech: 'universal', unit: 'Metro', preco: 8.50, padrao: 1 },
    { sku: 'NTC-INF-003', nome: 'Caixa de Passagem 10x10', cat: 'Infra', sub: 'Caixa', tech: 'universal', preco: 15.00, padrao: 1 },

    // ACESSORIOS
    { sku: 'NTC-ACE-001', nome: 'Balun de Vídeo (Par)', cat: 'Acessorio', sub: 'Balun', tech: 'analog', preco: 15.00, padrao: 1 },
    { sku: 'NTC-ACE-002', nome: 'Fonte 12V 5A p/ Câmeras', cat: 'Acessorio', sub: 'Fonte', tech: 'universal', preco: 45.00, padrao: 1 },
    { sku: 'NTC-ACE-003', nome: 'Switch POE 4 Portas', cat: 'Acessorio', sub: 'Switch', tech: 'ip', preco: 280.00, padrao: 1 },
    { sku: 'NTC-ACE-004', nome: 'Switch POE 8 Portas', cat: 'Acessorio', sub: 'Switch', tech: 'ip', preco: 520.00, padrao: 1 },
    { sku: 'NTC-ACE-005', nome: 'Switch POE 16 Portas', cat: 'Acessorio', sub: 'Switch', tech: 'ip', preco: 1100.00, padrao: 1 },
    { sku: 'NTC-ACE-006', nome: 'Conector RJ45', cat: 'Acessorio', sub: 'Conector', tech: 'ip', preco: 1.50, padrao: 1 },
    { sku: 'NTC-ACE-007', nome: 'Conector P4 Macho com Borne', cat: 'Acessorio', sub: 'Conector', tech: 'universal', preco: 2.50, padrao: 1 },
    { sku: 'NTC-ACE-008', nome: 'Caixa de Proteção CFTV', cat: 'Acessorio', sub: 'Caixa', tech: 'universal', preco: 12.00, padrao: 1 },
    { sku: 'NTC-ACE-009', nome: 'Kit Fixação (Bucha/Parafuso)', cat: 'Acessorio', sub: 'Kit', tech: 'universal', preco: 5.00, padrao: 1 },
    { sku: 'NTC-ACE-010', nome: 'Kit Abraçadeira Nylon (100un)', cat: 'Acessorio', sub: 'Kit', tech: 'universal', preco: 18.00, padrao: 1 }
  ];

  db.serialize(() => {
    // 1. Limpar e Popular Tabela de Governança
    db.run("DELETE FROM catalogo_noctua");
    const stmtNoctua = db.prepare(`INSERT INTO catalogo_noctua 
      (sku, nome_comercial, categoria, subcategoria, tecnologia, unidade_compra, preco_custo, item_padrao) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    
    catalogo_items.forEach(i => {
      stmtNoctua.run([i.sku, i.nome, i.cat, i.sub, i.tech, i.unit || 'Unidade', i.preco, i.padrao]);
    });
    stmtNoctua.finalize();

    // 2. Sincronizar com fornecedores_v2 (Compatibilidade Legada)
    db.run("DELETE FROM fornecedores_v2");
    const stmtV2 = db.prepare("INSERT INTO fornecedores_v2 (produto, preco_custo) VALUES (?, ?)");
    catalogo_items.forEach(i => {
      stmtV2.run([i.nome, i.preco]);
    });
    stmtV2.finalize();

    console.log(`✅ ${catalogo_items.length} itens catalogados e sincronizados.`);
  });
}

seed().catch(err => console.error('❌ Erro no seed:', err));
