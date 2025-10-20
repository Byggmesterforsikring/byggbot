import { AnalysisPlugin } from '../AnalysisPlugin';

class SeasonalOverlayPlugin extends AnalysisPlugin {
    constructor() {
        super({
            id: 'seasonalOverlay',
            name: 'Sesongmønstre',
            description: 'Se hvilke måneder som er best/dårligst for virksomheten din år for år',
            category: 'trend',
            complexity: 'medium',
            icon: '🍂',
            requiresTimeSeries: true,
            minDataPoints: 12,
            userExplanation: 'Har du høysesong i desember og lavsesong i januar? Denne analysen viser tydelig sesongmønstrene dine, slik at du kan planlegge bedre og forstå om årets resultater er normale eller unormale.',
            useCase: 'Viktig for budsjettplanlegging, lagerstyring og personalplanlegging. Hjelper deg å forstå når du bør satse ekstra og når du kan forvente nedgang.'
        });
    }

    isAvailable(data, dataB, hasCompare, reportType, chartLabels) {
        // Requires time-series data
        if (!this.hasTimeSeriesData(data)) return false;

        // Need at least 12 data points for seasonal analysis
        if (data.length < this.minDataPoints) return false;

        // Need at least one numeric field
        const numericFields = this.getNumericFields(data);
        if (numericFields.length === 0) return false;

        return true;
    }

    execute(params) {
        const { data, selectedMetric, timeField } = params;
        
        if (!data || data.length === 0) {
            throw new Error('Ingen data tilgjengelig for sesonganalyse');
        }

        // Find time field and metric field
        const timeFieldName = this.detectTimeField(data, timeField);
        const metricFieldName = selectedMetric || this.getNumericFields(data)[0];
        
        if (!timeFieldName || !metricFieldName) {
            throw new Error('Kan ikke finne dato- og verdifelt for sesonganalyse');
        }

        // Group data by month across all years
        const monthlyData = {};
        const yearlyData = {};
        
        data.forEach(row => {
            const dateValue = row[timeFieldName];
            const metricValue = parseFloat(row[metricFieldName]) || 0;
            
            if (!dateValue) return;
            
            const date = new Date(dateValue);
            const month = date.getMonth() + 1; // 1-12
            const year = date.getFullYear();
            const monthName = date.toLocaleDateString('nb-NO', { month: 'long' });
            
            // Monthly aggregation
            if (!monthlyData[month]) {
                monthlyData[month] = {
                    month: monthName,
                    monthNumber: month,
                    total: 0,
                    count: 0,
                    values: []
                };
            }
            monthlyData[month].total += metricValue;
            monthlyData[month].count += 1;
            monthlyData[month].values.push(metricValue);
            
            // Yearly breakdown
            if (!yearlyData[year]) yearlyData[year] = {};
            if (!yearlyData[year][month]) {
                yearlyData[year][month] = {
                    total: 0,
                    count: 0
                };
            }
            yearlyData[year][month].total += metricValue;
            yearlyData[year][month].count += 1;
        });

        // Calculate averages and create chart data
        const seasonalPattern = Object.values(monthlyData)
            .sort((a, b) => a.monthNumber - b.monthNumber)
            .map(monthData => ({
                month: monthData.month,
                monthNumber: monthData.monthNumber,
                average: monthData.total / monthData.count,
                total: monthData.total,
                dataPoints: monthData.count,
                min: Math.min(...monthData.values),
                max: Math.max(...monthData.values)
            }));

        // Create yearly comparison data for chart
        const years = Object.keys(yearlyData).sort();
        const chartData = [];
        
        for (let month = 1; month <= 12; month++) {
            const monthName = new Date(2024, month - 1, 1).toLocaleDateString('nb-NO', { month: 'short' });
            const dataPoint = { month: monthName, monthNumber: month };
            
            years.forEach(year => {
                if (yearlyData[year] && yearlyData[year][month]) {
                    const yearData = yearlyData[year][month];
                    dataPoint[`År ${year}`] = yearData.total / yearData.count;
                }
            });
            
            chartData.push(dataPoint);
        }

        // Find peak and low seasons
        const sorted = [...seasonalPattern].sort((a, b) => b.average - a.average);
        const peakSeason = sorted[0];
        const lowSeason = sorted[sorted.length - 1];
        
        // Calculate seasonality index (highest month / lowest month)
        const seasonalityIndex = peakSeason.average / lowSeason.average;
        
        // Generate insights
        const insights = this.generateSeasonalInsights(seasonalPattern, peakSeason, lowSeason, seasonalityIndex);

        return {
            type: 'seasonalOverlay',
            title: 'Sesongmønstre',
            subtitle: `Sammenligning av ${metricFieldName} per måned på tvers av år`,
            data: seasonalPattern,
            chartData: chartData,
            chartConfig: {
                type: 'line',
                xField: 'month',
                yField: 'average',
                seriesField: years.map(year => `År ${year}`),
                title: 'Sesongmønstre per måned',
                subtitle: 'Gjennomsnittsverdier per måned på tvers av år'
            },
            summary: {
                'Høysesong': `${peakSeason.month} (${this.formatNumber(peakSeason.average)})`,
                'Lavsesong': `${lowSeason.month} (${this.formatNumber(lowSeason.average)})`,
                'Sesongvariasjon': `${(seasonalityIndex * 100 - 100).toFixed(1)}%`,
                'Analyserte år': years.length,
                'Måneder med data': seasonalPattern.filter(m => m.dataPoints > 0).length
            },
            insights: insights
        };
    }

    generateSeasonalInsights(seasonalPattern, peakSeason, lowSeason, seasonalityIndex) {
        const insights = [];
        
        if (seasonalityIndex > 2) {
            insights.push('Du har svært tydelige sesongvariasjoner - planlegg ressurser og budsjett deretter.');
        } else if (seasonalityIndex > 1.5) {
            insights.push('Moderate sesongvariasjoner gir muligheter for sesongbasert strategi.');
        } else {
            insights.push('Relativt stabile verdier gjennom året - mindre behov for sesongplanlegging.');
        }
        
        // Quarter analysis
        const quarters = {
            Q1: seasonalPattern.filter(m => m.monthNumber <= 3),
            Q2: seasonalPattern.filter(m => m.monthNumber >= 4 && m.monthNumber <= 6),
            Q3: seasonalPattern.filter(m => m.monthNumber >= 7 && m.monthNumber <= 9),
            Q4: seasonalPattern.filter(m => m.monthNumber >= 10)
        };
        
        const quarterAverages = Object.entries(quarters).map(([quarter, months]) => ({
            quarter,
            average: months.reduce((sum, m) => sum + m.average, 0) / months.length
        }));
        
        const bestQuarter = quarterAverages.reduce((best, current) => 
            current.average > best.average ? current : best
        );
        
        insights.push(`${bestQuarter.quarter} er ditt sterkeste kvartal på året.`);
        
        return insights;
    }
}

export const seasonalOverlayPlugin = new SeasonalOverlayPlugin();
