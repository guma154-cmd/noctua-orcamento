# Mapeamento do Fluxo de Orçamento Atual

## Fluxo Atual (Diagrama Textual)
1. **Ponto de Entrada**: `bot.js` recebe comando `/start` ou botão clicar em `Novo Orçamento`.
2. **Engine**: `DialogueEngine.js` captura a intenção `client_budget_start`.
3. **Qualificação (Intake)**: 
   - `qualificacao.js` percorre `QUESTION_FAMILIES`.
   - Perguntas: `property_type` -> `camera_quantity` -> `installation_environment` -> `system_type` -> `recording` -> `recording_days` -> `remote_access` -> `material_source` -> `client_name` -> `client_address` -> `client_phone`.
4. **Resolução Técnica (TSR)**:
   - `DialogueEngine` chama `handleTechnicalScope`.
   - `technical_scope_resolver.js` gera o payload técnico base (NVR, Câmeras, HD, Cabos, Infra).
   - Se houver pendências técnicas (distâncias, infra detalhada), faz perguntas extras.
   - Realiza auditoria via `technical_auditor.js`.
5. **Revisão e Escolha de Modelo**:
   - `DialogueEngine` exibe o menu `menuRevisaoOrcamento`.
   - O usuário seleciona "Modelo A" (referenciado como MDO no código legando) ou "Modelo B" (Completo no código legado). **[CONFLITO IDENTIFICADO]**.
6. **Cálculo Financeiro**:
   - `orcamento.js` calcula `custoMaterial` e `custoInstalacao`.
   - Gera as duas propostas (A e B) via `renderizarProposta`.
7. **Finalização**: Envia o relatório operacional e a proposta textual para o Rafael.

## Pontos de Acoplamento e Riscos
| Arquivo | Linha | Problema |
| :--- | :--- | :--- |
| `orcamento.js` | 134 | `custoMaterial` soma tudo indiferente do modelo atual, dependendo do `preco_custo=0` setado via TSR. |
| `orcamento.js` | 149 | `valorModeloB` assume que material e instalação devem ser somados no markup único. |
| `DialogueEngine.js` | 414-420 | `handleModelChoice` tem labels invertidos em relação à nova especificação (A=Completo, B=MDO). |
| `qualificacao.js` | 90 | `getDefaultState` não possui o campo `budget_model`. |
| `TSR.js` | 437 | Lógica de `recording_required.includes('possuo')` está espalhada e acoplada a strings. |
| `TSR.js` | 573 | `material_source.includes('Cliente')` força revisão humana total, mas no Modelo B isso deveria ser o padrão. |

## O que PRESERVAR (Não tocar)
| Componente | Motivo |
| :--- | :--- |
| `sqlite.js` | Camada de persistência está estável. |
| `technical_auditor.js` | A auditoria deve continuar validando a consistência técnica, apenas mudando a severidade no Modelo B. |
| `catalogo_noctua` (DB) | Estrutura de preços e itens está correta. |

## O que REFATORAR
| Componente | O que muda |
| :--- | :--- |
| `qualificacao.js` | Inserir `budget_model` como primeira pergunta. |
| `orcamento.js` | Isolar os cálculos de cada modelo. Modelo B deve ignorar custos de material. |
| `TSR.js` | Remover a regra de "possuo" em favor da verificação do `budget_model`. |
| `DialogueEngine.js` | Corrigir a inversão de Modelo A/B e adicionar Modelo C. |

## Plano de Prevenção de NaN
- Adicionar guards em `calcularDadosFinanceiros` para garantir que `preco_custo` nunca seja `undefined`.
- Tipagem forçada no retorno do `findItemWithFallback`.
