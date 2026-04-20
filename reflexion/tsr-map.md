# Mapeamento do TSR - Pré-Refatoração de Tecnologia

Este documento mapeia a lógica atual do `TechnicalScopeResolver.js` para garantir uma transição segura para o novo motor de tecnologia (IP/Analógico/PoE).

## TSR Atual

| Decisão | Arquivo | Linhas | Lógica atual |
| :--- | :--- | :--- | :--- |
| **Tecnologia (IP vs Analog)** | `technical_scope_resolver.js` | 349-350 | Detectado via string `session.system_type`. |
| **Seleção de Gravador** | `technical_scope_resolver.js` | 379-416 | Usa `getRecorderDivision`. Seleciona gravadores de 4, 8, 16 ou 32 canais. Não diferencia NVR PoE de NVR simples. |
| **Tipo de Cabo** | `technical_scope_resolver.js` | 453-455 | Atribuição manual: `Cat5e` para IP, `Coaxial 4mm` para Analógica. Sobrescreve para `Cat6` se marcado no escopo. |
| **Tratamento PoE** | `technical_scope_resolver.js` | 516-551 | Adiciona switches PoE externos para projetos IP. Ignora a possibilidade de NVR com PoE integrado. |
| **Cálculo de Storage** | `technical_scope_resolver.js` | 258-281 | Usa `calculateStorage` (refatorado na sprint anterior para usar bitrate básico). |

## O que PRESERVAR
- A estrutura de `findItemWithFallback` para busca no catálogo.
- A lógica de `getRecorderDivision` para lidar com múltiplos gravadores em projetos grandes (>32 canais).
- O mapeamento de acessórios básicos (conector, fonte, etc).
- As `operational_flags` (high_complexity, etc).

## O que REFATORAR
- **Desacoplar a lógica de NVR**: Mover para `nvr-selector.js`.
- **Desacoplar a lógica de Cabo**: Mover para `cable-selector.js`.
- **Introduzir PoE_MODE**: Diferenciar NVR Integrado vs Switch Externo.
- **Topologia**: Melhorar a descrição da topologia quando houver switch.
- **IP over Coax**: Adicionar lógica para reaproveitamento de cabos coaxial em sistemas IP.
