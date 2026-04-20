const { BITRATE_GBDAY, OVERHEAD_SISTEMA } = require("../catalog/technology-constants");

/**
 * Calcula estimativa média de dias de gravação.
 * SPRINT 1 - NOCTUA V5
 */
function calcRetentionDays(hdCapacityTB, numCameras, resolution) {
  // Guards — nunca retornar NaN ou Infinity
  const hdStr = String(hdCapacityTB || "0").replace(',', '.');
  const hd  = parseFloat(hdStr);
  const cam = parseInt(numCameras);
  
  if (isNaN(hd)  || hd  <= 0) return { days: null, error: 'HD_INVALIDO', message: 'HD inválido' };
  if (isNaN(cam) || cam <= 0) return { days: null, error: 'CAMERAS_INVALIDO', message: 'Quantidade de câmeras inválida' };

  const bitrate     = BITRATE_GBDAY[resolution] ?? BITRATE_GBDAY['2MP'];
  const hdUsableGB  = (hd * 1024) * (1 - OVERHEAD_SISTEMA);
  const consumoDia  = bitrate * cam;
  const days        = Math.floor(hdUsableGB / consumoDia);

  return {
    days,
    hdTB: hd,
    message: `📼 ESTIMATIVA DE GRAVAÇÃO\nHD: ${hd}TB | Câmeras: ${cam} × ${resolution}\nRetenção média estimada: ~${days} dias\n_(H.265, gravação contínua)_`
  };
}

/**
 * Calcula o HD mínimo para atingir dias desejados (Modelo A).
 */
function calcHDForDays(daysDesired, numCameras, resolution) {
  const bitrate    = BITRATE_GBDAY[resolution] ?? BITRATE_GBDAY['2MP'];
  const cam        = parseInt(numCameras) || 1;
  const days       = parseInt(daysDesired) || 15;
  
  const consumoDia = bitrate * cam;
  const gbNeeded   = (consumoDia * days) / (1 - OVERHEAD_SISTEMA);
  const tbNeeded   = gbNeeded / 1024;

  if (tbNeeded <= 1)  return 'HD 1TB SkyHawk';
  if (tbNeeded <= 2)  return 'HD 2TB SkyHawk';
  if (tbNeeded <= 4)  return 'HD 4TB SkyHawk';
  if (tbNeeded <= 6)  return 'HD 6TB SkyHawk';
  if (tbNeeded <= 8)  return 'HD 8TB SkyHawk';
  return 'HD 10TB SkyHawk';
}

module.exports = { calcRetentionDays, calcHDForDays };
