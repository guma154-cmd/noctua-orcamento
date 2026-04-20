# Menu Reflections
Este arquivo contém as autocríticas acumuladas durante a correção dos menus do Telegram.

## Reflexion iter-1 — 2026-04-19 21:50
- Menu corrigido: Callbacks de Fornecedor, Comandos Globais (/cancelar, /status), Preservação de Prefixos.
- Causa raiz identificada: bot.js removia prefixos dos callbacks (ex: confirm_quote:ID -> ID), impossibilitando o DialogueEngine de identificar a identificar a intenção.
- Decisão: COMMITAR.

## Reflexion iter-2 — 2026-04-19 22:15
- Menu corrigido: Prevenção de Double-Click (T022).
- Causa raiz identificada: O bot processava cliques idênticos sequencialmente se o usuário clicasse rápido.
- Decisão: COMMITAR.

## Reflexion iter-3 — 2026-04-19 22:35
- Menu corrigido: Fallback Textual e Resiliência de IA (T016, T029).
- Causa raiz identificada: O Intent Router dependia 100% de IA; se a API falhasse, o bot ficava mudo ou dava fallback genérico.
- Decisão: COMMITAR.

## Reflexion iter-4 — 2026-04-19 23:10 (Final)
- Menu corrigido: Resumo TSR e Exibição de Resumo (T011, T009, F005).
- Causa raiz identificada: Falta do componente `menuRevisaoOrcamento` e fluxos de encerramento do TSR que não disparavam o motor de cálculo para exibição prévia.
- Efeitos colaterais verificados: O cálculo em tempo real no final do TSR enriquece a experiência sem travar o bot.
- Conclusão: Sistema de menus atingiu maturidade operacional para MODO_QUALIFICACAO.
