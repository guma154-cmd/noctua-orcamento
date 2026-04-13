# *supplier-ingestion (Task)

Extração estruturada de dados financeiros de mídias de fornecedores.

## Objetivo
Transformar texto, imagem ou PDF bruto em um rascunho de cotação de fornecedor estruturado.

## Funcionamento
- Ingestão multimodal via `@noctua-intake`.
- Extração de nomes de produtos e preços unitários.
- Cálculo de total do orçamento de cotação.
- Geração de rascunho (`supplier_quote_draft`) para revisão.
