import type { Bridge } from '../types';
import { S } from '../app/state';
import { GLAny } from './mapEnv';
import {
    getMappableBridgesForYear,
    getMappableBridgesSorted,
    getPlayableBridgesChronological,
} from './mappableBridges';
import { showBridgeDetail } from '../ui/bridgeModal';
import { renderBridgeImageDock } from '../ui/bridgeImageDock';
import { bridgeName, bridgeProvince, bridgeType } from '../i18n/bridgeLocale';
import { formatTimelineYearLabel, t } from '../i18n/i18n';
import { pausePlayback } from '../timeline/playhead';
import h from 'hyperscript';

const MAP_FOCUS_ZOOM_FROM_DOCK_MIN = 5;
const MAP_FOCUS_ZOOM_MARKER_CLICK = 7;

const SOURCE_ID = 'bridges-source';
const LAYER_ID = 'bridges-circle';
const POEM_GLOW_LAYER = 'bridges-poem-glow';

let activePopup: InstanceType<typeof GLAny.Popup> | null = null;
let activePopupBridge: Bridge | null = null;

export { getMappableBridgesForYear } from './mappableBridges';

export function getBridgeKey(bridge: Bridge): string {
    return bridge.id || `${bridge.name}_${bridge.lng}_${bridge.lat}`;
}

export function getBridgeColor(material?: string): string {
    const colorMap: { [key: string]: string } = {
        石: '#708090',
        木: '#8B4513',
        铁: '#4A4A4A',
    };
    return colorMap[material ?? ''] ?? (material?.includes('/') ? '#9370DB' : '#D4AF37');
}

export function getBridgeSize(size?: string): number {
    const sizeMap: { [key: string]: number } = { 小型: 12, 中型: 18, 大型: 26 };
    return sizeMap[size ?? ''] ?? 14;
}

export function getVisibleBridgesForMap(): Bridge[] {
    if (S.isPlaying) {
        const seq = getPlayableBridgesChronological();
        const n = S.playMarkersRevealCount;
        if (seq.length === 0 || n <= 0) {
            return getMappableBridgesForYear(S.currentYear);
        }
        return seq.slice(0, Math.min(n, seq.length));
    }
    return getMappableBridgesForYear(S.currentYear);
}

export function bridgeHasPoem(b: Bridge): boolean {
    return b.poem.isPlaceholder !== true && !!b.poem.text.trim();
}

function buildGeoJSON(bridges: Bridge[]): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: bridges
            .filter((b) => {
                const lng = Number(b.lng);
                const lat = Number(b.lat);
                return Number.isFinite(lng) && Number.isFinite(lat);
            })
            .map((b) => ({
                type: 'Feature' as const,
                geometry: {
                    type: 'Point' as const,
                    coordinates: [Number(b.lng), Number(b.lat)],
                },
                properties: {
                    bridgeId: b.id,
                    color: getBridgeColor(b.material),
                    radius: getBridgeSize(b.size) / 2,
                    hasPoem: bridgeHasPoem(b) ? 1 : 0,
                },
            })),
    };
}

export function setupBridgeLayer(): void {
    const map = S.map;
    if (!map) return;

    map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection,
    });

    map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
            'circle-radius': ['get', 'radius'],
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 2,
            'circle-stroke-color': 'rgba(255, 255, 255, 0.9)',
            'circle-pitch-alignment': 'map',
        },
    });

    map.addLayer({
        id: POEM_GLOW_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 'hasPoem'], 1],
        paint: {
            'circle-radius': ['+', ['get', 'radius'], 5],
            'circle-color': 'rgba(212, 175, 55, 0.35)',
            'circle-stroke-width': 2,
            'circle-stroke-color': 'rgba(212, 175, 55, 0.8)',
            'circle-pitch-alignment': 'map',
        },
        layout: { visibility: 'none' },
    });

    map.on('click', LAYER_ID, (e: any) => {
        const features = e.features;
        if (!features?.length) return;
        const bridgeId = features[0].properties.bridgeId;
        const bridge = S.bridges.find((b) => b.id === bridgeId);
        if (!bridge) return;

        pausePlayback();

        const lng = Number(bridge.lng);
        const lat = Number(bridge.lat);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

        map.flyTo({
            center: [lng, lat],
            zoom: MAP_FOCUS_ZOOM_MARKER_CLICK,
            duration: 1500,
        });

        showPopupForBridge(bridge, false);
    });

    map.on('mouseenter', LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
    });
}

function buildPopupDom(bridge: Bridge): HTMLElement {
    const btn = h<HTMLButtonElement>('button.popup-btn', t('popup.viewDetail'));
    btn.addEventListener('click', () => showBridgeDetail(bridge));

    const locLine = bridgeProvince(bridge) || t('popup.provinceUnknown');
    return h<HTMLDivElement>(
        'div',
        h('div.popup-title', bridgeName(bridge)),
        h(
            'div.popup-info',
            h('p', `📅 ${formatTimelineYearLabel(bridge.year)}`),
            h('p', `📍 ${locLine}`),
            h('p', `🏗️ ${bridgeType(bridge)}`),
        ),
        btn,
    );
}

function closeActivePopup(): void {
    if (activePopup) {
        const popup = activePopup;
        const bridge = activePopupBridge;
        activePopup = null;
        activePopupBridge = null;
        popup.remove();
        if (bridge && S.dockUserLockedBridge === bridge) {
            S.dockUserLockedBridge = null;
        }
    }
}

function showPopupForBridge(bridge: Bridge, suppressDockLock: boolean): void {
    const map = S.map;
    if (!map) return;

    const lng = Number(bridge.lng);
    const lat = Number(bridge.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

    if (activePopupBridge?.id === bridge.id && activePopup) {
        activePopup.setDOMContent(buildPopupDom(bridge));
        return;
    }

    closeActivePopup();

    const popup = new GLAny.Popup({ offset: 25, closeButton: false });
    popup.setDOMContent(buildPopupDom(bridge));
    popup.setLngLat([lng, lat]);
    popup.addTo(map);

    popup.on('close', () => {
        if (activePopup !== popup) return;
        if (activePopupBridge && S.dockUserLockedBridge === activePopupBridge) {
            S.dockUserLockedBridge = null;
        }
        activePopup = null;
        activePopupBridge = null;
        renderBridgeImageDock();
    });

    activePopup = popup;
    activePopupBridge = bridge;

    if (!suppressDockLock) {
        const all = getMappableBridgesSorted(S.currentYear);
        const wi = all.findIndex((b) => b.id === bridge.id);
        if (wi >= 0) {
            S.dockSlideshowIndex = wi;
        }
        S.dockUserLockedBridge = bridge;
        renderBridgeImageDock();
    }
}

export function refreshMapPopupBodies(): void {
    if (activePopup && activePopupBridge) {
        activePopup.setDOMContent(buildPopupDom(activePopupBridge));
    }
}

export function updateBridgeMarkers(): void {
    const map = S.map;
    const visibleBridges = getVisibleBridgesForMap();

    const totalBridgesEl = document.getElementById('totalBridges');
    if (totalBridgesEl) {
        totalBridgesEl.textContent = visibleBridges.length.toString();
    }

    if (!map || !map.loaded()) return;

    const source = map.getSource(SOURCE_ID);
    if (!source) return;

    (source as any).setData(buildGeoJSON(visibleBridges));
}

export function resetMarkers(): void {
    closeActivePopup();
    const map = S.map;
    if (!map || !map.loaded()) return;
    const source = map.getSource(SOURCE_ID);
    if (source) {
        (source as any).setData({ type: 'FeatureCollection', features: [] });
    }
}

export function openDockBridgePopup(bridge: Bridge): void {
    const map = S.map;
    if (!map) return;

    const lng = Number(bridge.lng);
    const lat = Number(bridge.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

    if (activePopupBridge?.id === bridge.id && activePopup) {
        map.easeTo({
            center: [lng, lat],
            zoom: Math.max(map.getZoom(), MAP_FOCUS_ZOOM_FROM_DOCK_MIN),
            duration: 600,
        });
        return;
    }

    S.dockSuppressPopupDockLock = true;
    showPopupForBridge(bridge, true);
    map.easeTo({
        center: [lng, lat],
        zoom: Math.max(map.getZoom(), MAP_FOCUS_ZOOM_FROM_DOCK_MIN),
        duration: 700,
    });
}

export function showBridgePopup(bridge: Bridge): void {
    showPopupForBridge(bridge, false);
}
