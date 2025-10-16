import { toRaw } from '../utils/formatters';

export async function copyTable(filteredData, filteredDataB, hasCompare) {
    if (!Array.isArray(filteredData) || filteredData.length === 0) return;
    const headers = Object.keys(filteredData[0]);
    const lines = [];
    if (!hasCompare) lines.push(headers.join('\t'));
    filteredData.forEach(row => { lines.push(headers.map(h => toRaw(row[h], h)).join('\t')); });
    if (hasCompare && Array.isArray(filteredDataB) && filteredDataB.length > 0) {
        filteredDataB.forEach(row => { lines.push(headers.map(h => toRaw(row[h], h)).join('\t')); });
    }
    const content = lines.join('\n');
    await navigator.clipboard.writeText(content);
}

export async function copyDrilldown(drillDownData, includeAllColumns, includeAllRows) {
    if (!drillDownData || !drillDownData.sourceRecords?.length) return;
    const records = includeAllRows ? drillDownData.sourceRecords : drillDownData.sourceRecords.slice(0, 100);
    const allColumns = Object.keys(drillDownData.sourceRecords[0] || {});
    const columns = includeAllColumns ? allColumns : allColumns.slice(0, 10);
    const csvContent = [
        columns.join('\t'),
        ...records.map(record => columns.map(col => toRaw(record[col], col)).join('\t'))
    ].join('\n');
    await navigator.clipboard.writeText(csvContent);
}


