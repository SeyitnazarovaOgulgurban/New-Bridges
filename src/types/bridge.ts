export interface CsvRow {
    桥ID: string;
    古桥名称: string;
    建造年代: number;
    经度: number;
    纬度: number;
    所在省份?: string;
    桥型: string;
    材质?: string;
    长度?: number;
    跨度?: number;
    保护级别?: string;
    数据来源?: string;
    建造朝代?: string;
    地理区域?: string;
    桥梁时代?: string;
    规模分类?: string;
    故事?: string;
}

export interface Bridge {
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
    poem: Poem;
    history: string;
    /** public/bridge-images 下的文件名列表 */
    images: string[];
}

export interface Poem {
    text: string;
    author: string;
    /** 无诗词收录时的占位，换语言时不依赖具体文案匹配 */
    isPlaceholder?: boolean;
}
