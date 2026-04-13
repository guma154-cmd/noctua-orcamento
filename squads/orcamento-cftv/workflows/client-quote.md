---
workflow: client-quote
name: "Fluxo de Orçamento ao Cliente"
description: "Processo completo desde a recepção do pedido até a geração e salvamento do orçamento final."
version: "1.0.0"
---

# Fluxo de Orçamento ao Cliente

## Phases

### 1. Intake (oc-intake)
- **Ação:** Recebe a mensagem do cliente.
- **Task:** `oc-intake-receber-pedido.md`
- **Output:** `intake-raw.json`

### 2. Qualification (oc-qualificacao)
- **Ação:** Analisa o pedido e extrai especificações técnicas.
- **Task:** `oc-qualificacao-analisar.md`
- **Output:** `specs-tecnicas.json`

### 3. Pricing (oc-orcamento)
- **Ação:** Calcula valores e gera o documento de orçamento.
- **Task:** `oc-orcamento-gerar.md`
- **Output:** `orcamento-final.pdf`, `final_data`

### 4. Persistence (oc-memoria)
- **Ação:** Salva o orçamento no histórico.
- **Task:** `oc-memoria-salvar.md`
- **Output:** `history.json` updated.

---

## Error Handling
- Se a qualificação falhar por falta de dados, volta para a Fase 1 solicitando mais informações via oc-intake.
- Se a precificação falhar por falta de preços, pausa o fluxo para intervenção humana.
