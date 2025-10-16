import { useMemo, useEffect } from 'react';
import { getOrderKey, normalizeTimeLabelSimple, sortCanonicalLabels } from '../utils/time';
import { parseNumeric } from '../utils/formatters';

const DEBUG_TIMELINE = true;

export const useTimelineData = (
    filteredData,
    filteredDataB,
    hasCompare,
    detectTimeField,
    selectedTimelineMetric,
    seriesDimension,
    seriesTopN
) => {
    // Available timeline metrics
    const availableTimelineMetrics = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return [];

        const columns = Object.keys(filteredData[0]);
        const metrics = [];

        // Add numeric fields as metrics
        columns.forEach(col => {
            const value = filteredData[0][col];
            if (typeof value === 'number' && value !== null) {
                metrics.push({
                    key: col,
                    label: col === 'Antall' ? 'Antall poster' :
                        col.toLowerCase().includes('sum') ? col.replace('Sum', '') :
                            col.toLowerCase().includes('utbetalt') ? 'Utbetalt beløp' :
                                col.toLowerCase().includes('premie') ? 'Premie' :
                                    col.toLowerCase().includes('beløp') ? 'Beløp' :
                                        col.toLowerCase().includes('verdi') ? 'Verdi' : col,
                    isCurrency: col.toLowerCase().includes('sum') ||
                        col.toLowerCase().includes('utbetalt') ||
                        col.toLowerCase().includes('premie') ||
                        col.toLowerCase().includes('beløp') ||
                        col.toLowerCase().includes('verdi'),
                    isCount: col === 'Antall' || col.toLowerCase().includes('antall')
                });
            }
        });

        return metrics;
    }, [filteredData]);

    // Detect time field
    const timeField = useMemo(() => {
        const sampleRow = (filteredData && filteredData[0]) || (filteredDataB && filteredDataB[0]);
        if (!sampleRow) return null;
        const columns = Object.keys(sampleRow);
        const isTimeLabel = (v) => {
            if (typeof v !== 'string') return false;
            return /^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s\d{4}$/.test(v) ||
                /^Q[1-4]\s\d{4}$/.test(v) ||
                /^\d{4}-\d{2}$/.test(v) ||
                /^\d{2}\.\d{2}\.\d{4}$/.test(v) ||
                /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/i.test(v) ||
                /^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)$/.test(v) ||
                /^Q[1-4]$/.test(v);
        };
        const detected = columns.find(c => isTimeLabel(sampleRow[c])) || null;
        if (!detected) {
            const commonCandidates = ['ProductionDate', 'Date', 'Måned', 'Month', 'Quarter'];
            return columns.find(c => commonCandidates.includes(c)) || null;
        }
        return detected;
    }, [filteredData, filteredDataB]);

    // Time series A
    const timeSeriesA = useMemo(() => {
        if (!timeField || !filteredData || filteredData.length === 0) return [];
        const valueField = selectedTimelineMetric || Object.keys(filteredData[0]).find(k => typeof filteredData[0][k] === 'number') || 'Antall';
        const map = new Map();
        filteredData.forEach(row => {
            const key = row[timeField];
            const val = parseNumeric(row[valueField]);
            map.set(key, (map.get(key) || 0) + val);
        });
        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => getOrderKey(a.name) > getOrderKey(b.name) ? 1 : -1);
    }, [filteredData, timeField, selectedTimelineMetric]);

    // Time series B
    const timeSeriesB = useMemo(() => {
        if (!hasCompare || !filteredDataB || !timeField) return null;
        const valueField = selectedTimelineMetric || Object.keys(filteredDataB[0] || {}).find(k => typeof (filteredDataB[0] || {})[k] === 'number') || 'Antall';
        const map = new Map();
        (filteredDataB || []).forEach(row => {
            const key = row[timeField];
            const val = parseNumeric(row[valueField]);
            map.set(key, (map.get(key) || 0) + val);
        });
        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => getOrderKey(a.name) > getOrderKey(b.name) ? 1 : -1);
    }, [filteredDataB, hasCompare, timeField, selectedTimelineMetric]);

    // Combined time series for comparison
    const combinedTimeSeries = useMemo(() => {
        if (!hasCompare || !timeSeriesA || !timeSeriesB) return null;

        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
        const normalizeMonth = (label) => {
            const m = label.match(/^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s\d{4}$/);
            if (m) return m[1];
            const ym = label.match(/^(\d{4})-(\d{2})$/);
            if (ym) return monthOrder[parseInt(ym[2]) - 1];
            return null;
        };
        const normalizeQuarter = (label) => {
            const q = label.match(/^Q([1-4])\s\d{4}$/);
            return q ? `Q${q[1]}` : null;
        };

        const sample = (timeSeriesA?.[0]?.name || '') + ' ' + (timeSeriesB?.[0]?.name || '');
        const isQuarter = /^.*(Q[1-4]\s\d{4}|Q[1-4]).*$/.test(sample);
        const isMonth = !isQuarter && /((Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s\d{4}|\d{4}-\d{2}|\b(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\b)/.test(sample);

        if (isQuarter) {
            const present = new Set();
            timeSeriesA.forEach(x => { const k = normalizeQuarter(x.name); if (k) present.add(k); });
            timeSeriesB.forEach(x => { const k = normalizeQuarter(x.name); if (k) present.add(k); });
            const canonical = ['Q1', 'Q2', 'Q3', 'Q4'].filter(q => present.has(q));
            const aMap = new Map();
            const bMap = new Map();
            timeSeriesA.forEach(x => { const k = normalizeQuarter(x.name); if (k) aMap.set(k, (aMap.get(k) || 0) + x.value); });
            timeSeriesB.forEach(x => { const k = normalizeQuarter(x.name); if (k) bMap.set(k, (bMap.get(k) || 0) + x.value); });
            return canonical.map(k => ({ name: k, A: aMap.get(k) || 0, B: bMap.get(k) || 0 }));
        }

        if (isMonth) {
            const present = [];
            timeSeriesA.forEach(x => { const k = normalizeMonth(x.name); if (k) present.push(k); });
            timeSeriesB.forEach(x => { const k = normalizeMonth(x.name); if (k) present.push(k); });
            const idxs = present.map(m => monthOrder.indexOf(m)).filter(i => i >= 0);
            const minIdx = Math.min(...idxs);
            const maxIdx = Math.max(...idxs);
            const canonical = monthOrder.slice(Math.max(0, minIdx), Math.min(monthOrder.length, maxIdx + 1));
            const aMap = new Map();
            const bMap = new Map();
            timeSeriesA.forEach(x => { const k = normalizeMonth(x.name); if (k) aMap.set(k, (aMap.get(k) || 0) + x.value); });
            timeSeriesB.forEach(x => { const k = normalizeMonth(x.name); if (k) bMap.set(k, (bMap.get(k) || 0) + x.value); });
            return canonical.map(k => ({ name: k, A: aMap.get(k) || 0, B: bMap.get(k) || 0 }));
        }

        const mapA = new Map(timeSeriesA.map(x => [x.name, x.value]));
        const mapB = new Map(timeSeriesB.map(x => [x.name, x.value]));
        const labels = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));
        return labels
            .map(name => ({ name, A: mapA.get(name) || 0, B: mapB.get(name) || 0 }))
            .sort((a, b) => getOrderKey(a.name) > getOrderKey(b.name) ? 1 : -1);
    }, [hasCompare, timeSeriesA, timeSeriesB]);

    // Series dimension options
    const seriesDimensionOptions = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return [];
        const cols = Object.keys(filteredData[0]);
        const candidates = cols.filter(c => {
            if (c === timeField) return false;
            const v = filteredData[0][c];
            const isString = typeof v === 'string';
            const isAgg = String(c).toLowerCase().includes('sum') || String(c).toLowerCase().includes('antall');
            return isString && !isAgg;
        });
        return candidates;
    }, [filteredData, timeField]);

    // Category series data (single period)
    const categorySeriesData = useMemo(() => {
        if (!seriesDimension || hasCompare) return null;
        if (!timeField || !filteredData || filteredData.length === 0) return null;

        const valueField = selectedTimelineMetric || Object.keys(filteredData[0]).find(k => typeof filteredData[0][k] === 'number') || 'Antall';
        const timeToCatMap = new Map();
        const totalsByCat = new Map();
        filteredData.forEach(row => {
            const t = row[timeField];
            const cat = row[seriesDimension];
            const val = parseNumeric(row[valueField]);
            if (!timeToCatMap.has(t)) timeToCatMap.set(t, new Map());
            const inner = timeToCatMap.get(t);
            inner.set(cat, (inner.get(cat) || 0) + val);
            totalsByCat.set(cat, (totalsByCat.get(cat) || 0) + val);
        });

        const sortedCats = Array.from(totalsByCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, seriesTopN).map(([k]) => k);
        const sanitize = (s) => {
            const base = String(s)
                .replace(/[ÆÄÅ]/g, 'A').replace(/[æäå]/g, 'a')
                .replace(/[ØÖ]/g, 'O').replace(/[øö]/g, 'o')
                .replace(/[ÉÈËÊ]/g, 'E').replace(/[éèëê]/g, 'e');
            return base.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        };
        const catIds = sortedCats.map(label => ({ id: sanitize(label), label }));

        const rows = Array.from(timeToCatMap.entries())
            .map(([name, inner]) => {
                const row = { name };
                catIds.forEach(({ id, label }) => { row[id] = inner.get(label) || 0; });
                return row;
            })
            .sort((a, b) => getOrderKey(a.name) > getOrderKey(b.name) ? 1 : -1);
        return { rows, categories: catIds };
    }, [seriesDimension, hasCompare, timeField, filteredData, selectedTimelineMetric, seriesTopN]);

    // Category series data (comparison)
    const categorySeriesCompareData = useMemo(() => {
        if (!seriesDimension || !hasCompare) return null;
        if (!timeField || !filteredData || !filteredDataB) return null;

        const valueFieldA = selectedTimelineMetric || Object.keys(filteredData[0]).find(k => typeof filteredData[0][k] === 'number') || 'Antall';
        const valueFieldB = selectedTimelineMetric || Object.keys(filteredDataB[0]).find(k => typeof filteredDataB[0][k] === 'number') || 'Antall';

        const acc = (rows, vf) => {
            const timeToCat = new Map();
            const totals = new Map();
            rows.forEach(row => {
                const tRaw = row[timeField];
                const t = normalizeTimeLabelSimple(tRaw);
                const cat = row[seriesDimension];
                const val = parseNumeric(row[vf]);
                if (!timeToCat.has(t)) timeToCat.set(t, new Map());
                const inner = timeToCat.get(t);
                inner.set(cat, (inner.get(cat) || 0) + val);
                totals.set(cat, (totals.get(cat) || 0) + val);
            });
            return { timeToCat, totals };
        };

        const { timeToCat: tA, totals: totalsA } = acc(filteredData, valueFieldA);
        const { timeToCat: tB, totals: totalsB } = acc(filteredDataB, valueFieldB);

        const combinedTotals = new Map();
        const addTotals = (m) => m.forEach((v, k) => combinedTotals.set(k, (combinedTotals.get(k) || 0) + v));
        addTotals(totalsA); addTotals(totalsB);
        const sortedCats = Array.from(combinedTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, seriesTopN).map(([k]) => k);
        const sanitize = (s) => {
            const base = String(s)
                .replace(/[ÆÄÅ]/g, 'A').replace(/[æäå]/g, 'a')
                .replace(/[ØÖ]/g, 'O').replace(/[øö]/g, 'o')
                .replace(/[ÉÈËÊ]/g, 'E').replace(/[éèëê]/g, 'e');
            return base.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        };
        const catIds = sortedCats.map(label => ({ id: sanitize(label), label }));

        const rawLabels = new Set([...tA.keys(), ...tB.keys()]);
        const labels = sortCanonicalLabels(Array.from(rawLabels));
        const rows = Array.from(labels).map(name => {
            const row = { name };
            const innerA = tA.get(name) || new Map();
            const innerB = tB.get(name) || new Map();
            catIds.forEach(({ id, label }) => {
                row[`${id}_A`] = innerA.get(label) || 0;
                row[`${id}_B`] = innerB.get(label) || 0;
            });
            return row;
        });

        return { rows, categories: catIds };
    }, [seriesDimension, hasCompare, timeField, filteredData, filteredDataB, selectedTimelineMetric, seriesTopN]);

    // Chart keys for forcing re-render
    const seriesChartKeyCompare = useMemo(() => {
        if (!hasCompare || !seriesDimension || !categorySeriesCompareData) return 'no-series';
        return categorySeriesCompareData.categories.map(c => c.id).join('|');
    }, [hasCompare, seriesDimension, categorySeriesCompareData]);

    const seriesChartKeySingle = useMemo(() => {
        if (!seriesDimension || !categorySeriesData) return 'no-series';
        return (categorySeriesData.categories || []).map(c => (typeof c === 'string' ? c : c.id)).join('|');
    }, [seriesDimension, categorySeriesData]);

    const expectedKeysCompare = useMemo(() => {
        if (!categorySeriesCompareData) return [];
        return (categorySeriesCompareData.categories || []).flatMap(c => [`${c.id}_A`, `${c.id}_B`]);
    }, [categorySeriesCompareData]);

    // Debug logging
    useEffect(() => {
        if (!DEBUG_TIMELINE) return;
        console.log('[RB-TIMELINE] timeField =', timeField);
        console.log('[RB-TIMELINE] timeSeriesA len =', timeSeriesA?.length, 'sample =', timeSeriesA?.slice ? timeSeriesA.slice(0, 3) : timeSeriesA);
        console.log('[RB-TIMELINE] timeSeriesB len =', timeSeriesB?.length, 'sample =', timeSeriesB?.slice ? timeSeriesB.slice(0, 3) : timeSeriesB);
        console.log('[RB-TIMELINE] combinedTimeSeries len =', combinedTimeSeries?.length, 'sample =', combinedTimeSeries?.slice ? combinedTimeSeries.slice(0, 3) : combinedTimeSeries);
    }, [timeField, timeSeriesA, timeSeriesB, combinedTimeSeries]);

    return {
        availableTimelineMetrics,
        timeField,
        timeSeriesA,
        timeSeriesB,
        combinedTimeSeries,
        seriesDimensionOptions,
        categorySeriesData,
        categorySeriesCompareData,
        seriesChartKeyCompare,
        seriesChartKeySingle,
        expectedKeysCompare
    };
};
