import maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildTiandituRasterStyle } from './tiandituStyle';

export type AnyMap = any;

const MAPBOX_TOKEN = String(import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim();
export const useMapbox = /^pk\./.test(MAPBOX_TOKEN) && MAPBOX_TOKEN.length >= 80;

/** 天地图浏览器端 tk（默认值为「中国古桥」应用 key，白名单 usst.lyricin.com） */
const TIANDITU_TK_DEFAULT = 'cb035a1bbd0a0824846a41fae3dd457d';
export const TIANDITU_TK = String(
    import.meta.env.VITE_TIANDITU_TK ?? TIANDITU_TK_DEFAULT,
).trim();

/**
 * 地图审图号与来源——竞赛规定：含国界/边界/行政区域界线的地图须标注审图号和来源。
 * 取 2024 版国家地理信息公共服务平台（天地图）公布的审图号；如官方页脚更新请同步修改。
 */
export const MAP_APPROVAL_NO = 'GS(2024)0650号';
export const MAP_SOURCE_TEXT = '底图来源：国家地理信息公共服务平台（天地图）';

/** Mapbox 中国视角：争议边界/行政区划按 CN 瓦片版本渲染 */
export const MAPBOX_WORLDVIEW = String(import.meta.env.VITE_MAPBOX_WORLDVIEW ?? 'CN').trim() || 'CN';
/** Mapbox 标注语言（国内地名显示中文） */
export const MAPBOX_LANGUAGE = String(import.meta.env.VITE_MAPBOX_LANGUAGE ?? 'zh-Hans').trim() || 'zh-Hans';
export const MAPBOX_STYLE = String(
    import.meta.env.VITE_MAPBOX_STYLE ?? 'mapbox://styles/mapbox/light-v11',
).trim();

export let GL: any = maplibregl;
export let GLAny: any = maplibregl;

export async function initMapLib(): Promise<void> {
    if (useMapbox) {
        const { default: mapboxgl } = await import('mapbox-gl');
        await import('mapbox-gl/dist/mapbox-gl.css');
        mapboxgl.accessToken = MAPBOX_TOKEN;
        GL = mapboxgl;
        GLAny = mapboxgl;
    }
}

export const MAPLIBRE_FILE_PROTOCOL_STYLE: StyleSpecification = {
    version: 8,
    name: 'offline-solid',
    sources: {},
    layers: [
        {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#e2d0b0' },
        },
    ],
};

export function pickMaplibreBaseStyle(): StyleSpecification {
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
        console.info(
            '[Bridge] file:// 本地打开：无法加载在线瓦片，已用纯色底图。正式访问请用 HTTP：npm run dev、npm run preview，或 scripts/open-dist.bat。',
        );
        return MAPLIBRE_FILE_PROTOCOL_STYLE;
    }
    return buildTiandituRasterStyle(TIANDITU_TK);
}

export type MapInitOptions = {
    container: string | HTMLElement;
    style: string | StyleSpecification;
    center: [number, number];
    zoom: number;
    minZoom: number;
    maxZoom: number;
    pitch: number;
    attributionControl: boolean;
    worldview?: string;
    language?: string;
};

export function buildMapInitOptions(): MapInitOptions {
    const base: MapInitOptions = {
        container: 'map',
        style: useMapbox ? MAPBOX_STYLE : pickMaplibreBaseStyle(),
        center: [110, 32],
        zoom: 4.5,
        minZoom: 3,
        maxZoom: 18,
        pitch: 30,
        attributionControl: false,
    };
    if (useMapbox) {
        base.worldview = MAPBOX_WORLDVIEW;
        base.language = MAPBOX_LANGUAGE;
    }
    return base;
}

export function applyMapboxLocalePolicy(map: AnyMap): void {
    if (!useMapbox || !map) return;
    try {
        if (typeof map.setWorldview === 'function') map.setWorldview(MAPBOX_WORLDVIEW);
        if (typeof map.setLanguage === 'function') map.setLanguage(MAPBOX_LANGUAGE);
    } catch (e) {
        console.warn('[Bridge] Mapbox worldview/language:', e);
    }
}

export function logMaplibreHttpHints(): void {
    if (useMapbox) {
        console.info(
            `[Bridge] Mapbox 底图（worldview=${MAPBOX_WORLDVIEW}, language=${MAPBOX_LANGUAGE}）。`,
        );
        return;
    }
    if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
        console.info(
            `[Bridge] 天地图栅格底图（克制做旧）。${MAP_SOURCE_TEXT}　审图号：${MAP_APPROVAL_NO}`,
        );
    }
}
