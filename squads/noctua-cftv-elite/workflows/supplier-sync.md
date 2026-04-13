# supplier-sync (Workflow)

O fluxo de ingestão e atualização de preços de fornecedores.

## Pipeline
1. `noctua-intake` processa PDF/Imagem -> `noctua-buyer` executa `*supplier-ingestion`.
2. `noctua-buyer` executa `*catalog-normalization` para padronizar itens.
3. `noctua-intake` apresenta rascunho estruturado ao Rafael.
4. Rafael confirma via resposta curta ou correção.
5. `noctua-memory` persiste na base definitiva de fornecedores.
