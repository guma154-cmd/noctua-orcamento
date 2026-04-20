## TSR Atual
| Decisão | Arquivo | Linha | Lógica atual |
|---------|---------|-------|--------------|
| Tipo de Tecnologia | technical_scope_resolver.js | 410 | `mapTechType(session.system_type)` |
| Modo PoE | technical_scope_resolver.js | 411 | `mapPoEMode(session.poe_mode)` |
| Seleção NVR/DVR | technical_scope_resolver.js | 416 | `selectNVR(techType, cameraCount, poeMode)` |
| Config Switch | technical_scope_resolver.js | 422 | Baseado em `nvrResult.switch` |
| Seleção de Cabo | technical_scope_resolver.js | 430 | `selectCable(techType, resolution, maxDistance)` |
| Storage | technical_scope_resolver.js | 475 | `calculateStorage(scope, cameraCount, isIP, session)` |

## O que PRESERVAR
- Estrutura modular de `findItemWithFallback` para busca no catálogo.
- Definições de perfis (`Casa`, `Comércio`, `Condomínio`).
- Lógica de cálculo de infraestrutura (eletrodutos/canaletas).
- Motor de resolução de respostas pendentes (`resolvePendingTechnicalAnswer`).

## O que REFATORAR
- **Flow de Perguntas**: Mover a lógica de tecnologia para o início do fluxo de qualificação para ser determinística.
- **Sugestão de IP over Coax**: Implementar a lógica de sugestão proativa quando `retrofit` for detectado.
- **Storage A/B/C**: Separar claramente as perguntas de "Dias Desejados" (Modelo A) vs "Capacidade Atual" (Modelo B) no fluxo de conversa, não apenas no TSR.
- **Topologia**: Garantir que a nota de topologia seja exibida corretamente no relatório final.
