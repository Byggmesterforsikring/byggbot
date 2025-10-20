import { AnalysisPlugin } from '../AnalysisPlugin';

class AnomalyDetectionPlugin extends AnalysisPlugin {
    constructor() {
        super({
            id: 'anomalyDetection',
            name: 'Anomalideteksjon',
            description: 'Identifiser uvanlige verdier og avvik fra normalområdet',
            category: 'advanced',
            complexity: 'high',
            icon: '🔍',
            requiresTimeSeries: true,
            minDataPoints: 10,
            userExplanation: 'Denne analysen bruker statistiske metoder for å finne verdier som skiller seg unormalt ut fra det normale mønsteret ditt. Den hjelper deg å oppdage både problemer og muligheter du kanskje ikke hadde lagt merke til.',
            useCase: 'Perfekt for å finne uvanlig høye eller lave salg, oppdage systemfeil, identifisere ekstraordinære hendelser eller finne nye trender tidlig.'
        });
    }

    isAvailable(data, dataB, hasCompare, reportType, chartLabels) {
        // Requires time-series data for trend analysis
        if (!this.hasTimeSeriesData(data)) return false;

        // Need enough data points for statistical analysis
        if (data.length < this.minDataPoints) return false;

        // Need at least one numeric field
        const numericFields = this.getNumericFields(data);
        if (numericFields.length === 0) return false;

        return true;
    }

    execute(params) {
        const { data, selectedMetric, timeField } = params;

        if (!data || data.length === 0) {
            throw new Error('Ingen data tilgjengelig for anomalideteksjon');
        }

        // Find fields
        const timeFieldName = this.detectTimeField(data, timeField);
        const metricFieldName = selectedMetric || this.getNumericFields(data)[0];

        if (!timeFieldName || !metricFieldName) {
            throw new Error('Kan ikke finne nødvendige felt for anomalideteksjon');
        }

        // Prepare time series data
        const timeSeriesData = this.prepareTimeSeriesData(data, timeFieldName, metricFieldName);

        if (timeSeriesData.length < this.minDataPoints) {
            throw new Error(`Trenger minst ${this.minDataPoints} datapunkter for anomalideteksjon`);
        }

        // Calculate statistics
        const values = timeSeriesData.map(d => d.value);
        const stats = this.calculateStatistics(values);

        // Detect anomalies using multiple methods
        const anomalies = this.detectAnomalies(timeSeriesData, stats);

        // Generate insights
        const insights = this.generateAnomalyInsights(anomalies, stats, metricFieldName);

        return {
            type: 'anomalyDetection',
            title: 'Anomalideteksjon',
            subtitle: `Uvanlige verdier i ${metricFieldName} over tid`,
            data: timeSeriesData,
            anomalies: anomalies,
            statistics: stats,
            chartConfig: {
                type: 'scatter',
                xField: 'period',
                yField: 'value',
                colorField: 'isAnomaly',
                title: 'Anomalier i data',
                subtitle: 'Røde punkter indikerer anomalier'
            },
            summary: {
                'Totale datapunkter': timeSeriesData.length,
                'Anomalier funnet': anomalies.length,
                'Anomali-rate': `${((anomalies.length / timeSeriesData.length) * 100).toFixed(1)}%`,
                'Normalområde': `${this.formatNumber(stats.lowerBound)} - ${this.formatNumber(stats.upperBound)}`,
                'Gjennomsnitt': this.formatNumber(stats.mean),
                'Standardavvik': this.formatNumber(stats.stdDev)
            },
            insights: insights
        };
    }

    prepareTimeSeriesData(data, timeFieldName, metricFieldName) {
        const timeSeriesData = [];

        data.forEach(row => {
            const dateValue = row[timeFieldName];
            const metricValue = parseFloat(row[metricFieldName]);

            if (!dateValue || isNaN(metricValue)) return;

            const date = new Date(dateValue);
            const period = this.formatTimePeriod(date);

            timeSeriesData.push({
                period,
                date,
                value: metricValue,
                originalRow: row
            });
        });

        return timeSeriesData.sort((a, b) => a.date - b.date);
    }

    formatTimePeriod(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        return `${year}-${month.toString().padStart(2, '0')}`;
    }

    calculateStatistics(values) {
        const n = values.length;
        const mean = values.reduce((sum, val) => sum + val, 0) / n;

        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);

        // Calculate quartiles
        const sortedValues = [...values].sort((a, b) => a - b);
        const q1 = sortedValues[Math.floor(n * 0.25)];
        const median = sortedValues[Math.floor(n * 0.5)];
        const q3 = sortedValues[Math.floor(n * 0.75)];
        const iqr = q3 - q1;

        // Different anomaly detection bounds
        const zScoreBounds = {
            lowerBound: mean - 2 * stdDev,
            upperBound: mean + 2 * stdDev
        };

        const iqrBounds = {
            lowerBound: q1 - 1.5 * iqr,
            upperBound: q3 + 1.5 * iqr
        };

        return {
            mean,
            stdDev,
            variance,
            median,
            q1,
            q3,
            iqr,
            min: Math.min(...values),
            max: Math.max(...values),
            zScoreBounds,
            iqrBounds,
            // Use IQR method as primary (more robust to outliers)
            lowerBound: iqrBounds.lowerBound,
            upperBound: iqrBounds.upperBound
        };
    }

    detectAnomalies(timeSeriesData, stats) {
        const anomalies = [];

        timeSeriesData.forEach((dataPoint, index) => {
            const value = dataPoint.value;
            let isAnomaly = false;
            let reasons = [];
            let severity = 'low';

            // IQR-based anomaly detection (primary method)
            if (value < stats.iqrBounds.lowerBound || value > stats.iqrBounds.upperBound) {
                isAnomaly = true;
                reasons.push('IQR-outlier');
                severity = 'medium';
            }

            // Z-score based anomaly detection (secondary check)
            const zScore = Math.abs((value - stats.mean) / stats.stdDev);
            if (zScore > 2.5) {
                isAnomaly = true;
                reasons.push('Z-score-outlier');
                if (zScore > 3) severity = 'high';
            }

            // Contextual anomaly detection (sudden changes)
            if (index > 0) {
                const previousValue = timeSeriesData[index - 1].value;
                const percentChange = Math.abs((value - previousValue) / previousValue) * 100;

                if (percentChange > 50) {
                    isAnomaly = true;
                    reasons.push('sudden-change');
                    if (percentChange > 100) severity = 'high';
                }
            }

            if (isAnomaly) {
                anomalies.push({
                    ...dataPoint,
                    isAnomaly: true,
                    reasons,
                    severity,
                    zScore: (value - stats.mean) / stats.stdDev,
                    deviationFromMean: value - stats.mean,
                    percentileRank: this.calculatePercentileRank(value, timeSeriesData.map(d => d.value))
                });
            }

            // Mark in original data
            dataPoint.isAnomaly = isAnomaly;
            dataPoint.severity = severity;
        });

        return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
    }

    calculatePercentileRank(value, allValues) {
        const sortedValues = [...allValues].sort((a, b) => a - b);
        const rank = sortedValues.filter(v => v <= value).length;
        return (rank / sortedValues.length) * 100;
    }

    generateAnomalyInsights(anomalies, stats, metricFieldName) {
        const insights = [];

        if (anomalies.length === 0) {
            insights.push(`Ingen signifikante anomalier funnet i ${metricFieldName}. Dataene følger et normalt mønster.`);
            return insights;
        }

        const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high');
        const positiveAnomalies = anomalies.filter(a => a.value > stats.mean);
        const negativeAnomalies = anomalies.filter(a => a.value < stats.mean);

        // Overall anomaly summary
        const anomalyRate = (anomalies.length / (anomalies.length + stats.mean)) * 100;
        if (anomalyRate > 10) {
            insights.push(`Høy anomali-rate (${anomalyRate.toFixed(1)}%) indikerer ustabile eller uforutsigbare data.`);
        } else if (anomalyRate < 2) {
            insights.push(`Lav anomali-rate (${anomalyRate.toFixed(1)}%) indikerer stabile og forutsigbare data.`);
        }

        // High severity anomalies
        if (highSeverityAnomalies.length > 0) {
            const mostExtreme = highSeverityAnomalies[0];
            insights.push(`Mest ekstreme anomali: ${mostExtreme.period} med verdi ${this.formatNumber(mostExtreme.value)} (${Math.abs(mostExtreme.zScore).toFixed(1)} standardavvik fra gjennomsnittet).`);
        }

        // Positive vs negative anomalies
        if (positiveAnomalies.length > negativeAnomalies.length * 2) {
            insights.push('Flest anomalier er positive (høye verdier) - kan indikere vekstmuligheter eller systemfeil.');
        } else if (negativeAnomalies.length > positiveAnomalies.length * 2) {
            insights.push('Flest anomalier er negative (lave verdier) - kan indikere problemer som trenger oppmerksomhet.');
        }

        // Recent anomalies
        const recentAnomalies = anomalies.filter(a => {
            const daysSinceAnomaly = (new Date() - a.date) / (1000 * 60 * 60 * 24);
            return daysSinceAnomaly < 90; // Last 3 months
        });

        if (recentAnomalies.length > 0) {
            insights.push(`${recentAnomalies.length} anomali(er) funnet i de siste 3 månedene - følg opp disse.`);
        }

        return insights;
    }
}

export const anomalyDetectionPlugin = new AnomalyDetectionPlugin();
