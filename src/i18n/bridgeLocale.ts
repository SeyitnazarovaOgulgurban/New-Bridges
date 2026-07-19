import type { Bridge } from '../types';
import type { Locale } from './i18n';
import { formatDynastyLabel, getLocale } from './i18n';
import enBridgeById from './bridges/en.byId.json';
import tkBridgeById from './bridges/tk.byId.json';

/**
 * 按桥梁 id（与 bridges.csv 桥ID 一致）覆盖展示文案。中文界面始终用 CSV/JSON 原文；
 * en/tk 下有词条则用翻译，否则回退中文。
 * 继续补充：编辑 bridges/en.byId.json 与 bridges/tk.byId.json。
 */
export type BridgeLocaleEntry = {
    name?: string;
    province?: string;
    type?: string;
    material?: string;
    level?: string;
    region?: string;
    size?: string;
    /** 弹窗朝代标签；不填则用 formatDynastyLabel(year) */
    dynastyTag?: string;
    history?: string;
    poemText?: string;
    poemAuthor?: string;
};

const byLocale: Record<Exclude<Locale, 'zh'>, Record<string, BridgeLocaleEntry>> = {
    en: enBridgeById as Record<string, BridgeLocaleEntry>,
    tk: tkBridgeById as Record<string, BridgeLocaleEntry>,
};

function overlay(bridge: Bridge): BridgeLocaleEntry | undefined {
    const loc = getLocale();
    if (loc === 'zh') {
        return undefined;
    }
    return byLocale[loc][bridge.id];
}

function pick(bridge: Bridge, key: keyof BridgeLocaleEntry, fallback: string): string {
    const v = overlay(bridge)?.[key];
    if (typeof v === 'string' && v.trim()) {
        return v.trim();
    }
    return fallback;
}

export function bridgeName(bridge: Bridge): string {
    return pick(bridge, 'name', bridge.name);
}

export function bridgeProvince(bridge: Bridge): string {
    return pick(bridge, 'province', bridge.province ?? '');
}

export function bridgeType(bridge: Bridge): string {
    return pick(bridge, 'type', bridge.type);
}

export function bridgeMaterial(bridge: Bridge): string {
    return pick(bridge, 'material', bridge.material ?? '');
}

export function bridgeLevel(bridge: Bridge): string {
    return pick(bridge, 'level', bridge.level ?? '');
}

export function bridgeHistory(bridge: Bridge): string {
    return pick(bridge, 'history', bridge.history);
}

export function bridgeDynastyTag(bridge: Bridge): string {
    const o = overlay(bridge)?.dynastyTag;
    if (typeof o === 'string' && o.trim()) {
        return o.trim();
    }
    return formatDynastyLabel(bridge.year);
}

/** 诗词区块：有翻译则全文用覆盖层；否则用 bridgePoems.json + CSV 中文 */
export function bridgePoemLines(bridge: Bridge): { text: string; author: string } | null {
    if (bridge.poem.isPlaceholder === true || !bridge.poem.text.trim()) {
        return null;
    }
    const o = overlay(bridge);
    if (o?.poemText?.trim()) {
        return {
            text: o.poemText.trim(),
            author: (o.poemAuthor?.trim() || bridge.poem.author).trim(),
        };
    }
    return {
        text: bridge.poem.text,
        author: bridge.poem.author,
    };
}
