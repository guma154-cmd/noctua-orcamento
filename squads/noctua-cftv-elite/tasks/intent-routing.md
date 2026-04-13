# *intent-routing (Task)

A camada inicial de inteligência que define o destino da conversa.

## Objetivo
- Analisar a entrada do usuário e o estado atual da sessão para decidir o fluxo.
- Categorias de destino:
  - `client_flow`: Rafael quer orçamento para cliente.
  - `supplier_flow`: Rafael enviou cotação de fornecedor.
  - `control_flow`: Rafael está apenas saudando ou jogando conversa fora.
  - `pending_answer`: Rafael está respondendo à pergunta anterior.

## Lógica AIOX
- Verificação de Regex prioritária (ex: "fornecedor" sempre roteia para `supplier_flow`).
- Verificação de contexto ativo via `@noctua-memory`.
- Saída: ID do Workflow a ser seguido.
