let overlay: HTMLElement | null = null;
let lbImg: HTMLImageElement | null = null;

function getElements(): boolean {
    if (!overlay) overlay = document.getElementById('imageLightbox');
    if (!lbImg) lbImg = document.getElementById('lightboxImg') as HTMLImageElement | null;
    return !!(overlay && lbImg);
}

export function openLightbox(src: string): void {
    if (!getElements()) return;
    lbImg!.src = src;
    overlay!.classList.add('lightbox--active');
}

export function closeLightbox(): void {
    if (!overlay) return;
    overlay.classList.remove('lightbox--active');
}

export function initLightbox(): void {
    if (!getElements()) return;
    overlay!.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });
}

export function wireImageZoom(img: HTMLElement): void {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLImageElement;
        if (target.src) openLightbox(target.src);
    });
}
