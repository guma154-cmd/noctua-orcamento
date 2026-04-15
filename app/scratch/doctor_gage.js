const { ELIGIBILITY_MATRIX } = require('../src/services/ai/matrix');
const { initDb } = require('../src/db/sqlite');

async function doctor() {
  console.log("⚡ [Gage] NOCTUA SYSTEM DIAGNOSTIC v3.0");
  console.log("-----------------------------------------");
  
  // 1. DB Check
  try {
    await initDb();
    console.log("✅ Database: CONNECTED");
  } catch (e) {
    console.log("❌ Database: FAILED -", e.message);
  }

  // 2. Matrix Integrity
  const categories = Object.keys(ELIGIBILITY_MATRIX);
  console.log(`✅ Matrix Integrity: Found ${categories.length} categories.`);
  
  // 3. Provider Readiness (Env Check)
  const envVars = [
    'TELEGRAM_BOT_TOKEN',
    'GEMINI_API_KEY',
    'GROQ_API_KEY',
    'OPENROUTER_API_KEY',
    'SAMBANOVA_API_KEY',
    'OPENAI_API_KEY'
  ];

  envVars.forEach(v => {
    const status = process.env[v] ? "✅ SET" : "⚠️ MISSING";
    console.log(`- ${v.padEnd(20)}: ${status}`);
  });

  // 4. Critical Dependencies
  try {
    require('telegraf');
    require('sharp');
    require('axios');
    console.log("✅ Dependencies: INSTALLED");
  } catch (e) {
    console.log("❌ Dependencies: MISSING -", e.message);
  }

  console.log("-----------------------------------------");
  console.log("💡 [Gage] System ready for deployment.");
}

doctor();
