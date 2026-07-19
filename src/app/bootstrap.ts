import { loadBridges } from '../data/loadBridges';
import { initMap } from '../map/initMap';
import { initCharts } from '../charts/insightCharts';
import { applyInitialTimelineEmpty, initTimeline, rebuildDynastyMarkers, updateYear } from '../timeline/playhead';
import { initEventListeners } from '../events/listeners';
import { updateStats } from './stats';
import { showBridgeDetail, wireWindowShowDetail } from '../ui/bridgeModal';
import { initBridgeImageDock } from '../ui/bridgeImageDock';
import { initLightbox } from '../ui/lightbox';
import { initBridgeSearch } from '../ui/bridgeSearch';
import { initBridgeTree, renderTree } from '../ui/bridgeTree';
import { initFamousBridges, refreshFamousList } from '../ui/famousBridges';
import { makeDraggable, makeResizable } from '../ui/panelInteract';
import { refreshOverlayLocale } from '../map/overlays';
import { initI18n, subscribeLocaleChange } from '../i18n/i18n';
import { S } from './state';
import { initMapLib } from '../map/mapEnv';

export async function bootstrap(): Promise<void> {
    initI18n();
    initLightbox();
    await loadBridges();
    applyInitialTimelineEmpty();
    initBridgeImageDock();
    initBridgeSearch();
    wireWindowShowDetail();
    await initMapLib();
    initMap();
    initCharts();
    initTimeline();
    initEventListeners();
    updateStats();
    initBridgeTree();
    initFamousBridges();
    initPanelInteractions();
    initTreeToggle();

    function initPanelInteractions(): void {
        const statsPanel = document.querySelector('.stats-panel') as HTMLElement | null;
        if (statsPanel) {
            const statsHeader = statsPanel.querySelector('.panel-header') as HTMLElement | null;
            if (statsHeader) makeDraggable(statsPanel, statsHeader);
            makeResizable(statsPanel);
        }

        const analysisPanel = document.getElementById('analysisPanel') as HTMLElement | null;
        if (analysisPanel) {
            const analysisHeader = analysisPanel.querySelector('.panel-header') as HTMLElement | null;
            if (analysisHeader) makeDraggable(analysisPanel, analysisHeader);
        }

        const treePanel = document.getElementById('treePanel') as HTMLElement | null;
        if (treePanel) {
            const treeHeader = treePanel.querySelector('.panel-header') as HTMLElement | null;
            if (treeHeader) makeDraggable(treePanel, treeHeader);
        }

        const legend = document.querySelector('.map-legend') as HTMLElement | null;
        if (legend) {
            const legendTitle = legend.querySelector('h4') as HTMLElement | null;
            makeDraggable(legend, legendTitle ?? legend);
        }
    }

    function initTreeToggle(): void {
        const toggleBtn = document.getElementById('toggleTree');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const content = document.getElementById('treeContent');
                if (content && toggleBtn) {
                    const collapsed = content.classList.toggle('collapsed');
                    toggleBtn.textContent = collapsed ? '+' : '−';
                }
            });
        }
    }

    subscribeLocaleChange(() => {
        rebuildDynastyMarkers();
        updateYear(S.currentYear, true);
        refreshOverlayLocale();
        renderTree();
        refreshFamousList();

        const modal = document.getElementById('bridgeModal');
        const bridgeId = modal instanceof HTMLElement ? modal.dataset.bridgeId : undefined;
        if (modal?.classList.contains('active') && bridgeId) {
            const bridge = S.bridges.find((b) => b.id === bridgeId);
            if (bridge) showBridgeDetail(bridge);
        }
    });
}
