import { useMemo } from 'react';
import { getFieldDisplayName, getValueDisplayName } from '../utils/labels';

export const useChartData = (filteredData, filteredDataB, hasCompare, isTimeSeriesData, selectedTimelineMetric) => {
    // Prepare chart data and dynamic labels (bar/pie mode)
    const chartData = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return [];

        // Find time field first for better axis selection
        const columns = Object.keys(filteredData[0]);
        const timeFieldCandidate = columns.find(col => {
            const v = filteredData[0][col];
            if (typeof v !== 'string') return false;
            return /^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s\d{4}$/.test(v) ||
                /^Q[1-4]\s\d{4}$/.test(v) ||
                /^\d{4}-\d{2}$/.test(v) ||
                /^\d{2}\.\d{2}\.\d{4}$/.test(v);
        });
        const groupField = timeFieldCandidate || columns.find(col =>
            typeof filteredData[0][col] === 'string' &&
            !col.toLowerCase().includes('sum') &&
            !col.toLowerCase().includes('antall')
        );

        // Use selected timeline metric or find the best numeric field for values
        const valueField = selectedTimelineMetric ||
            columns.find(col =>
                col.toLowerCase().includes('sum') ||
                col.toLowerCase().includes('utbetalt') ||
                col.toLowerCase().includes('beløp') ||
                col.toLowerCase().includes('premie') ||
                col.toLowerCase().includes('verdi') ||
                (typeof filteredData[0][col] === 'number' && col !== 'Antall')
            ) || 'Antall';

        // For timeline view: aggregate data by the primary time field if multi-field grouping detected
        let processedData = filteredData;

        if (isTimeSeriesData && columns.length > 3) { // More than just groupField + valueField + count suggests multi-field grouping
            console.log('🕐 Timeline aggregation: Multi-field data detected, aggregating by time field only');

            // Find the time-based field (usually first field with date patterns)
            const timeField = columns.find(col => {
                const value = filteredData[0][col];
                if (typeof value === 'string') {
                    return /^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s\d{4}$/.test(value) ||
                        /^Q[1-4]\s\d{4}$/.test(value) ||
                        /^\d{4}-\d{2}$/.test(value) ||
                        /^\d{2}\.\d{2}\.\d{4}$/.test(value);
                }
                return false;
            });

            if (timeField) {
                console.log('🎯 Found time field:', timeField, 'Aggregating data...');

                // Group by time field and sum up values
                const timeGroups = {};
                filteredData.forEach(row => {
                    const timeKey = row[timeField];
                    if (!timeGroups[timeKey]) {
                        timeGroups[timeKey] = {
                            [timeField]: timeKey,
                            totalValue: 0,
                            totalCount: 0
                        };
                    }

                    const value = parseFloat(String(row[valueField] || 0).replace(/kr\s*/gi, '').replace(/\s/g, '').replace(/,/g, '.')) || 0;
                    const count = row.Antall || 1;

                    timeGroups[timeKey].totalValue += value;
                    timeGroups[timeKey].totalCount += count;
                });

                // Convert back to array format
                processedData = Object.values(timeGroups).map(group => ({
                    [timeField]: group[timeField],
                    [valueField]: group.totalValue,
                    Antall: group.totalCount
                }));

                console.log('📊 Aggregated timeline data:', processedData.length, 'time periods');
            }
        }

        const chartRows = processedData.slice(0, 15).map((row, index) => ({
            name: row[groupField] || `Periode ${index + 1}`,
            value: parseFloat(String(row[valueField] || 0).replace(/kr\s*/gi, '').replace(/\s/g, '').replace(/,/g, '.')) || 0,
            count: row.Antall || 1,
            originalData: row,
            groupField,
            valueField
        }));

        // Sort time-series data chronologically if detected
        if (isTimeSeriesData && groupField) {
            return chartRows.sort((a, b) => {
                const aTime = a.originalData[groupField];
                const bTime = b.originalData[groupField];

                // Norwegian month sorting
                if (typeof aTime === 'string' && typeof bTime === 'string') {
                    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

                    const aMatch = aTime.match(/^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s(\d{4})$/);
                    const bMatch = bTime.match(/^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s(\d{4})$/);

                    if (aMatch && bMatch) {
                        const aYear = parseInt(aMatch[2]);
                        const bYear = parseInt(bMatch[2]);
                        if (aYear !== bYear) return aYear - bYear;

                        const aMonth = monthOrder.indexOf(aMatch[1]);
                        const bMonth = monthOrder.indexOf(bMatch[1]);
                        return aMonth - bMonth;
                    }
                }

                return a.name.localeCompare(b.name);
            });
        }

        return chartRows;
    }, [filteredData, isTimeSeriesData, selectedTimelineMetric]);

    // Build combined chart rows for A vs B when compare is active
    const comparativeChartData = useMemo(() => {
        if (!hasCompare || !filteredDataB || chartData.length === 0) return null;
        const groupField = chartData[0]?.groupField;
        const valueField = chartData[0]?.valueField;
        if (!groupField || !valueField) return null;

        // Map A
        const mapA = new Map(chartData.map(r => [r.name, r.value]));

        // Build B rows based on same fields
        const rowsB = filteredDataB.slice(0, 2000).map((row, index) => ({
            name: row[groupField] || `Periode ${index + 1}`,
            value: parseFloat(String(row[valueField] || 0).replace(/kr\s*/gi, '').replace(/\s/g, '').replace(/,/g, '.')) || 0
        }));

        const combined = new Map();
        chartData.forEach(r => combined.set(r.name, { name: r.name, A: r.value, B: 0 }));
        rowsB.forEach(r => {
            const existing = combined.get(r.name);
            if (existing) existing.B = r.value; else combined.set(r.name, { name: r.name, A: 0, B: r.value });
        });

        return Array.from(combined.values())
            .sort((a, b) => (b.A + b.B) - (a.A + a.B))
            .slice(0, 15);
    }, [hasCompare, filteredDataB, chartData]);

    // Dynamic chart labels
    const chartLabels = useMemo(() => {
        if (!filteredData || filteredData.length === 0 || chartData.length === 0) {
            return {
                groupFieldName: 'Kategori',
                valueFieldName: 'Verdi',
                chartTitle: 'Data Oversikt',
                pieTitle: 'Fordeling av Data'
            };
        }

        const groupField = chartData[0]?.groupField || 'Kategori';
        const valueField = chartData[0]?.valueField || 'Verdi';

        const groupDisplayName = getFieldDisplayName(groupField);
        const valueDisplayName = getValueDisplayName(valueField);

        return {
            groupFieldName: groupDisplayName,
            valueFieldName: valueDisplayName,
            chartTitle: `${valueDisplayName} per ${groupDisplayName}`,
            pieTitle: `Fordeling av ${valueDisplayName}`
        };
    }, [filteredData, chartData]);

    return {
        chartData,
        comparativeChartData,
        chartLabels
    };
};
