## Trace do NaN — BUG-001
Fórmula: `(camera.preco_custo * qtdCameras) + dvr.preco_custo + hd.preco_custo + custoAcessorios + custoCabo + custoInfra`
Arquivo: `app/src/agents/orcamento.js`

Variáveis:
- `qtdCameras`: Vem de `escopo.quantidade` (ou `escopo.camera_quantity`). Origem: `session.camera_quantity`.
- Tipo: String (ex: "8 câmeras") quando selecionado via menu de botões.
- Ponto de falha: Linha 116 de `orcamento.js`. Multiplicação de número por string não-numérica resulta em `NaN`.

Causa raiz:
O `DialogueEngine.js` passa o estado da sessão diretamente para o motor de cálculo. O estado da sessão armazena o label da opção selecionada (que contém texto) em vez de apenas o valor numérico, e o motor de cálculo não sanitiza esse input.