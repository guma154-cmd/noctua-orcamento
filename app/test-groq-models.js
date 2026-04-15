const axios = require("axios");
require("dotenv").config();
async function listGroqModels() {
  try {
    const response = await axios.get("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}` }
    });
    const models = response.data.data.map(m => m.id);
    console.log("VISION MODELS:", models.filter(m => m.toLowerCase().includes("vision")));
    console.log("ALL MODELS:", models);
  } catch(e) {
    console.log(e);
  }
}
listGroqModels();
