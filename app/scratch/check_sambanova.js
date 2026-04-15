require('dotenv').config();
const axios = require('axios');

async function test() {
  const key = process.env.SAMBANOVA_API_KEY;
  console.log("Checking SambaNova Key...");
  try {
    const response = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
      model: "Meta-Llama-3.1-8B-Instruct", // Usando um modelo básico que sempre existe
      messages: [{ role: "user", content: "hi" }]
    }, {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    console.log("SambaNova Auth Success!");
  } catch (error) {
    console.log("SambaNova Auth Failed:", error.response?.status, error.response?.data);
  }
}

test();
