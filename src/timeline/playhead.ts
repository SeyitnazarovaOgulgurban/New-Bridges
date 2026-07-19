import { dynasties } from '../constants/dynasty';
import { S } from '../app/state';
import { updateStats } from '../app/stats';
import { openDockBridgePopup, resetMarkers, updateBridgeMarkers } from '../map/markers';
import { updateCharts } from '../charts/insightCharts';
import { updateWaterwaysForYear } from '../map/overlays';
import { refreshDockFromTimeline } from '../ui/bridgeImageDock';
import {
    formatDynastyLabel,
    formatDynastyMarkerShort,
    formatTimelineYearLabel,
    t,
} from '../i18n/i18n';
import {
    getMappableBridgesSorted,
    getPlayableBridgesChronological,
    getTimelineEmptyStartYear,
    TIMELINE_SLIDER_MAX_YEAR,
} from '../map/mappableBridges';

export { formatTimelineYearLabel } from '../i18n/i18n';

/** 停止自动播放（不切换为「开始播」）；拖动时间轴时应先调用，避免下一拍把滑块拽回序列。 */
export function pausePlayback(): void {
    if (!S.isPlaying) {
        return;
    }
    S.isPlaying = false;
    const btn = document.getElementById('playBtn');
    const playIcon = btn?.querySelector('.play-icon');
    if (btn) btn.classList.remove('playing');
    if (playIcon) playIcon.textContent = '▶';
    if (S.playInterval !== undefined) {
        window.clearInterval(S.playInterval);
        S.playInterval = undefined;
    }
}

export function rebuildDynastyMarkers(): void {
    const sliderElement = document.getElementById('timeSlider');
    const markersContainer = document.getElementById('dynastyMarkers');
    if (!sliderElement || !(sliderElement instanceof HTMLInputElement) || !markersContainer) {
        return;
    }
    const slider = sliderElement;
    markersContainer.replaceChildren();
    dynasties.forEach((d) => {
        const marker = document.createElement('span');
        marker.className = 'dynasty-marker';
        marker.textContent = formatDynastyMarkerShort(d.id);
        marker.addEventListener('click', () => {
            slider.value = d.start.toString();
            pausePlayback();
            updateYear(d.start);
        });
        markersContainer.appendChild(marker);
    });
}

export function initTimeline(): void {
    const sliderElement = document.getElementById('timeSlider');
    if (!sliderElement || !(sliderElement instanceof HTMLInputElement)) {
        return;
    }
    const slider = sliderElement;

    rebuildDynastyMarkers();

    slider.addEventListener('input', (e) => {
        const target = e.target;
        if (target instanceof HTMLInputElement) {
            const y = parseInt(target.value, 10);
            if (Number.isFinite(y)) {
                pausePlayback();
                updateYear(y);
            }
        }
    });
}

export function updateYear(year: number, forceChartUpdate = false): void {
    if (!Number.isFinite(year)) {
        return;
    }
    S.currentYear = year;
    const currentYearEl = document.getElementById('currentYear');
    if (currentYearEl) currentYearEl.textContent = formatTimelineYearLabel(year);
    const currentDynastyEl = document.getElementById('currentDynasty');
    if (currentDynastyEl) currentDynastyEl.textContent = formatDynastyLabel(year);

    const dynastyMarkerEls = document.querySelectorAll('.dynasty-marker');
    dynastyMarkerEls.forEach((m, i) => {
        const d = dynasties[i];
        const isLast = i === dynasties.length - 1;
        const inRange = d && year >= d.start && (isLast ? year <= d.end : year < d.end);
        if (inRange) {
            m.classList.add('active');
        } else {
            m.classList.remove('active');
        }
    });

    updateBridgeMarkers();
    updateWaterwaysForYear(year);
    refreshDockFromTimeline();

    const now = Date.now();
    if (forceChartUpdate || !S.isPlaying || now - S.lastChartUpdate > 500) {
        S.lastChartUpdate = now;
        updateCharts();
    }

    updateStats();
}

/** 按当前时间轴年份对齐播放进度：已出现的桥数 = 时间序中建造年 ≤ year 的座数；下一拍从其后一座继续。 */
function syncPlayStateFromTimelineYear(year: number): void {
    const seq = getPlayableBridgesChronological();
    if (seq.length === 0) {
        S.playMarkersRevealCount = 0;
        S.playChronologicalIndex = 0;
        return;
    }
    const n = seq.filter((b) => b.year <= year).length;
    S.playMarkersRevealCount = n;
    S.playChronologicalIndex = n;
}

/** 首屏与「回到起点」：滑块停在首座可播桥的前一年，地图上 0 座桥。 */
export function applyInitialTimelineEmpty(): void {
    const slider = document.getElementById('timeSlider');
    if (!(slider instanceof HTMLInputElement)) return;
    const emptyY = getTimelineEmptyStartYear();
    slider.min = String(emptyY);
    slider.value = String(emptyY);
    updateYear(emptyY, true);
}

export function togglePlay(): void {
    S.isPlaying = !S.isPlaying;
    const btn = document.getElementById('playBtn');
    const playIcon = btn?.querySelector('.play-icon');

    if (S.isPlaying) {
        if (btn) btn.classList.add('playing');
        if (playIcon) playIcon.textContent = '⏸';
        S.dockUserLockedBridge = null;
        const speedSelect = document.getElementById('speedSelect');
        const speed = speedSelect instanceof HTMLSelectElement ? parseInt(speedSelect.value, 10) : 1000;
        const slider = document.getElementById('timeSlider');
        const raw = slider instanceof HTMLInputElement ? parseInt(slider.value, 10) : NaN;
        const y = Number.isFinite(raw) ? raw : S.currentYear;
        syncPlayStateFromTimelineYear(y);
        updateYear(y, true);
        if (getPlayableBridgesChronological().length === 0) {
            console.warn(t('warn.noPlayableBridges'));
            pausePlayback();
            return;
        }
        startPlayback(speed);
    } else {
        if (btn) btn.classList.remove('playing');
        if (playIcon) playIcon.textContent = '▶';
        if (S.playInterval !== undefined) {
            window.clearInterval(S.playInterval);
            S.playInterval = undefined;
        }
    }
}

/**
 * 每拍前进一座桥（时间序），年份显示为该桥建造年，地图/图表/胶片与之一致。
 * 速度选择器表示「每座桥停留毫秒数」，不再按十年一跳。
 */
export function startPlayback(speed: number): void {
    const slider = document.getElementById('timeSlider');
    if (!(slider instanceof HTMLInputElement)) return;

    if (S.playInterval !== undefined) {
        window.clearInterval(S.playInterval);
    }

    if (getPlayableBridgesChronological().length === 0) {
        pausePlayback();
        return;
    }

    const step = (): void => {
        const seq = getPlayableBridgesChronological();
        if (seq.length === 0) {
            pausePlayback();
            return;
        }

        const i = S.playChronologicalIndex % seq.length;
        S.playMarkersRevealCount = i + 1;
        const bridge = seq[i]!;
        S.playChronologicalIndex = (S.playChronologicalIndex + 1) % seq.length;

        const year = Math.min(bridge.year, TIMELINE_SLIDER_MAX_YEAR);
        slider.value = String(year);

        const allAtYear = getMappableBridgesSorted(year);
        const wi = allAtYear.findIndex((b) => b.id === bridge.id);
        S.dockSlideshowIndex = wi >= 0 ? wi : 0;

        updateYear(year);
        if (!S.dockUserLockedBridge) {
            openDockBridgePopup(bridge);
        }
    };

    if (S.playMarkersRevealCount === 0) {
        step();
    }
    S.playInterval = window.setInterval(step, speed);
}

export function resetTimelineToStart(): void {
    if (S.isPlaying) togglePlay();
    S.playChronologicalIndex = 0;
    S.playMarkersRevealCount = 0;
    resetMarkers();
    applyInitialTimelineEmpty();
}
