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
 * Orquestrador SORIA V2
 */
class AIOrchestrator {
  constructor() {
    this.maxAttempts = 2;
  }

  async run(type, operation, params) {
    const correlation_id = crypto.randomUUID();
    const providers = ELIGIBILITY_MATRIX[type];

    if (!providers) {
      throw new Error(`Tipo de operação desconhecido: ${type}`);
    }

    console.log(JSON.stringify({
      event: "ai_request_started",
      type,
      correlation_id,
      timestamp: new Date().toISOString()
    }));

    const attempts = [];
    let currentAttempt = 0;

    for (const config of providers) {
      if (currentAttempt >= this.maxAttempts) break;

      const { provider, timeout } = config;
      currentAttempt++;

      console.log(`[AI-Orchestrator][${correlation_id}] Tentativa ${currentAttempt}: ${provider.name}...`);

      try {
        const result = await withTimeout(
          operation(provider, params),
          timeout,
          provider.name
        );

        console.log(JSON.stringify({
          event: "ai_request_success",
          provider: provider.name,
          correlation_id,
          attempt: currentAttempt,
          timestamp: new Date().toISOString()
        }));

        return {
          content: result,
          provider: provider.name,
          correlation_id,
          attempts,
          status: "success"
        };

      } catch (error) {
        const isJsonError = error.message.includes("JSON") || error.name === "SyntaxError" || error.code === "invalid_json";
        const errorType = isJsonError ? "invalid_json" : "provider_error";
        
        let eventStatus = "ai_fallback_triggered";
        let finalStatus = "failed_recoverable";

        if (currentAttempt >= this.maxAttempts || !providers[currentAttempt]) {
          eventStatus = "ai_request_failed";
          finalStatus = isJsonError ? "blocked_nonrecoverable" : "failed_nonrecoverable";
        }

        const errorMsg = error.response ? `HTTP ${error.response.status}` : error.message;
        
        console.warn(JSON.stringify({
          event: eventStatus,
          provider: provider.name,
          correlation_id,
          error: errorMsg,
          error_type: errorType,
          status: finalStatus,
          attempt: currentAttempt,
          timestamp: new Date().toISOString()
        }));

        attempts.push({ 
          provider: provider.name, 
          error: errorMsg, 
          error_type: errorType,
          status: finalStatus 
        });

        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          console.error(JSON.stringify({
            event: "ai_auth_critical",
            provider: provider.name,
            correlation_id,
            error: "Falha de autenticação",
            timestamp: new Date().toISOString()
          }));
        }
      }
    }

    console.error(JSON.stringify({
      event: "ai_all_providers_failed",
      correlation_id,
      timestamp: new Date().toISOString()
    }));

    return { 
      content: null, 
      correlation_id, 
      attempts, 
      status: attempts[attempts.length - 1]?.status === "blocked_nonrecoverable" ? "blocked_nonrecoverable" : "degraded_mode_triggered" 
    };
  }
}

module.exports = new AIOrchestrator();
