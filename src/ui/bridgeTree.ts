import { S } from '../app/state';
import { queryTreeData, queryBridgesByDynastyProvince } from '../data/bridgeDb';
import { dbRowToBridge } from '../data/loadBridges';
import { bridgeName, bridgeProvince } from '../i18n/bridgeLocale';
import { t } from '../i18n/i18n';
import { bridgeHasPoem } from '../map/markers';

function tDynasty(raw: string): string {
    const v = t(`csvDynasty.${raw}`);
    return v.startsWith('csvDynasty.') ? raw : v;
}

function tProvince(raw: string): string {
    const v = t(`csvProvince.${raw}`);
    return v.startsWith('csvProvince.') ? raw : v;
}
import { pausePlayback, updateYear } from '../timeline/playhead';
import { renderBridgeImageDock } from './bridgeImageDock';
import { getMappableBridgesSorted } from '../map/mappableBridges';
import { showBridgePopup } from '../map/markers';
import type { Bridge } from '../types';

let treeContainer: HTMLElement | null = null;
let poemFilterActive = false;

function getPoemBridgeIds(): Set<string> {
    return new Set(S.bridges.filter(bridgeHasPoem).map((b) => b.id));
}

export function initBridgeTree(): void {
    treeContainer = document.getElementById('treeContent');

    const countEl = document.getElementById('poemBridgeCount');
    if (countEl) {
        const total = S.bridges.filter(bridgeHasPoem).length;
        countEl.textContent = `(${total})`;
    }

    const checkbox = document.getElementById('filterPoemBridges') as HTMLInputElement | null;
    if (checkbox) {
        checkbox.addEventListener('change', () => {
            poemFilterActive = checkbox.checked;
            renderTree();
        });
    }

    renderTree();
}

export function renderTree(): void {
    if (!treeContainer) return;
    treeContainer.innerHTML = '';

    const groups = queryTreeData();
    if (!groups.length) {
        treeContainer.textContent = t('tree.empty');
        return;
    }

    const poemIds = poemFilterActive ? getPoemBridgeIds() : null;

    for (const g of groups) {
        let dynastyPoemCount = 0;
        const provNodes: HTMLElement[] = [];

        for (const p of g.provinces) {
            let provCount = p.count;
            if (poemIds) {
                const rows = queryBridgesByDynastyProvince(g.dynasty, p.province);
                provCount = rows.filter((r) => poemIds.has(r.id)).length;
                if (provCount === 0) continue;
            }
            dynastyPoemCount += provCount;

            const provNode = document.createElement('div');
            provNode.className = 'tree-province';

            const provHeader = document.createElement('div');
            provHeader.className = 'tree-province__header';
            provHeader.innerHTML = `<span class="tree-toggle">&#9654;</span> <span class="tree-province__name">${esc(tProvince(p.province))}</span> <span class="tree-count">(${provCount})</span>`;

            const provBody = document.createElement('div');
            provBody.className = 'tree-province__body';
            let loaded = false;

            provHeader.addEventListener('click', (e) => {
                e.stopPropagation();
                provNode.classList.toggle('tree-province--open');
                if (!loaded) {
                    loaded = true;
                    loadProvinceBridges(provBody, g.dynasty, p.province, poemIds);
                }
            });

            provNode.append(provHeader, provBody);
            provNodes.push(provNode);
        }

        if (poemIds && dynastyPoemCount === 0) continue;

        const displayCount = poemIds ? dynastyPoemCount : g.count;
        const dynastyNode = document.createElement('div');
        dynastyNode.className = 'tree-dynasty';

        const dynastyHeader = document.createElement('div');
        dynastyHeader.className = 'tree-dynasty__header';
        dynastyHeader.innerHTML = `<span class="tree-toggle">&#9654;</span> <span class="tree-dynasty__name">${esc(tDynasty(g.dynasty))}</span> <span class="tree-count">(${displayCount})</span>`;
        dynastyHeader.addEventListener('click', () => {
            dynastyNode.classList.toggle('tree-dynasty--open');
        });

        const dynastyBody = document.createElement('div');
        dynastyBody.className = 'tree-dynasty__body';
        for (const pn of provNodes) dynastyBody.appendChild(pn);

        dynastyNode.append(dynastyHeader, dynastyBody);
        treeContainer.appendChild(dynastyNode);
    }
}

function loadProvinceBridges(
    container: HTMLElement,
    dynasty: string,
    province: string,
    poemIds: Set<string> | null,
): void {
    let rows = queryBridgesByDynastyProvince(dynasty, province);
    if (poemIds) rows = rows.filter((r) => poemIds.has(r.id));
    for (const row of rows) {
        const bridge = dbRowToBridge(row);
        const item = document.createElement('div');
        item.className = 'tree-bridge';
        if (poemIds) item.classList.add('tree-bridge--poem');
        item.textContent = bridgeName(bridge);
        item.title = `${bridgeProvince(bridge) || ''} · ${bridge.year}`;
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            flyToBridge(bridge);
        });
        container.appendChild(item);
    }
    if (!rows.length) {
        const empty = document.createElement('div');
        empty.className = 'tree-bridge tree-bridge--empty';
        empty.textContent = '—';
        container.appendChild(empty);
    }
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

function esc(s: string): string {
    const el = document.createElement('span');
    el.textContent = s;
    return el.innerHTML;
}
