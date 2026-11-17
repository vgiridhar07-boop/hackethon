export type CivicCategory = 'Roads' | 'Water' | 'Garbage' | 'Drainage' | 'Electricity';

export interface SubIssuePolicy {
  subIssueCode: string;
  subIssueLabel: string;
  category: CivicCategory;
  kUrban: 1 | 2 | 3 | 4;
  kRural: 1 | 2 | 3;
  radiusMeters: number;
  maxWaitMinutes: number; // T_max starvation ceiling
  slaHours: 4 | 12 | 24 | 72;
  criticalKeywords: string[];
  responsibleAuthority: string;
  escalationTier1: string;
  escalationTier2: string;
  escalationTier3: string;
}

export const SUB_ISSUE_POLICIES: Record<string, SubIssuePolicy> = {
  // 1. ROADS & INFRASTRUCTURE
  ROAD_CRITICAL_CAVEIN_BLOCKAGE: {
    subIssueCode: 'ROAD_CRITICAL_CAVEIN_BLOCKAGE',
    subIssueLabel: 'Road Cave-In / Bridge Damage / Arterial Blockage',
    category: 'Roads',
    kUrban: 1,
    kRural: 1,
    radiusMeters: 50,
    maxWaitMinutes: 0,
    slaHours: 4,
    criticalKeywords: [
      'cave-in',
      'sinkhole',
      'collapsed',
      'bridge damage',
      'bridge crack',
      'arterial road blocked',
      'hospital road blocked',
      'landslide',
      'culvert damage',
    ],
    responsibleAuthority: 'R&B Executive Engineer, Municipal Engineering Emergency Cell, Traffic Police (112)',
    escalationTier1: 'Assistant Executive Engineer (Roads)',
    escalationTier2: 'Superintending Engineer (R&B) & Municipal Commissioner Desk',
    escalationTier3: 'District Collectorate Grievance Cell & State Nodal 181 / 1902',
  },
  ROAD_URGENT_HAZARD_DIVIDER: {
    subIssueCode: 'ROAD_URGENT_HAZARD_DIVIDER',
    subIssueLabel: 'Dangerous Pothole Cluster / Broken Divider / Open Trench',
    category: 'Roads',
    kUrban: 2,
    kRural: 1,
    radiusMeters: 50,
    maxWaitMinutes: 120,
    slaHours: 24,
    criticalKeywords: [
      'deep pothole',
      'accident',
      'falling',
      'damaged divider',
      'broken divider',
      'open trench',
      'exposed iron rod',
      'unlit excavation',
    ],
    responsibleAuthority: 'Municipal Corporation Engineering Division, R&B Assistant Engineer',
    escalationTier1: 'Ward Junior Engineer (Roads)',
    escalationTier2: 'Executive Engineer (Civil/Roads)',
    escalationTier3: 'District Collectorate Grievance Cell',
  },
  ROAD_STANDARD_POTHOLE_FOOTPATH: {
    subIssueCode: 'ROAD_STANDARD_POTHOLE_FOOTPATH',
    subIssueLabel: 'Standard Road Potholes / Footpath Damage / Speed Breaker',
    category: 'Roads',
    kUrban: 3,
    kRural: 2,
    radiusMeters: 75,
    maxWaitMinutes: 360,
    slaHours: 72,
    criticalKeywords: [
      'pothole',
      'potholes',
      'cracks',
      'broken footpath',
      'footpath',
      'speed breaker',
      'road maintenance',
      'pavement damaged',
    ],
    responsibleAuthority: 'Ward Junior Engineer (Roads), Panchayat Raj Engineering (PR Eng)',
    escalationTier1: 'Ward Engineering Supervisor',
    escalationTier2: 'Municipal Engineering Division Head',
    escalationTier3: 'Collectorate Public Works Monitoring Desk',
  },
  ROAD_COSMETIC_SIGNAGE: {
    subIssueCode: 'ROAD_COSMETIC_SIGNAGE',
    subIssueLabel: 'Missing Non-Critical Signage / Faded Road Markings',
    category: 'Roads',
    kUrban: 4,
    kRural: 3,
    radiusMeters: 100,
    maxWaitMinutes: 720,
    slaHours: 72,
    criticalKeywords: ['missing sign', 'faded paint', 'milestone', 'signboard faded', 'road marking'],
    responsibleAuthority: 'Zonal Road Maintenance Desk / Mandal Parishad Officer',
    escalationTier1: 'Zonal Maintenance Supervisor',
    escalationTier2: 'Assistant Municipal Commissioner (Zone)',
    escalationTier3: 'District Urban Development Authority',
  },

  // 2. WATER SUPPLY
  WATER_CRITICAL_CONTAMINATION_BURST: {
    subIssueCode: 'WATER_CRITICAL_CONTAMINATION_BURST',
    subIssueLabel: 'Acute Drinking Water Contamination / Arterial Main Burst',
    category: 'Water',
    kUrban: 1,
    kRural: 1,
    radiusMeters: 100,
    maxWaitMinutes: 0,
    slaHours: 4,
    criticalKeywords: [
      'sewer water mixing',
      'contaminated drinking water',
      'main pipeline burst',
      'pipeline burst',
      'poisonous',
      'flooding road',
      'black sewage water coming',
      'epidemic risk',
    ],
    responsibleAuthority: 'Jal Board / Municipal Water Works Chief Engineer, PHED Emergency Cell',
    escalationTier1: 'Water Supply Executive Engineer',
    escalationTier2: 'Chief Engineer (PHED / Water Board)',
    escalationTier3: 'District Collectorate & State Disaster Management Desk',
  },
  WATER_URGENT_SUPPLY_OUTAGE: {
    subIssueCode: 'WATER_URGENT_SUPPLY_OUTAGE',
    subIssueLabel: 'Complete Colony Water Disruption / Broken Distribution Line',
    category: 'Water',
    kUrban: 2,
    kRural: 1,
    radiusMeters: 250,
    maxWaitMinutes: 120,
    slaHours: 24,
    criticalKeywords: [
      'no water supply',
      'water outage',
      'supply disruption',
      'broken pipeline',
      'dirty water',
      'turbid',
      'brown water',
      'foul smelling water',
    ],
    responsibleAuthority: 'Municipal Water Works Executive Engineer, Rural Water Supply (PR Dept)',
    escalationTier1: 'Zonal Water Inspector',
    escalationTier2: 'Executive Engineer (Water Supply)',
    escalationTier3: 'District Collectorate Public Health Monitoring Cell',
  },
  WATER_STANDARD_PRESSURE_LEAK: {
    subIssueCode: 'WATER_STANDARD_PRESSURE_LEAK',
    subIssueLabel: 'Low Pressure / Minor Valve Leak / Erratic Tanker Delivery',
    category: 'Water',
    kUrban: 3,
    kRural: 2,
    radiusMeters: 100,
    maxWaitMinutes: 360,
    slaHours: 72,
    criticalKeywords: [
      'low pressure',
      'valve leak',
      'water leakage',
      'pipeline dripping',
      'tanker delay',
      'water tanker',
      'booster pump',
    ],
    responsibleAuthority: 'Ward Water Works Inspector / Gram Panchayat Water Operator',
    escalationTier1: 'Ward Line Inspector',
    escalationTier2: 'Assistant Engineer (Water Distribution)',
    escalationTier3: 'Municipal Commissioner Grievance Desk',
  },

  // 3. DRAINAGE & SEWAGE
  DRAINAGE_CRITICAL_NAMASTE_MANHOLE: {
    subIssueCode: 'DRAINAGE_CRITICAL_NAMASTE_MANHOLE',
    subIssueLabel: 'Manual Sewer Entry (14420) / Open Manhole / Toxic Gas',
    category: 'Drainage',
    kUrban: 1,
    kRural: 1,
    radiusMeters: 50,
    maxWaitMinutes: 0,
    slaHours: 4,
    criticalKeywords: [
      'manual sewer',
      'manual scavenging',
      'open manhole',
      'missing manhole',
      'manhole cover missing',
      'manhole open',
      'sewer gas',
      'toxic gas',
      'chemical effluent',
      'worker trapped',
      '14420',
      'namaste',
    ],
    responsibleAuthority: 'NAMASTE Safety Desk (14420), Underground Drainage (UGD) Emergency Cell, Collectorate',
    escalationTier1: 'UGD Emergency Response Officer',
    escalationTier2: 'Chief Municipal Engineer (Sanitation)',
    escalationTier3: 'District Magistrate / Collector (Statutory Enforcement under 14420)',
  },
  DRAINAGE_URGENT_OVERFLOW_FLOODING: {
    subIssueCode: 'DRAINAGE_URGENT_OVERFLOW_FLOODING',
    subIssueLabel: 'Sewer Manhole Overflow / Road Waterlogging / Septic Hazard',
    category: 'Drainage',
    kUrban: 2,
    kRural: 1,
    radiusMeters: 75,
    maxWaitMinutes: 90,
    slaHours: 24,
    criticalKeywords: [
      'sewer overflow',
      'overflowing drain',
      'waterlogging',
      'water logging',
      'entering homes',
      'open septic',
      'blocked major drain',
      'drainage backflow',
    ],
    responsibleAuthority: 'UGD Division Engineer, Municipal Sanitation Engineering Cell',
    escalationTier1: 'Sanitary Inspector (Drainage)',
    escalationTier2: 'Executive Engineer (Underground Drainage)',
    escalationTier3: 'District Collectorate Urban Flooding Cell',
  },
  DRAINAGE_STANDARD_SILT_STAGNATION: {
    subIssueCode: 'DRAINAGE_STANDARD_SILT_STAGNATION',
    subIssueLabel: 'Silted Roadside Drain / Stagnant Puddle / Slow Flow',
    category: 'Drainage',
    kUrban: 3,
    kRural: 2,
    radiusMeters: 75,
    maxWaitMinutes: 360,
    slaHours: 72,
    criticalKeywords: [
      'stagnant water',
      'blocked side drain',
      'silt',
      'drain choked',
      'mosquito breeding',
      'side drain silted',
    ],
    responsibleAuthority: 'Ward Sanitation & Drainage Supervisor, Gram Panchayat Sanitation',
    escalationTier1: 'Ward Drainage Supervisor',
    escalationTier2: 'Health Officer / Sanitary Inspector',
    escalationTier3: 'Panchayat / Municipal Nodal Cell',
  },

  // 4. GARBAGE & SANITATION
  GARBAGE_CRITICAL_BIOMEDICAL_CARCASS: {
    subIssueCode: 'GARBAGE_CRITICAL_BIOMEDICAL_CARCASS',
    subIssueLabel: 'Biomedical Waste / Large Animal Carcass / Toxic Burning',
    category: 'Garbage',
    kUrban: 1,
    kRural: 1,
    radiusMeters: 50,
    maxWaitMinutes: 0,
    slaHours: 4,
    criticalKeywords: [
      'biomedical waste',
      'hospital waste',
      'dead animal',
      'animal carcass',
      'carcass',
      'burning garbage',
      'burning toxic garbage',
      'toxic smoke',
      'hazardous chemical waste',
    ],
    responsibleAuthority: 'Municipal Health & Sanitation Officer, SWM Rapid Response Unit',
    escalationTier1: 'Chief Health Officer',
    escalationTier2: 'Pollution Control Board Inspector & Municipal Commissioner',
    escalationTier3: 'District Collectorate Environmental Safety Desk',
  },
  GARBAGE_URGENT_OVERFLOWING_DUMPSTER: {
    subIssueCode: 'GARBAGE_URGENT_OVERFLOWING_DUMPSTER',
    subIssueLabel: 'Overflowing Community Dumpster / Road Blockage by Waste',
    category: 'Garbage',
    kUrban: 2,
    kRural: 1,
    radiusMeters: 50,
    maxWaitMinutes: 120,
    slaHours: 24,
    criticalKeywords: [
      'overflowing dumpster',
      'overflowing dustbin',
      'dumpster full',
      'garbage bin overflow',
      'foul smell entering homes',
      'blocking school entrance',
      'blocking hospital entrance',
      'garbage blocking road',
    ],
    responsibleAuthority: 'Municipal Solid Waste Management (SWM) Cell, Zonal Sanitary Inspector',
    escalationTier1: 'Zonal Sanitary Inspector',
    escalationTier2: 'Executive Engineer (Solid Waste Management)',
    escalationTier3: 'Swachh Bharat Urban / Rural Nodal Officer',
  },
  GARBAGE_STANDARD_UNCOLLECTED_LITTER: {
    subIssueCode: 'GARBAGE_STANDARD_UNCOLLECTED_LITTER',
    subIssueLabel: 'Missed Door-to-Door Collection / Roadside Litter',
    category: 'Garbage',
    kUrban: 3,
    kRural: 2,
    radiusMeters: 60,
    maxWaitMinutes: 360,
    slaHours: 72,
    criticalKeywords: [
      'missed collection',
      'door to door',
      'garbage truck',
      'road garbage',
      'public area dirty',
      'uncleaned street',
      'litter on road',
    ],
    responsibleAuthority: 'Ward Sanitary Inspector, Swachh Bharat Urban Nodal Desk, Gram Panchayat Sanitation',
    escalationTier1: 'Ward Sanitary Supervisor',
    escalationTier2: 'Zonal Health Officer',
    escalationTier3: 'Municipal Sanitation Grievance Head',
  },
  GARBAGE_COSMETIC_DEBRIS_PLASTIC: {
    subIssueCode: 'GARBAGE_COSMETIC_DEBRIS_PLASTIC',
    subIssueLabel: 'Construction Debris / Plastic Waste Accumulation',
    category: 'Garbage',
    kUrban: 4,
    kRural: 3,
    radiusMeters: 75,
    maxWaitMinutes: 720,
    slaHours: 72,
    criticalKeywords: [
      'construction debris',
      'construction waste',
      'malba',
      'plastic accumulation',
      'dry leaves',
      'tree branches',
    ],
    responsibleAuthority: 'Zonal Waste Collection Vehicle Supervisor',
    escalationTier1: 'C&D Waste Transport Supervisor',
    escalationTier2: 'Zonal Executive Engineer (SWM)',
    escalationTier3: 'Municipal Solid Waste Desk',
  },

  // 5. ELECTRICITY & STREET LIGHTING
  ELECTRICITY_CRITICAL_LIVEWIRE_POLE: {
    subIssueCode: 'ELECTRICITY_CRITICAL_LIVEWIRE_POLE',
    subIssueLabel: 'Hanging Live Wire / Fallen Pole / Transformer Blast / Sparks',
    category: 'Electricity',
    kUrban: 1,
    kRural: 1,
    radiusMeters: 50,
    maxWaitMinutes: 0,
    slaHours: 4,
    criticalKeywords: [
      'live wire',
      'electric sparks',
      'sparking',
      'hanging wire',
      'fallen pole',
      'broken electric pole',
      'transformer fire',
      'transformer blast',
      'transformer explosion',
      'electrocution',
      'live wire in water',
      'shock hazard',
    ],
    responsibleAuthority: 'DISCOM Emergency Fuse-Off Call Center, Electricity Board Assistant Engineer, 112 ERSS',
    escalationTier1: 'Sub-Station Assistant Engineer (DISCOM)',
    escalationTier2: 'Divisional Engineer (Operations) & Fire Service (101)',
    escalationTier3: 'Chief General Manager (DISCOM) & District Disaster Relief Cell',
  },
  ELECTRICITY_URGENT_POWERCUT_TRANSFORMER: {
    subIssueCode: 'ELECTRICITY_URGENT_POWERCUT_TRANSFORMER',
    subIssueLabel: 'Prolonged Area Power Cut / Feeder Failure / Damaged Transformer',
    category: 'Electricity',
    kUrban: 2,
    kRural: 1,
    radiusMeters: 400,
    maxWaitMinutes: 60,
    slaHours: 12,
    criticalKeywords: [
      'power cut',
      'no electricity',
      'blackout',
      'feeder failure',
      'phase failure',
      'entire street dark',
      'voltage fluctuation',
      'transformer leaking oil',
      'transformer damaged',
    ],
    responsibleAuthority: 'Power Distribution Company (DISCOM) Sub-Station Engineer',
    escalationTier1: 'Section Officer (DISCOM)',
    escalationTier2: 'Assistant Divisional Engineer (Operations)',
    escalationTier3: 'DISCOM Consumer Grievance Redressal Forum',
  },
  ELECTRICITY_STANDARD_STREETLIGHT: {
    subIssueCode: 'ELECTRICITY_STANDARD_STREETLIGHT',
    subIssueLabel: 'Municipal Street Light Pole Not Working / Daytime Burning',
    category: 'Electricity',
    kUrban: 3,
    kRural: 2,
    radiusMeters: 50,
    maxWaitMinutes: 360,
    slaHours: 72,
    criticalKeywords: [
      'street light',
      'lamp post',
      'street light not working',
      'dark street',
      'street light off',
      'daytime burning',
      'leaning pole',
      'light flickering',
    ],
    responsibleAuthority: 'Municipal Street Lighting Cell / Panchayat Street Lighting Technician',
    escalationTier1: 'Street Lighting Supervisor',
    escalationTier2: 'Assistant Engineer (Electrical - ULB)',
    escalationTier3: 'Municipal Commissioner Street Infrastructure Cell',
  },
};

export const COMPOUND_HAZARD_PAIRS: Array<[CivicCategory, CivicCategory]> = [
  ['Water', 'Roads'], // Pipeline leak causing road cave-in
  ['Drainage', 'Roads'], // Blocked drain causing road flooding / erosion
  ['Drainage', 'Water'], // Sewage mixing with drinking water line
  ['Electricity', 'Roads'], // Fallen pole/wire blocking road
  ['Electricity', 'Water'], // Live wire near waterlogged street (extreme electrocution hazard)
];

/**
 * Deterministically resolves a sub-issue policy from category and description
 */
export function detectSubIssuePolicy(
  category: CivicCategory,
  description: string,
  explicitSubIssueCode?: string
): SubIssuePolicy {
  if (explicitSubIssueCode && SUB_ISSUE_POLICIES[explicitSubIssueCode]) {
    return SUB_ISSUE_POLICIES[explicitSubIssueCode];
  }

  const descLower = description.toLowerCase();

  // Find all candidate policies matching this category
  const candidatePolicies = Object.values(SUB_ISSUE_POLICIES).filter(
    (p) => p.category.toLowerCase() === category.toLowerCase()
  );

  // Check critical keywords in order of strict priority: Critical (K=1) -> Urgent (K=2) -> Standard (K=3) -> Cosmetic (K=4)
  const sortedByPriority = candidatePolicies.sort((a, b) => a.kUrban - b.kUrban);

  for (const policy of sortedByPriority) {
    for (const kw of policy.criticalKeywords) {
      if (descLower.includes(kw.toLowerCase())) {
        return policy;
      }
    }
  }

  // Fallback to standard tier for the category
  const defaultStandard = sortedByPriority.find((p) => p.kUrban === 3) || sortedByPriority[0];
  return defaultStandard;
}

