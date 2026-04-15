const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

async function testGroqVision() {
  const filePath = 'temp_AgACAgEAAxkBAAIDoGnbdKHIfpd7se0w8KIB1wFOXvTqAAIiDGsb8XzZRkPfRcIN1GrZAQADAgADeQADOwQ.jpg';
  const fileData = fs.readFileSync(filePath);
  const base64Content = fileData.toString("base64");

  try {
    console.log("Chamando Groq Vision...");
    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.2-11b-vision-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Me diga o que tem na imagem" },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Content}` } }
          ]
        }
      ]
    }, {
      headers: { 
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, 
        "Content-Type": "application/json" 
      }
    });

    console.log("SUCESSO:", response.data.choices[0].message.content);
  } catch(e) {
    console.log("ERRO HTTP:", e.response ? e.response.status : e.message);
    console.log("ERRO DATA:", e.response ? JSON.stringify(e.response.data, null, 2) : "");
  }
}

testGroqVision();
