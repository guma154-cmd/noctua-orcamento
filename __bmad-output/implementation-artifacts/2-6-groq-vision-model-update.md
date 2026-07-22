# Story 2.6: Groq Vision Model Update

Status: ready-for-dev

## Story

As a System Administrator,
I want to replace the decommissioned Groq vision model with a supported one,
so that the image intake functionality remains robust and resilient.

## Acceptance Criteria

1.  The `llama-3.2-11b-vision-preview` model in `app/src/services/ai/matrix.js` is replaced with `meta-llama/llama-4-scout-17b-16e-instruct`.
2.  The application explicitly handles "model decommissioned" errors from any provider and automatically falls back to the next provider in the `ELIGIBILITY_MATRIX`.
3.  A unit test is added to simulate a "model decommissioned" error and validates that the system correctly falls back to the next provider.
4.  The Vision Squad continues to function with Groq as the primary provider and Gemini as the fallback.

## Tasks / Subtasks

- [x] **Task 1: Update AI Provider Matrix** (AC: 1, 4)
  - [x] Modify `app/src/services/ai/matrix.js` to replace the decommissioned Groq model.
- [x] **Task 2: Implement Decommissioned Model Error Handling** (AC: 2)
  - [x] Modify `app/src/services/ai/orchestrator.js` (or equivalent) to catch "model decommissioned" errors and trigger a fallback.
- [x] **Task 3: Create Fallback Unit Test** (AC: 3)
  - [x] Create a new test file or add to an existing one to simulate the decommissioned model error and verify the fallback logic.

## Dev Notes

-   **Relevant architecture patterns:** The system uses a "Squad de Visão" with a provider eligibility matrix (`ELIGIBILITY_MATRIX`) and an orchestrator to manage fallbacks. This pattern must be maintained.
-   **Source tree components to touch:**
    -   `app/src/services/ai/matrix.js` (UPDATE)
    -   `app/src/services/ai/orchestrator.js` (or equivalent) (UPDATE)
    -   A new or existing test file in `app/src/tests/`.
-   **Testing standards summary:** Unit tests are expected for new logic. Mocks and stubs should be used to isolate dependencies.

### Project Structure Notes

-   The changes align with the existing project structure. No conflicts are detected.

### References

-   [Source: `__bmad-output/planning-artifacts/architecture.md`#Integração Multimodal e Resiliência]
-   [Source: `__bmad-output/planning-artifacts/sprint-change-proposal-2026-05-03.md`]

## Dev Agent Record

### Agent Model Used
Gemini 1.5 Pro

### Debug Log References
- Initial bug report log: `[Groq Vision Error] Status: 400 "The model \`llama-3.2-11b-vision-preview\` has been decommissioned"`

### Completion Notes List
- The story file has been created based on the approved Sprint Change Proposal.
- All tasks have been completed. The AI provider matrix has been updated, error handling for decommissioned models has been implemented, and a new unit test has been added to verify the fallback logic.

### File List
- `app/src/services/ai/matrix.js`
- `app/src/services/ai/orchestrator.js`
- `app/src/tests/orchestrator.test.js`
- `__bmad-output/implementation-artifacts/2-6-groq-vision-model-update.md`
