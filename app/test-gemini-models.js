const axios = require("axios");
require('dotenv').config();

async function listGeminiModels() {
  try {
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const models = response.data.models.map(m => m.name);
    console.log("AVAILABLE MODELS:", models);
  } catch(e) {
    console.log("ERRO:", e.message);
  }
}

listGeminiModels();
