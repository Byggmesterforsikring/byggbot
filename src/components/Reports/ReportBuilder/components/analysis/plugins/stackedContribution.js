import { AnalysisPlugin } from '../AnalysisPlugin';

class StackedContributionPlugin extends AnalysisPlugin {
    constructor() {
        super({
            id: 'stackedContribution',
            name: 'Stacked Bidrag',
            description: 'Vis hvordan ulike kategorier bidrar til total over tid',
            category: 'trend',
            complexity: 'medium',
            icon: '📚',
            requiresTimeSeries: true,
            minDataPoints: 3,
            userExplanation: 'Denne analysen viser deg hvordan ulike deler (som salgsrep, produkter eller regioner) bidrar til totalen din over tid. Du ser både absolutte tall og relative andeler.',
            useCase: 'Perfekt for å forstå hvilke deler av virksomheten som vokser/krymper, og hvordan sammensetningen endrer seg over tid.'
        });
    }

    isAvailable(data, dataB, hasCompare, reportType, chartLabels) {
        // Requires time-series data
        if (!this.hasTimeSeriesData(data)) return false;

        // Need at least one numeric field
        const numericFields = this.getNumericFields(data);
        if (numericFields.length === 0) return false;

        // Need at least one categorical field for stacking
        const categoricalFields = this.getCategoricalFields(data);
        if (categoricalFields.length === 0) return false;

        return data.length >= this.minDataPoints;
    }

    execute(params) {
        const { data, selectedMetric, timeField, groupField } = params;
        
        if (!data || data.length === 0) {
            throw new Error('Ingen data tilgjengelig for stacked contribution analyse');
        }

        // Find fields
        const timeFieldName = this.detectTimeField(data, timeField);
        const metricFieldName = selectedMetric || this.getNumericFields(data)[0];
        const categoryFieldName = groupField || this.getCategoricalFields(data)[0];
        
        if (!timeFieldName || !metricFieldName || !categoryFieldName) {
            throw new Error('Kan ikke finne nødvendige felt for stacked contribution analyse');
        }

        // Group data by time and category
        const timeGrouped = {};
        const categories = new Set();
        
        data.forEach(row => {
            const dateValue = row[timeFieldName];
            const metricValue = parseFloat(row[metricFieldName]) || 0;
            const category = row[categoryFieldName] || 'Ukjent';
            
            if (!dateValue) return;
            
            const date = new Date(dateValue);
            const timeKey = this.formatTimeKey(date, timeFieldName);
            
            if (!timeGrouped[timeKey]) {
                timeGrouped[timeKey] = {
                    timeKey,
                    date,
                    total: 0,
                    categories: {}
                };
            }
            
            if (!timeGrouped[timeKey].categories[category]) {
                timeGrouped[timeKey].categories[category] = 0;
            }
            
            timeGrouped[timeKey].categories[category] += metricValue;
            timeGrouped[timeKey].total += metricValue;
            categories.add(category);
        });

        // Convert to chart data format
        const sortedTimeData = Object.values(timeGrouped)
            .sort((a, b) => a.date - b.date);

        const chartData = sortedTimeData.map(timeData => {
            const row = {
                time: timeData.timeKey,
                total: timeData.total
            };
            
            // Add each category as a separate field
            Array.from(categories).forEach(category => {
                row[category] = timeData.categories[category] || 0;
            });
            
            return row;
        });

        // Calculate percentage contribution over time
        const percentageData = chartData.map(row => {
            const percentageRow = { time: row.time, total: row.total };
            Array.from(categories).forEach(category => {
                percentageRow[`${category}_percent`] = row.total > 0 ? (row[category] / row.total * 100) : 0;
            });
            return percentageRow;
        });

        // Calculate contribution trends for each category
        const contributionTrends = this.calculateContributionTrends(chartData, categories);
        
        // Generate insights
        const insights = this.generateContributionInsights(contributionTrends, categories);

        return {
            type: 'stackedContribution',
            title: 'Stacked Bidrag',
            subtitle: `Hvordan ${categoryFieldName} bidrar til ${metricFieldName} over tid`,
            data: chartData,
            percentageData: percentageData,
            contributionTrends: contributionTrends,
            chartConfig: {
                type: 'stackedArea',
                xField: 'time',
                yField: metricFieldName,
                seriesField: Array.from(categories),
                title: 'Bidrag over tid',
                subtitle: 'Stacked områdediagram'
            },
            summary: {
                'Kategorier': categories.size,
                'Tidsperioder': chartData.length,
                'Størst bidragsyter': contributionTrends.largest?.category || 'N/A',
                'Raskest voksende': contributionTrends.fastestGrowing?.category || 'N/A',
                'Total verdi': this.formatNumber(chartData.reduce((sum, row) => sum + row.total, 0))
            },
            insights: insights
        };
    }

    formatTimeKey(date, timeFieldName) {
        // Format based on data granularity
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        // If we have daily data, group by month
        // If we have monthly data, use month
        // If we have yearly data, use year
        return `${year}-${month.toString().padStart(2, '0')}`;
    }

    calculateContributionTrends(chartData, categories) {
        const trends = {};
        let largestContributor = null;
        let fastestGrowing = null;
        
        Array.from(categories).forEach(category => {
            const values = chartData.map(row => row[category] || 0);
            const total = values.reduce((sum, val) => sum + val, 0);
            const average = total / values.length;
            
            // Calculate growth rate (first vs last)
            const first = values[0] || 0;
            const last = values[values.length - 1] || 0;
            const growthRate = first > 0 ? ((last - first) / first * 100) : 0;
            
            trends[category] = {
                category,
                total,
                average,
                growthRate,
                contribution: chartData.reduce((sum, row) => sum + row.total, 0) > 0 
                    ? (total / chartData.reduce((sum, row) => sum + row.total, 0) * 100) : 0
            };
            
            if (!largestContributor || trends[category].total > trends[largestContributor].total) {
                largestContributor = category;
            }
            
            if (!fastestGrowing || trends[category].growthRate > trends[fastestGrowing].growthRate) {
                fastestGrowing = category;
            }
        });
        
        return {
            ...trends,
            largest: trends[largestContributor],
            fastestGrowing: trends[fastestGrowing]
        };
    }

    generateContributionInsights(trends, categories) {
        const insights = [];
        
        if (trends.largest) {
            insights.push(`${trends.largest.category} er din største bidragsyter med ${trends.largest.contribution.toFixed(1)}% av totalen.`);
        }
        
        if (trends.fastestGrowing && trends.fastestGrowing.growthRate > 10) {
            insights.push(`${trends.fastestGrowing.category} vokser raskest med ${trends.fastestGrowing.growthRate.toFixed(1)}% økning.`);
        }
        
        // Find declining contributors
        const declining = Object.values(trends).filter(t => t.growthRate < -10 && t.category);
        if (declining.length > 0) {
            insights.push(`${declining.map(t => t.category).join(', ')} viser nedgang og trenger oppmerksomhet.`);
        }
        
        // Concentration analysis
        const sortedByContribution = Object.values(trends)
            .filter(t => t.category)
            .sort((a, b) => b.contribution - a.contribution);
        
        const top3Contribution = sortedByContribution.slice(0, 3).reduce((sum, t) => sum + t.contribution, 0);
        
        if (top3Contribution > 80) {
            insights.push('Du er svært avhengig av få bidragsytere - vurder diversifisering.');
        } else if (top3Contribution < 50) {
            insights.push('Du har god spredning av bidragsytere - mindre risiko.');
        }
        
        return insights;
    }
}

export const stackedContributionPlugin = new StackedContributionPlugin();
