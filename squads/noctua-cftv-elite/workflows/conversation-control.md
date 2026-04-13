# conversation-control (Workflow)

O fluxo de controle e gestão de contexto inicial.

## Pipeline
1. `noctua-intake` recebe entrada -> Executa `*intent-routing`.
2. Se `control_flow` (greeting/smalltalk): Responde curto e encerra.
3. Se `context_shift` (Mudança de assunto): Pede confirmação antes de mudar o fluxo ativo.
4. Se `pending_answer`: Encaminha para o fluxo ativo correspondente.
5. Se `budget_reset`: Limpa o estado via `noctua-memory` e confirma ao Rafael.
