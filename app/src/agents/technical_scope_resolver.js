const { db } = require("../db/sqlite");

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
 * Calculadora de Storage NOCTUA
 */
const calculateStorage = async (scope, cameraCount, isIP) => {
  const days = parseInt(scope.recording_days) || 15;
  // Regra Conservadora (H.265): 15GB/dia (Analog), 25GB/dia (IP)
  const gbPerDay = isIP ? 25 : 15;
  const totalGB = cameraCount * days * gbPerDay;

  // Mapa de Capacidades Disponíveis
  const capacities = [
    { label: 'HD 1TB SkyHawk', gb: 1000, price: 300 },
    { label: 'HD 2TB SkyHawk', gb: 2000, price: 450 },
    { label: 'HD 4TB SkyHawk', gb: 4000, price: 750 },
    { label: 'HD 8TB SkyHawk', gb: 8000, price: 1400 }
  ];

  const selected = capacities.find(c => c.gb >= totalGB) || capacities[capacities.length - 1];
  
  if (totalGB > 8000) {
    scope.incompatibilities.push('REVIEW_STORAGE_ABOVE_STANDARD');
    scope.requires_human_review = true;
    scope.waiting_human = true;
  }

  return await findItemWithFallback('HD', selected.label, selected.price);
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
  const isIP = (session.system_type || "").toLowerCase().includes('ip');
  const sysKey = isIP ? 'ip' : 'analog';

  const cameraCount = parseInt(session.camera_quantity) || 0;

  const scope = { 
    ...DEFAULT_SCOPE, 
    profile: session.property_type,
    system_type: sysKey,
    incompatibilities: [],
    operational_flags: { ...DEFAULT_SCOPE.operational_flags },
    resolved_items: [],
    ...(session.technical_scope || {})
  };

  // Define a origem da informação de distância
  if (scope.distance_alert_level !== undefined && scope.distance_alert_level !== null) {
    scope.distance_source = 'operator_confirmation';
    // Se entrar no subfluxo detalhado no futuro, aqui será 'detailed'
  } else {
    scope.distance_source = 'total_only';
  }

  const routeLabel = (scope.route_type_label || "").toLowerCase();
  if (routeLabel.includes('simples')) scope.route_factor = 1.15;
  else if (routeLabel.includes('difícil') || routeLabel.includes('dificil')) scope.route_factor = 1.50;
  else scope.route_factor = 1.30;
calculateCables(scope, cameraCount);

// 2. Seleção de Itens Principais
const getRecorderDivision = (qty) => {
  const numQty = parseInt(qty) || 0;
  if (numQty <= 4) return [4];
  if (numQty <= 8) return [8];
  if (numQty <= 16) return [16];
  if (numQty <= 32) return [32];
  
  // Divisão Multi-Gravador (Conservadora)
  if (numQty <= 36) return [32, 4];
  if (numQty <= 40) return [32, 8];
  if (numQty <= 48) return [32, 16];
  if (numQty <= 64) return [32, 32];
  
  return [32, 32, 'REVIEW']; // Acima de 64 exige revisão manual total
};

const requiredChannelsArray = getRecorderDivision(cameraCount);
scope.selected_recorders = [];

for (const channels of requiredChannelsArray) {
  if (channels === 'REVIEW') {
    scope.incompatibilities.push('BLOCK_CAPACITY_EXCEEDED');
    scope.requires_human_review = true;
    continue;
  }
  const recorderSearch = isIP ? `NVR ${channels} Canais IP` : `DVR ${channels} Canais Multi-HD`;
  const recorder = await findItemWithFallback('Recorder', recorderSearch, isIP ? 650 : 350, { tech: sysKey });
  
  if (recorder.sku === 'BLOCK') {
    scope.incompatibilities.push('BLOCK_CATALOG_CRITICAL_MISSING');
  } else if (recorder.origin === 'MANUAL') {
    scope.incompatibilities.push('ALERT_FALLBACK_USED');
  } else if (recorder.origin === 'LEGACY_CONTROLLED') {
    scope.incompatibilities.push('ALERT_LEGACY_SOURCE_USED');
  }
  
  scope.selected_recorders.push(recorder);
}

// Para manter compatibilidade com código que espera selected_recorder (como renderizador)
scope.selected_recorder = scope.selected_recorders[0]; 

if (scope.selected_recorders.length > 1) {
  scope.incompatibilities.push('ALERT_MULTI_RECORDER');
  scope.requires_human_review = true;
}

const cameraName = profile.base_camera[sysKey];
scope.selected_camera = await findItemWithFallback('Camera', cameraName, isIP ? 250 : 120, { tech: sysKey });

if (scope.selected_camera.sku === 'BLOCK') {
  scope.incompatibilities.push('BLOCK_CATALOG_CRITICAL_MISSING');
}

  // Storage Dimensionado
  scope.selected_hd = await calculateStorage(scope, cameraCount, isIP);
  
  // REGRA: HD FORNECIDO PELO CLIENTE (CÁLCULO DE DIAS)
  if (session.recording_required && session.recording_required.toLowerCase().includes('possuo')) {
    scope.selected_hd.preco_custo = 0;
    scope.selected_hd.produto += " (Fornecido pelo cliente)";
    
    // Cálculo do Período Estimado
    const hdGB = parseInt(scope.client_hd_gb) || 0;
    if (hdGB > 0) {
      const gbPerDay = isIP ? 25 : 15;
      scope.retention_days_estimate = Math.floor(hdGB / (cameraCount * gbPerDay));
      if (!scope.incompatibilities.includes('ALERT_CLIENT_MATERIAL_HD')) {
        scope.incompatibilities.push('ALERT_CLIENT_MATERIAL_HD');
      }
    }
  }

const acessorios = [];
  let cableName = isIP ? 'Cabo de Rede UTP Cat5e' : 'Cabo Coaxial Flexível 4mm';
  let defaultPrice = isIP ? 3.5 : 2.8;
  if (scope.cable_type === 'Cat6') { cableName = 'Cabo de Rede UTP Cat6'; defaultPrice = 5.5; }

  const cableItem = await findItemWithFallback('Cabo', cableName, defaultPrice);
  acessorios.push({ ...cableItem, qtd: scope.estimated_cable_total_m, categoria: 'Cabo' });

  const caixaProt = await findItemWithFallback('Acessorio', 'Caixa de Proteção CFTV', 12);
  const kitFix = await findItemWithFallback('Acessorio', 'Kit Fixação (Bucha/Parafuso)', 5);
  acessorios.push({ ...caixaProt, qtd: cameraCount, categoria: 'Acessorio' });
  acessorios.push({ ...kitFix, qtd: 1, categoria: 'Acessorio' });

  // INFRAESTRUTURA
  const infraStatus = (scope.infra_status || "").toLowerCase();
  if (!infraStatus.includes('existente')) {
    const manualType = scope.infra_type;
    const manualMeterage = parseFloat(scope.infra_meterage);
    const infraMeterage = isNaN(manualMeterage) ? Math.ceil(scope.estimated_cable_total_m * (infraStatus.includes('parcial') ? 0.3 : 1.0)) : manualMeterage;

    if (manualType) {
        let infraItem = await findItemWithFallback('Infra', manualType, 8.5);
        acessorios.push({ ...infraItem, qtd: infraMeterage, categoria: 'Infra' });
        
        // Adiciona acessórios de fixação/passagem compatíveis
        if (manualType.includes('Eletroduto')) {
            const abraca = await findItemWithFallback('Infra', 'Abraçadeira Tipo D 3/4', 1.8);
            if (infraStatus.includes('possuo')) {
              abraca.preco_custo = 0;
              abraca.produto += " (Fornecido pelo cliente)";
            }
            acessorios.push({ ...abraca, qtd: Math.ceil(infraMeterage / 2), categoria: 'Infra' });
        }
    } else {
        // Fallback automático por ambiente (original)
        const environment = (session.installation_environment || "Interno").toLowerCase();
        if (environment === 'externo' || environment === 'misto') {
          const eletroduto = await findItemWithFallback('Infra', 'Eletroduto Corrugado 3/4 (Metro)', 4.5);
          const abraca = await findItemWithFallback('Infra', 'Abraçadeira Tipo D 3/4', 1.8);
          acessorios.push({ ...eletroduto, qtd: infraMeterage, categoria: 'Infra' });
          acessorios.push({ ...abraca, qtd: Math.ceil(infraMeterage / 2), categoria: 'Infra' });
        } else {
          const canaleta = await findItemWithFallback('Infra', 'Canaleta com Adesivo 20x10mm (Metro)', 8.5);
          acessorios.push({ ...canaleta, qtd: infraMeterage, categoria: 'Infra' });
        }
    }
    const boxCount = infraStatus.includes('parcial') ? Math.ceil(cameraCount / 4) : cameraCount;
    const caixaPass = await findItemWithFallback('Infra', 'Caixa de Passagem 10x10', 15);
    acessorios.push({ ...caixaPass, qtd: boxCount, categoria: 'Infra' });
    const cintas = await findItemWithFallback('Infra', 'Kit Abraçadeira Nylon (100un)', 18);
    acessorios.push({ ...cintas, qtd: Math.ceil(scope.estimated_cable_total_m / 100), categoria: 'Infra' });
  }

  if (sysKey === 'analog') {
    const balun = await findItemWithFallback('Acessorio', 'Balun de Vídeo (Par)', 15);
    const fonte = await findItemWithFallback('Acessorio', 'Fonte 12V 1A', 25);
    const conectorP4 = await findItemWithFallback('Acessorio', 'Conector P4 Macho com Borne', 2.5);
    acessorios.push({ ...balun, qtd: cameraCount, categoria: 'Acessorio' });
    acessorios.push({ ...fonte, qtd: cameraCount, categoria: 'Acessorio' });
    acessorios.push({ ...conectorP4, qtd: cameraCount, categoria: 'Acessorio' });
  } else {
    const rj45 = await findItemWithFallback('Acessorio', 'Conector RJ45', 1.5);
    acessorios.push({ ...rj45, qtd: cameraCount * 2, categoria: 'Acessorio' });
    
    // Topologia de Rede IP (Switches PoE)
    let remainingPorts = cameraCount;
    let switchCount = 0;

    // 1. Tira blocos de 16
    if (remainingPorts > 16) {
      const sw16 = await findItemWithFallback('Acessorio', 'Switch POE 16 Portas', 1100);
      const count = Math.floor(remainingPorts / 16);
      if (count > 0) {
        acessorios.push({ ...sw16, qtd: count, categoria: 'Acessorio' });
        switchCount += count;
      }
      remainingPorts %= 16;
    }
    
    // 2. Tira o próximo maior (8 ou 4)
    if (remainingPorts > 4) {
      const sw8 = await findItemWithFallback('Acessorio', 'Switch POE 8 Portas', 520);
      acessorios.push({ ...sw8, qtd: 1, categoria: 'Acessorio', poe_budget_w: 96 });
      switchCount += 1;
      remainingPorts = 0;
    } else if (remainingPorts > 0) {
      const sw4 = await findItemWithFallback('Acessorio', 'Switch POE 4 Portas', 280);
      acessorios.push({ ...sw4, qtd: 1, categoria: 'Acessorio', poe_budget_w: 60 });
      switchCount += 1;
      remainingPorts = 0;
    }

    // Regra de PoE Budgeting (Cálculo de Consumo)
    const totalConsumptionW = cameraCount * 10; // Média 10W/camera IP
    const totalBudgetW = acessorios.filter(i => i.poe_budget_w).reduce((acc, i) => acc + (i.poe_budget_w * i.qtd), 0);
    
    if (totalConsumptionW > (totalBudgetW * 0.9)) { // Margem de segurança de 10%
      scope.incompatibilities.push('ALERT_POE_OVERLOAD_RISK');
      scope.operational_flags.high_complexity = true;
    }

    // Regra de Backbone (Interligação entre Switches)
    if (switchCount > 1) {
      const backbonePerSwitch = 15; // 15 metros por interligação
      const backboneTotal = (switchCount - 1) * backbonePerSwitch;
      scope.backbone_meterage = backboneTotal;
      scope.estimated_cable_total_m += backboneTotal;
      scope.incompatibilities.push('ALERT_BACKBONE_ADDED');
    } else {
      scope.backbone_meterage = 0;
    }

    if (cameraCount > 16) {
        scope.incompatibilities.push('REVIEW_TOPOLOGY_COMPLEX');
        if (switchCount > 3) scope.incompatibilities.push('REVIEW_SWITCH_BACKBONE_REQUIRED');
    }

    const conectorP4 = await findItemWithFallback('Acessorio', 'Conector P4 Macho com Borne', 2.5);
    acessorios.push({ ...conectorP4, qtd: cameraCount, categoria: 'Acessorio' });
  }

  if (session.material_source && session.material_source.includes('Cliente')) {
    scope.incompatibilities.push('REVIEW_CLIENT_MATERIAL');
    scope.requires_human_review = true; // REGRA CRÍTICA: Sempre trava se material for do cliente
    scope.waiting_human = true;          // Força aguardar revisão
  }

  if (session.installation_environment === 'Misto' || infraStatus.includes('parcial')) {
    scope.incompatibilities.push('ALERT_PARTIAL_INFRASTRUCTURE');
  }

  if (!session.property_type || session.property_type === 'Outro') {
    scope.incompatibilities.push('ALERT_DEFAULT_PROFILE_USED');
  }

  if (cameraCount > 16) {
    scope.operational_flags.high_complexity = true;
    scope.requires_human_review = true; // Projetos > 16 câmeras sempre pedem revisão
  }


  scope.resolved_items = [
    ...scope.selected_recorders.map(r => ({ ...r, qtd: 1, categoria: 'Recorder' })),
    { ...scope.selected_camera, qtd: cameraCount, categoria: 'Camera' },
    { ...scope.selected_hd, qtd: scope.selected_recorders.length, categoria: 'HD' }, // 1 HD por gravador físico
    ...acessorios
  ];

  scope.operational_flags.high_complexity = cameraCount > 8 || infraStatus.includes('não');
  scope.operational_flags.needs_ladder = scope.external_count > 0 || infraStatus.includes('não');

  if (scope.confirmation_mode === 'revisão') {
    scope.requires_human_review = true;
    scope.waiting_human = true;
  }

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
