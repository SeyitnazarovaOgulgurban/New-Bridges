import initSqlJs, { type Database } from 'sql.js';

const IDB_NAME = 'BridgeCultureDB';
const IDB_STORE = 'sqliteDb';
const IDB_KEY = 'main';

const DATA_VERSION = 12;

let db: Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS bridges (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    year        INTEGER NOT NULL,
    lng         REAL NOT NULL,
    lat         REAL NOT NULL,
    province    TEXT,
    type        TEXT,
    material    TEXT,
    length      REAL,
    span        REAL,
    level       TEXT,
    dynasty     TEXT,
    region      TEXT,
    size        TEXT,
    source      TEXT,
    history     TEXT,
    user_added  INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_year     ON bridges(year);
CREATE INDEX IF NOT EXISTS idx_province ON bridges(province);
CREATE INDEX IF NOT EXISTS idx_dynasty  ON bridges(dynasty);
CREATE INDEX IF NOT EXISTS idx_type     ON bridges(type);
CREATE INDEX IF NOT EXISTS idx_material ON bridges(material);
`;

/* ------------------------------------------------------------------ */
/*  IndexedDB persistence                                              */
/* ------------------------------------------------------------------ */

function openIDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
            const idb = req.result;
            if (!idb.objectStoreNames.contains(IDB_STORE)) {
                idb.createObjectStore(IDB_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function loadFromIDB(): Promise<Uint8Array | null> {
    try {
        const idb = await openIDB();
        return new Promise((resolve) => {
            const tx = idb.transaction(IDB_STORE, 'readonly');
            const store = tx.objectStore(IDB_STORE);
            const req = store.get(IDB_KEY);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

async function saveToIDB(): Promise<void> {
    if (!db) return;
    try {
        const data = db.export();
        const idb = await openIDB();
        const tx = idb.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(data, IDB_KEY);
    } catch (e) {
        console.warn('[BridgeDB] IndexedDB save failed:', e);
    }
}

/* ------------------------------------------------------------------ */
/*  Initialization                                                     */
/* ------------------------------------------------------------------ */

export async function initDatabase(): Promise<void> {
    const SQL = await initSqlJs({
        locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
    });

    const saved = await loadFromIDB();
    if (saved) {
        db = new SQL.Database(saved);
        db.run(SCHEMA);
        console.log('[BridgeDB] Restored from IndexedDB');
    } else {
        db = new SQL.Database();
        db.run(SCHEMA);
        console.log('[BridgeDB] Created new database');
    }
}

export function getDb(): Database {
    if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
    return db;
}

/* ------------------------------------------------------------------ */
/*  CSV bulk import                                                    */
/* ------------------------------------------------------------------ */

export interface BridgeRow {
    id: string;
    name: string;
    year: number;
    lng: number;
    lat: number;
    province?: string;
    type: string;
    material?: string;
    length?: number;
    span?: number;
    level?: string;
    dynasty?: string;
    region?: string;
    size?: string;
    source?: string;
    history?: string;
}

export async function importBridges(rows: BridgeRow[]): Promise<number> {
    const d = getDb();

    d.run('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)');
    const verRow = d.exec("SELECT value FROM meta WHERE key='data_version'");
    const storedVer = verRow[0]?.values[0]?.[0] ? Number(verRow[0].values[0][0]) : 0;

    const existing = d.exec('SELECT COUNT(*) FROM bridges');
    const dbCount = (existing[0]?.values[0]?.[0] as number) ?? 0;

    if (storedVer === DATA_VERSION && dbCount === rows.length) {
        console.log(`[BridgeDB] DB v${storedVer} has ${dbCount} bridges (CSV: ${rows.length}), skip import`);
        return dbCount;
    }

    if (dbCount > 0) {
        d.run('DELETE FROM bridges WHERE user_added = 0');
        console.log(`[BridgeDB] Data changed (v${storedVer}→v${DATA_VERSION}, ${dbCount}→${rows.length}), re-importing`);
    }
    d.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('data_version', ?)", [String(DATA_VERSION)]);

    d.run('BEGIN TRANSACTION');
    const stmt = d.prepare(
        `INSERT OR IGNORE INTO bridges (id,name,year,lng,lat,province,type,material,length,span,level,dynasty,region,size,source,history,user_added)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
    );
    let imported = 0;
    for (const r of rows) {
        stmt.run([
            r.id, r.name, r.year, r.lng, r.lat,
            r.province ?? null, r.type, r.material ?? null,
            r.length ?? null, r.span ?? null, r.level ?? null,
            r.dynasty ?? null, r.region ?? null, r.size ?? null,
            r.source ?? null, r.history ?? null,
        ]);
        imported++;
    }
    stmt.free();
    d.run('COMMIT');
    await saveToIDB();
    console.log(`[BridgeDB] Imported ${imported} bridges`);
    return imported;
}

/* ------------------------------------------------------------------ */
/*  Query helpers                                                      */
/* ------------------------------------------------------------------ */

export function queryAllBridges(): BridgeRow[] {
    const d = getDb();
    const result = d.exec(
        'SELECT id,name,year,lng,lat,province,type,material,length,span,level,dynasty,region,size,source,history FROM bridges ORDER BY year',
    );
    if (!result.length) return [];
    return result[0].values.map((v) => ({
        id: v[0] as string,
        name: v[1] as string,
        year: v[2] as number,
        lng: v[3] as number,
        lat: v[4] as number,
        province: v[5] as string | undefined,
        type: v[6] as string,
        material: v[7] as string | undefined,
        length: v[8] as number | undefined,
        span: v[9] as number | undefined,
        level: v[10] as string | undefined,
        dynasty: v[11] as string | undefined,
        region: v[12] as string | undefined,
        size: v[13] as string | undefined,
        source: v[14] as string | undefined,
        history: v[15] as string | undefined,
    }));
}

export interface TreeGroup {
    dynasty: string;
    provinces: { province: string; count: number }[];
    count: number;
}

export function queryTreeData(): TreeGroup[] {
    const d = getDb();
    const rows = d.exec(
        `SELECT COALESCE(dynasty,'未知') as dynasty, COALESCE(province,'未知') as province, COUNT(*) as cnt
         FROM bridges GROUP BY dynasty, province ORDER BY MIN(year), province`,
    );
    if (!rows.length) return [];
    const map = new Map<string, TreeGroup>();
    for (const v of rows[0].values) {
        const dynasty = v[0] as string;
        const province = v[1] as string;
        const cnt = v[2] as number;
        let g = map.get(dynasty);
        if (!g) {
            g = { dynasty, provinces: [], count: 0 };
            map.set(dynasty, g);
        }
        g.provinces.push({ province, count: cnt });
        g.count += cnt;
    }
    return Array.from(map.values());
}

export function queryBridgesByDynastyProvince(dynasty: string, province: string): BridgeRow[] {
    const d = getDb();
    const dynFilter = dynasty === '未知' ? 'dynasty IS NULL' : 'dynasty = ?';
    const provFilter = province === '未知' ? 'province IS NULL' : 'province = ?';
    const params: string[] = [];
    if (dynasty !== '未知') params.push(dynasty);
    if (province !== '未知') params.push(province);
    const result = d.exec(
        `SELECT id,name,year,lng,lat,province,type,material,length,span,level,dynasty,region,size,source,history
         FROM bridges WHERE ${dynFilter} AND ${provFilter} ORDER BY year`,
        params,
    );
    if (!result.length) return [];
    return result[0].values.map((v) => ({
        id: v[0] as string,
        name: v[1] as string,
        year: v[2] as number,
        lng: v[3] as number,
        lat: v[4] as number,
        province: v[5] as string | undefined,
        type: v[6] as string,
        material: v[7] as string | undefined,
        length: v[8] as number | undefined,
        span: v[9] as number | undefined,
        level: v[10] as string | undefined,
        dynasty: v[11] as string | undefined,
        region: v[12] as string | undefined,
        size: v[13] as string | undefined,
        source: v[14] as string | undefined,
        history: v[15] as string | undefined,
    }));
}

