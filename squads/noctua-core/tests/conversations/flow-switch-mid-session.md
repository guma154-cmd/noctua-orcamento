# Test: Flow Switch Mid-Session
Scenario: Rafael muda de assunto durante um orçamento de cliente ativo.

## Input 1
Rafael: "Quero orçar 4 câmeras"
Bot: "Ok, qual o ambiente?"

## Input 2
Rafael: "Aliás, salva esse preço de fornecedor aqui: Camera IP R$ 150"

## Expected Behavior
- Agent: `@noctua-intake` -> Intent: `supplier_quote_save`
- Workflow: `conversation-control` -> Detecta `context_shift` (Active Flow: `client_quote` vs New Intent: `supplier_quote_save`)
- Task: `*context-confirmation`
- Response: "Rafael, percebi que mudamos de assunto. Você quer continuar o orçamento do cliente ou prefere focar no fornecedor agora?"
- State: `awaiting_context_confirm: true`
