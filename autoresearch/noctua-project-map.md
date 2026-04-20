# NOCTUA PROJECT MAP

## Arquitetura
O sistema segue uma arquitetura de Agentes Especializados coordenados por um `DialogueEngine`.

- **Motor de Diálogo:** `app/src/core/DialogueEngine.js` (Máquina de estados para sessões Telegram).
- **Banco de Dados:** SQLite (`app/src/db/sqlite.js`). Armazena sessões, clientes, orçamentos e catálogo.
- **Camada de Agentes (Lógica de Domínio):**
  - `qualificacao.js`: Coleta de dados iniciais do cliente.
  - `technical_scope_resolver.js` (TSR): Definição técnica (câmeras, gravadores, infra).
  - `orcamento.js`: Cálculo de valores e composição de itens.
  - `fornecedor.js`: Gestão de preços e integração com fornecedores.
  - `memoria.js`: Abstração de persistência (CRUD).
  - `technical_auditor.js`: Auditoria de IA para revisão técnica.
  - `ingestor_planilha.js`: Parsing de listas de materiais externas.
- **Serviços:**
  - `app/src/services/ai.js`: Interface com LLMs (Anthropic, Gemini, Groq).
- **Interface (UI):**
  - `app/src/ui/telegram-menu.js`: Templates de menus e mensagens.
- **Testes e QA:**
  - `app/qa-*.js`: Suítes de validação funcional e stress.
  - `app/test-*.js`: Testes de unidades e integração.

## Tecnologias
- **Runtime:** Node.js
- **Banco:** SQLite
- **Bot:** Telegram Bot API
- **IA:** Anthropic, Gemini, Groq
- **Templates:** Handlebars (inferido de `app/src/templates`)
