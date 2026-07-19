export interface Dynasty {
    /** 稳定 id，供 i18n（dynasty.* / dynastyShort.*） */
    id: string;
    name: string;
    start: number;
    end: number;
    color: string;
}

export const dynasties: Dynasty[] = [
    { id: 'sui', name: '隋', start: 581, end: 618, color: '#2d5016' },
    { id: 'tang', name: '唐', start: 618, end: 907, color: '#4a7c23' },
    { id: 'five', name: '五代十国', start: 907, end: 960, color: '#777777' },
    { id: 'song', name: '宋', start: 960, end: 1279, color: '#8B4513' },
    { id: 'yuan', name: '元', start: 1279, end: 1368, color: '#C9302C' },
    { id: 'ming', name: '明', start: 1368, end: 1644, color: '#D4AF37' },
    { id: 'qing', name: '清', start: 1644, end: 1911, color: '#00A86B' },
];

/** 用于统计去重、图表分组键（与语言无关） */
export function getDynastyPeriodId(year: number): string {
    if (!Number.isFinite(year)) {
        return 'unknown';
    }
    for (let i = 0; i < dynasties.length; i++) {
        const d = dynasties[i]!;
        const isLast = i === dynasties.length - 1;
        if (year >= d.start && (isLast ? year <= d.end : year < d.end)) {
            return d.id;
        }
    }
    if (year < 581) {
        return 'preSui';
    }
    return 'unknown';
}
