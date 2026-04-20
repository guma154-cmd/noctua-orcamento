/**
 * NOCTUA STORAGE CONSTANTS
 * Bitrate médio por resolução — valor central H.265
 * Fonte: padrão de mercado CFTV, margem conservadora
 */

const BITRATE_GBDAY = {
  '1MP':  5.0,   // 720p
  '2MP':  9.0,   // 1080p Full HD  ← mais comum
  '4MP':  16.0,  // 2K
  '5MP':  20.0,  // 3K
  '8MP':  32.0,  // 4K
  '12MP': 48.0,  // 6K
};

const OVERHEAD_SISTEMA = 0.10; // 10% reserva técnica do HD
const LABEL_PADRAO = 'Estimativa média — gravação contínua H.265';

module.exports = {
  BITRATE_GBDAY,
  OVERHEAD_SISTEMA,
  LABEL_PADRAO
};
