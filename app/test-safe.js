require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

async function test() {
  console.log("=== DIAGNÓSTICO FINAL GEMINI 2.5 (API V1) ===");
  const key = process.env.GEMINI_API_KEY;
  
  if (!key) {
    console.error("❌ ERRO: GEMINI_API_KEY não configurada no .env");
    return;
  }

  try {
    // 1. Listar modelos via API V1
    console.log("\n🔍 Consultando catálogo estável (V1)...");
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${key.trim()}`;
    const res = await axios.get(url);
    
    console.log("Modelos Estáveis Encontrados:");
    res.data.models.forEach(m => {
      if (m.supportedGenerationMethods.includes("generateContent")) {
        console.log(`  - ${m.name.replace('models/', '')}`);
      }
    });

    // 2. Teste de Fogo com Gemini 2.5 Flash
    const modeloDesejado = "gemini-2.5-flash"; 
    console.log(`\n🚀 Testando Conectividade: ${modeloDesejado}...`);
    
    // Forçamos o SDK a usar V1 explicitamente no construtor
    const genAI = new GoogleGenerativeAI(key.trim(), { apiVersion: "v1" });
    const model = genAI.getGenerativeModel({ model: modeloDesejado });
    
    const result = await model.generateContent("Diga 'Conexão Gemini 2.5 V1 OK'");
    
    console.log("🤖 Resposta:", result.response.text());
    console.log("\n✅ SUCESSO ABSOLUTO! O bot agora está rodando no estado da arte da IA.");

  } catch (e) {
    console.error("\n❌ FALHA NO DIAGNÓSTICO:");
    if (e.response?.data?.error) {
        console.error(`${e.response.data.error.message} (${e.response.data.error.status})`);
    } else {
        console.error(e.message);
    }
  }
}

test();
