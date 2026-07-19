import type { Bridge } from '../types';
import { S } from '../app/state';
import { bridgeName, bridgeProvince } from '../i18n/bridgeLocale';
import { formatTimelineYearLabel, t } from '../i18n/i18n';
import { pausePlayback, updateYear } from '../timeline/playhead';
import { renderBridgeImageDock } from './bridgeImageDock';
import { getMappableBridgesSorted } from '../map/mappableBridges';
import { showBridgePopup } from '../map/markers';

export function initBridgeSearch(): void {
    const input = document.getElementById('bridgeSearchInput') as HTMLInputElement | null;
    const results = document.getElementById('searchResults');
    if (!input || !results) return;

    let debounce: number | undefined;

    input.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = window.setTimeout(() => {
            const q = input.value.trim();
            if (q.length === 0) {
                results.classList.remove('search-results--open');
                results.innerHTML = '';
                return;
            }
            const matches = searchBridges(q, 8);
            renderResults(results, matches, input);
        }, 200);
    });

    input.addEventListener('focus', () => {
        if (input.value.trim().length > 0 && results.children.length > 0) {
            results.classList.add('search-results--open');
        }
    });

    document.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('.header-search')) {
            results.classList.remove('search-results--open');
        }
    });
}

function searchBridges(query: string, limit: number): Bridge[] {
    const q = query.toLowerCase();
    const scored: { bridge: Bridge; score: number }[] = [];

    for (const b of S.bridges) {
        const localName = bridgeName(b).toLowerCase();
        const rawName = b.name.toLowerCase();
        const prov = (b.province ?? '').toLowerCase();

        let score = 0;
        if (localName === q || rawName === q) score = 100;
        else if (localName.startsWith(q) || rawName.startsWith(q)) score = 80;
        else if (localName.includes(q) || rawName.includes(q)) score = 60;
        else if (prov.includes(q)) score = 30;

        if (score > 0) scored.push({ bridge: b, score });
    }

    scored.sort((a, b) => b.score - a.score || a.bridge.year - b.bridge.year);
    return scored.slice(0, limit).map((s) => s.bridge);
}

function renderResults(container: HTMLElement, matches: Bridge[], input: HTMLInputElement): void {
    container.innerHTML = '';
    if (matches.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'search-result-empty';
        empty.textContent = t('search.noResult');
        container.appendChild(empty);
        container.classList.add('search-results--open');
        return;
    }

    for (const bridge of matches) {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        const name = document.createElement('div');
        name.className = 'search-result-item__name';
        name.textContent = bridgeName(bridge);

        const meta = document.createElement('div');
        meta.className = 'search-result-item__meta';
        meta.textContent = `${formatTimelineYearLabel(bridge.year)} · ${bridgeProvince(bridge) || '—'}`;

        item.append(name, meta);
        item.addEventListener('click', () => {
            input.value = '';
            container.classList.remove('search-results--open');
            container.innerHTML = '';
            flyToBridge(bridge);
        });
        container.appendChild(item);
    }
    container.classList.add('search-results--open');
}

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
