import type { FeatureCollection, Point } from 'geojson';
import { S } from '../app/state';
import { GLAny } from './mapEnv';
import { t } from '../i18n/i18n';

interface TradeRouteDef {
    nameKey: string;
    descKey: string;
    color: string;
    casing: string;
    coords: [number, number][];
}

const TRADE_ROUTES: TradeRouteDef[] = [
    {
        nameKey: 'analysis.routeSilk', descKey: 'analysis.routeSilkDesc',
        color: '#D4945A', casing: '#1A1A1A',
        coords: [
            [109.0715, 34.3012], // 灞桥 (西安)
            [107.38,   34.53],   // 凤翔渭水浮桥
            [105.725,  34.581],  // 天水伏羲桥
            [105.1234, 34.5678], // 灞陵桥 (渭源)
            [103.8167, 36.0667], // 中山桥 (兰州)
            [94.662,   40.142],  // 敦煌鸣沙桥遗址
            [89.17,    42.96],   // 坎儿井桥 (吐鲁番)
            [84.89,    44.32],   // 独山子木桥
            [81.318,   43.823],  // 伊犁惠远桥
        ],
    },
    {
        nameKey: 'analysis.routeTeaN', descKey: 'analysis.routeTeaNDesc',
        color: '#8BC49C', casing: '#1A1A1A',
        coords: [
            [104.0667, 30.65],   // 万里桥 (成都)
            [103.0,    29.98],   // 雅安铁索桥
            [102.2345, 29.9123], // 泸定桥
            [101.89,   30.88],   // 丹巴藏寨桥
            [91.132,   29.652],  // 拉萨宇拓桥
        ],
    },
    {
        nameKey: 'analysis.routeTeaS', descKey: 'analysis.routeTeaSDesc',
        color: '#A3C282', casing: '#1A1A1A',
        coords: [
            [102.68,  25.05],   // 翠湖九曲桥 (昆明)
            [100.175, 25.606],  // 大理洱海桥
            [100.233, 26.892],  // 丽江黑龙潭桥
            [100.035, 27.188],  // 神川铁桥
            [91.132,  29.652],  // 拉萨宇拓桥
        ],
    },
];

let tradeRoutesInited = false;

function tradeCasingId(idx: number): string { return `trade-casing-${idx}`; }
function tradeLayerId(idx: number): string { return `trade-route-${idx}`; }
function tradeSrcId(idx: number): string { return `trade-src-${idx}`; }

function ensureTradeRouteLayers(map: any): void {
    if (tradeRoutesInited) return;
    TRADE_ROUTES.forEach((r, i) => {
        const lineGeo: FeatureCollection = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: { name: t(r.nameKey), desc: t(r.descKey) },
                geometry: { type: 'LineString', coordinates: r.coords },
            }],
        };
        map.addSource(tradeSrcId(i), { type: 'geojson', data: lineGeo });
        map.addLayer({
            id: tradeCasingId(i),
            type: 'line',
            source: tradeSrcId(i),
            layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                'line-color': r.casing,
                'line-width': 5,
                'line-opacity': 0.35,
            },
        });
        map.addLayer({
            id: tradeLayerId(i),
            type: 'line',
            source: tradeSrcId(i),
            layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                'line-color': r.color,
                'line-width': 3,
                'line-opacity': 1,
                'line-dasharray': [6, 3],
            },
        });
        wireLineHover(map, tradeLayerId(i));
    });
    tradeRoutesInited = true;
}

export function toggleTradeRoutes(e: Event): void {
    const map = S.map;
    if (!map) return;
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    ensureTradeRouteLayers(map);
    const vis = target.checked ? 'visible' : 'none';
    TRADE_ROUTES.forEach((_, i) => {
        for (const lid of [tradeCasingId(i), tradeLayerId(i)]) {
            if (map.getLayer(lid)) map.setLayoutProperty(lid, 'visibility', vis);
        }
    });
}

interface WaterwayDef {
    id: string;
    nameKey: string;
    descKey: string;
    startYear: number;
    endYear: number;
    color: string;
    casing: string;
    width: number;
    canal?: boolean;
    coords: [number, number][];
}

const WATERWAYS: WaterwayDef[] = [
    {
        id: 'yangtze',
        nameKey: 'analysis.riverYangtze',
        descKey: 'analysis.riverYangtzeDesc',
        startYear: -9999, endYear: 9999,
        color: '#5B8DB8', casing: '#1B3A5C', width: 4.5,
        coords: [
            [97.0, 33.5], [99.0, 32.0], [100.5, 31.0], [102.0, 30.5],
            [103.5, 29.5], [104.6, 29.3], [106.5, 29.6], [107.4, 30.8],
            [108.4, 30.7], [110.4, 30.4], [111.3, 30.3], [112.2, 30.3],
            [113.5, 30.5], [114.3, 30.6], [115.0, 30.0], [115.9, 29.7],
            [116.7, 29.9], [117.2, 30.2], [117.8, 30.5], [118.4, 31.0],
            [118.8, 31.4], [118.7, 32.1], [119.5, 32.2], [120.3, 31.8],
            [121.0, 31.5], [121.8, 31.3],
        ],
    },
    {
        id: 'huanghe',
        nameKey: 'analysis.riverHuanghe',
        descKey: 'analysis.riverHuangheDesc',
        startYear: -9999, endYear: 9999,
        color: '#C6A55A', casing: '#6B4E1F', width: 4.5,
        coords: [
            [96.5, 34.8], [98.0, 35.0], [100.0, 35.5], [101.5, 36.0],
            [103.0, 36.0], [104.0, 35.7], [105.5, 36.5], [106.6, 37.5],
            [106.8, 38.5], [107.0, 39.0], [107.5, 40.0], [108.8, 40.8],
            [110.0, 40.5], [111.0, 40.0], [112.0, 39.5], [112.5, 38.0],
            [111.5, 37.0], [110.5, 35.5], [111.0, 34.8], [112.5, 34.7],
            [113.7, 34.8], [114.5, 35.0], [115.5, 35.5], [116.2, 36.5],
            [117.0, 37.0], [118.0, 37.4], [118.8, 37.8], [119.2, 37.5],
        ],
    },
    {
        id: 'grand-canal',
        nameKey: 'analysis.routeCanal',
        descKey: 'analysis.routeCanalDesc',
        startYear: 1293, endYear: 9999,
        color: '#3DB5A6', casing: '#145048', width: 5, canal: true,
        coords: [
            [116.46, 39.92],  // 北京 (通惠河起点)
            [116.65, 39.90],  // 通州
            [116.70, 39.60],  // 香河
            [116.85, 39.15],  // 武清
            [117.20, 39.10],  // 天津
            [117.05, 38.55],  // 静海/青县
            [116.85, 38.30],  // 沧州
            [116.60, 37.80],  // 东光/吴桥
            [116.35, 37.45],  // 德州
            [116.10, 36.85],  // 临清
            [116.00, 36.65],  // 聊城
            [116.30, 36.20],  // 梁山/东平
            [116.60, 35.40],  // 济宁
            [116.70, 35.00],  // 鱼台
            [116.90, 34.60],  // 沛县
            [117.20, 34.20],  // 徐州
            [117.60, 33.80],  // 宿迁/泗阳
            [118.60, 33.60],  // 淮安
            [118.80, 33.10],  // 宝应
            [119.10, 32.75],  // 高邮
            [119.25, 32.55],  // 邵伯
            [119.43, 32.39],  // 扬州
            [119.45, 32.20],  // 镇江
            [119.60, 32.00],  // 丹阳
            [119.95, 31.78],  // 常州
            [120.30, 31.56],  // 无锡
            [120.62, 31.30],  // 苏州
            [120.75, 30.90],  // 嘉兴
            [120.40, 30.55],  // 桐乡/崇福
            [120.15, 30.28],  // 杭州
        ],
    },
    {
        id: 'lingqu',
        nameKey: 'analysis.waterwayLingqu',
        descKey: 'analysis.waterwayLingquDesc',
        startYear: -214, endYear: 9999,
        color: '#6BA3C7', casing: '#2A5470', width: 3, canal: true,
        coords: [
            [110.62, 25.58], [110.55, 25.47], [110.48, 25.35],
            [110.40, 25.24], [110.35, 25.10],
        ],
    },
    {
        id: 'tongji',
        nameKey: 'analysis.waterwayTongji',
        descKey: 'analysis.waterwayTongjiDesc',
        startYear: 605, endYear: 1194,
        color: '#C9965A', casing: '#6B4A1F', width: 3, canal: true,
        coords: [
            [112.45, 34.75], [113.10, 34.70], [113.65, 34.65],
            [114.35, 34.80], [114.98, 34.45], [115.40, 34.10],
            [115.80, 33.80], [116.20, 33.55], [116.65, 33.30],
            [117.00, 33.20], [117.35, 33.00], [117.60, 32.80],
            [118.60, 33.60],
        ],
    },
    {
        id: 'yongji',
        nameKey: 'analysis.waterwayYongji',
        descKey: 'analysis.waterwayYongjiDesc',
        startYear: 608, endYear: 1279,
        color: '#8B7BB5', casing: '#3D2E5C', width: 3, canal: true,
        coords: [
            [112.45, 34.75], [112.90, 35.30], [113.30, 35.75],
            [113.70, 36.20], [114.00, 36.60], [114.30, 37.05],
            [114.60, 37.55], [115.00, 38.00], [115.50, 38.50],
            [115.95, 38.90], [116.20, 39.50], [116.40, 39.90],
        ],
    },
    {
        id: 'zhedong',
        nameKey: 'analysis.waterwayZhedong',
        descKey: 'analysis.waterwayZhedongDesc',
        startYear: -490, endYear: 9999,
        color: '#9B8872', casing: '#4A3B28', width: 3, canal: true,
        coords: [
            [120.15, 30.28], [120.50, 30.10], [120.75, 30.00],
            [120.95, 29.90], [121.15, 29.88], [121.55, 29.87],
        ],
    },
    {
        id: 'zhujiang',
        nameKey: 'analysis.riverZhujiang',
        descKey: 'analysis.riverZhujiangDesc',
        startYear: -9999, endYear: 9999,
        color: '#5B9EA6', casing: '#1E4A50', width: 4,
        coords: [
            [104.3, 23.9], [105.6, 23.6], [106.6, 23.5], [107.4, 23.3],
            [108.3, 23.1], [109.4, 23.0], [110.4, 23.1], [111.3, 23.4],
            [112.3, 23.1], [113.0, 23.0], [113.3, 23.1], [113.6, 23.1],
        ],
    },
    {
        id: 'huaihe',
        nameKey: 'analysis.riverHuaihe',
        descKey: 'analysis.riverHuaiheDesc',
        startYear: -9999, endYear: 9999,
        color: '#6A9BBF', casing: '#254565', width: 3.5,
        coords: [
            [113.5, 32.75], [114.0, 32.5], [114.8, 32.6], [115.5, 32.9],
            [116.0, 33.0], [116.6, 33.2], [117.2, 33.3], [117.8, 33.0],
            [118.5, 33.5], [119.0, 33.6],
        ],
    },
    {
        id: 'haihe',
        nameKey: 'analysis.riverHaihe',
        descKey: 'analysis.riverHaiheDesc',
        startYear: -9999, endYear: 9999,
        color: '#5A88A8', casing: '#1D3850', width: 3.5,
        coords: [
            [114.5, 38.0], [115.0, 38.3], [115.6, 38.7], [116.2, 39.0],
            [116.6, 39.1], [117.0, 39.1], [117.2, 39.1], [117.7, 39.0],
        ],
    },
    {
        id: 'songhua',
        nameKey: 'analysis.riverSonghua',
        descKey: 'analysis.riverSonghuaDesc',
        startYear: -9999, endYear: 9999,
        color: '#7AA3C0', casing: '#2A4A65', width: 3.5,
        coords: [
            [126.6, 42.0], [127.0, 42.5], [127.0, 43.5], [126.6, 44.0],
            [126.5, 44.8], [126.6, 45.8], [126.5, 46.6], [127.5, 47.3],
            [130.0, 47.5], [132.5, 47.7],
        ],
    },
    {
        id: 'liaohe',
        nameKey: 'analysis.riverLiaohe',
        descKey: 'analysis.riverLiaoheDesc',
        startYear: -9999, endYear: 9999,
        color: '#8BA5B5', casing: '#304855', width: 3,
        coords: [
            [123.5, 42.0], [123.8, 42.3], [123.5, 42.8], [123.0, 43.0],
            [122.5, 43.5], [122.0, 43.8], [121.5, 44.0], [121.0, 44.5],
        ],
    },
    {
        id: 'hanjiang',
        nameKey: 'analysis.riverHanjiang',
        descKey: 'analysis.riverHanjiangDesc',
        startYear: -9999, endYear: 9999,
        color: '#6495A8', casing: '#20465A', width: 3,
        coords: [
            [106.9, 33.1], [107.5, 33.0], [108.5, 32.7], [109.5, 32.6],
            [110.5, 32.0], [111.3, 31.8], [112.0, 31.2], [112.6, 30.8],
            [113.3, 30.6], [114.3, 30.6],
        ],
    },
    {
        id: 'ganjiang',
        nameKey: 'analysis.riverGanjiang',
        descKey: 'analysis.riverGanjiangDesc',
        startYear: -9999, endYear: 9999,
        color: '#5DA09A', casing: '#1D4845', width: 3,
        coords: [
            [114.4, 25.8], [114.9, 26.3], [115.1, 27.0], [115.3, 27.6],
            [115.6, 28.2], [115.8, 28.7], [116.0, 29.2], [116.1, 29.7],
        ],
    },
    {
        id: 'xiangjiang',
        nameKey: 'analysis.riverXiangjiang',
        descKey: 'analysis.riverXiangjiangDesc',
        startYear: -9999, endYear: 9999,
        color: '#5C9E8A', casing: '#1D4838', width: 3,
        coords: [
            [110.6, 25.3], [111.0, 26.2], [111.6, 26.9], [112.0, 27.5],
            [112.4, 27.8], [112.6, 28.2], [112.9, 28.7], [112.9, 29.0],
        ],
    },
    {
        id: 'minjiang-fj',
        nameKey: 'analysis.riverMinjiang',
        descKey: 'analysis.riverMinjiangDesc',
        startYear: -9999, endYear: 9999,
        color: '#4E9BB0', casing: '#1A4555', width: 3,
        coords: [
            [117.1, 27.8], [117.6, 27.3], [118.0, 26.8], [118.3, 26.4],
            [118.7, 26.2], [119.0, 26.1], [119.3, 26.0],
        ],
    },
    {
        id: 'qiantang',
        nameKey: 'analysis.riverQiantang',
        descKey: 'analysis.riverQiantangDesc',
        startYear: -9999, endYear: 9999,
        color: '#5A92A5', casing: '#1D4250', width: 3,
        coords: [
            [118.3, 29.1], [118.7, 29.3], [119.1, 29.5], [119.5, 29.8],
            [119.8, 30.0], [120.1, 30.2], [120.2, 30.3],
        ],
    },
    {
        id: 'weihe',
        nameKey: 'analysis.riverWeihe',
        descKey: 'analysis.riverWeiheDesc',
        startYear: -9999, endYear: 9999,
        color: '#B8A070', casing: '#5A4828', width: 3,
        coords: [
            [104.4, 34.1], [105.2, 34.4], [106.3, 34.3], [107.0, 34.3],
            [107.8, 34.3], [108.5, 34.4], [109.0, 34.5], [109.5, 34.6],
            [110.0, 34.6], [110.2, 34.8],
        ],
    },
    {
        id: 'luohe',
        nameKey: 'analysis.riverLuohe',
        descKey: 'analysis.riverLuoheDesc',
        startYear: -9999, endYear: 9999,
        color: '#A89878', casing: '#504430', width: 2.5,
        coords: [
            [109.8, 34.0], [110.3, 34.2], [110.8, 34.3], [111.3, 34.5],
            [111.8, 34.6], [112.3, 34.7], [112.5, 34.7],
        ],
    },
    {
        id: 'daduhe',
        nameKey: 'analysis.riverDaduhe',
        descKey: 'analysis.riverDaduheDesc',
        startYear: -9999, endYear: 9999,
        color: '#6AADBA', casing: '#255058', width: 3,
        coords: [
            [100.8, 32.5], [101.2, 31.8], [101.8, 31.0], [102.2, 30.5],
            [102.5, 30.0], [102.8, 29.7], [103.2, 29.5], [103.5, 29.5],
        ],
    },
];

let waterwaysEnabled = false;
let waterwaysInited = false;
let hoverPopup: any = null;

function wwCasingId(id: string): string { return `ww-casing-${id}`; }

function ensureWaterwayLayers(map: any): void {
    if (waterwaysInited) return;
    for (const w of WATERWAYS) {
        const srcId = `ww-${w.id}`;
        const layerId = `ww-line-${w.id}`;
        const geojson: FeatureCollection = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: { name: t(w.nameKey), desc: t(w.descKey) },
                geometry: { type: 'LineString', coordinates: w.coords },
            }],
        };
        map.addSource(srcId, { type: 'geojson', data: geojson });
        const casingPaint: Record<string, unknown> = {
            'line-color': w.casing,
            'line-width': w.width + 3,
            'line-opacity': w.canal ? 0.4 : 0.5,
        };
        const corePaint: Record<string, unknown> = {
            'line-color': w.color,
            'line-width': w.width,
            'line-opacity': w.canal ? 0.9 : 0.82,
        };
        if (w.canal) {
            corePaint['line-dasharray'] = [8, 4];
        }
        map.addLayer({
            id: wwCasingId(w.id),
            type: 'line',
            source: srcId,
            layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
            paint: casingPaint,
        });
        map.addLayer({
            id: layerId,
            type: 'line',
            source: srcId,
            layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
            paint: corePaint,
        });
        wireLineHover(map, layerId);
    }
    waterwaysInited = true;
}

function applyWaterwayVisibility(map: any, year: number): void {
    for (const w of WATERWAYS) {
        const vis = waterwaysEnabled && year >= w.startYear && year <= w.endYear ? 'visible' : 'none';
        for (const lid of [wwCasingId(w.id), `ww-line-${w.id}`]) {
            if (map.getLayer(lid)) map.setLayoutProperty(lid, 'visibility', vis);
        }
    }
}

export function toggleWaterways(e: Event): void {
    const map = S.map;
    if (!map) return;
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    waterwaysEnabled = target.checked;
    ensureWaterwayLayers(map);
    applyWaterwayVisibility(map, S.currentYear);
}

export function updateWaterwaysForYear(year: number): void {
    if (!waterwaysEnabled || !waterwaysInited) return;
    const map = S.map;
    if (!map) return;
    applyWaterwayVisibility(map, year);
}

function wireLineHover(map: any, layerId: string): void {
    map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
        if (hoverPopup) { hoverPopup.remove(); hoverPopup = null; }
    });
    map.on('mousemove', layerId, (e: any) => {
        const f = e.features?.[0];
        if (!f) return;
        const name = f.properties?.name ?? '';
        const desc = f.properties?.desc ?? '';
        const html = `<div style="font-family:'Noto Serif SC',serif;max-width:220px"><strong style="color:var(--gold,#b8860b);font-size:0.95rem">${name}</strong>${desc ? `<p style="margin:5px 0 0;font-size:0.8rem;color:#6b5744;line-height:1.4">${desc}</p>` : ''}</div>`;
        if (hoverPopup) hoverPopup.remove();
        hoverPopup = new GLAny.Popup({ closeButton: false, closeOnClick: false, offset: 12 })
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map);
    });
}

export function refreshOverlayLocale(): void {
    const map = S.map;
    if (!map) return;
    if (waterwaysInited) {
        for (const w of WATERWAYS) {
            const src = map.getSource(`ww-${w.id}`);
            if (src && 'setData' in src) {
                (src as { setData: (d: FeatureCollection) => void }).setData({
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        properties: { name: t(w.nameKey), desc: t(w.descKey) },
                        geometry: { type: 'LineString', coordinates: w.coords },
                    }],
                });
            }
        }
    }
    if (tradeRoutesInited) {
        TRADE_ROUTES.forEach((r, i) => {
            const src = map.getSource(tradeSrcId(i));
            if (src && 'setData' in src) {
                (src as { setData: (d: FeatureCollection) => void }).setData({
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        properties: { name: t(r.nameKey), desc: t(r.descKey) },
                        geometry: { type: 'LineString', coordinates: r.coords },
                    }],
                });
            }
        });
    }
    if (hoverPopup) { hoverPopup.remove(); hoverPopup = null; }
}

export function toggleClusters(e: Event): void {
    const map = S.map;
    if (!map) return;
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.checked) {
        const visibleBridges = S.bridges.filter((b) => b.year <= S.currentYear);
        const heatData: FeatureCollection<Point> = {
            type: 'FeatureCollection',
            features: visibleBridges.map((b) => ({
                type: 'Feature',
                properties: { weight: 1 },
                geometry: { type: 'Point', coordinates: [b.lng, b.lat] },
            })),
        };

        if (!map.getSource('bridge-heat')) {
            map.addSource('bridge-heat', { type: 'geojson', data: heatData });
            const heatLayer = {
                id: 'bridge-heat-layer',
                type: 'heatmap' as const,
                source: 'bridge-heat',
                paint: {
                    'heatmap-weight': 1,
                    'heatmap-intensity': 1,
                    'heatmap-radius': 50,
                    'heatmap-opacity': 0.6,
                    'heatmap-color': [
                        'interpolate',
                        ['linear'],
                        ['heatmap-density'],
                        0,
                        'rgba(0,0,0,0)',
                        0.2,
                        'rgba(139,69,19,0.3)',
                        0.4,
                        'rgba(212,175,55,0.5)',
                        0.6,
                        'rgba(255,165,0,0.7)',
                        0.8,
                        'rgba(255,69,0,0.8)',
                        1,
                        'rgba(255,0,0,0.9)',
                    ],
                },
            };
            if (map.getLayer('waterway-label')) {
                map.addLayer(heatLayer, 'waterway-label');
            } else {
                map.addLayer(heatLayer);
            }
        } else {
            const source = map.getSource('bridge-heat');
            if (source && 'setData' in source) {
                (source as { setData: (d: FeatureCollection<Point>) => void }).setData(heatData);
            }
            map.setLayoutProperty('bridge-heat-layer', 'visibility', 'visible');
        }
    } else if (map.getLayer('bridge-heat-layer')) {
        map.setLayoutProperty('bridge-heat-layer', 'visibility', 'none');
    }
}
