import type { StyleSpecification } from 'maplibre-gl';

/**
 * 天地图栅格底图（Plan A）。
 *
 * 合规依据：竞赛规定要求底图来自官方审核来源并标注审图号；天地图（国家地理信息
 * 公共服务平台）为官方来源，国界/南海断续线/南海诸岛/台湾/钓鱼岛/藏南等表示
 * 均已按官方标准绘制，省去手工边界规则（可删除 mapCnBoundaryPolicy）。
 *
 * 天地图仅提供 WMTS 栅格瓦片（无 MVT 矢量瓦片），图片无法重绘成羊皮纸矢量风，
 * 故仅对栅格施加“克制做旧”：降饱和 + 一层低透明度羊皮纸罩，注记层置于罩上方
 * 保持清晰（附件3 要求界线、地名清晰正确，不得盖糊）。
 *
 * 必须使用 _w（Web 墨卡托 EPSG:900913）系列；maplibre 不支持 _c（经纬度）。
 */

/** 羊皮纸主色，与原仿古样式一致 */
const PARCHMENT = '#E8D5B5';

/** 天地图子域 t0-t7，maplibre 会在多个 tiles 模板间分流 */
const SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];

function wmtsTiles(layer: 'vec' | 'cva', tk: string): string[] {
    const query =
        `?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0` +
        `&LAYER=${layer}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles` +
        `&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tk}`;
    // 开发期走 vite 的 /tdt 代理（伪装白名单 Referer）以绕过 localhost 域名拦截；
    // 生产期直连 t0-t7 多子域分流。见 config/vite.config.ts 的 server.proxy。
    if (import.meta.env.DEV) {
        return [`/tdt/${layer}_w/wmts${query}`];
    }
    return SUBDOMAINS.map((s) => `https://t${s}.tianditu.gov.cn/${layer}_w/wmts${query}`);
}

/** 覆盖全图的羊皮纸罩，叠在底图与注记之间做暖旧色调 */
const WORLD_POLYGON: GeoJSON.Feature = {
    type: 'Feature',
    properties: {},
    geometry: {
        type: 'Polygon',
        coordinates: [
            [
                [-180, -85.05],
                [180, -85.05],
                [180, 85.05],
                [-180, 85.05],
                [-180, -85.05],
            ],
        ],
    },
};

export function buildTiandituRasterStyle(tk: string): StyleSpecification {
    return {
        version: 8,
        name: 'tianditu-antique-raster',
        sources: {
            'tdt-vec': {
                type: 'raster',
                tiles: wmtsTiles('vec', tk),
                tileSize: 256,
                minzoom: 1,
                maxzoom: 18,
                attribution: '© 天地图 · 国家地理信息公共服务平台',
            },
            'tdt-cva': {
                type: 'raster',
                tiles: wmtsTiles('cva', tk),
                tileSize: 256,
                minzoom: 1,
                maxzoom: 18,
            },
            'parchment-wash': {
                type: 'geojson',
                data: WORLD_POLYGON,
            },
        },
        layers: [
            {
                id: 'background',
                type: 'background',
                paint: { 'background-color': PARCHMENT },
            },
            {
                id: 'tdt-vec',
                type: 'raster',
                source: 'tdt-vec',
                paint: {
                    // 克制做旧：降饱和 + 轻微降对比，避免现代蓝白配色过于跳脱
                    'raster-saturation': -0.55,
                    'raster-contrast': -0.08,
                    'raster-brightness-min': 0.05,
                    'raster-brightness-max': 0.9,
                },
            },
            {
                id: 'parchment-wash',
                type: 'fill',
                source: 'parchment-wash',
                paint: {
                    'fill-color': PARCHMENT,
                    'fill-opacity': 0.3,
                    'fill-antialias': false,
                },
            },
            {
                // 注记置于羊皮纸罩之上，保持界线/地名清晰可读（合规要求）
                id: 'tdt-cva',
                type: 'raster',
                source: 'tdt-cva',
                paint: {
                    'raster-saturation': -0.2,
                    'raster-opacity': 0.95,
                },
            },
        ],
    };
}
