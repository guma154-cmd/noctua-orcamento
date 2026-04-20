# NOCTUA SEARCH MEMORY
- Padrões de Orquestração: SORIA V2 implementado em `orchestrator.js`.
- Persistência: SQLite com inicialização automática em `sqlite.js`.
- Interface: Telegraf.js com fila de mensagens anti-stress em `bot.js`.
- Padrão aprendido (Pesquisa): Lazy Sessions (evitar fetch de sessão para comandos stateless).
- Padrão aprendido (Pesquisa): Separação de FSM (XState style) para lógica complexa desacoplada do transporte.
- Validação: O uso de `messageQueue` no NOCTUA é uma best practice para evitar race conditions em Node.js.
- Padrão Profissional (Pesquisa): Níveis DORI (Detection, Observation, Recognition, Identification) para especificação de câmeras.
- Padrão Profissional (Pesquisa): PoE Budgeting (Cálculo de consumo total em Watts para switches PoE).


