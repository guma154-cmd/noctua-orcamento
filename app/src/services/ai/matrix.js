const gemini = require("./providers/gemini");
const sambanova = require("./providers/sambanova");
const openrouter = require("./providers/openrouter");

/**
 * Matriz de Elegibilidade SORIA V2.1 (Determinística)
 * Define a ordem de tentativa e capacidades de cada provedor.
 */
const ELIGIBILITY_MATRIX = {
  TEXT: [
    { 
      provider: gemini, 
      timeout: 5000, 
      supports: ["text", "json"],
      priority: 1 
    },
    { 
      provider: openrouter, 
      timeout: 8000, 
      supports: ["text"],
      priority: 2 
    }
  ],
  MULTIMODAL: [
    { 
      provider: gemini, 
      timeout: 15000, 
      supports: ["vision", "pdf", "text"],
      priority: 1 
    },
    { 
      provider: sambanova, 
      timeout: 20000, 
      supports: ["vision", "text"],
      priority: 2 
    }
  ],
  AUDIO: [
    { 
      provider: sambanova, 
      timeout: 15000, 
      supports: ["audio"],
      priority: 1 
    },
    { 
      provider: gemini, 
      timeout: 20000, 
      supports: ["audio", "vision"],
      priority: 2 
    }
  ]
};

/**
 * Verifica se um provedor suporta uma determinada capability
 */
const providerSupports = (type, providerName, capability) => {
  const configs = ELIGIBILITY_MATRIX[type];
  if (!configs) return false;
  
  const config = configs.find(c => c.provider.name === providerName);
  return config ? config.supports.includes(capability) : false;
};

module.exports = { 
  ELIGIBILITY_MATRIX,
  providerSupports
};
