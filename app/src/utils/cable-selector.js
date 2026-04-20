const { TECH_TYPE, CABLE_TYPE } = require("../catalog/technology-constants");

/**
 * Define o tipo de cabo automaticamente baseado na tecnologia.
 * Operador NÃO escolhe o cabo — o TSR define.
 * 
 * SPRINT 1 - NOCTUA V5
 */
function selectCable(techType, resolution, maxDistanceMeters) {
  if (techType === TECH_TYPE.ANALOG || techType === TECH_TYPE.HYBRID) {
    return maxDistanceMeters > 300
      ? { ...CABLE_TYPE.ANALOG_LONG, alert: null }   // RG6 para longas distâncias
      : { ...CABLE_TYPE.ANALOG_STD,  alert: null };   // RG59 padrão
  }

  if (techType === TECH_TYPE.IP) {
    let selected = resolution === '8MP' || resolution === '12MP'
      ? { ...CABLE_TYPE.IP_4K }       // Cat6 para 4K
      : { ...CABLE_TYPE.IP_STANDARD }; // Cat5e para até 5MP

    // Alerta obrigatório se distância > 100m
    if (maxDistanceMeters > 100) {
        selected.alert = 'DISTÂNCIA_EXCEDIDA';
        selected.action = 'Usar switch PoE intermediário ou fibra óptica para manter o padrão.';
    }

    return selected;
  }

  return { label: 'Cabo a definir', alert: 'UNKNOWN_TECH' };
}

module.exports = { selectCable };
