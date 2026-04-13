# Test: Greeting Basic
Scenario: Rafael inicia uma conversa casual.

## Input
Rafael: "Oi"

## Expected Behavior
- Agent: `@noctua-intake` -> Intent: `greeting`
- Workflow: `conversation-control`
- Next Action: `acknowledge`
- Response: "Opa, Rafael. Manda o que você precisa." (ou variante natural curta)
- State: `activeFlow: null`, `answered_families: []`
