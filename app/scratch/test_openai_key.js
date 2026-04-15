const { OpenAI } = require('openai');
require('dotenv').config({ override: true });

async function testKey() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const res = await openai.models.list();
    console.log("✅ OpenAI Key is Working!");
  } catch (e) {
    console.error("❌ OpenAI Key Failed:", e.message);
  }
}

testKey();
