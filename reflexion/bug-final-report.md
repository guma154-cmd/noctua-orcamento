## Relatório Final de Correção de Bugs — NOCTUA

| Bug | Causa raiz | Arquivo corrigido | Commit | Teste |
| :--- | :--- | :--- | :--- | :--- |
| BUG-001 (NaN) | Input de string label não sanitizado antes de cálculo | `app/src/agents/orcamento.js` | a3f0b21 | B001-B005 |
| BUG-002 (NVR) | Prioridade de Query de Padrão Global sobre Busca Nominal | `app/src/agents/technical_scope_resolver.js` | a3f0b21 | B006-B010 |
| BUG-003 (Alertas) | Ausência de gate de bloqueio para severidade BLOCK | `app/src/core/DialogueEngine.js` | a3f0b21 | B011-B015 |
| BUG-004 (Template)| Redundância entre variável e texto fixo no template | `app/src/templates/propostas.js` | a3f0b21 | B016-B018 |
| BUG-005 (Storage) | Interpretação de quantidade como NaN afetando cálculo | `app/src/agents/technical_scope_resolver.js` | a3f0b21 | B019-B020 |

### Resumo das Ações:
- **Sanitização Universal:** Todos os inputs de quantidade de câmeras agora passam por `parseInt()` no início do processamento técnico (TSR) e financeiro (Orcamento), garantindo que labels como "8 câmeras" não quebrem as fórmulas.
- **Hierarquia de Catálogo:** A busca nominal agora tem precedência sobre os itens padrão, permitindo que o TSR selecione o gravador correto conforme a necessidade técnica.
- **Gate de Segurança:** Implementado bloqueio real para alertas de severidade `BLOCK`. O sistema agora impede a geração de orçamentos tecnicamente inviáveis.
- **Refinamento de Template:** Templates limpos e lógica de pluralização (câmera/câmeras) movida para o renderizador.

### Verificação do Orçamento de Validação (Cenário Abreu):
- **8 câmeras, Modelo A, Casa:**
  - Valor Final: **Validado** (Numérico correto)
  - NVR Selecionado: **NVR 8 Canais IP** (Correto)
  - Alertas: **Validado** (Bloqueio funciona se exceder capacidade)
  - Texto: **"8 câmeras"** (Sem duplicação)
  - Storage: **HD 2TB SkyHawk** (Calculado corretamente para 8 cams IP)

Score Final: **20/20** nos evals automatizados.
