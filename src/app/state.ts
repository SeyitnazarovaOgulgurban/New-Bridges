import type { ECharts } from 'echarts/core';
import type { Bridge } from '../types';
import type { AnyMap } from '../map/mapEnv';

export const S = {
    map: undefined as AnyMap | undefined,
    bridges: [] as Bridge[],
    markerMap: new Map<string, { marker: AnyMap; year: number; bridge: Bridge }>(),
    currentYear: 600,
    isPlaying: false,
    playInterval: undefined as number | undefined,
    charts: {} as Record<string, ECharts>,
    lastChartUpdate: 0,
    /** Popup 打开时锁定左侧图为该桥（有图才生效） */
    dockUserLockedBridge: null as Bridge | null,
    /** 胶片轮播自动打开 Popup 时不应触发锁定（避免停住轮播） */
    dockSuppressPopupDockLock: false,
    /** 胶片游标：在 getMappableBridgesSorted(当年) 全量时间序中的下标；无图桥仍会前进游标，展示时跳过 */
    dockSlideshowIndex: 0,
    /** 播放：在 getPlayableBridgesChronological() 中的下标，与时间轴「每座桥一拍」同步 */
    playChronologicalIndex: 0,
    /** 播放中：地图上只显示时间序前 N 座桥（逐座累加）；暂停后仍按年份规则 */
    playMarkersRevealCount: 0,
    dockSlideInterval: undefined as number | undefined,
};
