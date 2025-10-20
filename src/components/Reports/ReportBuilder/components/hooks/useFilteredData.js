import { useMemo } from 'react';

export function useFilteredData(data, dataB, activeFilters, hasCompare) {
    // Filter data based on active filters
    const filteredData = useMemo(() => {
        if (!Array.isArray(data) || Object.keys(activeFilters || {}).length === 0) {
            return data || [];
        }
        return data.filter(row => {
            return Object.entries(activeFilters).every(([field, selectedValues]) => {
                if (!selectedValues || selectedValues.length === 0) return true;
                const fieldValue = row[field];
                return selectedValues.includes(fieldValue);
            });
        });
    }, [data, activeFilters]);

    // Apply same interactive filters to comparison dataset
    const filteredDataB = useMemo(() => {
        if (!hasCompare || !Array.isArray(dataB)) return null;
        if (Object.keys(activeFilters || {}).length === 0) return dataB;
        return dataB.filter(row => {
            return Object.entries(activeFilters).every(([field, selectedValues]) => {
                if (!selectedValues || selectedValues.length === 0) return true;
                const fieldValue = row[field];
                return selectedValues.includes(fieldValue);
            });
        });
    }, [dataB, activeFilters, hasCompare]);

    // Get available filter options for each field (union of A and B)
    const filterOptions = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) return {};
        const unionRows = hasCompare && Array.isArray(dataB) ? [...data, ...dataB] : data;
        const options = {};
        const columns = Object.keys(unionRows[0] || {});
        columns.forEach(column => {
            const uniqueValues = [...new Set(unionRows.map(row => row[column]))]
                .filter(value => value !== null && value !== undefined && value !== '')
                .sort();
            if (uniqueValues.length > 1 && uniqueValues.length <= 50) {
                options[column] = uniqueValues;
            }
        });
        return options;
    }, [data, hasCompare, dataB]);

    return { filteredData, filteredDataB, filterOptions };
}


