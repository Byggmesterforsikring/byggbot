import { AnalysisPlugin } from '../AnalysisPlugin';

class TopMoversPlugin extends AnalysisPlugin {
    constructor() {
        super({
            id: 'topMovers',
            name: 'Største Endringer',
            description: 'Se hvem/hva som har økt eller sunket mest mellom de to periodene du sammenligner',
            category: 'comparison',
            complexity: 'low',
            icon: '📈',
            requiresComparison: true,
            minDataPoints: 2,
            userExplanation: 'Denne analysen hjelper deg å identifisere hvilke kunder, produkter eller regioner som har hatt de største endringene (både positive og negative) mellom de to periodene du sammenligner.',
            useCase: 'Perfekt for å finne ut hvilke salgsrep som har forbedret seg mest, eller hvilke produkter som har gått tilbake.'
        });
    }

    isAvailable(data, dataB, hasCompare, reportType, chartLabels) {
        // Requires comparison data
        if (!hasCompare || !dataB || dataB.length === 0) return false;

        // Need at least one numeric field
        const numericFields = this.getNumericFields(data);
        if (numericFields.length === 0) return false;

        // Need at least one categorical field for grouping
        const categoricalFields = this.getCategoricalFields(data);
        if (categoricalFields.length === 0) return false;

        return data.length >= this.minDataPoints && dataB.length >= this.minDataPoints;
    }

    execute({ data, dataB, selectedMetric, groupField, topN = 10 }) {
        if (!data || !dataB || !selectedMetric || !groupField) {
            throw new Error('TopMovers analysis requires data, dataB, selectedMetric, and groupField');
        }

        // Aggregate data by group field
        const aggregateData = (dataset) => {
            const groups = {};
            dataset.forEach(row => {
                const group = row[groupField];
                const value = this.parseNumeric(row[selectedMetric]);
                if (!groups[group]) groups[group] = 0;
                groups[group] += value;
            });
            return groups;
        };

        const dataA = aggregateData(data);
        const dataBMap = aggregateData(dataB);

        // Calculate changes
        const changes = [];
        const allGroups = new Set([...Object.keys(dataA), ...Object.keys(dataBMap)]);

        allGroups.forEach(group => {
            const valueA = dataA[group] || 0;
            const valueB = dataBMap[group] || 0;

            const absoluteChange = valueA - valueB;
            const percentChange = valueB !== 0 ? ((valueA - valueB) / valueB) * 100 : (valueA > 0 ? 100 : 0);

            changes.push({
                group,
                valueA,
                valueB,
                absoluteChange,
                percentChange,
                direction: absoluteChange > 0 ? 'up' : absoluteChange < 0 ? 'down' : 'stable'
            });
        });

        // Sort by absolute change (biggest movers first)
        const topMovers = changes
            .sort((a, b) => Math.abs(b.absoluteChange) - Math.abs(a.absoluteChange))
            .slice(0, topN);

        // Prepare chart data
        const chartData = topMovers.map(item => ({
            name: item.group,
            'Periode A': item.valueA,
            'Periode B': item.valueB,
            'Endring': item.absoluteChange,
            'Endring %': item.percentChange,
            direction: item.direction
        }));

        return {
            type: 'topMovers',
            title: `De ${topN} Største Endringene`,
            subtitle: `Hvem/hva som har endret seg mest mellom periodene`,
            data: chartData,
            summary: {
                totalCategories: changes.length,
                biggestGainer: topMovers.find(m => m.direction === 'up'),
                biggestLoser: topMovers.find(m => m.direction === 'down'),
                averageChange: changes.reduce((sum, c) => sum + Math.abs(c.absoluteChange), 0) / changes.length
            },
            insights: this.generateInsights(topMovers, changes),
            visualization: {
                type: 'barChart',
                config: {
                    xAxis: 'name',
                    yAxes: ['Periode A', 'Periode B'],
                    colorBy: 'direction',
                    colors: {
                        up: '#10b981',
                        down: '#ef4444',
                        stable: '#6b7280'
                    }
                }
            }
        };
    }

    generateInsights(topMovers, allChanges) {
        const insights = [];

        const positiveChanges = allChanges.filter(c => c.direction === 'up');
        const negativeChanges = allChanges.filter(c => c.direction === 'down');

        if (topMovers.length > 0) {
            const biggest = topMovers[0];
            if (biggest.direction === 'up') {
                insights.push(`"${biggest.group}" har hatt den største forbedringen med en økning på ${Math.abs(biggest.absoluteChange).toLocaleString('nb-NO')}`);
            } else {
                insights.push(`"${biggest.group}" har hatt den største nedgangen med en reduksjon på ${Math.abs(biggest.absoluteChange).toLocaleString('nb-NO')}`);
            }
        }

        if (positiveChanges.length > negativeChanges.length) {
            insights.push(`${positiveChanges.length} kategorier har økt, mens ${negativeChanges.length} har gått ned - det er flere vinnere enn tapere!`);
        } else if (negativeChanges.length > positiveChanges.length) {
            insights.push(`${negativeChanges.length} kategorier har gått ned, mens ${positiveChanges.length} har økt - flere kategorier trenger oppmerksomhet`);
        }

        if (allChanges.length >= 5) {
            const topFive = topMovers.slice(0, 5);
            const topFiveTotal = topFive.reduce((sum, m) => sum + Math.abs(m.absoluteChange), 0);
            const totalChange = allChanges.reduce((sum, c) => sum + Math.abs(c.absoluteChange), 0);
            const percentage = (topFiveTotal / totalChange) * 100;
            insights.push(`De 5 største endringene utgjør ${percentage.toFixed(0)}% av all aktivitet - dette er hvor du bør fokusere`);
        }

        return insights;
    }

    parseNumeric(val) {
        if (typeof val === 'number') return val;
        const n = Number(String(val || '').replace(/kr\s*/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.'));
        return isNaN(n) ? 0 : n;
    }
}

export const topMoversPlugin = new TopMoversPlugin();
