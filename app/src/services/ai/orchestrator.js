const { ELIGIBILITY_MATRIX } = require("./matrix");
const crypto = require("crypto");

/**
 * Utilitário de Timeout
 */
const withTimeout = (promise, ms, operationName) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout de ${ms}ms em ${operationName}`)), ms)
  );
  return Promise.race([promise, timeout]);
};

/**
 * Utilitário de Delay (Backoff)
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Orquestrador SORIA V2
 */
class AIOrchestrator {
  constructor() {
    this.maxAttempts = 6;
    this.defaultTimeout = 45000; // 45 segundos padrão
  }

  async run(type, operation, params) {
    return this.runWithRotation(ELIGIBILITY_MATRIX[type], operation, params, type);
  }

  async runSpecificConfig(config, operation, params, type = "SPECIFIC") {
    return this.runWithRotation([config], operation, params, type);
  }

  async runWithRotation(providers, operation, params, type) {
    const correlation_id = crypto.randomUUID();

    if (!providers || providers.length === 0) {
      throw new Error(`Nenhum provedor disponível para: ${type}`);
    }

    console.log(`[AI-Orchestrator][${correlation_id}] Início da requisição: ${type}`);

    const attempts = [];
    let currentAttempt = 0;

    for (const config of providers) {
      if (currentAttempt >= this.maxAttempts) break;

      const { provider, timeout } = config;
      currentAttempt++;

      console.log(`[AI-Orchestrator][${correlation_id}] Tentativa ${currentAttempt}: ${provider.name}...`);

      try {
        const result = await withTimeout(
          operation(provider, config, params),
          timeout || this.defaultTimeout,
          provider.name
        );

        return {
          content: result,
          provider: provider.name,
          correlation_id,
          attempts,
          status: "success"
        };

      } catch (error) {
        const errorMsg = error.response ? `HTTP ${error.response.status}` : error.message;
        const isRateLimit = errorMsg.includes("429") || error.message.toLowerCase().includes("rate limit");
        const isJsonError = error.message.includes("JSON") || error.name === "SyntaxError" || error.code === "invalid_json";
        
        console.warn(`[AI-Orchestrator][${correlation_id}] FALHA na tentativa ${currentAttempt} (${provider.name}): ${errorMsg}`);
        
        if (isRateLimit) {
          console.log(`[AI-Orchestrator][${correlation_id}] Rate Limit detectado. Aguardando 2s antes do próximo provedor...`);
          await sleep(2000); // Backoff simples
        }

        attempts.push({ 
          provider: provider.name, 
          error: errorMsg, 
          error_stack: error.stack,
          status: "failed_recoverable" 
        });

        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          console.error(`[AI-Orchestrator][${correlation_id}] CRITICAL: Falha de autenticação em ${provider.name}`);
        }
      }
    }

    console.error(`[AI-Orchestrator][${correlation_id}] TODOS os provedores falharam para o tipo: ${type}`);

    return { 
      content: null, 
      correlation_id, 
      attempts, 
      status: "degraded_mode_triggered" 
    };
  }
}

module.exports = new AIOrchestrator();
