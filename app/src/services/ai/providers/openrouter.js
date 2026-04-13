const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

class OpenRouterProvider {
  constructor() {
    this.name = "OpenRouter";
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.primaryModel = "qwen/qwen3.6-plus:free";
    this.fallbackModel = "openrouter/free";
  }

  async execute(prompt, systemInstruction = "") {
    if (!this.apiKey) throw new Error("OPENROUTER_API_KEY não configurada");

    try {
      return await this._request(this.primaryModel, prompt, systemInstruction);
    } catch (error) {
      console.warn(`[OpenRouter] Falha no modelo primário (${this.primaryModel}), tentando fallback (${this.fallbackModel})...`);
      return await this._request(this.fallbackModel, prompt, systemInstruction);
    }
  }

  async _request(model, prompt, systemInstruction) {
    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: model,
      messages: [
        { role: "system", content: systemInstruction || "Você é um assistente útil." },
        { role: "user", content: prompt }
      ]
    }, {
      headers: { 
        "Authorization": `Bearer ${this.apiKey}`, 
        "Content-Type": "application/json" 
      }
    });

    return response.data.choices[0].message.content;
  }

  async processMultimodal(filePath, mimeType, prompt) {
    if (!this.apiKey) throw new Error("OPENROUTER_API_KEY não configurada");

    const fileData = fs.readFileSync(filePath);
    const base64Content = fileData.toString("base64");

    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: this.primaryModel,
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
    }, {
      headers: { 
        "Authorization": `Bearer ${this.apiKey}`, 
        "Content-Type": "application/json" 
      }
    });

    return response.data.choices[0].message.content;
  }
}

module.exports = new OpenRouterProvider();
