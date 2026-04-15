const tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');

async function testOCR() {
  console.log("Iniciando Tesseract Test");
  try {
    const text = await tesseract.recognize(
      'temp_AgACAgEAAxkBAAIDzmnblGE0OVOlQA7fk5E1qxLPhrPvAAIkDGsb8XzZRu8UnxpgL1lwAQADAgADeQADOwQ.jpg',
      'por',
      { logger: m => console.log(m) }
    );
    console.log("TEXTO ENCONTRADO:", text.data.text.substring(0, 100));
  } catch(e) {
    console.error("ERRO", e);
  }
}

testOCR();
