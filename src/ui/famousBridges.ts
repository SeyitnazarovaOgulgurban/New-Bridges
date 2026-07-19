import { S } from '../app/state';
import { bridgeName } from '../i18n/bridgeLocale';
import { formatTimelineYearLabel, t } from '../i18n/i18n';
import { pausePlayback, updateYear } from '../timeline/playhead';
import { renderBridgeImageDock } from './bridgeImageDock';
import { getMappableBridgesSorted } from '../map/mappableBridges';
import { showBridgePopup } from '../map/markers';
import type { Bridge } from '../types';

const FAMOUS_IDS: string[] = [
    'br_da218ab5d6b8', // 赵州桥 (Anji/Zhaozhou)
    'br_b35d403c6f9e', // 卢沟桥 (Marco Polo)
    'br_38c42babd7ac', // 洛阳桥 (Luoyang/Wan'an)
    'br_740191ceb577', // 广济桥 (Guangji/Xiangzi)
    'br_4d04253ba49a', // 安平桥 (Anping/Five-li)
    'br_8050921e53e0', // 五亭桥 (Wuting)
    'br_88eda75be800', // 断桥 (Broken Bridge)
    'br_c5b8c5d8e390', // 枫桥 (Feng)
    'br_fbe3c3ddb58e', // 灞桥 (Ba)
    'br_c94e0c4e9fdf', // 垂虹桥 (Chuihong)
    'br_3b3400087b8a', // 玉带桥 (Yudai)
    'br_a4f4c3fdf47b', // 八字桥 (Bazi)
    'br_b9fad24f2f4d', // 天津桥 (Tianjin/Luoyang)
    'br_9e7968a66a3b', // 永济桥 (Yongji)
    'br_03d8438e7b2f', // 十七孔桥 (Seventeen-arch)
    'br_39c1c8431495', // 朱雀桥 (Zhuque)
    'br_ac343bc35aba', // 巴陵桥 (Baling)
];

function flyToBridge(bridge: Bridge): void {
    pausePlayback();
    const slider = document.getElementById('timeSlider') as HTMLInputElement | null;
    let targetY = bridge.year;
    if (slider) {
        const mn = parseInt(slider.min, 10);
        const mx = parseInt(slider.max, 10);
        if (Number.isFinite(mn)) targetY = Math.max(targetY, mn);
        if (Number.isFinite(mx)) targetY = Math.min(targetY, mx);
        slider.value = String(targetY);
    }
    updateYear(targetY, true);

    const all = getMappableBridgesSorted(targetY);
    const idx = all.findIndex((b) => b.id === bridge.id);
    if (idx >= 0) {
        S.dockSlideshowIndex = idx;
        S.dockUserLockedBridge = null;
        renderBridgeImageDock({ syncMapPopup: true });
    }

    const map = S.map;
    if (map) {
        const lng = Number(bridge.lng);
        const lat = Number(bridge.lat);
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
            map.flyTo({ center: [lng, lat], zoom: 8, duration: 1500 });
            const openPopup = (): void => {
                map.off('moveend', openPopup);
                showBridgePopup(bridge);
            };
            map.on('moveend', openPopup);
        }
    }
}

export function initFamousBridges(): void {
    const btn = document.getElementById('famousBridgesBtn');
    const dropdown = document.getElementById('famousDropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.toggle('famous-dropdown--open');
        if (isOpen && !dropdown.dataset.built) {
            buildList(dropdown);
            dropdown.dataset.built = '1';
        }
    });

    document.addEventListener('click', () => {
        dropdown.classList.remove('famous-dropdown--open');
    });

    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function buildList(dropdown: HTMLElement): void {
    const famous = FAMOUS_IDS
        .map((id) => S.bridges.find((b) => b.id === id))
        .filter((b): b is Bridge => b !== undefined);

    famous.sort((a, b) => a.year - b.year);

    for (const bridge of famous) {
        const item = document.createElement('div');
        item.className = 'famous-item';

        const name = document.createElement('span');
        name.className = 'famous-item__name';
        name.textContent = bridgeName(bridge);

        const year = document.createElement('span');
        year.className = 'famous-item__year';
        year.textContent = formatTimelineYearLabel(bridge.year);

        item.append(name, year);
        item.addEventListener('click', () => {
            dropdown.classList.remove('famous-dropdown--open');
            flyToBridge(bridge);
        });
        dropdown.appendChild(item);
    }
}

export function refreshFamousList(): void {
    const dropdown = document.getElementById('famousDropdown');
    if (dropdown?.dataset.built) {
        dropdown.innerHTML = '';
        dropdown.dataset.built = '';
    }
}
