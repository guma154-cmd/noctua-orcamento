# *slot-filling (Task)

Extração incremental de dados técnicos e preenchimento de estado.

## Objetivo
Processar o conteúdo bruto e identificar campos pendentes no rascunho de orçamento.

## Funcionamento
- Usa as "Question Families" para entender equivalência semântica.
- Preenche `answered_families` conforme o progresso.
- Define `confidence` para cada campo (High/Low).
- Detecta contradições em relação aos dados já salvos no rascunho.
