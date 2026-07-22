# Story 2.7: Correct Supplier Flow Routing

Status: ready-for-dev

## Story

As a System Administrator,
I want to ensure that supplier quote data is processed by a dedicated supplier intake flow,
so that data integrity is maintained and supplier products are correctly saved to the database.

## Acceptance Criteria

1.  When the user initiates a "Cotação de Fornecedor", the session is marked with `active_flow = 'supplier_quote'`.
2.  A defensive check is implemented at the beginning of the client qualification logic to throw an error if it's called with `session.active_flow === 'supplier_quote'`.
3.  After data is extracted from an image or other source, a router checks `session.active_flow` and calls a dedicated `handleSupplierIngestion` function for supplier quotes.
4.  The `handleSupplierIngestion` function normalizes extracted data to the `noctua_schema_base_fornecedores_v1` schema.
5.  If the supplier's name is not found in the extracted data, the system must ask the user for the name before proceeding.
6.  A summary of the normalized items is presented to the user with `[Cadastrar Tudo]`, `[Revisar]`, and `[Cancelar]` options.
7.  Upon confirmation, a `FornecedorRepository` is used to bulk insert the items into the `base_fornecedores_noctua` table.
8.  A unit test validates that the client qualification agent is **never** called when `active_flow` is `'supplier_quote'`.
9.  A unit test validates that the `FornecedorRepository.bulkInsert` method is called with the correct, normalized data after user confirmation.

## Tasks / Subtasks

- [x] **Task 1: Implement Session Mode** (AC: 1)
  - [x] In `app/src/core/DialogueEngine.js`, set `session.active_flow = 'supplier_quote'` when the "Cotação de Fornecedor" menu option is selected.
- [x] **Task 2: Add Defensive Check** (AC: 2)
  - [x] In the client qualification agent or the part of the `DialogueEngine` that calls it, add the safety check to prevent cross-flow execution.
- [x] **Task 3: Implement Routing Logic** (AC: 3)
  - [x] In `app/src/core/DialogueEngine.js`, after the `intake.classificarIntencao` call, add the logic to route to `handleSupplierIngestion` based on the session flag.
- [x] **Task 4: Create Supplier Ingestion Flow** (AC: 4, 5, 6)
  - [x] Create the `handleSupplierIngestion` function in `app/src/agents/fornecedor.js`.
  - [x] Implement the normalization logic according to the `noctua_schema_base_fornecedores_v1` schema.
  - [x] Implement the logic to ask for the supplier's name if it's missing.
  - [x] Create the confirmation menu in `app/src/ui/telegram-menu.js`.
- [x] **Task 5: Create Fornecedor Repository** (AC: 7)
  - [x] Create the new file `app/src/services/FornecedorRepository.js` with `bulkInsert` and `getTotalItemCount` methods.
- [x] **Task 6: Implement Confirmation Handlers** (AC: 7)
  - [x] In `app/src/bot.js`, add the `callback_query` handlers for the new confirmation buttons.
- [x] **Task 7: Create Unit Tests** (AC: 8, 9)
  - [x] Create a new test file `app/src/tests/fornecedor-flow.test.js` to test the isolated flow and repository interaction.

## Dev Notes

-   **Relevant architecture patterns:** Repository Pattern, Separation of Concerns. The supplier flow must be completely isolated from the client flow.
-   **Source tree components to touch:**
    -   `app/src/core/DialogueEngine.js` (UPDATE)
    -   `app/src/agents/fornecedor.js` (UPDATE)
    -   `app/src/services/FornecedorRepository.js` (NEW)
    -   `app/src/bot.js` (UPDATE)
    -   `app/src/ui/telegram-menu.js` (UPDATE)
    -   `app/src/tests/fornecedor-flow.test.js` (NEW)
-   **Testing standards summary:** Unit tests are crucial for this change to ensure the flow isolation and data integrity. Use spies to assert that certain functions are not called.

### Project Structure Notes

-   The introduction of a `FornecedorRepository` aligns with the established Repository Pattern for database interactions.

### References

-   [Source: `__bmad-output/planning-artifacts/prd-noctua.md`]
-   [Source: `__bmad-output/planning-artifacts/architecture.md`]
-   [Source: `__bmad-output/planning-artifacts/sprint-change-proposal-2026-05-03.md`]

## Dev Agent Record

### Agent Model Used
Gemini 1.5 Pro

### Debug Log References
- Initial bug report log showing `IA-Qualificacao` being called incorrectly.

### Completion Notes List
- The story file has been created based on the approved Sprint Change Proposal.
- All tasks have been completed. The supplier intake flow is now correctly routed and isolated from the client flow. A new repository has been created to handle data persistence, and new unit tests have been added.

### File List
- `app/src/core/DialogueEngine.js`
- `app/src/agents/fornecedor.js`
- `app/src/services/FornecedorRepository.js`
- `app/src/bot.js`
- `app/src/ui/telegram-menu.js`
- `app/src/tests/fornecedor-flow.test.js`
- `__bmad-output/implementation-artifacts/2-7-correct-supplier-flow-routing.md`
