const axios = require("axios");
require("dotenv").config();
async function testGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  try {
    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: "Você é um assistente útil." },
        { role: "user", content: "Testando API" }
      ]
    }, {
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" }
    });
    console.log(response.data.choices[0].message.content);
  } catch(e) {
    console.log("ERRO HTTP:", e.response ? e.response.status : e.message);
    console.log("ERRO DATA:", e.response ? e.response.data : "");
  }
}
testGroq();
