const axios = require("axios");
const fs = require("fs");
require("dotenv").config({ override: true });

class OpenRouterProvider {
  constructor() {
    this.name = "OpenRouter";
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.primaryModel = process.env.OPENROUTER_MODEL || "cognitivecomputations/dolphin-mistral-24b-venice-edition:free";
    this.fallbackModel = "thedrummer/unslopnemo-12b:free";
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

  async processMultimodal(filePath, mimeType, prompt, modelOverride = null) {
    if (!this.apiKey) throw new Error("OPENROUTER_API_KEY não configurada");

    const model = modelOverride || this.primaryModel;
    const fileData = fs.readFileSync(filePath);
    const base64Content = fileData.toString("base64");

    try {
      const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: model,
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
    } catch (error) {
      console.error(`[OpenRouter Error] Status: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
      
      // Fallback: Se for PDF e deu erro 400, tenta enviar como texto puro se o PDF tiver texto ASCII
      if (mimeType === "application/pdf") {
        console.warn("[OpenRouter] Tentando fallback para texto puro...");
        const rawText = fileData.toString('utf8').replace(/[^\x20-\x7E\n]/g, ' '); // Filtra binários
        return await this.execute(`[ARQUIVO PDF - EXTRAÇÃO BRUTA]\n${rawText.substring(0, 5000)}\n\n${prompt}`, "Analise este PDF extraído.");
      }
      throw error;
    }
  }
}

module.exports = new OpenRouterProvider();
