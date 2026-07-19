import zh from './locales/zh.json';
import en from './locales/en.json';
import tk from './locales/tk.json';
import { getDynastyPeriodId } from '../constants/dynasty';

export type Locale = 'zh' | 'en' | 'tk';

const STORAGE_KEY = 'bridge-locale';

const bundles: Record<Locale, unknown> = {
    zh: zh as unknown,
    en: en as unknown,
    tk: tk as unknown,
};

const htmlLang: Record<Locale, string> = {
    zh: 'zh-CN',
    en: 'en',
    tk: 'tk',
};

let currentLocale: Locale = 'zh';

const localeListeners = new Set<() => void>();

function readUrlLocale(): Locale | null {
    if (typeof window === 'undefined' || typeof URLSearchParams === 'undefined') {
        return null;
    }
    try {
        const q = new URLSearchParams(window.location.search).get('lang');
        if (q === 'en' || q === 'tk' || q === 'zh') {
            return q;
        }
    } catch {
        /* ignore */
    }
    return null;
}

function readStoredLocale(): Locale {
    if (typeof localStorage === 'undefined') {
        return 'zh';
    }
    try {
        const s = localStorage.getItem(STORAGE_KEY);
        if (s === 'en' || s === 'tk' || s === 'zh') {
            return s;
        }
    } catch {
        /* file:// 或禁用存储时回退中文 */
    }
    return 'zh';
}

function lookup(bundle: unknown, path: string): string | undefined {
    const segs = path.split('.');
    let x: unknown = bundle;
    for (const s of segs) {
        if (x !== null && typeof x === 'object' && s in (x as object)) {
            x = (x as Record<string, unknown>)[s];
        } else {
            return undefined;
        }
    }
    return typeof x === 'string' ? x : undefined;
}

export function getLocale(): Locale {
    return currentLocale;
}

/** 翻译文案；缺失时回退到中文包，再缺失则返回 key */
export function t(key: string): string {
    return (
        lookup(bundles[currentLocale], key) ??
        lookup(bundles.zh, key) ??
        key
    );
}

export function tReplace(key: string, vars: Record<string, string | number>): string {
    let s = t(key);
    for (const [k, v] of Object.entries(vars)) {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
    return s;
}

export function formatTimelineYearLabel(y: number): string {
    if (!Number.isFinite(y)) {
        return t('year.unknown');
    }
    if (y < 0) {
        return tReplace('year.bc', { n: Math.abs(y) });
    }
    return tReplace('year.ad', { n: y });
}

export function formatDynastyLabel(year: number): string {
    const id = getDynastyPeriodId(year);
    return t(`dynasty.${id}`);
}

export function formatDynastyMarkerShort(dynastyId: string): string {
    return t(`dynastyShort.${dynastyId}`);
}

/** 图表等：材质字段来自 CSV，无对应词条时原样返回 */
export function translateMaterialLabel(raw: string | undefined): string {
    if (!raw || !raw.trim()) {
        return t('material.unknown');
    }
    const key = `material.${raw}`;
    const tr = lookup(bundles[currentLocale], key) ?? lookup(bundles.zh, key);
    return tr ?? raw;
}

export function translateRegionLabel(raw: string | undefined): string {
    if (!raw || !raw.trim()) {
        return t('region.other');
    }
    const trimmed = raw.trim();
    if (trimmed === '其他') {
        return t('region.other');
    }
    const key = `region.${trimmed}`;
    const tr = lookup(bundles[currentLocale], key) ?? lookup(bundles.zh, key);
    return tr ?? raw;
}

function applyDomI18n(): void {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const k = el.getAttribute('data-i18n');
        if (k) {
            el.textContent = t(k);
        }
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        const k = el.getAttribute('data-i18n-title');
        if (k) {
            el.setAttribute('title', t(k));
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const k = el.getAttribute('data-i18n-placeholder');
        if (k && el instanceof HTMLInputElement) {
            el.placeholder = t(k);
        }
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
        const k = el.getAttribute('data-i18n-aria');
        if (k) {
            el.setAttribute('aria-label', t(k));
        }
    });

    document.title = t('meta.pageTitle');
}

const LANG_LABELS: Record<Locale, string> = { zh: '中文', en: 'English', tk: 'Türkmençe' };

function syncLangSelect(): void {
    const sel = document.getElementById('langSelect');
    if (sel instanceof HTMLSelectElement) {
        sel.value = currentLocale;
        sel.setAttribute('aria-label', t('lang.selectorAria'));
    }
    const cur = document.getElementById('langCurrent');
    if (cur) cur.textContent = LANG_LABELS[currentLocale] ?? currentLocale;
    document.querySelectorAll('.lang-dropdown__item').forEach((el) => {
        const lang = (el as HTMLElement).dataset.lang;
        el.classList.toggle('lang-dropdown__item--active', lang === currentLocale);
    });
}

export function subscribeLocaleChange(fn: () => void): () => void {
    localeListeners.add(fn);
    return () => {
        localeListeners.delete(fn);
    };
}

function notifyLocaleChange(): void {
    localeListeners.forEach((fn) => {
        fn();
    });
    void import('../map/markers').then(({ refreshMapPopupBodies }) => {
        refreshMapPopupBodies();
    });
}

export function setLocale(next: Locale): void {
    if (next !== 'zh' && next !== 'en' && next !== 'tk') {
        return;
    }
    currentLocale = next;
    try {
        localStorage.setItem(STORAGE_KEY, next);
    } catch {
        /* ignore */
    }
    document.documentElement.lang = htmlLang[next];
    applyDomI18n();
    syncLangSelect();
    notifyLocaleChange();
}

/** 在 loadBridges 之前调用：恢复语言并刷新静态 DOM */
export function initI18n(): void {
    const fromUrl = readUrlLocale();
    if (fromUrl !== null) {
        currentLocale = fromUrl;
        try {
            localStorage.setItem(STORAGE_KEY, fromUrl);
        } catch {
            /* ignore */
        }
    } else {
        currentLocale = readStoredLocale();
    }
    document.documentElement.lang = htmlLang[currentLocale];
    applyDomI18n();
    syncLangSelect();

    const sel = document.getElementById('langSelect');
    if (sel instanceof HTMLSelectElement) {
        sel.addEventListener('change', () => {
            const v = sel.value;
            if (v === 'zh' || v === 'en' || v === 'tk') {
                setLocale(v);
            }
        });
    }

    const dropdown = document.getElementById('langDropdown');
    const trigger = document.getElementById('langTrigger');
    const menu = document.getElementById('langMenu');
    if (dropdown && trigger && menu) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('lang-dropdown--open');
        });
        menu.addEventListener('click', (e) => {
            const item = (e.target as HTMLElement).closest('.lang-dropdown__item') as HTMLElement | null;
            if (!item) return;
            const v = item.dataset.lang;
            if (v === 'zh' || v === 'en' || v === 'tk') {
                setLocale(v);
            }
            dropdown.classList.remove('lang-dropdown--open');
        });
        document.addEventListener('click', () => {
            dropdown.classList.remove('lang-dropdown--open');
        });
    }
}
