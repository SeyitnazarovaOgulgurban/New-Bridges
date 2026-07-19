import type { Bridge } from '../types';
import { S } from '../app/state';

/** 与时间轴滑块上限一致（index.html #timeSlider max） */
export const TIMELINE_SLIDER_MAX_YEAR = 1911;

/** CSV / Papa 在部分环境下会把数字列解析成字符串，strict typeof === 'number' 会把整表判为「不在范围内」。 */
function asFiniteNumber(v: unknown): number | undefined {
    if (typeof v === 'number' && Number.isFinite(v)) {
        return v;
    }
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v.trim());
        if (Number.isFinite(n)) {
            return n;
        }
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

function bridgeGeometry(b: Bridge): { year: number; lng: number; lat: number } | null {
    const year = asFiniteNumber(b.year);
    const lng = asFiniteNumber(b.lng);
    const lat = asFiniteNumber(b.lat);
    if (year === undefined || lng === undefined || lat === undefined) {
        return null;
    }
    return { year, lng, lat };
}

function bridgeInMapBounds(lng: number, lat: number): boolean {
    return lng >= 73 && lng <= 135 && lat >= 18 && lat <= 54;
}

/** 播放用：时间轴范围内、有坐标可上地图的桥，按建造年排序（每拍前进一座）。 */
export function getPlayableBridgesChronological(): Bridge[] {
    return S.bridges
        .filter((b) => {
            const g = bridgeGeometry(b);
            if (!g) {
                return false;
            }
            return g.year <= TIMELINE_SLIDER_MAX_YEAR && bridgeInMapBounds(g.lng, g.lat);
        })
        .sort((a, b) => {
            const ga = bridgeGeometry(a);
            const gb = bridgeGeometry(b);
            const ya = ga?.year ?? 0;
            const yb = gb?.year ?? 0;
            return ya - yb || a.id.localeCompare(b.id);
        });
}

let _cachedYear = NaN;
let _cachedBridgesRef: Bridge[] | null = null;
let _cachedResult: Bridge[] = [];

/** 与标点一致：建造年 ≤ 当前年，且经纬度在中国范围内。 */
export function getMappableBridgesForYear(year: number): Bridge[] {
    if (year === _cachedYear && S.bridges === _cachedBridgesRef) {
        return _cachedResult;
    }
    _cachedYear = year;
    _cachedBridgesRef = S.bridges;
    _cachedResult = S.bridges.filter((b) => {
        const g = bridgeGeometry(b);
        if (!g) {
            return false;
        }
        return g.year <= year && bridgeInMapBounds(g.lng, g.lat);
    });
    return _cachedResult;
}

export function invalidateMappableCache(): void {
    _cachedYear = NaN;
    _cachedBridgesRef = null;
    _cachedResult = [];
}

/** 当年可映射桥，按建造年、桥 ID 排序（时间轴顺序，含无配图桥）。 */
export function getMappableBridgesSorted(year: number): Bridge[] {
    return [...getMappableBridgesForYear(year)].sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
}

/** 时间轴左侧轮播候选：当年可见且至少有一张图。 */
export function getDockCandidates(year: number): Bridge[] {
    return getMappableBridgesSorted(year).filter((b) => b.images.length > 0);
}

/** 时间轴「尚无桥出现」的截止年：第一座可播桥建造年的前一年（用于初始 0 标点）。含公元前时须为负数，不可钳到公元 1 年。 */
export function getTimelineEmptyStartYear(): number {
    const seq = getPlayableBridgesChronological();
    if (seq.length === 0) {
        return 600;
    }
    return seq[0]!.year - 1;
}
