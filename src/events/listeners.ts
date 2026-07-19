import { S } from '../app/state';
import { toggleClusters, toggleTradeRoutes, toggleWaterways } from '../map/overlays';
import { resetTimelineToStart, startPlayback, togglePlay } from '../timeline/playhead';

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function resizeChartsSoon(): void {
    window.requestAnimationFrame(() => {
        Object.values(S.charts).forEach((c) => c.resize());
    });
}

function togglePanelCollapse(contentId: string, buttonId: string): void {
    const content = document.getElementById(contentId);
    const btn = document.getElementById(buttonId);
    const panel = content?.closest<HTMLElement>('.analysis-panel, .stats-panel');
    if (!content || !btn) return;

    const collapsed = content.classList.toggle('collapsed');
    btn.textContent = collapsed ? '+' : '−';
    panel?.classList.toggle('panel-collapsed', collapsed);

    if (panel?.classList.contains('panel-resized')) {
        if (collapsed) {
            if (panel.style.height) {
                panel.dataset.expandedHeight = panel.style.height;
            }
            panel.style.height = '';
            panel.classList.remove('panel-condensed');
        } else if (panel.dataset.expandedHeight) {
            panel.style.height = panel.dataset.expandedHeight;
        }
    }

    setTimeout(resizeChartsSoon, 300);
}

function initPanelResizeGrips(): void {
    document.querySelectorAll<HTMLElement>('.panel-resize-grip[data-resize-target]').forEach((grip) => {
        grip.addEventListener('pointerdown', (event) => {
            const selector = grip.dataset.resizeTarget;
            const panel = selector ? document.querySelector<HTMLElement>(selector) : null;
            if (!panel) return;

            event.preventDefault();
            grip.setPointerCapture(event.pointerId);

            const rect = panel.getBoundingClientRect();
            const startX = event.clientX;
            const startY = event.clientY;
            const startWidth = rect.width;
            const startHeight = rect.height;
            const isTimeline = panel.classList.contains('timeline-panel');
            const isTopLeftGrip = grip.dataset.resizeCorner === 'top-left';

            panel.classList.add('panel-resized');
            document.body.classList.add('panel-is-resizing');

            const onPointerMove = (moveEvent: PointerEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;
                const maxWidth = isTimeline ? window.innerWidth - 80 : window.innerWidth - rect.left - 20;
                const maxHeight = isTimeline ? window.innerHeight - 160 : window.innerHeight - rect.top - 20;
                const nextWidth = isTopLeftGrip
                    ? startWidth - deltaX * (isTimeline ? 2 : 1)
                    : startWidth + deltaX * (isTimeline ? 2 : 1);
                const nextHeight = isTopLeftGrip || isTimeline ? startHeight - deltaY : startHeight + deltaY;
                const minWidth = isTimeline ? 360 : 200;
                const minHeight = isTimeline ? 82 : 72;
                const clampedWidth = clamp(nextWidth, minWidth, maxWidth);
                const clampedHeight = clamp(nextHeight, minHeight, maxHeight);

                panel.style.width = `${clampedWidth}px`;
                panel.style.height = `${clampedHeight}px`;
                panel.classList.toggle('panel-condensed', clampedHeight < (isTimeline ? 145 : 118));
                resizeChartsSoon();
            };

            const onPointerUp = (upEvent: PointerEvent) => {
                grip.releasePointerCapture(upEvent.pointerId);
                document.body.classList.remove('panel-is-resizing');
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                resizeChartsSoon();
            };

            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
        });
    });
}

export function initEventListeners(): void {
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
        playBtn.addEventListener('click', togglePlay);
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetTimelineToStart);
    }

    const speedSelect = document.getElementById('speedSelect');
    if (speedSelect) {
        speedSelect.addEventListener('change', (e) => {
            const target = e.target;
            if (target instanceof HTMLSelectElement && S.isPlaying) {
                if (S.playInterval !== undefined) {
                    window.clearInterval(S.playInterval);
                    S.playInterval = undefined;
                }
                startPlayback(parseInt(target.value, 10));
            }
        });
    }

    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            const modal = document.getElementById('bridgeModal');
            if (modal) modal.classList.remove('active');
        });
    }

    const bridgeModal = document.getElementById('bridgeModal');
    if (bridgeModal) {
        bridgeModal.addEventListener('click', (e) => {
            if (e.target === bridgeModal) {
                bridgeModal.classList.remove('active');
            }
        });
    }

    const toggleStats = document.getElementById('toggleStats');
    if (toggleStats) {
        toggleStats.addEventListener('click', () => {
            togglePanelCollapse('statsContent', 'toggleStats');
        });
    }

    const toggleAnalysis = document.getElementById('toggleAnalysis');
    if (toggleAnalysis) {
        toggleAnalysis.addEventListener('click', () => {
            togglePanelCollapse('analysisContent', 'toggleAnalysis');
        });
    }

    const showTradeRoutes = document.getElementById('showTradeRoutes');
    if (showTradeRoutes) {
        showTradeRoutes.addEventListener('change', toggleTradeRoutes);
    }

    const showWaterways = document.getElementById('showWaterways');
    if (showWaterways) {
        showWaterways.addEventListener('change', toggleWaterways);
    }

    const showClusters = document.getElementById('showClusters');
    if (showClusters) {
        showClusters.addEventListener('change', toggleClusters);
    }

    document.querySelectorAll('.chart-zoom-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const container = btn.closest('.chart-container') as HTMLElement | null;
            const content = document.getElementById('statsContent');
            const panel = content?.closest('.stats-panel') as HTMLElement | null;
            if (!container || !content) return;
            const wasExpanded = container.classList.contains('chart-expanded');
            content.querySelectorAll('.chart-container').forEach((c) =>
                c.classList.remove('chart-expanded'));
            if (wasExpanded) {
                content.classList.remove('has-expanded');
                panel?.classList.remove('panel-expanded');
                (btn as HTMLElement).textContent = '⤢';
            } else {
                container.classList.add('chart-expanded');
                content.classList.add('has-expanded');
                panel?.classList.add('panel-expanded');
                (btn as HTMLElement).textContent = '⤡';
            }
            setTimeout(() => {
                Object.values(S.charts).forEach((c) => c.resize());
            }, 350);
        });
    });

    initPanelResizeGrips();

}
