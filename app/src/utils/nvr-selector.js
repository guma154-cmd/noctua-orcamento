const { TECH_TYPE, POE_MODE } = require("../catalog/technology-constants");

/**
 * Seleciona NVR/DVR correto baseado em tecnologia,
 * quantidade de câmeras e modo PoE.
 *
 * REGRA FUNDAMENTAL:
 * - NVR com PoE integrado: câmeras conectam direto no NVR
 *   (sem switch externo). NVR usa suas próprias portas PoE.
 * - Switch PoE externo + NVR sem PoE: câmeras vão para o switch,
 *   switch conecta ao NVR por UM ÚNICO CABO (uplink).
 *   NVR não precisa de portas PoE — só precisa de canais.
 * - Nunca usar NVR com PoE + switch PoE juntos = redundância.
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
      // Limite prático: 8 câmeras (acima disso, switch é melhor)
      if (numCameras <= 4)  return { model: 'NVR 4 Canais PoE',  poe: true,  switch: null };
      if (numCameras <= 8)  return { model: 'NVR 8 Canais PoE',  poe: true,  switch: null };
      // Acima de 8: forçar switch externo
      return selectNVR(techType, numCameras, POE_MODE.SWITCH_EXTERNAL);
    }

    if (poeMode === POE_MODE.SWITCH_EXTERNAL || poeMode === POE_MODE.INDIVIDUAL) {
      // NVR SEM PoE — câmeras → switch → 1 cabo uplink → NVR
      const nvr = numCameras <= 8  ? 'NVR 8 Canais'  :
                  numCameras <= 16 ? 'NVR 16 Canais' :
                  numCameras <= 32 ? 'NVR 32 Canais' : 'NVR 64 Canais';

      let sw = null;
      if (poeMode === POE_MODE.SWITCH_EXTERNAL) {
          // Switch com portas suficientes + margem de 20%
          const portsNeeded = Math.ceil(numCameras * 1.2);
          sw = portsNeeded <= 4  ? 'Switch PoE 4 portas'  :
               portsNeeded <= 8  ? 'Switch PoE 8 portas'  :
               portsNeeded <= 16 ? 'Switch PoE 16 portas' :
               portsNeeded <= 24 ? 'Switch PoE 24 portas' : 'Switch PoE 48 portas';
      }

      return {
        model: nvr,
        poe: false,
        switch: sw,
        note: sw ? 'Câmeras → Switch PoE → 1 cabo uplink → NVR' : 'Câmeras → NVR (+ Fontes Indiv.)'
      };
    }
  }

  if (techType === TECH_TYPE.HYBRID || techType === 'hybrid') {
    // DVR híbrido: aceita analógicas existentes + IP novas
    if (numCameras <= 8)  return { model: 'DVR Híbrido 8 Canais',  poe: false, switch: null };
    if (numCameras <= 16) return { model: 'DVR Híbrido 16 Canais', poe: false, switch: null };
    return { model: 'DVR Híbrido 32 Canais', poe: false, switch: null };
  }

  return { model: 'NVR 8 Canais', poe: false, switch: null }; // Fallback
}

module.exports = { selectNVR };
