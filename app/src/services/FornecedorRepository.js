const { getDb } = require('../db/sqlite');

class FornecedorRepository {
  async bulkInsert(items) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        // Usamos INSERT OR REPLACE para que o registro mais recente sempre atualize o antigo
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO base_fornecedores_noctua (
            fornecedor_nome, sku_noctua, codigo_fornecedor, marca, categoria, subcategoria, modelo,
            descricao_padronizada, descricao_original, unidade_medida,
            preco_unitario, moeda, origem_preco_tipo, origem_preco_referencia,
            data_coleta, confianca_extracao, status_registro
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of items) {
          stmt.run(
            item.fornecedor_nome, item.sku_noctua, item.codigo_fornecedor, item.marca, item.categoria, item.subcategoria, item.modelo,
            item.descricao_padronizada || null, item.descricao_original, item.unidade_medida,
            item.preco_unitario, item.moeda, item.origem_preco_tipo, item.origem_preco_referencia,
            item.data_coleta, item.confianca_extracao, item.status_registro
          );
        }

        stmt.finalize((err) => {
          if (err) {
            db.run("ROLLBACK");
            reject(err);
          } else {
            db.run("COMMIT", (err) => {
              if (err) reject(err);
              else resolve(true);
            });
          }
        });
      });
    });
  }

  async getTotalItemCount() {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM base_fornecedores_noctua', (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      });
    });
  }

  async searchByTerm(term) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      const query = `
        SELECT sku_noctua, fornecedor_nome, preco_unitario, data_coleta, descricao_original
        FROM base_fornecedores_noctua 
        WHERE sku_noctua LIKE ? OR descricao_original LIKE ?
        ORDER BY preco_unitario ASC
        LIMIT 10
      `;
      const searchPattern = `%${term}%`;
      db.all(query, [searchPattern, searchPattern], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = new FornecedorRepository();
