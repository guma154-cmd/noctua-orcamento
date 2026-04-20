# Mapa de Menus - Fase 0

## Mapa de Menus Real
| Menu | Arquivo | Linha | Opções | Handler | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Menu Principal** | `telegram-menu.js` | 76 | Novo Orçamento, Continuar, Cotação, Consultar, Limpar | `bot.js:141` (`menu:`) -> `DE.handleMainMenuSelection` | Ativo |
| **Mídia Fornecedor** | `telegram-menu.js` | 95 | Texto, Imagem, PDF, Áudio | Callbacks `supplier_midia:*` | **Órfão (Sem Handler)** |
| **Revisão Cotação** | `telegram-menu.js` | 110 | Confirmar, Editar Nome, Cancelar, Voltar | Callbacks `confirm_quote:*`, `edit_name_quote:*`, etc. | **Órfão (Sem Handler)** |
| **Escolha Modelo** | `telegram-menu.js` | 162 | Modelo A, Modelo B, Ambos | `DE.process` -> `DE.handleModelChoice` | Ativo (via `cleanText`) |
| **Confirmação Reset**| `telegram-menu.js` | 229 | Sim, não | `DE.process` (status `awaiting_reset_confirmation`) | Ativo |
| **Revisão Importação**| `telegram-menu.js` | 208 | Tudo, Confiáveis, Manual, Cancelar | `DE.handleImportReview` | Ativo |
| **Opções Dinâmicas** | `telegram-menu.js` | 186 | (Dinâmicas) | `bot.js:148` -> `DE.process` -> `qualificacao.resolvePendingAnswer` | Ativo |

## Falhas Identificadas
| ID | Menu afetado | Tipo de falha | Severidade | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| **F001** | Revisão Cotação | Callback sem handler | Crítico | Botões `confirm_quote`, `edit_name_quote` e `cancel_quote` não estão tratados no `bot.js`. |
| **F002** | Mídia Fornecedor | Callback sem handler | Crítico | Botões `supplier_midia:*` não estão tratados no `bot.js`. Ao clicar, nada acontece. |
| **F003** | Geral (Navigation)| Perda de Prefixo | Alto | O `bot.js:149` faz split pelo `:` e descarta o prefixo. Isso quebra handlers que dependem do prefixo (ex: `admin:`, `menu:`, `q:`, `model:`). |
| **F004** | `/start` | Falta de Reset | Médio | `/start` não limpa a sessão se houver um rascunho anterior, o que pode causar comportamento inesperado. |
| **F005** | `/cancelar` | Comando inexistente | Alto | O comando `/cancelar` não está registrado no `bot.js`, forçando o usuário a digitar comandos de "limpar". |
| **F006** | Mídia Fornecedor | Inconsistência Voz | Baixo | Botão `MIDIA_AUDIO` usa `supplier_midia:audio`, mas o bot ouve o tipo `voice`. |
| **F007** | Qualificação | Conflito de Intenção | Médio | Se o usuário digitar algo que pareça um comando durante a qualificação, o `Intent Router` pode tirar ele do fluxo bruscamente. |
| **F008** | `/status` | Comando inexistente | Médio | Comando `/status` não implementado no `bot.js`. |
| **F010** | Callback | Falta de timeout | Médio | Callbacks expirados não têm tratamento amigável (o Telegram mostra apenas um spinner eterno se o handler falhar). |

## Observações Técnicas
- O `bot.js` usa um sistema de fila para evitar stress.
- O `DialogueEngine` centraliza a lógica, mas o `bot.js` faz uma prévia do conteúdo (split de callback) que está prejudicando a granularidade.
- A sessão é persistida em SQLite via `memoria.js`.
