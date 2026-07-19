/** public/bridge-images 下的文件名 → 运行时 URL（Vite base 兼容）。 */
export function bridgeImagePublicUrl(filename: string): string {
    const base = import.meta.env.BASE_URL;
    const prefix = base.endsWith('/') ? base : `${base}/`;
    return `${prefix}bridge-images/${filename}`;
}

import { getLocale } from '../i18n/i18n';

const placeholderFileMap: Record<string, string> = {
    zh: 'placeholder.png',
    en: 'placeholder_en.png',
    tk: 'placeholder_tk.png',
};

export function placeholderImageUrl(): string {
    const file = placeholderFileMap[getLocale()] ?? 'placeholder.png';
    return bridgeImagePublicUrl(file);
}
