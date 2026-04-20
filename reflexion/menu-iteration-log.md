# Menu Iteration Log
Registro de todas as iterações de correção de menus.

## Iteração 1 — 2026-04-19 21:55
- Falha alvo: [T020, T033, T034, T035] Callbacks de fornecedor, prefixos de callback, comando /cancelar e /status.
- Causa raiz identificada: bot.js descartava prefixos de callback e não tinha comandos registrados.
- Correção implementada: bot.js atualizado para preservar data integral; DE.js agora diferencia callbacks de texto comum e suporta fluxos de fornecedor.
- Autocrítica: Resolvido via preservação de contexto e handlers específicos.
- Score antes/depois: 19 → 24.

## Iteração 2 — 2026-04-19 22:15
- Falha alvo: [T022] Double-click em botão não duplica ação.
- Causa raiz identificada: Falta de proteção de idempotência no handler de callback.
- Correção implementada: Adicionado `lastClicks` Map no `bot.js`.
- Autocrítica: Simples e eficaz.
- Score antes/depois: 24 → 25.

## Iteração 3 — 2026-04-19 22:35
- Falha alvo: [T016, T029] Fallback textual e Erro de IA.
- Causa raiz identificada: Intent Router sem fallback local robusto para falhas de Gemini.
- Correção implementada: try-catch no Intent Router; fallback para `parseLocal` e `unknown`; `continueFlow` agora oferece menu principal se estiver perdido.
- Autocrítica: Aumenta a percepção de estabilidade do bot sob carga ou falha de API.
- Score antes/depois: 25 → 27 (T016 e T029 passam).
- Commit: N/A
- Próxima falha na fila: [T011, T009] Exibição de resumo e topologia no TSR.
