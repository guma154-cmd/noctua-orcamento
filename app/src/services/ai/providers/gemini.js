const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ override: true });

class GeminiProvider {
  constructor(name, modelName) {
    this.name = name;
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = modelName;
  }

  async execute(prompt, systemInstruction = "", modelOverride = null) {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: modelOverride || this.modelName });
    
    const result = await model.generateContent(
      systemInstruction ? `Instrução: ${systemInstruction}\n\nEntrada: ${prompt}` : prompt
    );
    const response = await result.response;
    return response.text();
  }

  async processMultimodal(filePath, mimeType, prompt, modelOverride = null) {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const fs = require("fs");
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: modelOverride || this.modelName });
    const fileData = fs.readFileSync(filePath);

    const result = await model.generateContent([
      { inlineData: { mimeType, data: fileData.toString("base64") } },
      { text: prompt }
    ]);
    const response = await result.response;
    return response.text();
  }
}

module.exports = {
  geminiPrimary: new GeminiProvider("Gemini", process.env.GEMINI_MODEL || "gemini-2.5-flash"),
  geminiFallback: new GeminiProvider("Gemini (Fallback)", process.env.GEMINI_FALLBACK_MODEL || "gemini-2.0-flash")
};
