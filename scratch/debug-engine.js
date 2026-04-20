const DialogueEngine = require('../app/src/core/DialogueEngine');
const qualificacao = require('../app/src/agents/qualificacao');

// Mock do DB e outros para não quebrar o require do DialogueEngine se ele carregar algo
// Na verdade, DialogueEngine carrega AgentFactory e QualificationAgent.

async function debug() {
    const engine = require('../app/src/core/DialogueEngine');
    const chatId = "123456";
    
    console.log("--- SIMULANDO NOVO ORÇAMENTO ---");
    let res = await engine.process(chatId, { text: "1", type: "text" }); 
    console.log("Bot:", res.text || res.response);

    console.log("\n--- SELECIONANDO MODELO A ---");
    res = await engine.process(chatId, { text: "A", type: "text" }); 
    console.log("Bot:", res.text || res.response);
    
    if (!res.success) {
        console.error("ERRO DETECTADO!");
    } else {
        console.log("Sucesso no Modelo A");
    }

    // Se falhar em algum ponto, o node vai cuspir o erro.
}

debug().catch(err => {
    console.error("CRASH NO ENGINE:", err);
});
