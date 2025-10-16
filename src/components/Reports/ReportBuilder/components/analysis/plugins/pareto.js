import { AnalysisPlugin } from '../AnalysisPlugin';

class ParetoPlugin extends AnalysisPlugin {
    constructor() {
        super({
            id: 'pareto',
            name: '80/20 Analyse',
            description: 'Finn ut hvilke få kunder/produkter som gir deg mesteparten av inntektene',
            category: 'distribution',
            complexity: 'low',
            icon: '📊',
            requiresComparison: false,
            minDataPoints: 3,
            userExplanation: 'Basert på 80/20-regelen: Ofte kommer 80% av inntektene fra bare 20% av kundene dine. Denne analysen viser deg hvem disse "gulleggene" er, så du kan fokusere mer på dem.',
            useCase: 'Perfekt for å prioritere kundeoppfølging, markedsføringsbudsjett og salgsressurser der det gir mest utbytte.'
        });
    }

    isAvailable(data, dataB, hasCompare, reportType, chartLabels) {
        // Need at least one numeric field
        const numericFields = this.getNumericFields(data);
        if (numericFields.length === 0) return false;

        // Need at least one categorical field for grouping
        const categoricalFields = this.getCategoricalFields(data);
        if (categoricalFields.length === 0) return false;

        return data.length >= this.minDataPoints;
    }

    execute({ data, selectedMetric, groupField, includeOthers = true }) {
        if (!data || !selectedMetric || !groupField) {
            throw new Error('Pareto analysis requires data, selectedMetric, and groupField');
        }

        // Aggregate data by group field
        const groups = {};
        data.forEach(row => {
            const group = row[groupField];
            const value = this.parseNumeric(row[selectedMetric]);
            if (!groups[group]) groups[group] = 0;
            groups[group] += value;
        });

        // Convert to array and sort by value (descending)
        const sortedData = Object.entries(groups)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Calculate total and cumulative percentages
        const total = sortedData.reduce((sum, item) => sum + item.value, 0);
        let cumulative = 0;

        const paretoData = sortedData.map((item, index) => {
            cumulative += item.value;
            const percentage = (item.value / total) * 100;
            const cumulativePercentage = (cumulative / total) * 100;

            return {
                name: item.name,
                value: item.value,
                percentage,
                cumulativePercentage,
                rank: index + 1,
                isTop80: cumulativePercentage <= 80
            };
        });

        // Find 80% cutoff point
        const top80Index = paretoData.findIndex(item => item.cumulativePercentage > 80);
        const top80Count = top80Index === -1 ? paretoData.length : top80Index;

        // Separate top contributors and others
        const topContributors = paretoData.slice(0, top80Count);
        const others = paretoData.slice(top80Count);

        // Create visualization data
        let chartData = [...topContributors];

        if (includeOthers && others.length > 0) {
            const othersTotal = others.reduce((sum, item) => sum + item.value, 0);
            const othersPercentage = (othersTotal / total) * 100;

            chartData.push({
                name: `Andre (${others.length})`,
                value: othersTotal,
                percentage: othersPercentage,
                cumulativePercentage: 100,
                rank: top80Count + 1,
                isOthers: true
            });
        }

        // Calculate insights
        const top20PercentCount = Math.ceil(paretoData.length * 0.2);
        const top20PercentValue = paretoData.slice(0, top20PercentCount).reduce((sum, item) => sum + item.value, 0);
        const top20PercentContribution = (top20PercentValue / total) * 100;

        return {
            type: 'pareto',
            title: 'Pareto Analyse (80/20 Regel)',
            subtitle: `Fordeling av ${selectedMetric} per ${groupField}`,
            data: chartData,
            summary: {
                totalCategories: paretoData.length,
                top80Count,
                top80Percentage: top80Count > 0 ? (topContributors.reduce((sum, item) => sum + item.value, 0) / total) * 100 : 0,
                top20PercentCount,
                top20PercentContribution,
                paretoEfficiency: top20PercentContribution >= 80 ? 'Høy' : top20PercentContribution >= 60 ? 'Middels' : 'Lav'
            },
            insights: [
                `Top ${top20PercentCount} kategorier (20%) står for ${top20PercentContribution.toFixed(1)}% av total verdi`,
                `${top80Count} kategorier kreves for å nå 80% av total verdi`,
                topContributors.length > 0 ? `"${topContributors[0].name}" er den største bidragsyteren med ${topContributors[0].percentage.toFixed(1)}%` : null
            ].filter(Boolean),
            visualization: {
                type: 'paretoChart',
                config: {
                    primaryAxis: 'value',
                    secondaryAxis: 'cumulativePercentage',
                    barColor: '#3b82f6',
                    lineColor: '#ef4444',
                    paretoLine: true,
                    showPercentageLabels: true
                }
            }
        };
    }

    parseNumeric(val) {
        if (typeof val === 'number') return val;
        const n = Number(String(val || '').replace(/kr\s*/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.'));
        return isNaN(n) ? 0 : n;
    }
}

export const paretoPlugin = new ParetoPlugin();
