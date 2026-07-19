import Papa from 'papaparse';
import type { Bridge, CsvRow, Poem } from '../types';
import { S } from '../app/state';
import { t, tReplace } from '../i18n/i18n';
import { initDatabase, importBridges, queryAllBridges, type BridgeRow } from './bridgeDb';
import bridgePoemsFile from './bridgePoems.json';
import bridgeImagesFile from './bridgeImages.json';
import bridgesCsvRaw from './bridges.csv?raw';
import { gcj02ToWgs84 } from './geoDatum';

const DEFAULT_POEM: Poem = { text: '', author: '', isPlaceholder: true };

type PoemJson = {
    byId?: Record<string, Poem>;
    byBridge?: Record<string, Poem>;
};

const poemFile = bridgePoemsFile as PoemJson;

type ImagesJson = { byId?: Record<string, string[]>; byBridge?: Record<string, string[]> };
const imgFile = bridgeImagesFile as ImagesJson;

function dedupeFilenames(files: string[]): string[] {
    return Array.from(new Set(files));
}

function imagesForBridge(id: string, name: string): string[] {
    const a = imgFile.byId?.[id];
    if (a?.length) return dedupeFilenames(a);
    const b = imgFile.byBridge?.[name];
    return b?.length ? dedupeFilenames(b) : [];
}

function poemForBridge(id: string, name: string): Poem {
    const p = poemFile.byId?.[id] ?? poemFile.byBridge?.[name];
    if (p?.text?.trim()) return p;
    return DEFAULT_POEM;
}

/** CSV 建造年代：纯数字、或「公元前160」等形式 */
function parseBuildingYear(raw: unknown): number {
    if (raw === null || raw === undefined) return NaN;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    const s = String(raw).trim();
    if (!s) return NaN;
    if (s.startsWith('公元前')) {
        const digits = s.slice(3).replace(/\D/g, '');
        if (!digits) return NaN;
        return -parseInt(digits, 10);
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
}

function parseCoordinate(raw: unknown): number {
    if (raw === null || raw === undefined) return NaN;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    const n = parseFloat(String(raw).trim());
    return Number.isFinite(n) ? n : NaN;
}

function csvRowHasGeometry(b: CsvRow): boolean {
    const y = parseBuildingYear(b.建造年代);
    const lng = parseCoordinate(b.经度);
    const lat = parseCoordinate(b.纬度);
    return Number.isFinite(y) && Number.isFinite(lng) && Number.isFinite(lat);
}

/** Convert a CSV row to a BridgeRow suitable for SQLite import */
function csvToBridgeRow(b: CsvRow): BridgeRow {
    // CSV 坐标为 GCJ-02，统一转回 WGS-84 后入库，与天地图/OpenFreeMap 底图对齐。
    const [lng, lat] = gcj02ToWgs84(parseCoordinate(b.经度), parseCoordinate(b.纬度));
    return {
        id: String(b.桥ID ?? '').trim(),
        name: b.古桥名称,
        year: parseBuildingYear(b.建造年代),
        lng,
        lat,
        province: b.所在省份,
        type: b.桥型,
        material: b.材质 as string | undefined,
        length: b.长度,
        span: b.跨度,
        level: b.保护级别,
        dynasty: b.建造朝代,
        region: b.地理区域,
        size: b.规模分类,
        source: b.数据来源,
        history: b.故事 || '这座桥是一座桥。',
    };
}

/** Enrich a flat DB row with poem and image data */
export function dbRowToBridge(row: BridgeRow): Bridge {
    return {
        ...row,
        province: row.province ?? undefined,
        material: row.material ?? undefined,
        length: row.length ?? undefined,
        span: row.span ?? undefined,
        level: row.level ?? undefined,
        dynasty: row.dynasty ?? undefined,
        region: row.region ?? undefined,
        size: row.size ?? undefined,
        source: row.source ?? undefined,
        history: row.history || '这座桥是一座桥。',
        poem: poemForBridge(row.id, row.name),
        images: imagesForBridge(row.id, row.name),
    };
}

/** Refresh S.bridges from SQLite */
export function refreshBridgesFromDb(): void {
    const rows = queryAllBridges();
    S.bridges = rows.map(dbRowToBridge);
    console.log(tReplace('load.done', { count: S.bridges.length }));
}

export async function loadBridges(): Promise<void> {
    try {
        await initDatabase();

        if (!bridgesCsvRaw || bridgesCsvRaw.length < 500) {
            console.error('[Bridge] bridges.csv 内容异常（过短），请检查构建是否内联了完整 CSV');
        }

        const result = Papa.parse<CsvRow>(bridgesCsvRaw, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
        });

        if (result.errors?.length) {
            console.warn('[Bridge] CSV 解析提示:', result.errors.slice(0, 5));
        }

        const valid = result.data.filter(csvRowHasGeometry);
        const seen = new Set<string>();
        const deduped: BridgeRow[] = [];
        for (const row of valid) {
            const br = csvToBridgeRow(row);
            if (br.id && !seen.has(br.id)) {
                seen.add(br.id);
                deduped.push(br);
            }
        }

        await importBridges(deduped);
        refreshBridgesFromDb();
    } catch (error) {
        console.error(t('load.failed'), error);
    }
}
