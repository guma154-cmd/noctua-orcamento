const { OpenAI } = require("openai");
require("dotenv").config({ override: true });

class OpenAIProvider {
  constructor() {
    this.name = "OpenAI";
    this.apiKey = process.env.OPENAI_API_KEY;
    this.textModel = "gpt-4o-mini";
    this.visionModel = "gpt-4o-mini";
  }

  async execute(prompt, systemInstruction = "") {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY não configurada");

    const openai = new OpenAI({ apiKey: this.apiKey });
    const response = await openai.chat.completions.create({
      model: this.textModel,
      messages: [
        { role: "system", content: systemInstruction || "Você é um assistente útil." },
        { role: "user", content: prompt }
      ]
    });

    return response.choices[0].message.content;
  }

  async processMultimodal(filePath, mimeType, prompt) {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY não configurada");

    const fs = require("fs");
    const fileData = fs.readFileSync(filePath);
    const base64Content = fileData.toString("base64");

    const openai = new OpenAI({ apiKey: this.apiKey });
    const response = await openai.chat.completions.create({
      model: this.visionModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: { url: `data:${mimeType};base64,${base64Content}` } 
            }
          ]
        }
      ]
    });

    return response.choices[0].message.content;
  }
}

module.exports = new OpenAIProvider();
