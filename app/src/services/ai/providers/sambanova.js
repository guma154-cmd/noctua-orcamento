const axios = require("axios");
const fs = require("fs");
require("dotenv").config({ override: true });

class SambaNovaProvider {
  constructor() {
    this.name = "SambaNova";
    this.apiKey = process.env.SAMBANOVA_API_KEY;
    this.textModel = "Llama-4-Maverick-17B-128E-Instruct";
    this.audioModel = "Whisper-Large-v3";
  }

  async execute(prompt, systemInstruction = "") {
    if (!this.apiKey) throw new Error("SAMBANOVA_API_KEY não configurada");

    const response = await axios.post("https://api.sambanova.ai/v1/chat/completions", {
      model: this.textModel,
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
    if (!this.apiKey) throw new Error("SAMBANOVA_API_KEY não configurada");

    const fileData = fs.readFileSync(filePath);
    const base64Content = fileData.toString("base64");

    // Llama-4 Maverick for vision
    const response = await axios.post("https://api.sambanova.ai/v1/chat/completions", {
      model: this.textModel,
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

  async transcribeAudio(filePath) {
    if (!this.apiKey) throw new Error("SAMBANOVA_API_KEY não configurada");

    const FormData = require("form-data");
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));
    form.append("model", this.audioModel);

    const response = await axios.post("https://api.sambanova.ai/v1/audio/transcriptions", form, {
      headers: {
        ...form.getHeaders(),
        "Authorization": `Bearer ${this.apiKey}`
      }
    });

    return response.data.text;
  }
}

module.exports = new SambaNovaProvider();
