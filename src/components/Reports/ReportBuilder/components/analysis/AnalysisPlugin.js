/**
 * Base class for analysis plugins
 * Each plugin must implement isAvailable() and execute() methods
 */
export class AnalysisPlugin {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.category = config.category; // 'comparison', 'trend', 'distribution', 'advanced'
        this.complexity = config.complexity; // 'low', 'medium', 'high'
        this.icon = config.icon;
        this.requiresComparison = config.requiresComparison || false;
        this.requiresTimeSeries = config.requiresTimeSeries || false;
        this.minDataPoints = config.minDataPoints || 1;
    }

    /**
     * Check if this analysis is available for the given data
     * @param {Array} data - Primary dataset
     * @param {Array} dataB - Comparison dataset (optional)
     * @param {boolean} hasCompare - Whether comparison mode is active
     * @param {string} reportType - Type of report
     * @param {Object} chartLabels - Chart configuration
     * @returns {boolean}
     */
    isAvailable(data, dataB, hasCompare, reportType, chartLabels) {
        throw new Error('isAvailable() method must be implemented');
    }

    /**
     * Execute the analysis
     * @param {Object} params - Analysis parameters
     * @returns {Object} Analysis result with visualization data
     */
    execute(params) {
        throw new Error('execute() method must be implemented');
    }

    /**
     * Helper: Check if data has time-series characteristics
     * @param {Array} data 
     * @returns {boolean}
     */
    hasTimeSeriesData(data) {
        if (!data || data.length === 0) return false;

        const columns = Object.keys(data[0]);
        return columns.some(col => {
            const value = data[0][col];
            if (typeof value !== 'string') return false;
            return /^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s\d{4}$/.test(value) ||
                /^Q[1-4]\s\d{4}$/.test(value) ||
                /^\d{4}-\d{2}$/.test(value) ||
                /^\d{2}\.\d{2}\.\d{4}$/.test(value);
        });
    }

    /**
     * Helper: Get numeric fields from data
     * @param {Array} data 
     * @returns {Array}
     */
    getNumericFields(data) {
        if (!data || data.length === 0) return [];

        const columns = Object.keys(data[0]);
        return columns.filter(col => {
            const value = data[0][col];
            return typeof value === 'number' && value !== null;
        });
    }

    /**
     * Helper: Get categorical fields from data
     * @param {Array} data 
     * @returns {Array}
     */
    getCategoricalFields(data) {
        if (!data || data.length === 0) return [];

        const columns = Object.keys(data[0]);
        return columns.filter(col => {
            const value = data[0][col];
            return typeof value === 'string' &&
                !col.toLowerCase().includes('sum') &&
                !col.toLowerCase().includes('antall') &&
                !this.isTimeField(col, value);
        });
    }

    /**
     * Helper: Check if field is a time field
     * @param {string} fieldName 
     * @param {*} value 
     * @returns {boolean}
     */
    isTimeField(fieldName, value) {
        if (typeof value !== 'string') return false;
        return /^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s\d{4}$/.test(value) ||
            /^Q[1-4]\s\d{4}$/.test(value) ||
            /^\d{4}-\d{2}$/.test(value) ||
            /^\d{2}\.\d{2}\.\d{4}$/.test(value);
    }

    /**
     * Helper: Check if a value looks like a time/date value
     * @param {*} value 
     * @returns {boolean}
     */
    looksLikeTimeValue(value) {
        if (!value) return false;

        // Try to parse as Date
        const dateValue = new Date(value);
        if (!isNaN(dateValue.getTime())) {
            // Valid date, but make sure it's not just a number
            if (typeof value === 'string' && value.length > 4) {
                return true;
            }
        }

        // Check string patterns
        if (typeof value === 'string') {
            return /^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s\d{4}$/.test(value) ||
                /^Q[1-4]\s\d{4}$/.test(value) ||
                /^\d{4}-\d{2}(-\d{2})?$/.test(value) ||
                /^\d{2}\.\d{2}\.\d{4}$/.test(value) ||
                /^\d{4}\/\d{2}\/\d{2}$/.test(value) ||
                /^\d{2}\/\d{2}\/\d{4}$/.test(value);
        }

        return false;
    }

    /**
     * Helper: Check if this is skade-related data
     * @param {string} reportType 
     * @param {Object} chartLabels 
     * @returns {boolean}
     */
    isSkadeReport(reportType, chartLabels) {
        return reportType === 'skade' ||
            (chartLabels && (
                chartLabels.valueFieldName?.toLowerCase().includes('skade') ||
                chartLabels.groupFieldName?.toLowerCase().includes('skade')
            ));
    }

    /**
     * Helper: Detect time/date field in data
     * @param {Array} data 
     * @param {string} preferredField - Optional preferred field name
     * @returns {string|null}
     */
    detectTimeField(data, preferredField = null) {
        if (!data || data.length === 0) return null;

        const sampleRow = data[0];
        const fieldNames = Object.keys(sampleRow);

        // If preferred field is specified and exists, use it
        if (preferredField && fieldNames.includes(preferredField)) {
            return preferredField;
        }

        // Look for common time field patterns
        const timeFieldCandidates = fieldNames.filter(field => {
            const value = sampleRow[field];
            if (!value) return false;

            const fieldNameLower = field.toLowerCase();

            // Check field name patterns
            if (fieldNameLower.includes('date') ||
                fieldNameLower.includes('time') ||
                fieldNameLower.includes('måned') ||
                fieldNameLower.includes('month') ||
                fieldNameLower.includes('år') ||
                fieldNameLower.includes('year') ||
                fieldNameLower.includes('periode')) {
                return true;
            }

            // Check if value looks like a date
            return this.looksLikeTimeValue(value);
        });

        return timeFieldCandidates.length > 0 ? timeFieldCandidates[0] : null;
    }

    /**
     * Helper: Format numbers for display
     * @param {number} value 
     * @returns {string}
     */
    formatNumber(value) {
        if (typeof value !== 'number' || isNaN(value)) return '0';

        // For large numbers, use compact notation
        if (Math.abs(value) >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (Math.abs(value) >= 1000) {
            return `${(value / 1000).toFixed(1)}k`;
        } else if (value % 1 === 0) {
            // Integer
            return value.toLocaleString('nb-NO');
        } else {
            // Decimal
            return value.toLocaleString('nb-NO', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });
        }
    }
}
