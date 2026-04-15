const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
require('dotenv').config();

async function testGeminiVision() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // The stable string
    const filePath = 'temp_AgACAgEAAxkBAAIDoGnbdKHIfpd7se0w8KIB1wFOXvTqAAIiDGsb8XzZRkPfRcIN1GrZAQADAgADeQADOwQ.jpg';
    
    // Converte para Base64
    const imagePart = {
      inlineData: {
        data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
        mimeType: "image/jpeg"
      },
    };

    const prompt = "Me diga todos os itens da tabela e os valores.";
    console.log("Chamando Gemini 1.5 Flash Vision...");
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    console.log("SUCESSO:\n", response.text());
  } catch(e) {
    console.log("ERRO:", e.message);
  }
}

testGeminiVision();
