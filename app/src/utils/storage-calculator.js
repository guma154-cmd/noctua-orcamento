const { BITRATE_GBDAY, OVERHEAD_SISTEMA } = require('../catalog/storage-constants');

/**
 * Funções de utilidade para tratamento de inputs
 */
const parseCapacity = (input) => {
    if (typeof input === 'number') return input;
    if (!input) return 0;
    
    // Trata "2,5TB" -> 2.5 e "500GB" -> 0.5
    let clean = input.toString().toLowerCase().replace(',', '.').trim();
    
    if (clean.includes('gb')) {
        const val = parseFloat(clean.replace('gb', ''));
        return isNaN(val) ? 0 : val / 1024;
    }
    
    const val = parseFloat(clean.replace('tb', ''));
    return isNaN(val) ? 0 : val;
};

/**
 * Calcula estimativa média de dias de gravação
 */
function calcRetentionDays(hdCapacityTB_Input, numCameras, resolution) {
  const hdCapacityTB = parseCapacity(hdCapacityTB_Input);

  // Guards obrigatórios — nunca retornar NaN
  if (!hdCapacityTB || isNaN(hdCapacityTB) || hdCapacityTB <= 0) {
    return { days: null, error: 'HD não informado ou inválido' };
  }
  if (!numCameras || isNaN(numCameras) || numCameras <= 0) {
    return { days: null, error: 'Número de câmeras inválido' };
  }
  
  const resKey = resolution || '2MP';
  const bitrate = BITRATE_GBDAY[resKey] ?? BITRATE_GBDAY['2MP'];

  const hdUsableGB = (hdCapacityTB * 1024) * (1 - OVERHEAD_SISTEMA);
  const consumoDiarioTotal = bitrate * numCameras;
  
  if (consumoDiarioTotal <= 0) return { days: null, error: 'Consumo inválido' };
  
  const days = Math.floor(hdUsableGB / consumoDiarioTotal);

  return {
    days,
    hdTB: hdCapacityTB,
    cameras: numCameras,
    resolution: resKey,
    message: formatRetentionMessage(days, hdCapacityTB, numCameras)
  };
}

function formatRetentionMessage(days, hdTB, cameras) {
  if (days === null) return `📼 ESTIMATIVA DE GRAVAÇÃO\nHD não informado — estimativa indisponível.`;
  
  const hdLabel = hdTB >= 1 ? `${hdTB}TB` : `${Math.round(hdTB * 1024)}GB`;
  return [
    `📼 ESTIMATIVA DE GRAVAÇÃO`,
    `HD: ${hdLabel} | Câmeras: ${cameras}`,
    ``,
    `Retenção média estimada: *${days} dias*`,
    `_(gravação contínua, H.265, movimentação moderada)_`,
    ``,
    `⚠️ Ambientes com muito movimento podem reduzir`,
    `este tempo. Ambientes estáticos podem aumentar.`
  ].join('\n');
}

module.exports = {
  calcRetentionDays,
  formatRetentionMessage,
  parseCapacity
};
