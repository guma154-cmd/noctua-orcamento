# client-quote (Workflow)

O fluxo completo de montagem de orçamento para clientes.

## Pipeline
1. `noctua-intake` normaliza -> `noctua-memory` atualiza o rastro.
2. `noctua-qualifier` executa `*slot-filling` incremental.
3. `noctua-memory` valida contradições.
4. `noctua-orc` (se dados completos) executa cálculos e gera relatório.
5. `noctua-intake` entrega a resposta final (Relatório + Proposta).
6. Se dados incompletos: Executa `*next-best-action` para fazer a próxima pergunta.
