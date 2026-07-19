import { placeholderImageUrl } from './bridgeImageUrl';

/** 图片 404 或加载失败时替换为占位图，避免裂图 */
export function wireBridgeImage(
    img: HTMLImageElement,
    kind: 'dock-main' | 'dock-thumb' | 'modal',
): void {
    if (kind === 'dock-main' || kind === 'dock-thumb') {
        return;
    }
    img.addEventListener(
        'error',
        () => {
            if (img.src.includes('placeholder')) return;
            img.src = placeholderImageUrl();
        },
        { once: true },
    );
}

/**
 * Per-image load generation counter.
 * Each time we initiate a new load on a dock img, we bump its gen.
 * The error handler captured for that load checks whether the gen
 * still matches; if not, a newer load superseded it and the error is stale.
 */
const dockImgGen = new WeakMap<HTMLImageElement, number>();

export function attachDockErrorHandler(
    img: HTMLImageElement,
    _kind: 'dock-main' | 'dock-thumb',
): void {
    const gen = (dockImgGen.get(img) ?? 0) + 1;
    dockImgGen.set(img, gen);

    img.addEventListener(
        'error',
        () => {
            if (dockImgGen.get(img) !== gen) return;
            if (img.src.includes('placeholder')) return;
            img.src = placeholderImageUrl();
            img.style.visibility = '';
        },
        { once: true },
    );
}

/** Bump the load gen without attaching a handler (used when clearing src). */
export function cancelDockLoad(img: HTMLImageElement): void {
    dockImgGen.set(img, (dockImgGen.get(img) ?? 0) + 1);
}
