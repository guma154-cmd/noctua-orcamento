const { db } = require("../db/sqlite");
const { BITRATE_GBDAY, OVERHEAD_SISTEMA, TECH_TYPE, POE_MODE } = require("../catalog/technology-constants");
const { DORI_LEVELS, DORI_RANGES, DORI_LABELS } = require("../catalog/dori-constants");
const { calcRetentionDays } = require("../utils/storage-calculator");
const { selectNVR } = require("../utils/nvr-selector");
const { selectCable } = require("../utils/cable-selector");

/**
 * TECHNICAL SCOPE RESOLVER - NOCTUA V4 (INFRA MODULE READY)
 */

const PROFILES = {
  'Casa': {
    label: 'Residencial (Casa)',
    base_recorder: { analog: 'DVR 4 Canais', ip: 'NVR 4 Canais' },
    base_camera: { analog: 'Câmera Bullet 2MP (Analógica)', ip: 'Câmera Bullet 2MP (IP)' },
    questions: [
      { 
        id: 'external_cameras', 
        prompt: 'Quantas dessas câmeras serão instaladas em área externa?', 
        type: 'choice',
        field: 'external_count',
        options: ['0 câmeras', '1 câmera', '2 câmeras', '4 câmeras', 'Outra quantidade']
      }
    ]
  },
  'Apartamento': {
    label: 'Residencial (Apartamento)',
    base_recorder: { analog: 'DVR 4 Canais', ip: 'NVR 4 Canais' },
    base_camera: { analog: 'Câmera Dome 2MP (Analógica)', ip: 'Câmera Dome 2MP (IP)' },
    questions: []
  },
  'Comércio': {
    label: 'Comercial',
    base_recorder: { analog: 'DVR 8 Canais', ip: 'NVR 8 Canais' },
    base_camera: { analog: 'Câmera Dome 2MP (Analógica)', ip: 'Câmera Dome 2MP (IP)' },
    questions: [
      {
        id: 'recording_days',
        prompt: 'Quantos dias de gravação você precisa manter?',
        type: 'choice',
        field: 'recording_days',
        options: ['7 dias (Econômico)', '15 dias (Padrão)', '30 dias (Segurança Máxima)', 'Outro (Personalizado)']
      }
    ]
  },
  'Condomínio': {
    label: 'Condominial',
    base_recorder: { analog: 'DVR 16 Canais', ip: 'NVR 16 Canais' },
    base_camera: { analog: 'Câmera Bullet 2MP (Analógica)', ip: 'Câmera Bullet 2MP (IP)' },
    questions: []
  },
  'Outro': {
    label: 'Personalizado',
    base_recorder: { analog: 'DVR 4 Canais', ip: 'NVR 4 Canais' },
    base_camera: { analog: 'Câmera Bullet 2MP (Analógica)', ip: 'Câmera Bullet 2MP (IP)' },
    questions: []
  }
};

const GLOBAL_TECH_QUESTIONS = [
  {
    id: 'dori_level',
    prompt: 'Qual o objetivo principal de imagem (Padrão DORI)?',
    type: 'choice',
    field: 'dori_level',
    options: Object.values(DORI_LABELS)
  },
  {
    id: 'infra_status',
    prompt: 'Qual o estado da infraestrutura (tubulação) no local?',
    type: 'choice',
    field: 'infra_status',
    options: ['Existente\n(Aproveitar atual)', 'Nova\n(Instalação total)', 'Parcial\n(Alguns pontos prontos)']
  },
  {
    id: 'infra_type',
    prompt: 'Qual tipo de material será utilizado na infraestrutura?',
    type: 'choice',
    field: 'infra_type',
    options: ['Eletroduto Corrugado', 'Canaleta com Adesivo', 'Eletroduto Rígido/PVC'],
    condition: (scope) => scope.infra_status && !scope.infra_status.toLowerCase().includes('existente')
  },
  {
    id: 'infra_meterage',
    prompt: 'Informe a metragem total (em metros) de infraestrutura/tubulação necessária:',
    type: 'text',
    field: 'infra_meterage',
    condition: (scope) => scope.infra_status && !scope.infra_status.toLowerCase().includes('existente')
  },
  {
    id: 'cable_total',
    prompt: 'Qual a metragem total aproximada de cabo (em metros)?',
    type: 'text',
    field: 'cable_total_m'
  },
  {
    id: 'long_distance_risk',
    prompt: 'Existe alguma câmera com distância acima do padrão até o gravador/switch?',
    type: 'choice',
    field: 'distance_alert_level',
    options: ['Não', 'Sim, acima de 90 m', 'Sim, acima de 100 m', 'Não sei']
  },
  {
    id: 'detailed_subflow_qty',
    prompt: 'Quantas câmeras estão acima do padrão?',
    type: 'text',
    field: 'detailed_long_distance_count',
    condition: (scope) => ['above_90', 'above_100', 'unknown'].includes(scope.distance_alert_level)
  },
  {
    id: 'detailed_subflow_mode',
    prompt: 'Como deseja informar as distâncias dessas câmeras?',
    type: 'choice',
    field: 'detailed_entry_mode',
    options: ['Informar uma por uma', 'Informar tudo em uma linha', 'Marcar para revisão manual'],
    condition: (scope) => ['above_90', 'above_100', 'unknown'].includes(scope.distance_alert_level) && scope.detailed_long_distance_count > 0
  },
  {
    id: 'cable_batch_distances',
    prompt: 'Informe as distâncias no formato "1=95, 2=110, 3=102" ou similar:',
    type: 'text',
    field: 'raw_detailed_points',
    condition: (scope) => scope.detailed_entry_mode === 'batch'
  },
  {
    id: 'cable_individual_distance',
    prompt: (scope) => {
        const points = scope.raw_detailed_points || {};
        const count = parseInt(scope.detailed_long_distance_count) || 0;
        const current = Object.keys(points).length + 1;
        return `Qual a distância da câmera longa #${current} (em metros)?`;
    },
    type: 'text',
    field: 'current_individual_distance',
    condition: (scope) => {
        if (scope.detailed_entry_mode !== 'one_by_one') return false;
        const points = scope.raw_detailed_points || {};
        const count = parseInt(scope.detailed_long_distance_count) || 0;
        return Object.keys(points).length < count;
    }
  },
  {
    id: 'route_type',
    prompt: 'Qual o nível de dificuldade da rota de instalação?',
    type: 'choice',
    field: 'route_type_label',
    options: ['Simples\n(Caminho livre)', 'Padrão\n(Ambiente comum)', 'Difícil\n(Altura/Externa)']
  },
  {
    id: 'confirm_standard',
    prompt: 'Deseja finalizar com o dimensionamento Padrão NOCTUA ou aguardar revisão manual?',
    type: 'choice',
    field: 'confirmation_mode',
    options: ['Padrão NOCTUA (Otimizado)', 'Solicitar Revisão Manual']
  }
];

const DEFAULT_SCOPE = {
  profile: null,
  system_type: 'analog',
  dori_level: DORI_LEVELS.DETECTION,
  selected_recorder: null,
  selected_camera: null,
  external_count: undefined,
  recording_days: undefined,
  infra_status: undefined,
  cable_total_m: 0,
  max_point_distance_m: 0,
  distance_alert_level: undefined, // none, above_90, above_100, unknown
  distance_source: 'total_only', // total_only, operator_confirmation, detailed
  route_factor: 1.30,
  cable_slack_per_point_m: 4,
  estimated_cable_total_m: 0,
  estimated_cable_per_point_m: 0,
  distance_risk: false,
  requires_human_review: false,
  incompatibilities: [],
  waiting_human: false,
  resolved_items: [],
  confirmation_mode: 'padrão',
  operational_flags: {
    high_complexity: false,
    needs_ladder: false,
    long_distance: false
  }
};

const getProfile = (propertyType) => PROFILES[propertyType] || PROFILES['Outro'];

const findItemWithFallback = async (category, searchName, defaultPrice, options = {}) => {
  return new Promise((resolve) => {
    const tech = options.tech || 'universal';
    const profile = options.profile || 'Outro';

    /**
     * HIERARQUIA DE RESOLUÇÃO (ETAPA 2):
     * 1. SKU Exato (Ativo)
     * 2. Item Padrão por Perfil + Categoria + Tecnologia (Ativo)
     * 3. Item Padrão por Categoria + Tecnologia (Ativo)
     * 4. Busca Legada por Nome (Ativo)
     * 5. Fallback Manual (Se permitido)
     */
    
    const queries = [
      // 1. SKU Exato
      {
        sql: "SELECT *, 'SKU' as origin FROM catalogo_noctua WHERE sku = ? AND ativo = 1",
        params: [searchName]
      },
      // 2. Busca Legada (Controle de Ativos) - PRIORIDADE SOBRE PADRÕES
      {
        sql: "SELECT *, 'LEGACY_CONTROLLED' as origin FROM catalogo_noctua WHERE nome_comercial LIKE ? AND ativo = 1 LIMIT 1",
        params: [`%${searchName}%`]
      },
      // 3. Item Padrão por Perfil + Categoria + Tecnologia
      {
        sql: "SELECT *, 'PROFILE_DEFAULT' as origin FROM catalogo_noctua WHERE categoria = ? AND tecnologia = ? AND perfil_noctua = ? AND item_padrao = 1 AND ativo = 1",
        params: [category, tech, profile]
      },
      // 4. Item Padrão por Categoria + Tecnologia
      {
        sql: "SELECT *, 'GLOBAL_DEFAULT' as origin FROM catalogo_noctua WHERE categoria = ? AND tecnologia = ? AND item_padrao = 1 AND ativo = 1",
        params: [category, tech]
      }
    ];

    const tryNextQuery = (index) => {
      if (index >= queries.length) {
        // 5. Fallback Manual (Se permitido pelo sistema ou se for o último recurso)
        // Verificamos se algum item da categoria proíbe fallback (regra conservadora)
        db.get("SELECT COUNT(*) as forbidden FROM catalogo_noctua WHERE categoria = ? AND fallback_permitido = 0", [category], (err, row) => {
          if (!err && row && row.forbidden > 0) {
            return resolve({ 
              produto: `ERRO: Item ${category} não encontrado e Fallback Proibido`, 
              preco_custo: 0, 
              sku: 'BLOCK', 
              error: 'FALLBACK_FORBIDDEN' 
            });
          }
          return resolve({ produto: searchName, preco_custo: defaultPrice, sku: 'FALLBACK', origin: 'MANUAL' });
        });
        return;
      }

      const q = queries[index];
      db.get(q.sql, q.params, (err, row) => {
        if (!err && row && row.preco_custo > 0) {
          // Sucesso: Encontrou item ativo com preço
          return resolve({
            sku: row.sku,
            produto: row.nome_comercial,
            preco_custo: row.preco_custo,
            categoria: row.categoria,
            unidade_compra: row.unidade_compra,
            origin: row.origin
          });
        }
        // Tentar próxima prioridade
        tryNextQuery(index + 1);
      });
    };

    tryNextQuery(0);
  });
};

/**
 * Mapeadores de Flow para Engine (V5)
 */
const mapTechType = (label) => {
    if (!label) return TECH_TYPE.ANALOG;
    if (label.includes('IP')) return TECH_TYPE.IP;
    if (label.includes('Analóg')) return TECH_TYPE.ANALOG;
    if (label.includes('Híbrid')) return TECH_TYPE.HYBRID;
    return TECH_TYPE.ANALOG;
};

const mapPoEMode = (label) => {
    if (!label) return POE_MODE.SWITCH_EXTERNAL;
    if (label.includes('integrado')) return POE_MODE.NVR_INTEGRATED;
    if (label.includes('Switch')) return POE_MODE.SWITCH_EXTERNAL;
    if (label.includes('individual')) return POE_MODE.INDIVIDUAL;
    return POE_MODE.SWITCH_EXTERNAL;
};

/**
 * Calculadora de Storage NOCTUA (V5 - SPRINT 5)
 */
const calculateStorage = async (scope, cameraCount, isIP, session, resolution = '2MP') => {
  
  // SEÇÃO: CLIENTE FORNECE HD (B / C)
  const isClientSupplied = session.recording_required?.toLowerCase().includes('possuo') || 
                           (session.budget_model === 'B' && session.recording_required === 'Sim') ||
                           (session.budget_model === 'C' && session.source_recorder?.includes('Cliente'));

  if (isClientSupplied) {
    const hdCapacity = session.client_hd_gb || 0; // Guardado como TB no state
    const result = calcRetentionDays(hdCapacity, cameraCount, resolution);
    
    scope.retention_estimate = result;
    
    // Retorna um item HD genérico com custo 0
    return { 
      sku: 'HD-CLIENTE', 
      produto: `HD ${hdCapacity >= 1 ? hdCapacity + 'TB' : (hdCapacity * 1024) + 'GB'} (Cliente)`, 
      preco_custo: 0, 
      categoria: 'HD',
      supplied_by: 'Cliente'
    };
  }

  // SEÇÃO: NOCTUA FORNECE HD (A / C)
  const targetDays = parseInt(session.recording_days) || 15;
  const bitrate = BITRATE_GBDAY[resolution] ?? BITRATE_GBDAY['2MP'];
  const consumoDiario = bitrate * cameraCount;
  const gbNecessario = (consumoDiario * targetDays) / (1 - OVERHEAD_SISTEMA);
  const tbRequired = gbNecessario / 1024;

  let hdLabel = 'HD 1TB SkyHawk';
  let defaultPrice = 350;

  if (tbRequired <= 1) { hdLabel = 'HD 1TB SkyHawk'; defaultPrice = 350; }
  else if (tbRequired <= 2) { hdLabel = 'HD 2TB SkyHawk'; defaultPrice = 520; }
  else if (tbRequired <= 4) { hdLabel = 'HD 4TB SkyHawk'; defaultPrice = 850; }
  else if (tbRequired <= 8) { hdLabel = 'HD 8TB SkyHawk'; defaultPrice = 1600; }
  else { hdLabel = 'HD 10TB SkyHawk'; defaultPrice = 2200; }

  const hdItem = await findItemWithFallback('HD', hdLabel, defaultPrice);
  
  // Calcula retenção real do HD selecionado para o relatório
  const hdTB = parseFloat(hdItem.produto.match(/(\d+)TB/)?.[1] || 1);
  scope.retention_estimate = calcRetentionDays(hdTB, cameraCount, resolution);

  return hdItem;
};

const calculateCables = (scope, cameraCount) => {
  const mode = scope.cable_calc_mode || 'total';
  const rawDist = scope.raw_distances || "";
  const alertLevel = scope.distance_alert_level || 'none';
  const slack = scope.cable_slack_per_point_m || 4;
  const factor = scope.route_factor || 1.3;

  let totalM = 0;
  let maxM = 0;

  if (mode === 'detalhado' && rawDist) {
    // Modo Detalhado: Soma de distâncias individuais + folga por ponto
    const distances = rawDist.split(/[,; ]+/).map(d => parseFloat(d)).filter(d => !isNaN(d));
    distances.forEach(d => {
      const adjusted = d + slack;
      totalM += adjusted;
      if (d > maxM) maxM = d;
    });
  } else if (mode === 'estimado' && rawDist) {
    // Modo Estimado: (Média * Fator de Rota) + Folga por ponto
    const avgDistance = parseFloat(rawDist) || 0;
    const perPoint = (avgDistance * factor) + slack;
    totalM = cameraCount * perPoint;
    maxM = avgDistance * factor;
  } else {
    // Modo Total (Legado/Manual)
    totalM = parseFloat(scope.cable_total_m) || 0;
    maxM = 0;
  }
  
  // 1. Metragem Total para Compra
  scope.estimated_cable_total_m = Math.ceil(totalM);

  // 2. Risco Técnico de Distância (por ponto)
  if (scope.distance_source === 'total_only' && mode === 'total') {
    scope.max_point_distance_m = 0;
    scope.distance_risk = false;
  } else {
    scope.max_point_distance_m = maxM;
    
    // Avalia o nível de alerta baseado na maior distância encontrada ou selecionada
    if (maxM > 100 || alertLevel === 'above_100') {
      scope.distance_risk = true;
      scope.requires_human_review = true;
      scope.waiting_human = true;
      if (!scope.incompatibilities.includes('BLOCK_DISTANCE_LIMIT')) {
        scope.incompatibilities.push('BLOCK_DISTANCE_LIMIT');
      }
    } else if (maxM > 90 || alertLevel === 'above_90') {
      scope.distance_risk = true;
      scope.operational_flags.long_distance = true;
      if (!scope.incompatibilities.includes('ALERT_LONG_DISTANCE')) {
        scope.incompatibilities.push('ALERT_LONG_DISTANCE');
      }
    } else if (alertLevel === 'unknown') {
      scope.requires_human_review = true;
    } else {
      scope.distance_risk = false;
    }
  }

  scope.estimated_cable_per_point_m = Math.ceil(maxM);
};

const generateTechnicalPayload = async (session) => {
  const profile = getProfile(session.property_type);
  const cameraCount = parseInt(session.camera_quantity) || 0;
  const isModeloB = session.budget_model === 'B';
  const isModeloC = session.budget_model === 'C';

  const scope = { 
    ...DEFAULT_SCOPE, 
    profile: session.property_type,
    incompatibilities: [],
    operational_flags: { ...DEFAULT_SCOPE.operational_flags },
    resolved_items: [],
    ...(session.technical_scope || {})
  };

  // 1. Definição de Tecnologia e PoE (V5)
  const techType = mapTechType(session.system_type);
  const poeMode = mapPoEMode(session.poe_mode);
  const isIP = techType === TECH_TYPE.IP;
  const maxDistance = scope.max_point_distance_m || 30;

  // 1.1 Resolução Baseada em DORI (V5.1)
  let resolution = "2MP";
  const targetDori = scope.dori_level || DORI_LEVELS.DETECTION;

  // Busca a melhor resolução que atenda a distância no nível DORI escolhido
  const resolutionsOrdered = ['2MP', '4MP', '8MP'];
  for (const res of resolutionsOrdered) {
      if (DORI_RANGES[res] && DORI_RANGES[res][targetDori] >= maxDistance) {
          resolution = res;
          break;
      }
      // Se chegarmos no último e ainda não atender, usamos o último (mais potente)
      resolution = res;
  }

  if (DORI_RANGES[resolution][targetDori] < maxDistance) {
      scope.incompatibilities.push('ALERT_DORI_LIMIT');
      scope.operational_flags.high_complexity = true;
  }

  // 2. Seleção de Gravador e Switch (V5)
  const nvrResult = selectNVR(techType, cameraCount, poeMode);
  const recorderItem = await findItemWithFallback('Recorder', nvrResult.model, isIP ? 650 : 350, { tech: techType });
  
  scope.selected_recorders = [{ ...recorderItem, qtd: 1, categoria: 'Recorder' }];
  scope.selected_recorder = scope.selected_recorders[0];
  
  if (nvrResult.switch) {
      const switchItem = await findItemWithFallback('Acessorio', nvrResult.switch, 520);
      scope.resolved_items.push({ ...switchItem, qtd: 1, categoria: 'Acessorio' });
      scope.network_topology = nvrResult.note;
  } else {
      scope.network_topology = isIP ? 'Câmeras conectadas diretamente no NVR (PoE Integrado)' : 'Câmeras conectadas diretamente no DVR';
  }

  // 3. Seleção de Cabo e Câmera (V5)
  const cableResult = selectCable(techType, resolution, maxDistance);
  const cableItem = await findItemWithFallback('Cabo', cableResult.label, isIP ? 3.5 : 2.8);
  
  if (cableResult.alert) {
      scope.incompatibilities.push(`BLOCK_${cableResult.alert}`);
      scope.requires_human_review = true;
      scope.waiting_human = true;
  }

  const baseName = profile.base_camera[isIP ? 'ip' : 'analog'];
  const cameraName = baseName.replace('2MP', resolution);
  scope.selected_camera = await findItemWithFallback('Camera', cameraName, isIP ? 250 : 120, { tech: techType });

  // 4. Acessórios e Infraestrutura (V5)
  const acessorios = [];
  acessorios.push({ ...cableItem, qtd: scope.estimated_cable_total_m || (cameraCount * 25), categoria: 'Cabo' });

  if (isIP) {
      const rj45 = await findItemWithFallback('Acessorio', 'Conector RJ45', 1.5);
      acessorios.push({ ...rj45, qtd: cameraCount * 2, categoria: 'Acessorio' });
  } else {
      const balun = await findItemWithFallback('Acessorio', 'Balun de Vídeo (Par)', 15);
      const conectorP4 = await findItemWithFallback('Acessorio', 'Conector P4 Macho com Borne', 2.5);
      acessorios.push({ ...balun, qtd: cameraCount, categoria: 'Acessorio' });
      acessorios.push({ ...conectorP4, qtd: cameraCount, categoria: 'Acessorio' });
      
      if (poeMode === POE_MODE.INDIVIDUAL || !session.poe_mode) {
          const fonte = await findItemWithFallback('Acessorio', 'Fonte 12V 1A', 25);
          acessorios.push({ ...fonte, qtd: cameraCount, categoria: 'Acessorio' });
      }
  }

  const caixaProt = await findItemWithFallback('Acessorio', 'Caixa de Proteção CFTV', 12);
  acessorios.push({ ...caixaProt, qtd: cameraCount, categoria: 'Acessorio' });

  // INFRAESTRUTURA
  const infraStatus = (scope.infra_status || "").toLowerCase();
  if (!infraStatus.includes('existente')) {
      const infraMeterage = parseFloat(scope.infra_meterage) || Math.ceil((scope.estimated_cable_total_m || cameraCount * 25) * 0.7);
      const environment = (session.installation_environment || "Interno").toLowerCase();
      
      const infraType = (environment === 'externo' || environment === 'misto') ? 'Eletroduto Corrugado 3/4 (Metro)' : 'Canaleta com Adesivo 20x10mm (Metro)';
      const infraItem = await findItemWithFallback('Infra', infraType, 4.5);
      acessorios.push({ ...infraItem, qtd: infraMeterage, categoria: 'Infra' });
  }

  // 5. Storage (V5)
  scope.selected_hd = await calculateStorage(scope, cameraCount, isIP, session, resolution);
  
  // 6. Consolidação e Regras de Fornecimento
  const shouldClientSupply = (categoria) => {
    if (isModeloB) return true;
    if (isModeloC) {
      if (categoria === 'Camera' && session.source_cameras?.includes('Cliente')) return true;
      if (categoria === 'Recorder' && session.source_recorder?.includes('Cliente')) return true;
      if (categoria === 'Cabo' && session.source_cables?.includes('Cliente')) return true;
      if (categoria === 'Acessorio' && session.source_cables?.includes('Cliente')) return true;
      if (categoria === 'Infra' && session.source_infra?.includes('Cliente')) return true;
      if (categoria === 'HD' && (session.recording_required?.includes('possuo') || session.recording_required === 'Sim')) return true;
    }
    return false;
  };

  scope.resolved_items = [
    ...scope.selected_recorders.map(r => ({ ...r, qtd: 1, categoria: 'Recorder' })),
    { ...scope.selected_camera, qtd: cameraCount, categoria: 'Camera' },
    { ...scope.selected_hd, qtd: scope.selected_recorders.length, categoria: 'HD' },
    ...acessorios
  ];

  scope.resolved_items = scope.resolved_items.map(item => ({
    ...item,
    preco_custo: shouldClientSupply(item.categoria) ? 0 : item.preco_custo,
    supplied_by: shouldClientSupply(item.categoria) ? 'Cliente' : 'NOCTUA'
  }));

  if (scope.selected_camera?.sku === 'BLOCK' || scope.selected_recorder?.sku === 'BLOCK') {
      scope.incompatibilities.push('BLOCK_CATALOG_CRITICAL_MISSING');
      scope.requires_human_review = true;
  }

  if (session.material_source && session.material_source.includes('Cliente') && !isModeloB) {
    scope.incompatibilities.push('REVIEW_CLIENT_MATERIAL');
    scope.requires_human_review = true;
    scope.waiting_human = true;
  }

  // Model B: No review for material (expected)
  if (isModeloB) {
      scope.requires_human_review = false;
      scope.waiting_human = false;
  }

  if (cameraCount > 16) {
    scope.operational_flags.high_complexity = true;
    scope.requires_human_review = true;
  }

  scope.operational_flags.high_complexity = cameraCount > 8 || infraStatus.includes('não');
  scope.operational_flags.needs_ladder = infraStatus.includes('não');

  return scope;
};

const resolvePendingTechnicalAnswer = (text, questionId) => {
  const clean = text.trim().replace(/\n/g, ' '); // Remove quebras de linha para comparação
  const lower = clean.toLowerCase();

  // 1. MAPEAMENTOS ESPECÍFICOS (Prioridade Máxima)
  // Estes mapeamentos garantem que IDs de controle (slugs) sejam retornados corretamente
  // antes que o bloco genérico de opções capture o texto bruto dos botões.
  
  if (questionId === 'infra_status') return { 
    '1': 'Existente (Aproveitar atual)', 
    '2': 'Nova (Instalação total)', 
    '3': 'Parcial (Alguns pontos prontos)'
  }[clean] || clean;
  
  if (questionId === 'long_distance_risk') {
      const val = (clean === '4' || lower.includes('sei')) ? 'unknown' :
                  (clean === '1' || lower.includes('não')) ? 'none' :
                  (clean === '2' || lower.includes('90')) ? 'above_90' :
                  (clean === '3' || lower.includes('100')) ? 'above_100' : null;
      if (val) return val;
      return clean;
  }
  
  if (questionId === 'detailed_subflow_mode') {
      const val = (clean === '1' || lower.includes('uma por uma')) ? 'one_by_one' : 
                  (clean === '2' || lower.includes('uma linha')) ? 'batch' : 
                  (clean === '3' || lower.includes('revisão')) ? 'review' : null;
      if (val) return val;
      return clean;
  }
  
  if (questionId === 'route_type') return { '1': 'Simples (Caminho livre)', '2': 'Padrão (Ambiente comum)', '3': 'Difícil (Altura/Externa)' }[clean] || clean;
  
  if (questionId === 'dori_level') {
      if (clean === '1' || lower.includes('detecção')) return DORI_LEVELS.DETECTION;
      if (clean === '2' || lower.includes('observação')) return DORI_LEVELS.OBSERVATION;
      if (clean === '3' || lower.includes('reconhecimento')) return DORI_LEVELS.RECOGNITION;
      if (clean === '4' || lower.includes('identificação')) return DORI_LEVELS.IDENTIFICATION;
  }
  
      // Se for texto livre mas o motor encontrou um "match" no bloco genérico, 
      // deixamos passar se for um número válido.
  
  if (questionId === 'external_cameras') {
      const val = clean.split(' ')[0];
      if (!isNaN(parseInt(val))) return val;
  }
  
  if (questionId === 'confirm_standard') {
      if (clean === '1' || lower.includes('padrão')) return 'padrão';
      if (clean === '2' || lower.includes('revisão')) return 'revisão';
  }


  // Validação Numérica Estrita para Metragem e Quantidades do TSR
  if (questionId === 'cable_total' || questionId === 'detailed_subflow_qty' || questionId === 'infra_meterage') {
      const num = parseFloat(clean);
      if (isNaN(num)) return null;
      return num.toString();
  }

  // Tratamento especial para coleta iterativa de distâncias individuais
  if (questionId === 'cable_individual_distance') {
      const dist = parseFloat(clean);
      if (isNaN(dist)) return null;
      return dist; // O DialogueEngine/Orchestrator deve decidir onde salvar
  }

  // Tratamento especial para parse de lote (batch)
  if (questionId === 'cable_batch_distances') {
      // Ex: "1=95, 2=110, 3=102"
      const result = {};
      const pairs = clean.split(/[,; ]+/);
      pairs.forEach(p => {
          const [idx, val] = p.split('=');
          if (idx && val) {
              const v = parseFloat(val);
              if (!isNaN(v)) result[idx.trim()] = v;
          } else {
              // Tenta apenas números sequenciais se não houver "="
              const v = parseFloat(p);
              if (!isNaN(v)) result[Object.keys(result).length + 1] = v;
          }
      });
      return result;
  }

  // 2. BUSCA DE DEFINIÇÃO DE PERGUNTA
  let question = GLOBAL_TECH_QUESTIONS.find(q => q.id === questionId);
  if (!question) {
    for (const profileKey in PROFILES) {
      const q = (PROFILES[profileKey].questions || []).find(q => q.id === questionId);
      if (q) {
        question = q;
        break;
      }
    }
  }
  
  // 3. PROCESSAMENTO GENÉRICO DE OPÇÕES
  if (question && question.options) {
    // 3.1 Se for um número puro, verificar se é uma opção válida
    const num = parseInt(clean);
    const isPureNumber = /^\d+$/.test(clean);

    if (isPureNumber && !isNaN(num) && question.options[num - 1]) {
        const selectedOpt = question.options[num - 1].toLowerCase();
        // INTERCEPTAÇÃO: Se o número aponta para "Outro/a", mas é um número puro
        if (selectedOpt.includes('outra') || selectedOpt.includes('outro')) {
            if (lower.includes('outra') || lower.includes('outro')) return 'WAIT_FOR_MANUAL';
            return clean; // Trata como valor real
        }
        return question.options[num - 1];
    }

    // 3.2 Se contém a palavra "outro" ou "outra" (clique no botão ou texto livre)
    if (lower.includes('outra') || lower.includes('outro')) return 'WAIT_FOR_MANUAL';

    // 3.3 Tentar por texto parcial da opção (Normalizando opções também)
    const found = question.options.find(opt => opt.replace(/\n/g, ' ').toLowerCase().includes(lower));
    if (found) return found;
  }

  return clean;
};

module.exports = { PROFILES, GLOBAL_TECH_QUESTIONS, generateTechnicalPayload, resolvePendingTechnicalAnswer, findItemWithFallback };
