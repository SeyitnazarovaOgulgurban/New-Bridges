/**
 * 无 Mapbox Token：OpenMapTiles/OSM 仿古底图上的国内展示规则。
 * 边界字段说明见 https://github.com/openmaptiles/openmaptiles/blob/master/layers/boundary/boundary.yaml
 *
 * 修改顺序建议：
 * 1. 本文件 filter 常量
 * 2. antiqueStyle.ts 中 boundary / place 图层引用
 */

/** 不作为独立「国家」注记的 ISO 3166-1 alpha-2 */
export const CN_REGION_ISO = ['TW', 'HK', 'MO'] as const;

/** Natural Earth / OSM adm0 名称：任一侧出现则不绘国界 */
export const ADM0_SENSITIVE_NAMES = [
    'Taiwan',
    'Hong Kong',
    'Macau',
    'Macao',
] as const;

/**
 * OSM disputed_name 已知争议区（亚洲为主，来自 OpenMapTiles 文档示例）。
 * 与 notNamedDisputeBoundary 叠加：有 disputed_name 字段且非空的一律不绘。
 */
export const DISPUTED_NAME_BLOCKLIST = [
    'AbuMusaIsland',
    'BaraHotiiValleys',
    'ChineseClaim',
    'Demchok',
    'Dokdo',
    'IndianClaim-North',
    'IndianClaimwesternKashmir',
    'PakistaniClaim',
    'SamduValleys',
    'TirpaniValleys',
] as const;

/** 英文国名兜底屏蔽（部分低缩放数据 iso_a2 缺失） */
export const COUNTRY_NAME_EN_HIDE = ['Taiwan', 'Hong Kong', 'Macau', 'Macao'] as const;

/* ---------- 国界 / 边界线 ---------- */

/** disputed 标记为 1 的界线不绘 */
export const notDisputedFlag: unknown[] = [
    'any',
    ['!', ['has', 'disputed']],
    ['==', ['get', 'disputed'], 0],
];

/** 带 disputed_name 的线段不绘（含 Natural Earth 低缩放争议段） */
export const notNamedDisputeBoundary: unknown[] = [
    'any',
    ['!', ['has', 'disputed_name']],
    ['==', ['get', 'disputed_name'], ''],
];

/** disputed_name 命中黑名单（双保险） */
export const notBlocklistedDisputeName: unknown[] = [
    '!',
    ['in', ['get', 'disputed_name'], ['literal', [...DISPUTED_NAME_BLOCKLIST]]],
];

/** 仅保留 claimed_by 为空或 CN 的界线（去掉印、巴等它国视角主张线） */
export const onlyCnOrNeutralClaim: unknown[] = [
    'any',
    ['!', ['has', 'claimed_by']],
    ['==', ['get', 'claimed_by'], ''],
    ['==', ['get', 'claimed_by'], 'CN'],
];

/** 两岸国界线（admin_level=2） */
export const notCrossStraitBorder: unknown[] = [
    '!',
    ['any',
        ['all', ['==', ['get', 'adm0_l'], 'China'], ['==', ['get', 'adm0_r'], 'Taiwan']],
        ['all', ['==', ['get', 'adm0_l'], 'Taiwan'], ['==', ['get', 'adm0_r'], 'China']],
        ['==', ['get', 'adm0_l'], 'Taiwan'],
        ['==', ['get', 'adm0_r'], 'Taiwan'],
    ],
];

/** adm0 任一侧为台港澳则不绘国界 */
export const notSensitiveAdm0Border: unknown[] = [
    '!',
    ['any',
        ['in', ['get', 'adm0_l'], ['literal', [...ADM0_SENSITIVE_NAMES]]],
        ['in', ['get', 'adm0_r'], ['literal', [...ADM0_SENSITIVE_NAMES]]],
    ],
];

/**
 * 国界/省界等 boundary 图层统一 filter（boundary_2、boundary_3 共用）。
 * 不包含海上边界（maritime 在图层里另筛）。
 */
export const cnBoundaryLineOk: unknown[] = [
    'all',
    notDisputedFlag,
    notNamedDisputeBoundary,
    notBlocklistedDisputeName,
    onlyCnOrNeutralClaim,
    notCrossStraitBorder,
    notSensitiveAdm0Border,
];

/* ---------- 地名注记 ---------- */

/** 台港澳不出现 country 级地名（iso） */
export const notRegionAsCountry: unknown[] = [
    '!',
    ['in', ['get', 'iso_a2'], ['literal', [...CN_REGION_ISO]]],
];

/** country 级英文地名兜底 */
export const notEnglishExcludedCountry: unknown[] = [
    '!',
    ['in', ['get', 'name:en'], ['literal', [...COUNTRY_NAME_EN_HIDE]]],
];

/** 台港澳不用 OSM place.state 注记（改用手工点） */
export const notCnRegionStateLabel: unknown[] = [
    '!',
    ['in', ['get', 'iso_a2'], ['literal', [...CN_REGION_ISO]]],
];

/** 台港澳城市不标为国家首都（capital=2） */
export const notCnNationalCapital: unknown[] = [
    'any',
    ['!=', ['get', 'capital'], 2],
    ['!', ['in', ['get', 'iso_a2'], ['literal', [...CN_REGION_ISO]]]],
];

/** country 图层完整 filter */
export const cnCountryLabelOk: unknown[] = [
    'all',
    ['==', ['get', 'class'], 'country'],
    notRegionAsCountry,
    notEnglishExcludedCountry,
];

/* ---------- 手工注记 ---------- */

/** 省级 / 特别行政区注记（GeoJSON） */
export const cnRegionLabelFeatures = [
    { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [121.0, 23.7] }, properties: { name: '台湾' } },
    { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [114.17, 22.32] }, properties: { name: '香港' } },
    { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [113.54, 22.19] }, properties: { name: '澳门' } },
];
