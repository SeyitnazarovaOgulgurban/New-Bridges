import { S } from '../app/state';

/**
 * Make a panel draggable by its header.
 * Switches the element from fixed positioning with top/right/left/bottom
 * to absolute top/left so it can be freely placed.
 */
export function makeDraggable(
    panel: HTMLElement,
    handle: HTMLElement,
): void {
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let dragging = false;

    handle.style.cursor = 'grab';

    function toAbsolutePosition(): void {
        const rect = panel.getBoundingClientRect();
        panel.style.position = 'fixed';
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.top}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    }

    handle.addEventListener('pointerdown', (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest('button, input, select')) return;
        e.preventDefault();
        dragging = true;
        handle.style.cursor = 'grabbing';
        handle.setPointerCapture(e.pointerId);

        toAbsolutePosition();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = panel.offsetLeft;
        startTop = panel.offsetTop;
    });

    handle.addEventListener('pointermove', (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        panel.style.left = `${startLeft + dx}px`;
        panel.style.top = `${startTop + dy}px`;
    });

    const endDrag = (): void => {
        if (!dragging) return;
        dragging = false;
        handle.style.cursor = 'grab';
        clampToViewport(panel);
    };

    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
}

/**
 * Make a panel resizable via a corner grip handle.
 * Also triggers ECharts resize when the stats panel changes size.
 */
export function makeResizable(panel: HTMLElement): void {
    const grip = document.createElement('div');
    grip.className = 'panel-resize-grip';
    panel.appendChild(grip);
    panel.style.overflow = 'hidden';

    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;
    let resizing = false;

    grip.addEventListener('pointerdown', (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        resizing = true;
        grip.setPointerCapture(e.pointerId);
        startX = e.clientX;
        startY = e.clientY;
        startW = panel.offsetWidth;
        startH = panel.offsetHeight;
        document.body.style.userSelect = 'none';
    });

    grip.addEventListener('pointermove', (e: PointerEvent) => {
        if (!resizing) return;
        const newW = Math.max(200, startW + (e.clientX - startX));
        const newH = Math.max(120, startH + (e.clientY - startY));
        panel.style.width = `${newW}px`;
        panel.style.maxHeight = 'none';
        const content = panel.querySelector('.panel-content') as HTMLElement | null;
        if (content) {
            content.style.maxHeight = `${newH - 60}px`;
        }
    });

    const endResize = (): void => {
        if (!resizing) return;
        resizing = false;
        document.body.style.userSelect = '';
        Object.values(S.charts).forEach((c) => c.resize());
    };

    grip.addEventListener('pointerup', endResize);
    grip.addEventListener('pointercancel', endResize);
}

function clampToViewport(el: HTMLElement): void {
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = rect.left;
    let top = rect.top;
    if (left + rect.width > vw) left = vw - rect.width;
    if (top + rect.height > vh) top = vh - rect.height;
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
}
