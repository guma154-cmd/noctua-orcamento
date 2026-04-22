/**
 * DORI STANDARD CONSTANTS (EN 62676-4)
 * Based on 2.8mm Fixed Lens (Standard for Bullet/Dome)
 */

const DORI_LEVELS = {
    DETECTION:      'detection',      // 25 PPM
    OBSERVATION:    'observation',    // 62 PPM
    RECOGNITION:    'recognition',    // 125 PPM
    IDENTIFICATION: 'identification', // 250 PPM
};

const DORI_LABELS = {
    [DORI_LEVELS.DETECTION]:      '👁️ Detecção (Monitorar presença)',
    [DORI_LEVELS.OBSERVATION]:    '🔍 Observação (Ver detalhes/roupas)',
    [DORI_LEVELS.RECOGNITION]:    '👤 Reconhecimento (Saber quem é)',
    [DORI_LEVELS.IDENTIFICATION]: '🆔 Identificação (Rostos e Placas)',
};

// Max distances (meters) for each resolution at 2.8mm lens
const DORI_RANGES = {
    '2MP': {
        [DORI_LEVELS.DETECTION]:      44,
        [DORI_LEVELS.OBSERVATION]:    17,
        [DORI_LEVELS.RECOGNITION]:     9,
        [DORI_LEVELS.IDENTIFICATION]:  4,
    },
    '4MP': {
        [DORI_LEVELS.DETECTION]:      56,
        [DORI_LEVELS.OBSERVATION]:    22,
        [DORI_LEVELS.RECOGNITION]:    11,
        [DORI_LEVELS.IDENTIFICATION]:  5.6,
    },
    '8MP': {
        [DORI_LEVELS.DETECTION]:      81,
        [DORI_LEVELS.OBSERVATION]:    32,
        [DORI_LEVELS.RECOGNITION]:    16,
        [DORI_LEVELS.IDENTIFICATION]:  8,
    }
};

module.exports = { DORI_LEVELS, DORI_LABELS, DORI_RANGES };
