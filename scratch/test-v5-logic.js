const path = require('path');
const base = 'c:/Users/rafae/OneDrive/Documentos/AGENTES_PESSOAIS/noctua-orcamento/app/src';

const { selectNVR } = require(path.join(base, 'utils/nvr-selector.js'));
const { selectCable } = require(path.join(base, 'utils/cable-selector.js'));
const { calcRetentionDays } = require(path.join(base, 'utils/storage-calculator.js'));
const { TECH_TYPE, POE_MODE } = require(path.join(base, 'catalog/technology-constants.js'));

console.log("--- TESTE NVR SELECTOR ---");
console.log("IP + PoE Integrado (4 cams):", selectNVR(TECH_TYPE.IP, 4, POE_MODE.NVR_INTEGRATED));
console.log("IP + Switch (12 cams):", selectNVR(TECH_TYPE.IP, 12, POE_MODE.SWITCH_EXTERNAL));
console.log("Analógico (8 cams):", selectNVR(TECH_TYPE.ANALOG, 8, null));

console.log("\n--- TESTE CABLE SELECTOR ---");
console.log("IP 80m:", selectCable(TECH_TYPE.IP, "2MP", 80));
console.log("IP 120m:", selectCable(TECH_TYPE.IP, "2MP", 120));
console.log("Analógico 400m:", selectCable(TECH_TYPE.ANALOG, "2MP", 400));

console.log("\n--- TESTE STORAGE ---");
console.log("2TB, 8 cams:", calcRetentionDays(2, 8, "2MP").days, "dias");
console.log("1TB, 4 cams:", calcRetentionDays(1, 4, "2MP").days, "dias");
