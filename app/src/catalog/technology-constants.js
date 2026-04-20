/**
 * TECH CONSTANTS - NOCTUA V5
 */

const TECH_TYPE = {
  IP:        'ip',
  ANALOG:    'analog',
  HYBRID:    'hybrid',
};

const POE_MODE = {
  NVR_INTEGRATED: 'nvr_poe',    // NVR com PoE embutido
  SWITCH_EXTERNAL: 'switch_poe', // Switch PoE + NVR sem PoE
  INDIVIDUAL:      'individual', // Fonte por câmera
};

const CABLE_TYPE = {
  IP_STANDARD:  { label: 'Cabo de Rede UTP Cat5e', sku: 'UTP-C5E', maxMeters: 100 },
  IP_4K:        { label: 'Cabo de Rede UTP Cat6',  sku: 'UTP-C6',  maxMeters: 100 },
  ANALOG_STD:   { label: 'Cabo Coaxial RG59',      sku: 'RG59',    maxMeters: 300 },
  ANALOG_LONG:  { label: 'Cabo Coaxial RG6',       sku: 'RG6',     maxMeters: 500 },
};

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
  OVERHEAD_SISTEMA
};
