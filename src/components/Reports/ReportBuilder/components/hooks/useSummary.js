import { useMemo } from 'react';

export function useSummary(filteredData) {
    return useMemo(() => {
        if (!Array.isArray(filteredData) || filteredData.length === 0) return {};

        const columns = Object.keys(filteredData[0]);
        const sumFields = columns.filter(col =>
            col.toLowerCase().includes('sum') ||
            col.toLowerCase().includes('utbetalt') ||
            col.toLowerCase().includes('beløp')
        );

        let totalValue = 0;
        let totalCount = 0;
        let maxValue = 0;
        let topPerformer = '';

        filteredData.forEach(row => {
            const value = parseFloat(String(row[sumFields[0]] || 0).replace(/kr\s*/gi, '').replace(/\s/g, '').replace(/,/g, '.')) || 0;
            totalValue += value;
            totalCount += row.Antall || 1;
            if (value > maxValue) {
                maxValue = value;
                topPerformer = row[Object.keys(row)[0]] || 'Ukjent';
            }
        });

        return {
            totalValue,
            totalCount,
            averageValue: totalCount > 0 ? totalValue / totalCount : 0,
            topPerformer,
            maxValue,
            groupCount: filteredData.length
        };
    }, [filteredData]);
}


