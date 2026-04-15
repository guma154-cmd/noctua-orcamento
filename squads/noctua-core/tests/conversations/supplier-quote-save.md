# Test: Supplier Quote Save
Scenario: Rafael quer salvar um orçamento de fornecedor, mesmo usando a palavra "orçamento".

## Input
Rafael: "Preciso salvar um orçamento de fornecedor"

## Expected Behavior
- Agent: `@noctua-intake` -> Intent: `supplier_quote_save` (Prioridade via Regex/Contexto)
- Workflow: `supplier-sync`
- Task: `*next-best-action` -> Decide: `request_file`
- Response: "Rafael, identifiquei sua solicitação sobre orçamento de FORNECEDOR. Pode mandar o PDF ou a imagem da cotação."
- State: `activeFlow: supplier_sync`
- Constraint: NÃO deve perguntar sobre residência/comércio ou ambiente.
