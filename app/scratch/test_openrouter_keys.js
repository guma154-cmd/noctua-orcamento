const axios = require('axios');

const key = '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';

async function testKey() {
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
      messages: [{ role: 'user', content: 'hello' }]
    }, {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Success! Response:", response.data.choices[0].message.content);
  } catch (error) {
    console.error("Failed!", error.response?.status, error.response?.data);
  }
}

testKey();
