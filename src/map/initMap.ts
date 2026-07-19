import { S } from '../app/state';
import {
    applyMapboxLocalePolicy,
    buildMapInitOptions,
    GLAny,
    logMaplibreHttpHints,
    MAP_APPROVAL_NO,
    MAP_SOURCE_TEXT,
    useMapbox,
} from './mapEnv';
import { updateYear } from '../timeline/playhead';
import { setupBridgeLayer } from './markers';

/** 在地图角落渲染底图来源 + 审图号（竞赛合规要求） */
function renderMapApproval(): void {
    const el = document.getElementById('mapApproval');
    if (el && !useMapbox) {
        el.textContent = `${MAP_SOURCE_TEXT}　审图号：${MAP_APPROVAL_NO}`;
    }
}

export function initMap(): void {
    S.map = new GLAny.Map(buildMapInitOptions());

    const map = S.map;
    renderMapApproval();
    map.on('load', () => {
        applyMapboxLocalePolicy(map);
        setupBridgeLayer();
        const slider = document.getElementById('timeSlider');
        const raw = slider instanceof HTMLInputElement ? parseInt(slider.value, 10) : NaN;
        const y = Number.isFinite(raw) ? raw : 600;
        updateYear(y, true);
        document.querySelectorAll<HTMLElement>('.mapboxgl-ctrl-logo, .maplibregl-ctrl-logo').forEach((el) => {
            el.style.display = 'none';
        });
    });

    logMaplibreHttpHints();
}
