const { DORI_LEVELS } = require("./dori-constants");

// Tecnologias suportadas
const TECH_TYPE = {
  IP:        'ip',
  ANALOG:    'analog',
  HYBRID:    'hybrid',
};

// Infraestrutura PoE
const POE_MODE = {
  NVR_INTEGRATED: 'nvr_poe',    // NVR com PoE embutido
  SWITCH_EXTERNAL: 'switch_poe', // Switch PoE + NVR sem PoE
  INDIVIDUAL:      'individual', // Fonte por câmera
};

// Tipo de cabo por tecnologia (output do TSR, não input)
const CABLE_TYPE = {
  IP_STANDARD:  { label: 'UTP Cat5e', maxMeters: 100, sku: 'UTP-C5E' },
  IP_4K:        { label: 'UTP Cat6',  maxMeters: 100, sku: 'UTP-C6' },
  ANALOG_STD:   { label: 'Coaxial RG59', maxMeters: 300, sku: 'RG59' },
  ANALOG_LONG:  { label: 'Coaxial RG6',  maxMeters: 500, sku: 'RG6' },
};

// Bitrate médio por resolução (H.265, gravação contínua)
const BITRATE_GBDAY = {
  '1MP':  5.0,
  '2MP':  9.0,
  '4MP':  16.0,
  '5MP':  20.0,
  '8MP':  32.0,
  '12MP': 48.0,
};

const OVERHEAD_SISTEMA = 0.10; // 10% reserva técnica do HD

module.exports = {
  TECH_TYPE,
  POE_MODE,
  CABLE_TYPE,
  BITRATE_GBDAY,
  OVERHEAD_SISTEMA,
  DORI_LEVELS
};
