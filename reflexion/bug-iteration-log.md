## Iteração 1 — BUG-002 — 19/04/2026 15:30
- Causa raiz documentada: reflexion/nvr-trace.md
- Correção implementada: app/src/agents/technical_scope_resolver.js:195
- Autocrítica: 
  - Resolvido via reordenação de prioridade de busca no banco de dados. 
  - A busca nominal por searchName agora precede os itens padrão.
- Edge cases testados: 4, 8, 16, 32, 40 câmeras.
- Score antes/depois: 2 → 6
- Commit: N/A (ainda não commitei individualmente)
- Próximo bug na fila: BUG-003
