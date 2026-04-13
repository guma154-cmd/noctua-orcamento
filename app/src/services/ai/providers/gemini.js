const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

class GeminiProvider {
  constructor() {
    this.name = "Gemini";
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
  }

  async execute(prompt, systemInstruction = "") {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: this.modelName });
    
    const result = await model.generateContent(
      systemInstruction ? `Instrução: ${systemInstruction}\n\nEntrada: ${prompt}` : prompt
    );
    const response = await result.response;
    return response.text();
  }

  async processMultimodal(filePath, mimeType, prompt) {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const fs = require("fs");
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: this.modelName });
    const fileData = fs.readFileSync(filePath);

    const result = await model.generateContent([
      { inlineData: { mimeType, data: fileData.toString("base64") } },
      { text: prompt }
    ]);
    const response = await result.response;
    return response.text();
  }
}

module.exports = new GeminiProvider();
