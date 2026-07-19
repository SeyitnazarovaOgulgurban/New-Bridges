/**
 * GCJ-02（火星坐标）⇄ WGS-84 转换。
 *
 * 背景：bridges.csv 的经纬度来自国家文物局数据库，经卢沟桥/赵州桥/洛阳桥/宝带桥等
 * 已知古桥实测比对，呈整体东偏约 0.005°（≈500m）的 GCJ-02 典型签名，判定为 GCJ-02。
 * 天地图（CGCS2000≈WGS-84）与 OpenFreeMap（WGS-84）底图均按 WGS-84 渲染，
 * 故桥点需先由 GCJ-02 转回 WGS-84 再叠加，否则相对底图偏移约 500m。
 *
 * 算法为业界通用的 “eviltransform” 偏移公式，正算 WGS-84→GCJ-02 精确，
 * 反算用迭代逼近，收敛到亚米级，足够本项目地图标注使用。
 */

const PI = Math.PI;
const A = 6378245.0; // 克拉索夫斯基椭球长半轴
const EE = 0.006693421622965943; // 椭球偏心率平方

/** 国境外（含港澳台海域近似框）不做偏移：GCJ-02 仅在中国大陆范围内生效 */
function outOfChina(lng: number, lat: number): boolean {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
    let ret =
        -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
    ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0;
    return ret;
}

function transformLng(x: number, y: number): number {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
    ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0;
    return ret;
}

/** WGS-84 → GCJ-02（正算） */
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
    if (outOfChina(lng, lat)) return [lng, lat];
    let dLat = transformLat(lng - 105.0, lat - 35.0);
    let dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = (lat / 180.0) * PI;
    let magic = Math.sin(radLat);
    magic = 1 - EE * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
    dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
    return [lng + dLng, lat + dLat];
}

/** GCJ-02 → WGS-84（反算，迭代逼近至亚米级） */
export function gcj02ToWgs84(lng: number, lat: number): [number, number] {
    if (outOfChina(lng, lat)) return [lng, lat];
    let wgsLng = lng;
    let wgsLat = lat;
    for (let i = 0; i < 10; i++) {
        const [gLng, gLat] = wgs84ToGcj02(wgsLng, wgsLat);
        const dLng = gLng - lng;
        const dLat = gLat - lat;
        wgsLng -= dLng;
        wgsLat -= dLat;
        if (Math.abs(dLng) < 1e-9 && Math.abs(dLat) < 1e-9) break;
    }
    return [wgsLng, wgsLat];
}
