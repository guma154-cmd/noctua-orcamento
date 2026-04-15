const axios = require("axios");
const fs = require("fs");
require("dotenv").config({ override: true });

class GroqProvider {
  constructor() {
    this.name = "Groq";
    this.apiKey = process.env.GROQ_API_KEY;
    this.textModel = "llama-3.3-70b-versatile";
    this.visionModel = "meta-llama/llama-4-scout-17b-16e-instruct";
    this.audioModel = "whisper-large-v3";
  }

  async execute(prompt, systemInstruction = "", modelOverride = null) {
    if (!this.apiKey) throw new Error("GROQ_API_KEY não configurada");

    const model = modelOverride || this.textModel;
    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
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
    if (!this.apiKey) throw new Error("GROQ_API_KEY não configurada");

    const model = modelOverride || this.visionModel;
    const fileData = fs.readFileSync(filePath);
    const base64Content = fileData.toString("base64");

    try {
      const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
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
      console.error(`[Groq Vision Error] Status: ${error.response?.status}`);
      console.error(`[Groq Vision Error] Data: ${JSON.stringify(error.response?.data)}`);
      throw error;
    }
  }

  async transcribeAudio(filePath) {
    if (!this.apiKey) throw new Error("GROQ_API_KEY não configurada");

    const FormData = require("form-data");
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));
    form.append("model", this.audioModel);

    const response = await axios.post("https://api.groq.com/openai/v1/audio/transcriptions", form, {
      headers: {
        ...form.getHeaders(),
        "Authorization": `Bearer ${this.apiKey}`
      }
    });

    return response.data.text;
  }
}

module.exports = new GroqProvider();
