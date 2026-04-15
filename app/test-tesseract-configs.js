const tesseract = require('tesseract.js');
const fs = require('fs');
const filePath = 'temp_AgACAgEAAxkBAAIDoGnbdKHIfpd7se0w8KIB1wFOXvTqAAIiDGsb8XzZRkPfRcIN1GrZAQADAgADeQADOwQ.jpg';

async function testPSM(psmValue) {
  console.log(`\n\n--- TESTANDO PSM ${psmValue} ---`);
  try {
    const sharp = require('sharp');
    const processedPath = 'test_sharp.png';
    await sharp(filePath)
      .resize({ width: 2000, withoutEnlargement: true }) // upsizes to aid OCR
      .greyscale()
      .toFile(processedPath);

    const { data: { text } } = await tesseract.recognize(
      processedPath,
      'por',
      { logger: m => {}, tessedit_pageseg_mode: psmValue, preserve_interword_spaces: '1' }
    );
    console.log(text.substring(0, 1500));
  } catch(e) {}
}

async function run() {
  await testPSM(3);
  await testPSM(4);
  await testPSM(6);
  await testPSM(11);
}
run();
