import { AnalysisPlugin } from '../AnalysisPlugin';

class WaterfallPlugin extends AnalysisPlugin {
    constructor() {
        super({
            id: 'waterfall',
            name: 'Waterfall Analyse',
            description: 'Vis kumulative endringer og bidrag over tid',
            category: 'trend',
            complexity: 'medium',
            icon: '🌊',
            requiresTimeSeries: true,
            minDataPoints: 3,
            userExplanation: 'En waterfall-graf viser deg hvordan verdier bygger seg opp eller brytes ned steg for steg over tid. Du ser tydelig hvilke perioder eller faktorer som bidrar positivt eller negativt.',
            useCase: 'Ideell for å forstå hva som driver endringer i dine nøkkeltall, som hvordan salget bygger seg opp måned for måned eller hvordan kostnader påvirker profitt.'
        });
    }

    isAvailable(data, dataB, hasCompare, reportType, chartLabels) {
        // Requires time-series data for waterfall progression
        if (!this.hasTimeSeriesData(data)) return false;

        // Need at least one numeric field
        const numericFields = this.getNumericFields(data);
        if (numericFields.length === 0) return false;

        return data.length >= this.minDataPoints;
    }

    execute(params) {
        const { data, selectedMetric, timeField, groupField } = params;
        
        if (!data || data.length === 0) {
            throw new Error('Ingen data tilgjengelig for waterfall analyse');
        }

        // Find fields
        const timeFieldName = this.detectTimeField(data, timeField);
        const metricFieldName = selectedMetric || this.getNumericFields(data)[0];
        
        if (!timeFieldName || !metricFieldName) {
            throw new Error('Kan ikke finne nødvendige felt for waterfall analyse');
        }

        // Group data by time periods
        const timeGrouped = {};
        
        data.forEach(row => {
            const dateValue = row[timeFieldName];
            const metricValue = parseFloat(row[metricFieldName]) || 0;
            
            if (!dateValue) return;
            
            const date = new Date(dateValue);
            const timeKey = this.formatTimeKey(date);
            
            if (!timeGrouped[timeKey]) {
                timeGrouped[timeKey] = {
                    timeKey,
                    date,
                    value: 0,
                    count: 0
                };
            }
            
            timeGrouped[timeKey].value += metricValue;
            timeGrouped[timeKey].count += 1;
        });

        // Sort by time and calculate cumulative values
        const sortedData = Object.values(timeGrouped)
            .sort((a, b) => a.date - b.date)
            .map(item => ({
                ...item,
                average: item.value / item.count
            }));

        // Create waterfall data with period-over-period changes
        const waterfallData = [];
        let cumulativeValue = 0;
        
        sortedData.forEach((item, index) => {
            if (index === 0) {
                // Starting value
                cumulativeValue = item.value;
                waterfallData.push({
                    period: item.timeKey,
                    type: 'start',
                    value: item.value,
                    change: 0,
                    cumulative: cumulativeValue,
                    startValue: 0,
                    endValue: item.value
                });
            } else {
                const previousValue = sortedData[index - 1].value;
                const change = item.value - previousValue;
                const startValue = cumulativeValue;
                
                cumulativeValue += change;
                
                waterfallData.push({
                    period: item.timeKey,
                    type: change >= 0 ? 'positive' : 'negative',
                    value: item.value,
                    change: change,
                    cumulative: cumulativeValue,
                    startValue: startValue,
                    endValue: cumulativeValue,
                    changePercent: previousValue > 0 ? (change / previousValue * 100) : 0
                });
            }
        });

        // Add total if more than 2 periods
        if (waterfallData.length > 2) {
            const totalChange = cumulativeValue - waterfallData[0].value;
            waterfallData.push({
                period: 'Total',
                type: 'total',
                value: cumulativeValue,
                change: totalChange,
                cumulative: cumulativeValue,
                startValue: 0,
                endValue: cumulativeValue,
                changePercent: waterfallData[0].value > 0 ? (totalChange / waterfallData[0].value * 100) : 0
            });
        }

        // Calculate insights
        const insights = this.generateWaterfallInsights(waterfallData, metricFieldName);

        return {
            type: 'waterfall',
            title: 'Waterfall Analyse',
            subtitle: `Kumulative endringer i ${metricFieldName} over tid`,
            data: waterfallData,
            chartConfig: {
                type: 'waterfall',
                xField: 'period',
                yField: 'value',
                changeField: 'change',
                title: 'Waterfall Chart',
                subtitle: 'Endringer periode for periode'
            },
            summary: {
                'Startverdi': this.formatNumber(waterfallData[0]?.value || 0),
                'Sluttverdi': this.formatNumber(waterfallData[waterfallData.length - 1]?.cumulative || 0),
                'Total endring': this.formatNumber(waterfallData[waterfallData.length - 1]?.change || 0),
                'Antall perioder': waterfallData.filter(d => d.type !== 'total').length,
                'Positive perioder': waterfallData.filter(d => d.type === 'positive').length,
                'Negative perioder': waterfallData.filter(d => d.type === 'negative').length
            },
            insights: insights
        };
    }

    formatTimeKey(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        return `${year}-${month.toString().padStart(2, '0')}`;
    }

    generateWaterfallInsights(waterfallData, metricFieldName) {
        const insights = [];
        const changes = waterfallData.filter(d => d.type === 'positive' || d.type === 'negative');
        
        if (changes.length === 0) return insights;

        // Find largest positive and negative changes
        const positiveChanges = changes.filter(d => d.change > 0);
        const negativeChanges = changes.filter(d => d.change < 0);
        
        if (positiveChanges.length > 0) {
            const largestGain = positiveChanges.reduce((max, current) => 
                current.change > max.change ? current : max
            );
            insights.push(`Største økning var i ${largestGain.period} med ${this.formatNumber(largestGain.change)} (${largestGain.changePercent.toFixed(1)}%)`);
        }
        
        if (negativeChanges.length > 0) {
            const largestLoss = negativeChanges.reduce((min, current) => 
                current.change < min.change ? current : min
            );
            insights.push(`Største nedgang var i ${largestLoss.period} med ${this.formatNumber(Math.abs(largestLoss.change))} (${Math.abs(largestLoss.changePercent).toFixed(1)}%)`);
        }

        // Overall trend
        const totalChange = waterfallData[waterfallData.length - 1]?.change || 0;
        const startValue = waterfallData[0]?.value || 0;
        
        if (totalChange > 0) {
            const totalGrowth = startValue > 0 ? (totalChange / startValue * 100) : 0;
            insights.push(`Samlet sett har ${metricFieldName} økt med ${totalGrowth.toFixed(1)}% over perioden.`);
        } else if (totalChange < 0) {
            const totalDecline = startValue > 0 ? (Math.abs(totalChange) / startValue * 100) : 0;
            insights.push(`Samlet sett har ${metricFieldName} falt med ${totalDecline.toFixed(1)}% over perioden.`);
        } else {
            insights.push(`${metricFieldName} har holdt seg stabilt over perioden til tross for variasjoner.`);
        }

        // Volatility analysis
        const changeValues = changes.map(d => Math.abs(d.changePercent));
        const avgVolatility = changeValues.reduce((sum, val) => sum + val, 0) / changeValues.length;
        
        if (avgVolatility > 20) {
            insights.push('Du opplever høy volatilitet - vurder å identifisere årsakene til svingningene.');
        } else if (avgVolatility < 5) {
            insights.push('Stabile endringer indikerer forutsigbar utvikling.');
        }

        return insights;
    }
}

export const waterfallPlugin = new WaterfallPlugin();
