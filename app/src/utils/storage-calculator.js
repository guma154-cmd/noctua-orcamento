const { BITRATE_GBDAY, OVERHEAD_SISTEMA } = require("../catalog/technology-constants");

/**
 * Converte strings de capacidade (ex: "500 GB", "1 TB") para número em TB.
 */
function parseStorageToTB(input) {
  if (!input) return 0;
  const str = String(input).toUpperCase().replace(',', '.');
  const num = parseFloat(str);
  if (isNaN(num)) return 0;

  if (str.includes('GB')) return num / 1024;
  if (str.includes('TB')) return num;
  
  // Se for só número > 10, assume GB (ex: 500)
  if (num > 10) return num / 1024;
  return num;
}

/**
 * Calcula estimativa média de dias de gravação.
 * SPRINT 1 - NOCTUA V5
 */
function calcRetentionDays(hdCapacityRaw, numCameras, resolution) {
  const hd = parseStorageToTB(hdCapacityRaw);
  const cam = parseInt(numCameras);
  const res = resolution || '2MP';
  
  if (hd <= 0) return { days: null, error: 'HD_INVALIDO', message: 'Capacidade de HD inválida' };
  if (cam <= 0) return { days: null, error: 'CAMERAS_INVALIDO', message: 'Quantidade de câmeras inválida' };

  const bitrate     = BITRATE_GBDAY[res] ?? BITRATE_GBDAY['2MP'];
  const hdUsableGB  = (hd * 1024) * (1 - OVERHEAD_SISTEMA);
  const consumoDia  = bitrate * cam;
  const days        = Math.floor(hdUsableGB / consumoDia);

  const displayHD = hd < 1 ? `${Math.round(hd * 1024)}GB` : `${hd}TB`;

  return {
    days,
    hdTB: hd,
    message: `📼 ESTIMATIVA DE GRAVAÇÃO\nHD: ${displayHD} | Câmeras: ${cam} × ${res}\nRetenção média estimada: ~${days} dias\n_(H.265, gravação contínua)_`
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

module.exports = { calcRetentionDays, calcHDForDays, parseStorageToTB };
