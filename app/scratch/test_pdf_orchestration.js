const { extractConsolidatedPDF } = require('../src/services/ai');
const fs = require('fs');
const path = require('path');

async function testPdfSquad() {
  console.log("🧪 Testando Orquestração do Squad de PDF...");
  
  // Criar um arquivo dummy .pdf
  const dummyPath = path.join(__dirname, 'dummy.pdf');
  fs.writeFileSync(dummyPath, '%PDF-1.4\n1 0 obj\n<< /Title (Dummy) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');

  try {
    console.log("Chamando extractConsolidatedPDF...");
    // Isso vai disparar as 3 IAs do Squad de PDF
    const result = await extractConsolidatedPDF(dummyPath, "Extraia dados deste PDF de teste.");
    
    console.log("\n--- RESULTADO FINAL CONSOLIDADO ---");
    console.log(result);
  } catch (e) {
    console.error("Erro no Squad de PDF:", e.message);
  } finally {
    if (fs.existsSync(dummyPath)) fs.unlinkSync(dummyPath);
  }
}

testPdfSquad();
