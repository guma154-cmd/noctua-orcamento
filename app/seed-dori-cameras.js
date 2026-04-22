const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, './data/database.sqlite');
const db = new sqlite3.Database(dbPath);

const cameras = [
    {
        sku: 'NTC-CAM-4MP-ANALOG',
        nome_comercial: 'Câmera Bullet 4MP (Analógica)',
        categoria: 'Camera',
        subcategoria: 'Analógica',
        tecnologia: 'analog',
        preco_custo: 195.00,
        item_padrao: 1
    },
    {
        sku: 'NTC-CAM-4MP-IP',
        nome_comercial: 'Câmera Bullet 4MP (IP)',
        categoria: 'Camera',
        subcategoria: 'IP',
        tecnologia: 'ip',
        preco_custo: 380.00,
        item_padrao: 1
    },
    {
        sku: 'NTC-CAM-8MP-IP',
        nome_comercial: 'Câmera Bullet 8MP (IP)',
        categoria: 'Camera',
        subcategoria: 'IP',
        tecnologia: 'ip',
        preco_custo: 850.00,
        item_padrao: 1
    },
    {
        sku: 'NTC-CAM-4MP-DOME-ANALOG',
        nome_comercial: 'Câmera Dome 4MP (Analógica)',
        categoria: 'Camera',
        subcategoria: 'Analógica',
        tecnologia: 'analog',
        preco_custo: 185.00,
        item_padrao: 1
    },
    {
        sku: 'NTC-CAM-4MP-DOME-IP',
        nome_comercial: 'Câmera Dome 4MP (IP)',
        categoria: 'Camera',
        subcategoria: 'IP',
        tecnologia: 'ip',
        preco_custo: 360.00,
        item_padrao: 1
    },
    {
        sku: 'NTC-CAM-8MP-DOME-IP',
        nome_comercial: 'Câmera Dome 8MP (IP)',
        categoria: 'Camera',
        subcategoria: 'IP',
        tecnologia: 'ip',
        preco_custo: 820.00,
        item_padrao: 1
    }
];

db.serialize(() => {
    const stmt = db.prepare(`INSERT OR REPLACE INTO catalogo_noctua 
        (sku, nome_comercial, categoria, subcategoria, tecnologia, preco_custo, item_padrao, ativo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)`);

    cameras.forEach(cam => {
        stmt.run(cam.sku, cam.nome_comercial, cam.categoria, cam.subcategoria, cam.tecnologia, cam.preco_custo, cam.item_padrao);
        console.log(`[Seed] Adicionado/Atualizado: ${cam.sku}`);
    });

    stmt.finalize();
});

db.close();
