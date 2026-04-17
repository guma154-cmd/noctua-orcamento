const XLSX = require('xlsx');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const { findItemWithFallback } = require('./technical_scope_resolver');

/**
 * AGENTE DE INGESTÃO GOVERNADA NOCTUA
 * Realiza normalização, classificação e mapeamento de confiança.
 */

const processFile = async (filePath, mimeType) => {
    try {
        let rows = [];

        if (mimeType.includes('csv')) {
            const content = fs.readFileSync(filePath, 'utf8');
            rows = parse(content, { columns: true, skip_empty_lines: true });
        } else {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        }

        return await normalizeAndMap(rows);
    } catch (error) {
        console.error('[Ingestor-Governado] Erro:', error.message);
        throw new Error('Falha na normalização da planilha. Verifique a estrutura das colunas.');
    }
};

const normalizeAndMap = async (rows) => {
    const normalizedItems = [];
    let summary = {
        total: 0,
        mapped: 0,
        partial: 0,
        unknown: 0,
        requires_review: false
    };

    for (const row of rows) {
        // 1. Extração e Limpeza Base
        const rawDesc = row.descricao || row.item || row.produto || row.Descricao || row.Item || Object.values(row)[0];
        if (!rawDesc || String(rawDesc).trim().length < 2) continue;

        const normalizedDesc = String(rawDesc).trim().replace(/\s+/g, ' ');
        const quantity = parseInt(row.quantidade || row.qtd || row.Qtd || 1) || 1;
        const unit = row.unidade || row.un || row.Unit || 'Unid';
        const spreadsheetPrice = parseFloat(String(row.preco || row.valor || row.unitario || 0).replace(/[R$\s\.]/g, '').replace(',', '.'));

        // 2. Mapeamento Governado (Chamada ao Catálogo)
        const resolved = await findItemWithFallback('Desconhecido', normalizedDesc, spreadsheetPrice);

        // 3. Cálculo de Confiança e Classificação
        let confidence = 0.0;
        let status = 'UNKNOWN';
        
        if (resolved.origin === 'SKU') {
            confidence = 1.0;
            status = 'MAPPED';
        } else if (resolved.origin === 'PROFILE_DEFAULT' || resolved.origin === 'GLOBAL_DEFAULT') {
            confidence = 0.9;
            status = 'MAPPED';
        } else if (resolved.origin === 'LEGACY_CONTROLLED') {
            confidence = 0.6;
            status = 'PARTIAL';
        } else {
            confidence = 0.3;
            status = 'UNKNOWN';
        }

        const itemRequiresReview = confidence < 0.8 || resolved.sku === 'BLOCK' || resolved.sku === 'FALLBACK';
        if (itemRequiresReview) summary.requires_review = true;

        // Atualiza contadores do sumário
        summary.total++;
        if (status === 'MAPPED') summary.mapped++;
        else if (status === 'PARTIAL') summary.partial++;
        else summary.unknown++;

        // 4. Estrutura Interna Final
        normalizedItems.push({
            raw_description: rawDesc,
            normalized_description: normalizedDesc,
            quantity: quantity,
            unit: unit,
            unit_price: resolved.preco_custo || spreadsheetPrice,
            total_price: (resolved.preco_custo || spreadsheetPrice) * quantity,
            mapped_sku: resolved.sku,
            mapped_category: resolved.categoria || 'Extra',
            mapped_technology: resolved.tecnologia || 'universal',
            source_type: resolved.origin === 'MANUAL' ? 'PLANILHA' : 'CATALOGO',
            confidence: confidence,
            requires_human_review: itemRequiresReview,
            meta: {
                original_row: row,
                price_diff: spreadsheetPrice > 0 ? (resolved.preco_custo - spreadsheetPrice) : 0
            }
        });
    }

    return {
        items: normalizedItems,
        summary
    };
};

module.exports = { processFile };
