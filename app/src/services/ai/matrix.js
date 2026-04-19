const { geminiPrimary, geminiFallback } = require('./providers/gemini');
const groq = require('./providers/groq');
const openrouter = require('./providers/openrouter');
const sambanova = require('./providers/sambanova');
const openai = require('./providers/openai');

/**
 * ELIGIBILITY_MATRIX
 * Define a ordem de prioridade para cada tipo de tarefa.
 * TASK TYPES: TEXT, image-to-text, PDF, AUDIO
 */
const ELIGIBILITY_MATRIX = {
  "TEXT": [
    { provider: groq, priority: 1 },
    { provider: sambanova, priority: 2 },
    { provider: geminiPrimary, priority: 3 }
  ],
  "image-to-text": [
    { 
      provider: groq, 
      params: { model: "llama-3.2-11b-vision-preview" },
      timeout: 30000, 
      supports: ["vision", "text"],
      priority: 1 
    },
    { 
      provider: geminiPrimary, 
      timeout: 45000, 
      supports: ["vision", "text"],
      priority: 2 
    }
  ],
  "PDF": [
    { provider: geminiPrimary, priority: 1 },
    { provider: groq, priority: 2 },
    { provider: openrouter, params: { model: "meta-llama/llama-3.3-70b-instruct" }, priority: 3 }
  ],  "AUDIO": [
    { provider: groq, priority: 1 },
    { provider: geminiPrimary, priority: 2 },
    { provider: geminiFallback, priority: 3 },
    { provider: sambanova, priority: 4 },
    { provider: groq, priority: 5 },
    { provider: openai, priority: 6 }
  ]
};

const getProviderConfig = (type, rank = 1) => {
  const list = ELIGIBILITY_MATRIX[type];
  if (!list) return null;
  return list.find(c => c.priority === rank) || null;
};

module.exports = { ELIGIBILITY_MATRIX, getProviderConfig };
