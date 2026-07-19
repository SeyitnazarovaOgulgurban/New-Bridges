import h from 'hyperscript';
import type { Bridge } from '../types';
import { S } from '../app/state';
import {
    getDockCandidates,
    getMappableBridgesSorted,
    getPlayableBridgesChronological,
} from '../map/mappableBridges';
import { wireBridgeImage, attachDockErrorHandler, cancelDockLoad } from '../data/bridgeImageFallback';
import { bridgeImagePublicUrl, placeholderImageUrl } from '../data/bridgeImageUrl';
import { bridgeName } from '../i18n/bridgeLocale';
import { getLocale, t } from '../i18n/i18n';

/** 胶片轮播：焦点桥在候选列表中顺移（毫秒） */
const DOCK_SLIDE_MS = 2800;

type FilmPlacement = 'above2' | 'above1' | 'main' | 'below1' | 'below2';

type DockFrame = {
    centerBridge: Bridge;
    bAbove2: Bridge | null;
    bAbove1: Bridge | null;
    bBelow1: Bridge | null;
    bBelow2: Bridge | null;
};

type SideSlotEl = { wrap: HTMLElement; img: HTMLImageElement; ph: HTMLElement };

type BuiltDock = {
    inner: HTMLElement;
    label: HTMLElement;
    filmstrip: HTMLElement;
    sides: SideSlotEl[];
    mainWrap: HTMLElement;
    mainImgs: [HTMLImageElement, HTMLImageElement];
    mainActive: 0 | 1;
    lastFingerprint: string;
    hasShownOnce: boolean;
    animating: boolean;
    pendingRun: (() => void) | null;
};

const dockByRoot = new WeakMap<HTMLElement, BuiltDock>();

function filmstripFingerprint(frame: DockFrame): string {
    const { bAbove2, bAbove1, centerBridge, bBelow1, bBelow2 } = frame;
    // include locale so language switch forces re-render even if bridge ids stay the same
    const locale = getLocale();
    return [locale, bAbove2?.id ?? '', bAbove1?.id ?? '', centerBridge.id, bBelow1?.id ?? '', bBelow2?.id ?? ''].join(
        '\u0001',
    );
}

/** 仅当年可见列表内取邻（回退用） */
function frameFromWalkIndex(visible: Bridge[], walkIdx: number): DockFrame {
    const n = visible.length;
    const ci = ((walkIdx % n) + n) % n;
    const centerBridge = visible[ci]!;
    return {
        centerBridge,
        bAbove2: ci - 2 >= 0 ? visible[ci - 2]! : null,
        bAbove1: ci - 1 >= 0 ? visible[ci - 1]! : null,
        bBelow1: ci + 1 < n ? visible[ci + 1]! : null,
        bBelow2: ci + 2 < n ? visible[ci + 2]! : null,
    };
}

/**
 * 侧格上下邻按「全时间轴可播列表」（建造年 ≤ 1949）取数，D/E 可显示滑块年份之后的下一座、再下一座；
 * 中心仍在「当年可见」列表里由游标/锁定决定。
 */
function frameFromWalkWithFullTail(visible: Bridge[], walkIdx: number, full: Bridge[]): DockFrame {
    const n = visible.length;
    const ci = ((walkIdx % n) + n) % n;
    const centerBridge = visible[ci]!;
    const wi = full.findIndex((b) => b.id === centerBridge.id);
    if (wi < 0) {
        return frameFromWalkIndex(visible, walkIdx);
    }
    return {
        centerBridge,
        bAbove2: wi - 2 >= 0 ? full[wi - 2]! : null,
        bAbove1: wi - 1 >= 0 ? full[wi - 1]! : null,
        bBelow1: wi + 1 < full.length ? full[wi + 1]! : null,
        bBelow2: wi + 2 < full.length ? full[wi + 2]! : null,
    };
}

/** 有图锁定模式：邻格同样按 full 时间轴，与「仅有图子列表」长度无关。 */
function frameImagedCenterWithFullNeighbors(centerBridge: Bridge, full: Bridge[]): DockFrame {
    const wi = full.findIndex((b) => b.id === centerBridge.id);
    if (wi < 0) {
        return {
            centerBridge,
            bAbove2: null,
            bAbove1: null,
            bBelow1: null,
            bBelow2: null,
        };
    }
    return {
        centerBridge,
        bAbove2: wi - 2 >= 0 ? full[wi - 2]! : null,
        bAbove1: wi - 1 >= 0 ? full[wi - 1]! : null,
        bBelow1: wi + 1 < full.length ? full[wi + 1]! : null,
        bBelow2: wi + 2 < full.length ? full[wi + 2]! : null,
    };
}

/** 左侧大图对应的桥（锁定 Popup 或当前胶片游标所指桥，与地图时间序一致） */
export function effectiveDockBridge(): Bridge | null {
    const all = getMappableBridgesSorted(S.currentYear);
    if (all.length === 0) {
        return null;
    }
    const locked = S.dockUserLockedBridge;
    if (locked && locked.images.length > 0) {
        const imaged = getDockCandidates(S.currentYear);
        const i = imaged.findIndex((b) => b.id === locked.id);
        if (i >= 0) {
            return imaged[i] ?? null;
        }
        return locked;
    }
    const walkIdx = ((S.dockSlideshowIndex % all.length) + all.length) % all.length;
    return all[walkIdx] ?? null;
}

function computeDockFrame(): DockFrame | null {
    const visible = getMappableBridgesSorted(S.currentYear);
    if (visible.length === 0) {
        return null;
    }
    const full = getPlayableBridgesChronological();
    const locked = S.dockUserLockedBridge;

    if (locked && locked.images.length > 0) {
        const imaged = getDockCandidates(S.currentYear);
        const i = imaged.findIndex((b) => b.id === locked.id);
        if (i >= 0) {
            return frameImagedCenterWithFullNeighbors(imaged[i]!, full);
        }
        return {
            centerBridge: locked,
            bAbove2: null,
            bAbove1: null,
            bBelow1: null,
            bBelow2: null,
        };
    }

    const walkIdx = ((S.dockSlideshowIndex % visible.length) + visible.length) % visible.length;
    return frameFromWalkWithFullTail(visible, walkIdx, full);
}

function buildSideSlot(placement: FilmPlacement): SideSlotEl {
    const ph = h('div.bridge-image-dock__slot__ph') as HTMLElement;
    const img = document.createElement('img');
    img.alt = '';
    img.className = 'bridge-image-dock__slot__img';
    const wrap = h(`div.bridge-image-dock__slot.bridge-image-dock__slot--${placement}`, ph, img) as HTMLElement;
    return { wrap, img, ph };
}

function buildDock(root: HTMLElement): BuiltDock {
    const label = h('div.bridge-image-dock__label') as HTMLElement;
    const filmstrip = h('div.bridge-image-dock__filmstrip') as HTMLElement;

    const sides: SideSlotEl[] = [];
    for (const p of ['above2', 'above1', 'below1', 'below2'] as const) {
        sides.push(buildSideSlot(p));
    }

    const stack = document.createElement('div');
    stack.className = 'bridge-image-dock__main-stack';
    const a = document.createElement('img');
    a.className = 'bridge-image-dock__main-layer';
    a.alt = '';
    const b = document.createElement('img');
    b.className = 'bridge-image-dock__main-layer';
    b.alt = '';
    stack.append(a, b);
    const mainWrap = h('div.bridge-image-dock__slot.bridge-image-dock__slot--main', stack) as HTMLElement;
    const mainImgs: [HTMLImageElement, HTMLImageElement] = [a, b];
    mainImgs[0]!.style.opacity = '1';
    mainImgs[1]!.style.opacity = '0';

    filmstrip.append(sides[0]!.wrap, sides[1]!.wrap, mainWrap, sides[2]!.wrap, sides[3]!.wrap);

    filmstrip.addEventListener('click', (ev) => {
        const jumpEl = (ev.target as HTMLElement).closest('.bridge-image-dock__slot[data-dock-jump-year]');
        if (jumpEl) {
            const y = parseInt(jumpEl.getAttribute('data-dock-jump-year') || '', 10);
            const bid = jumpEl.getAttribute('data-dock-jump-bridge') || '';
            if (Number.isFinite(y)) {
                void import('../timeline/playhead').then(({ pausePlayback, updateYear }) => {
                    pausePlayback();
                    const slider = document.getElementById('timeSlider');
                    let targetY = y;
                    if (slider instanceof HTMLInputElement) {
                        const mn = parseInt(slider.min, 10);
                        const mx = parseInt(slider.max, 10);
                        if (Number.isFinite(mn)) targetY = Math.max(targetY, mn);
                        if (Number.isFinite(mx)) targetY = Math.min(targetY, mx);
                        slider.value = String(targetY);
                    }
                    updateYear(targetY, true);
                    S.dockUserLockedBridge = null;
                    const timeline = getMappableBridgesSorted(targetY);
                    const ix = bid ? timeline.findIndex((b) => b.id === bid) : -1;
                    if (ix >= 0) {
                        S.dockSlideshowIndex = ix;
                    }
                    renderBridgeImageDock({ syncMapPopup: true });
                });
            }
            return;
        }

        const slot = (ev.target as HTMLElement).closest('.bridge-image-dock__slot[data-dock-idx]');
        if (!slot) {
            return;
        }
        const raw = slot.getAttribute('data-dock-idx');
        if (raw === null || raw === '') {
            return;
        }
        const listIndex = parseInt(raw, 10);
        if (Number.isNaN(listIndex)) {
            return;
        }
        S.dockUserLockedBridge = null;
        const timeline = getMappableBridgesSorted(S.currentYear);
        if (listIndex >= 0 && listIndex < timeline.length) {
            S.dockSlideshowIndex = listIndex;
        }
        renderBridgeImageDock({ syncMapPopup: true });
    });

    const inner = h('div.bridge-image-dock__inner', label, filmstrip) as HTMLElement;
    root.replaceChildren(inner);

    return {
        inner,
        label,
        filmstrip,
        sides,
        mainWrap,
        mainImgs,
        mainActive: 0,
        lastFingerprint: '',
        hasShownOnce: false,
        animating: false,
        pendingRun: null,
    };
}

function sideSlotClickMeta(bridge: Bridge | null): {
    listIndex: number | null;
    jumpYear: number | null;
    jumpBridgeId: string | null;
} {
    if (!bridge) {
        return { listIndex: null, jumpYear: null, jumpBridgeId: null };
    }
    const visible = getMappableBridgesSorted(S.currentYear);
    const listIndex = visible.findIndex((b) => b.id === bridge.id);
    if (listIndex >= 0) {
        return { listIndex, jumpYear: null, jumpBridgeId: null };
    }
    if (!Number.isFinite(bridge.year)) {
        return { listIndex: null, jumpYear: null, jumpBridgeId: null };
    }
    return { listIndex: null, jumpYear: bridge.year, jumpBridgeId: bridge.id };
}

function applySideSlotClickTargets(wrap: HTMLElement, meta: ReturnType<typeof sideSlotClickMeta>): void {
    wrap.removeAttribute('data-dock-idx');
    wrap.removeAttribute('data-dock-jump-year');
    wrap.removeAttribute('data-dock-jump-bridge');
    wrap.classList.remove('bridge-image-dock__slot--dock-jump');
    if (meta.listIndex !== null) {
        wrap.classList.add('bridge-image-dock__slot--clickable');
        wrap.setAttribute('data-dock-idx', String(meta.listIndex));
        wrap.removeAttribute('title');
    } else if (meta.jumpYear !== null && meta.jumpBridgeId) {
        wrap.classList.add('bridge-image-dock__slot--clickable', 'bridge-image-dock__slot--dock-jump');
        wrap.setAttribute('data-dock-jump-year', String(meta.jumpYear));
        wrap.setAttribute('data-dock-jump-bridge', meta.jumpBridgeId);
        wrap.title = t('dock.jumpYearTitle');
    } else {
        wrap.classList.remove('bridge-image-dock__slot--clickable');
        wrap.removeAttribute('title');
    }
}

function setSideSlot(slot: SideSlotEl, bridge: Bridge | null, placement: FilmPlacement): void {
    const { wrap } = slot;
    wrap.querySelectorAll('.bridge-image-fallback').forEach((n) => n.remove());
    wrap.querySelectorAll('.bridge-image-dock__slot__text-fallback, .bridge-image-dock__slot__edge-caption').forEach((n) => n.remove());
    wrap.classList.remove('bridge-image-dock__slot--text-thumb', 'bridge-image-dock__slot--edge-empty');
    if (!wrap.contains(slot.img)) {
        const newImg = document.createElement('img');
        newImg.className = 'bridge-image-dock__slot__img';
        newImg.alt = '';
        wrap.appendChild(newImg);
        slot.img = newImg;
    } else {
        slot.img.style.visibility = '';
    }
    const { img } = slot;
    img.style.display = '';

    if (!bridge) {
        wrap.classList.remove(
            'bridge-image-dock__slot--has-img',
            'bridge-image-dock__slot--clickable',
            'bridge-image-dock__slot--dock-jump',
        );
        wrap.removeAttribute('data-dock-idx');
        wrap.removeAttribute('data-dock-jump-year');
        wrap.removeAttribute('data-dock-jump-bridge');
        wrap.removeAttribute('title');
        cancelDockLoad(img);
        img.removeAttribute('src');
        img.removeAttribute('data-dock-src');
        img.style.opacity = '';
        const cap = document.createElement('div');
        cap.className = 'bridge-image-dock__slot__edge-caption';
        const isBelow = placement === 'below1' || placement === 'below2';
        cap.textContent = isBelow ? t('dock.edgeAfter') : t('dock.edgeBefore');
        cap.title = isBelow ? t('dock.edgeAfterDetail') : t('dock.edgeBeforeDetail');
        wrap.appendChild(cap);
        wrap.classList.add('bridge-image-dock__slot--edge-empty');
        return;
    }

    wrap.classList.remove('bridge-image-dock__slot--text-thumb', 'bridge-image-dock__slot--edge-empty');

    const url = bridge.images.length > 0 ? bridgeImagePublicUrl(bridge.images[0]!) : placeholderImageUrl();
    wrap.classList.add('bridge-image-dock__slot--has-img');
    applySideSlotClickTargets(wrap, sideSlotClickMeta(bridge));

    const prev = img.getAttribute('data-dock-src') ?? '';
    if (prev === url) {
        return;
    }
    img.style.display = '';
    img.style.opacity = '0.55';
    img.addEventListener('load', () => { img.style.opacity = '1'; }, { once: true });
    attachDockErrorHandler(img, 'dock-thumb');
    img.src = url;
    img.setAttribute('data-dock-src', url);
}

function setMainCrossfade(d: BuiltDock, bridge: Bridge, instant: boolean): void {
    const stack = d.mainWrap.querySelector('.bridge-image-dock__main-stack');
    stack?.querySelectorAll('.bridge-image-fallback').forEach((n) => n.remove());
    for (const im of d.mainImgs) {
        im.style.visibility = '';
    }

    const url = bridge.images.length > 0 ? bridgeImagePublicUrl(bridge.images[0]!) : placeholderImageUrl();
    const vis = d.mainImgs[d.mainActive]!;
    if (vis.getAttribute('data-dock-src') === url) {
        return;
    }

    const hide = vis;
    const show = d.mainImgs[d.mainActive === 0 ? 1 : 0]!;

    cancelDockLoad(hide);
    attachDockErrorHandler(show, 'dock-main');

    if (instant) {
        hide.style.transition = 'none';
        show.style.transition = 'none';
        show.src = url;
        show.style.opacity = '1';
        hide.style.opacity = '0';
        show.setAttribute('data-dock-src', url);
        d.mainActive = d.mainActive === 0 ? 1 : 0;
        void hide.offsetHeight;
        show.style.transition = '';
        hide.style.transition = '';
        return;
    }

    show.style.transition = '';
    hide.style.transition = '';
    show.style.opacity = '0';
    hide.style.opacity = '1';
    show.src = url;
    show.setAttribute('data-dock-src', url);

    const go = (): void => {
        show.style.opacity = '1';
        hide.style.opacity = '0';
        d.mainActive = d.mainActive === 0 ? 1 : 0;
    };
    show.addEventListener('load', () => requestAnimationFrame(go), { once: true });
    if (show.complete && show.naturalWidth > 0) {
        requestAnimationFrame(go);
    }
}

function applyDockFrame(d: BuiltDock, frame: DockFrame, instant: boolean): void {
    d.label.textContent = bridgeName(frame.centerBridge);

    setSideSlot(d.sides[0]!, frame.bAbove2, 'above2');
    setSideSlot(d.sides[1]!, frame.bAbove1, 'above1');
    setSideSlot(d.sides[2]!, frame.bBelow1, 'below1');
    setSideSlot(d.sides[3]!, frame.bBelow2, 'below2');

    d.mainWrap.classList.add('bridge-image-dock__slot--has-img');
    setMainCrossfade(d, frame.centerBridge, instant);

    d.lastFingerprint = filmstripFingerprint(frame);
}

function finishAnimChain(d: BuiltDock): void {
    d.animating = false;
    if (d.pendingRun) {
        const next = d.pendingRun;
        d.pendingRun = null;
        next();
    }
}

/** 胶片内容切换：先淡出 → 换帧 → 再淡入（仅 opacity，避免位移两段动画的顿挫感） */
function runFilmstripTransition(d: BuiltDock, apply: () => void): void {
    const { filmstrip } = d;

    const onFadeInEnd = (e: TransitionEvent): void => {
        if (e.target !== filmstrip || e.propertyName !== 'opacity') {
            return;
        }
        filmstrip.removeEventListener('transitionend', onFadeInEnd);
        filmstrip.classList.remove('bridge-image-dock__filmstrip--animating');
        finishAnimChain(d);
    };

    const onFadeOutEnd = (e: TransitionEvent): void => {
        if (e.target !== filmstrip || e.propertyName !== 'opacity') {
            return;
        }
        filmstrip.removeEventListener('transitionend', onFadeOutEnd);
        apply();
        filmstrip.addEventListener('transitionend', onFadeInEnd);
        requestAnimationFrame(() => {
            filmstrip.classList.remove('bridge-image-dock__filmstrip--out');
        });
    };

    filmstrip.classList.add('bridge-image-dock__filmstrip--animating');
    filmstrip.classList.add('bridge-image-dock__filmstrip--out');
    filmstrip.addEventListener('transitionend', onFadeOutEnd);
}

export function refreshDockFromTimeline(): void {
    const all = getMappableBridgesSorted(S.currentYear);
    if (all.length === 0) {
        S.dockSlideshowIndex = 0;
    } else if (S.dockSlideshowIndex >= all.length) {
        S.dockSlideshowIndex %= all.length;
    }
    renderBridgeImageDock({ instant: true });
}

export function startDockSlideshow(): void {
    stopDockSlideshow();
    S.dockSlideInterval = window.setInterval(() => {
        if (S.dockUserLockedBridge) {
            return;
        }
        const all = getMappableBridgesSorted(S.currentYear);
        if (all.length === 0) {
            return;
        }
        S.dockSlideshowIndex = (S.dockSlideshowIndex + 1) % all.length;
        renderBridgeImageDock({ syncMapPopup: true });
    }, DOCK_SLIDE_MS);
}

export function stopDockSlideshow(): void {
    if (S.dockSlideInterval !== undefined) {
        window.clearInterval(S.dockSlideInterval);
        S.dockSlideInterval = undefined;
    }
}

export type RenderDockOptions = { instant?: boolean; syncMapPopup?: boolean };

export function renderBridgeImageDock(opts?: RenderDockOptions): void {
    const root = document.getElementById('bridgeImageDock');
    if (!root) {
        return;
    }

    const allForDock = getMappableBridgesSorted(S.currentYear);
    if (allForDock.length === 0) {
        root.replaceChildren();
        root.classList.remove('bridge-image-dock--visible');
        dockByRoot.delete(root);
        return;
    }

    const frame = computeDockFrame();
    if (!frame) {
        return;
    }

    const fp = filmstripFingerprint(frame);
    let d = dockByRoot.get(root);
    if (!d || !root.contains(d.inner)) {
        d = buildDock(root);
        dockByRoot.set(root, d);
    }

    if (fp === d.lastFingerprint) {
        root.classList.add('bridge-image-dock--visible');
        return;
    }

    const instant = opts?.instant === true;
    const syncMapPopup = opts?.syncMapPopup === true;
    const popupTarget = frame.centerBridge;

    const apply = (): void => {
        applyDockFrame(d!, frame, instant);
        if (syncMapPopup && !S.dockUserLockedBridge) {
            void import('../map/markers').then(({ openDockBridgePopup }) => {
                openDockBridgePopup(popupTarget);
            });
        }
    };

    const run = (): void => {
        if (!d!.hasShownOnce) {
            apply();
            d!.hasShownOnce = true;
            root.classList.add('bridge-image-dock--visible');
            return;
        }
        if (instant) {
            apply();
            root.classList.add('bridge-image-dock--visible');
            return;
        }
        if (d!.animating) {
            d!.pendingRun = () => renderBridgeImageDock();
            return;
        }
        d!.animating = true;
        runFilmstripTransition(d!, apply);
        root.classList.add('bridge-image-dock--visible');
    };

    run();
}

export function initBridgeImageDock(): void {
    refreshDockFromTimeline();
}
