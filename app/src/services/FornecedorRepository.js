const { getDb } = require('../db/sqlite');

class FornecedorRepository {
  async bulkInsert(items) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO base_fornecedores_noctua (
        fornecedor_nome, item_codigo, marca, categoria, subcategoria, modelo,
        descricao_padronizada, descricao_original, unidade_medida,
        preco_unitario, moeda, origem_preco_tipo, origem_preco_referencia,
        data_coleta, confianca_extracao, status_registro
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction((items) => {
      for (const item of items) {
        stmt.run(
          item.fornecedor_nome, item.item_codigo, item.marca, item.categoria, item.subcategoria, item.modelo,
          item.descricao_padronizada, item.descricao_original, item.unidade_medida,
          item.preco_unitario, item.moeda, item.origem_preco_tipo, item.origem_preco_referencia,
          item.data_coleta, item.confianca_extracao, item.status_registro
        );
      }
    })(items);
  }

  async getTotalItemCount() {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM base_fornecedores_noctua').get();
    return row.count;
  }
}

module.exports = new FornecedorRepository();
