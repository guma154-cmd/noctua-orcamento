## Trace do Template Duplicado — BUG-004
Arquivo: `app/src/templates/propostas.js`
Variável: `{{quantidade_cameras}}`

Ponto de Falha:
```javascript
• Instalação técnica de {{quantidade_cameras}} câmeras {{descricao_cameras}}
```

Causa raiz:
Redundância na composição do template. O sistema espera que `{{quantidade_cameras}}` seja apenas o numeral, mas o `DialogueEngine` passa o label da opção (ex: "8 câmeras"), resultando no texto final redundante. Além disso, o template usa "câmeras" de forma estática, o que causaria problema mesmo que o input fosse numeral puro (plural/singular).