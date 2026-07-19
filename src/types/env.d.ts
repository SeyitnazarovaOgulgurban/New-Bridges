/// <reference types="vite/client" />

declare module '*.csv?raw' {
    const content: string;
    export default content;
}

interface ImportMetaEnv {
    readonly VITE_MAPBOX_TOKEN: string;
    /** Mapbox 地图视角，国内发布建议 CN */
    readonly VITE_MAPBOX_WORLDVIEW?: string;
    /** Mapbox 标注语言，国内建议 zh-Hans */
    readonly VITE_MAPBOX_LANGUAGE?: string;
    /** Mapbox 样式 URL，需支持 worldview 的官方样式 */
    readonly VITE_MAPBOX_STYLE?: string;
    readonly VITE_MAP_RASTER_TILE_URL?: string;
    readonly VITE_MAP_RASTER_CARTO_HOST?: string;
    /** 天地图浏览器端 tk，缺省用内置「中国古桥」应用 key */
    readonly VITE_TIANDITU_TK?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface Window {
    showDetail: (idOrName: string) => void;
}

declare module 'sql.js' {
    export interface QueryExecResult {
        columns: string[];
        values: unknown[][];
    }

    export interface Statement {
        run(params?: unknown[]): void;
        free(): void;
    }

    export interface Database {
        run(sql: string, params?: unknown[]): void;
        exec(sql: string, params?: unknown[]): QueryExecResult[];
        prepare(sql: string): Statement;
        export(): Uint8Array;
        getRowsModified(): number;
        close(): void;
    }

    export interface SqlJsStatic {
        Database: new (data?: ArrayLike<number>) => Database;
    }

    export interface InitSqlJsOptions {
        locateFile?: (filename: string) => string;
    }

    export default function initSqlJs(options?: InitSqlJsOptions): Promise<SqlJsStatic>;
}
