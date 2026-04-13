const ai = require("./src/services/ai");

async function test() {
  console.log("Iniciando testes da arquitetura SORIA V2...");
  
  try {
    console.log("\n1. Testando askGemini (Alias)...");
    // Simulando chamada (vai falhar por falta de API Key se não houver no ambiente, mas queremos ver os logs)
    const res1 = await ai.askGemini("Oi", "Você é um teste.");
    console.log("Resultado askGemini:", res1);
  } catch (e) {
    console.error("Erro esperado no teste (provavelmente falta de API Key):", e.message);
  }

  try {
    console.log("\n2. Testando transcribeAudio...");
    const res2 = await ai.transcribeAudio("fake_path.ogg");
    console.log("Resultado transcribeAudio:", res2);
  } catch (e) {
    console.error("Erro esperado no teste:", e.message);
  }

  console.log("\nFim dos testes.");
}

test();
