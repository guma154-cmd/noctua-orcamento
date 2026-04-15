const axios = require('axios');
require('dotenv').config();

const KEYS = [
  "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",
  "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"
];

async function check() {
  for (const key of KEYS) {
    console.log(`Checking key: ${key.substring(0, 15)}...`);
    try {
      const res = await axios.get('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${key}` }
      });
      console.log("✅ Working! Current limit:", res.data.limit);
    } catch (e) {
      console.log("❌ Failed:", e.response?.status, e.response?.data?.error?.message);
    }
  }
}

check();
