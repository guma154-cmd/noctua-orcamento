const FollowUpService = require('../src/services/FollowUpService');
const { db } = require('../src/db/sqlite');

async function testarFollowUp() {
  console.log("=== INICIANDO TESTE DO MOTOR DE FOLLOW-UP ===");

  // 1. Injetar condição de Follow-up (Manipulação Temporal)
  console.log("\n[1] Setup: Procurando orçamentos para converter em 'estagnados'...");
  db.get(
    "SELECT id FROM orcamentos ORDER BY created_at DESC LIMIT 1",
    async (err, row) => {
      if (err || !row) return console.log("Nenhum orçamento encontrado para teste.");

      const testId = row.id;
      console.log(`Orçamento mais recente encontrado: ${testId}`);

      // Retroceder 25 horas e colocar status de proposta_enviada
      db.run(
        `UPDATE orcamentos 
         SET status_noctua = 'proposta_enviada', 
             waiting_human = 0, 
             last_interaction_at = datetime('now', '-25 hours') 
         WHERE id = ?`,
        [testId],
        async (updateErr) => {
          if (updateErr) return console.error(updateErr);
          console.log(`[OK] Orçamento ${testId} rebobinado para -25 horas e setado como 'proposta_enviada'.`);

          // 2. Rodar Serviço Criterioso
          console.log("\n[2] Execução: Rodando FollowUpService.processarRotinaManual(24)...");
          try {
            const resultado = await FollowUpService.processarRotinaManual(24);
            console.log("\n[3] Resultado:");
            console.log(resultado);
            
            // 3. Rodar de novo para testar Anti-Spam
            console.log("\n[4] Teste Anti-Repetição: Rodando novamente imediatamente...");
            const resultado2 = await FollowUpService.processarRotinaManual(24);
            console.log(resultado2);
            
            console.log("\n=== TESTE CONCLUÍDO ===");
          } catch (e) {
            console.error("Erro durante o teste:", e);
          }
        }
      );
    }
  );
}

testarFollowUp();
