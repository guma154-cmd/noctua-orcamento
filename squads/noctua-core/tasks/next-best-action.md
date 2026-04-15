# *next-best-action (Task)

O motor de decisão do Squad que define o próximo passo operacional.

## Objetivo
Decidir racionalmente qual a melhor interação a ser feita com o Rafael no próximo turno.

## Ações Possíveis
- `ask_field`: Perguntar o próximo campo técnico pendente.
- `confirm_inference`: Pedir confirmação de um dado preenchido via inferência.
- `resolve_conflict`: Pedir esclarecimento sobre uma contradição detectada.
- `request_file`: Solicitar anexo ou PDF de cotação.
- `calculate`: Encaminhar para o agente de orçamento (`@noctua-orc`).
- `present_proposal`: Entregar o resultado final ao Rafael.
- `acknowledge`: Apenas validar o recebimento da informação e aguardar.

## Lógica AIOX
- Baseada no estado estruturado em `@noctua-memory`.
- Prioriza campos técnicos faltantes conforme a hierarquia de importância do PRD.
