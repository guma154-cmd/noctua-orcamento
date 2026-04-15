require('dotenv').config();
const axios = require('axios');

async function test() {
  const key = process.env.OPENROUTER_API_KEY;
  console.log("Key from env:", key.substring(0, 10) + "...");
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/auth/key', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    console.log("Auth success:", response.data);
  } catch (error) {
    console.log("Auth failed:", error.response?.status, error.response?.data);
  }
}

test();
