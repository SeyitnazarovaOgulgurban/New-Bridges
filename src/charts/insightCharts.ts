import { init, use, graphic } from 'echarts/core';
import { PieChart, BarChart } from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

use([
    PieChart,
    BarChart,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    CanvasRenderer,
]);
import { S } from '../app/state';
import { getVisibleBridgesForMap } from '../map/markers';
import { formatDynastyLabel, t, translateMaterialLabel, translateRegionLabel } from '../i18n/i18n';

export function initCharts(): void {
    const dynastyChartEl = document.getElementById('dynastyChart');
    if (dynastyChartEl) {
        S.charts.dynasty = init(dynastyChartEl) as any;
    }

    const materialChartEl = document.getElementById('materialChart');
    if (materialChartEl) {
        S.charts.material = init(materialChartEl) as any;
    }

    const regionChartEl = document.getElementById('regionChart');
    if (regionChartEl) {
        S.charts.region = init(regionChartEl) as any;
    }

    const correlationChartEl = document.getElementById('correlationChart');
    if (correlationChartEl) {
        S.charts.correlation = init(correlationChartEl) as any;
    }

    updateCharts();

    window.addEventListener('resize', () => {
        Object.values(S.charts).forEach((chart) => chart.resize());
    });
}

export function updateCharts(): void {
    const visibleBridges = getVisibleBridgesForMap();
    if (visibleBridges.length === 0) {
        S.charts.dynasty?.clear();
        S.charts.material?.clear();
        S.charts.region?.clear();
        return;
    }

    const dynastyData: { [key: string]: number } = {};
    visibleBridges.forEach((b) => {
        const d = formatDynastyLabel(b.year);
        dynastyData[d] = (dynastyData[d] ?? 0) + 1;
    });

    if (Object.keys(dynastyData).length > 0 && S.charts.dynasty) {
        S.charts.dynasty.setOption({
            title: { text: t('chart.dynasty'), textStyle: { color: '#5a3e28', fontSize: 14 }, left: 'center' },
            tooltip: { trigger: 'item' },
            series: [
                {
                    type: 'pie',
                    radius: ['40%', '70%'],
                    data: Object.entries(dynastyData).map(([name, value]) => ({ name, value })),
                    label: { color: '#4a3728', fontSize: 10 },
                    emphasis: {
                        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' },
                    },
                },
            ],
        });
    }

    const materialData: { [key: string]: number } = {};
    visibleBridges.forEach((b) => {
        const raw = b.material?.trim() || t('material.unknown');
        materialData[raw] = (materialData[raw] ?? 0) + 1;
    });

    if (Object.keys(materialData).length > 0 && S.charts.material) {
        const sorted = Object.entries(materialData).sort((a, b) => a[1] - b[1]);
        const materialLabels = sorted.map(([k]) => translateMaterialLabel(k));
        const materialValues = sorted.map(([, v]) => v);
        S.charts.material.setOption({
            title: { text: t('chart.material'), textStyle: { color: '#5a3e28', fontSize: 14 }, left: 'center', top: 0 },
            tooltip: { trigger: 'axis' },
            grid: { left: 90, right: 20, top: 30, bottom: 24 },
            yAxis: {
                type: 'category',
                data: materialLabels,
                axisLabel: { color: '#6b5744', fontSize: 10, width: 75, overflow: 'truncate' },
                axisLine: { lineStyle: { color: '#d5cbbe' } },
            },
            xAxis: {
                type: 'value',
                axisLabel: { color: '#6b5744', fontSize: 10 },
                axisLine: { lineStyle: { color: '#d5cbbe' } },
                splitLine: { lineStyle: { color: '#e8e0d4' } },
            },
            series: [
                {
                    type: 'bar',
                    data: materialValues,
                    itemStyle: {
                        color: new graphic.LinearGradient(1, 0, 0, 0, [
                            { offset: 0, color: '#D4AF37' },
                            { offset: 1, color: '#8B4513' },
                        ]),
                    },
                },
            ],
        });
    }

    const regionData: { [key: string]: number } = {};
    visibleBridges.forEach((b) => {
        const r = b.region?.trim() || '其他';
        if (r) {
            regionData[r] = (regionData[r] ?? 0) + 1;
        }
    });

    const regionKeys = Object.keys(regionData).filter((k) => k && k.trim());
    if (regionKeys.length > 0 && S.charts.region) {
        S.charts.region.setOption({
            title: { text: t('chart.region'), textStyle: { color: '#5a3e28', fontSize: 14 }, left: 'center', top: 0 },
            tooltip: { trigger: 'item' },
            series: [
                {
                    type: 'pie',
                    radius: ['25%', '55%'],
                    center: ['50%', '55%'],
                    roseType: 'radius',
                    data: regionKeys.map((name) => ({
                        name: translateRegionLabel(name),
                        value: regionData[name],
                    })),
                    label: { color: '#4a3728', fontSize: 10 },
                    itemStyle: {
                        borderRadius: 5,
                        borderColor: '#ffffff',
                        borderWidth: 2,
                    },
                    emphasis: {
                        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' },
                    },
                },
            ],
        });
    }
}
