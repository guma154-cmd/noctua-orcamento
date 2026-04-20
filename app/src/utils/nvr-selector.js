const { TECH_TYPE, POE_MODE } = require("../catalog/technology-constants");

/**
 * Seleciona NVR/DVR correto baseado em tecnologia,
 * quantidade de câmeras e modo PoE.
 * 
 * SPRINT 1 - NOCTUA V5
 */
function selectNVR(techType, numCameras, poeMode) {
  if (techType === TECH_TYPE.ANALOG) {
    // Analógico sempre DVR, nunca PoE
    if (numCameras <= 4)  return { model: 'DVR 4 Canais Multi-HD',  poe: false, switch: null };
    if (numCameras <= 8)  return { model: 'DVR 8 Canais Multi-HD',  poe: false, switch: null };
    if (numCameras <= 16) return { model: 'DVR 16 Canais Multi-HD', poe: false, switch: null };
    return { model: 'DVR 32 Canais Multi-HD', poe: false, switch: null };
  }

  if (techType === TECH_TYPE.IP) {
    if (poeMode === POE_MODE.NVR_INTEGRATED) {
      // NVR com PoE: câmeras conectam direto.
      // Limite prático: 8 câmeras (acima disso, switch é melhor devido a custo/layout)
      if (numCameras <= 4)  return { model: 'NVR 4 Canais PoE',  poe: true,  switch: null };
      if (numCameras <= 8)  return { model: 'NVR 8 Canais PoE',  poe: true,  switch: null };
      
      // Acima de 8: Fallback para Switch Externo (Regra de Negócio Noctua)
      return selectNVR(techType, numCameras, POE_MODE.SWITCH_EXTERNAL);
    }

    if (poeMode === POE_MODE.SWITCH_EXTERNAL || poeMode === POE_MODE.INDIVIDUAL) {
      // NVR SEM PoE — câmeras -> switch -> 1 cabo uplink -> NVR
      // O NVR só precisa de canais, não de portas PoE
      const nvrModel = numCameras <= 8 ? 'NVR 8 Canais'  :
                       numCameras <= 16 ? 'NVR 16 Canais' :
                       numCameras <= 32 ? 'NVR 32 Canais' : 'NVR 64 Canais';

      let swLabel = null;
      if (poeMode === POE_MODE.SWITCH_EXTERNAL) {
        // Switch com portas suficientes + margem de 20%
        const portsNeeded = Math.ceil(numCameras * 1.2);
        swLabel = portsNeeded <= 4  ? 'Switch PoE 4 portas' :
                  portsNeeded <= 8  ? 'Switch PoE 8 portas' :
                  portsNeeded <= 16 ? 'Switch PoE 16 portas' :
                  portsNeeded <= 24 ? 'Switch PoE 24 portas' : 'Switch PoE 48 portas';
      }

      return {
        model: nvrModel,
        poe: false,
        switch: swLabel,
        note: swLabel ? 'Câmeras → Switch PoE → 1 cabo uplink → NVR' : 'Câmeras → NVR (+ Fontes Indiv.)'
      };
    }
  }

  if (techType === TECH_TYPE.HYBRID) {
    // DVR híbrido: aceita analógicas existentes + IP novas
    if (numCameras <= 8)  return { model: 'DVR Híbrido 8 Canais',  poe: false, switch: null };
    if (numCameras <= 16) return { model: 'DVR Híbrido 16 Canais', poe: false, switch: null };
    return { model: 'DVR Híbrido 32 Canais', poe: false, switch: null };
  }

  return { model: 'Revisão Necessária', poe: false, switch: null, error: 'UNKNOWN_TECH' };
}

module.exports = { selectNVR };
