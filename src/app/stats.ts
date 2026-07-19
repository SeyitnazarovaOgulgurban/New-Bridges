import { getDynastyPeriodId } from '../constants/dynasty';
import { getVisibleBridgesForMap } from '../map/markers';
import { S } from './state';

export function updateStats(): void {
    const totalBridgesEl = document.getElementById('totalBridges');
    if (totalBridgesEl) {
        totalBridgesEl.textContent = getVisibleBridgesForMap().length.toString();
    }

    const dynastySet = new Set(S.bridges.map((b) => getDynastyPeriodId(b.year)));
    const dynastyCountEl = document.getElementById('dynastyCount');
    if (dynastyCountEl) dynastyCountEl.textContent = dynastySet.size.toString();

    const provinceSet = new Set(S.bridges.map((b) => b.province).filter(Boolean));
    const provinceCountEl = document.getElementById('provinceCount');
    if (provinceCountEl) provinceCountEl.textContent = provinceSet.size.toString();
}
