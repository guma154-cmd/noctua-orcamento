## Trace da Seleção de NVR — BUG-002
Função: `findItemWithFallback`
Arquivo: `app/src/agents/technical_scope_resolver.js`

Hierarquia de Queries:
1. SKU Exato
2. PROFILE_DEFAULT
3. GLOBAL_DEFAULT
4. LEGACY_CONTROLLED (Busca Nominal)

Ponto de Falha:
O `TSR` solicita `NVR 8 Canais IP` via busca nominal (Query 4). No entanto, a Query 3 (`GLOBAL_DEFAULT`) é executada antes e encontra o `NVR 4 Canais IP` marcado como `item_padrao = 1` no banco de dados para a categoria `Recorder` e tecnologia `IP`.

Causa raiz:
A priorização de itens "Padrão Global" na hierarquia de busca impede que especificações nominais dinâmicas (como o número de canais calculado pelo `TSR`) sejam honradas se houver qualquer item marcado como padrão na mesma categoria/tecnologia. Além disso, o seed do banco de dados tem o NVR de 4 canais marcado como padrão.