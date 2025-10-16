import { AnalysisPlugin } from '../AnalysisPlugin';

class ChangeRatesPlugin extends AnalysisPlugin {
    constructor() {
        super({
            id: 'changeRates',
            name: 'Månedlig og Årlig Vekst',
            description: 'Se hvor mye verdiene dine vokser fra måned til måned og år til år',
            category: 'trend',
            complexity: 'low',
            icon: '📊',
            requiresTimeSeries: true,
            minDataPoints: 2,
            userExplanation: 'Denne analysen viser deg hvor raskt virksomheten din vokser. Du får to tall: månedlig vekst (hvor mye økte salget fra forrige måned?) og årlig vekst (hvor mye mer solgte vi i januar i år vs januar i fjor?).',
            useCase: 'Ideell for å spotte trender og forstå om virksomheten er på rett spor. Negativ vekst kan være et tidlig varsel om problemer.'
        });
    }

    isAvailable(data, dataB, hasCompare, reportType, chartLabels) {
        // Requires time-series data
        if (!this.hasTimeSeriesData(data)) return false;

        // Need at least one numeric field
        const numericFields = this.getNumericFields(data);
        if (numericFields.length === 0) return false;

        return data.length >= this.minDataPoints;
    }

    execute({ data, dataB, hasCompare, selectedMetric, timeField }) {
        if (!data || !selectedMetric || !timeField) {
            throw new Error('ChangeRates analysis requires data, selectedMetric, and timeField');
        }

        // Parse and sort time series data
        const parseTimeData = (dataset) => {
            const timeMap = new Map();
            dataset.forEach(row => {
                const timeKey = row[timeField];
                const value = this.parseNumeric(row[selectedMetric]);
                timeMap.set(timeKey, (timeMap.get(timeKey) || 0) + value);
            });

            // Sort by time
            return Array.from(timeMap.entries())
                .map(([time, value]) => ({ time, value, parsedTime: this.parseTimeKey(time) }))
                .sort((a, b) => a.parsedTime - b.parsedTime);
        };

        const timeSeriesA = parseTimeData(data);
        const timeSeriesB = hasCompare && dataB ? parseTimeData(dataB) : null;

        // Calculate change rates
        const calculateChanges = (timeSeries, label) => {
            const changes = [];

            for (let i = 1; i < timeSeries.length; i++) {
                const current = timeSeries[i];
                const previous = timeSeries[i - 1];

                // Month-over-Month (MoM)
                const momChange = previous.value !== 0 ?
                    ((current.value - previous.value) / previous.value) * 100 : 0;

                // Year-over-Year (find same period last year)
                const yoyPrevious = this.findYearOverYearComparison(timeSeries, current.time, i);
                const yoyChange = yoyPrevious ?
                    ((current.value - yoyPrevious.value) / yoyPrevious.value) * 100 : null;

                changes.push({
                    time: current.time,
                    value: current.value,
                    momChange,
                    yoyChange,
                    label,
                    previousValue: previous.value,
                    yoyPreviousValue: yoyPrevious?.value
                });
            }

            return changes;
        };

        const changesA = calculateChanges(timeSeriesA, 'Periode A');
        const changesB = timeSeriesB ? calculateChanges(timeSeriesB, 'Periode B') : [];

        // Combine changes for visualization
        const allChanges = [...changesA, ...changesB];

        // Prepare chart data
        const chartData = changesA.map((item, index) => {
            const result = {
                name: item.time,
                'Verdi A': item.value,
                'MoM % A': item.momChange,
                'YoY % A': item.yoyChange
            };

            if (changesB[index]) {
                result['Verdi B'] = changesB[index].value;
                result['MoM % B'] = changesB[index].momChange;
                result['YoY % B'] = changesB[index].yoyChange;
            }

            return result;
        });

        // Calculate summary statistics
        const avgMoMChangeA = changesA.reduce((sum, c) => sum + Math.abs(c.momChange), 0) / changesA.length;
        const avgYoYChangeA = changesA.filter(c => c.yoyChange !== null).reduce((sum, c) => sum + Math.abs(c.yoyChange), 0) / changesA.filter(c => c.yoyChange !== null).length;

        return {
            type: 'changeRates',
            title: 'Endringsrater Analyse',
            subtitle: `MoM og YoY endringer for ${selectedMetric}`,
            data: chartData,
            summary: {
                avgMoMChange: avgMoMChangeA || 0,
                avgYoYChange: avgYoYChangeA || 0,
                totalPeriods: changesA.length,
                hasYoYData: changesA.some(c => c.yoyChange !== null)
            },
            visualization: {
                type: 'lineChart',
                config: {
                    xAxis: 'name',
                    yAxes: hasCompare ? ['MoM % A', 'MoM % B', 'YoY % A', 'YoY % B'] : ['MoM % A', 'YoY % A'],
                    colors: {
                        'MoM % A': '#3b82f6',
                        'YoY % A': '#10b981',
                        'MoM % B': '#8b5cf6',
                        'YoY % B': '#f59e0b'
                    }
                }
            }
        };
    }

    parseTimeKey(timeKey) {
        // Parse different time formats to comparable numbers
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

        // "Jan 2025" format
        const monthMatch = timeKey.match(/^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s(\d{4})$/);
        if (monthMatch) {
            const year = parseInt(monthMatch[2]);
            const month = monthNames.indexOf(monthMatch[1]);
            return year * 12 + month;
        }

        // "Q1 2025" format
        const quarterMatch = timeKey.match(/^Q([1-4])\s(\d{4})$/);
        if (quarterMatch) {
            const year = parseInt(quarterMatch[2]);
            const quarter = parseInt(quarterMatch[1]);
            return year * 4 + quarter;
        }

        // "2025-01" format
        const yearMonthMatch = timeKey.match(/^(\d{4})-(\d{2})$/);
        if (yearMonthMatch) {
            const year = parseInt(yearMonthMatch[1]);
            const month = parseInt(yearMonthMatch[2]) - 1;
            return year * 12 + month;
        }

        return 0;
    }

    findYearOverYearComparison(timeSeries, currentTime, currentIndex) {
        // Look for same period previous year
        const currentParsed = this.parseTimeKey(currentTime);

        // For monthly data, look 12 months back
        const targetParsed = currentParsed - 12;

        return timeSeries.find(item => this.parseTimeKey(item.time) === targetParsed);
    }

    parseNumeric(val) {
        if (typeof val === 'number') return val;
        const n = Number(String(val || '').replace(/kr\s*/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.'));
        return isNaN(n) ? 0 : n;
    }
}

export const changeRatesPlugin = new ChangeRatesPlugin();
