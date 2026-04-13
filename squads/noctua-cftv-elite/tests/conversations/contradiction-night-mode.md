# Test: Contradiction Night Mode
Scenario: Rafael se contradiz sobre a necessidade de imagem noturna.

## Input 1
Rafael: "Não precisa de uso noturno"

## Input 2 (turno posterior)
Rafael: "Precisa filmar no escuro total"

## Expected Behavior
- Task: `*slot-filling` detecta contradição (`night_use: false` vs `night_use: true`)
- Workflow: `conflict-resolution`
- Task: `*contradiction-resolution`
- Response: "Rafael, você comentou antes que não precisaria de uso noturno, mas agora mencionou filmagem no escuro. Pode confirmar qual o requisito final?"
- State: `confidenceByField.night_use: Low`
