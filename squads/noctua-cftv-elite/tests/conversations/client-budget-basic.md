# Test: Client Budget Basic
Scenario: Rafael inicia um orçamento de cliente com dados parciais.

## Input
Rafael: "Preciso de um orçamento para 4 câmeras num apartamento"

## Expected Behavior
- Agent: `@noctua-intake` -> Intent: `client_budget_start`
- Workflow: `client-quote`
- Task: `*slot-filling` -> Extrai: `camera_quantity: 4`, `property_type: residencial/apartamento`
- Task: `*next-best-action` -> Decide: `ask_field` (installation_environment)
- Response: "Ok, 4 câmeras no apartamento. O ambiente será interno ou externo?"
- State: `activeFlow: client_quote`, `answered_families: [camera_quantity, property_type]`
