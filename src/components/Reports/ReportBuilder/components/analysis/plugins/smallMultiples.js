import { AnalysisPlugin } from '../AnalysisPlugin';

class SmallMultiplesPlugin extends AnalysisPlugin {
    constructor() {
        super({
            id: 'smallMultiples',
            name: 'Small Multiples',
            description: 'Vis flere små grafer for sammenligning av kategorier',
            category: 'comparison',
            complexity: 'medium',
            icon: '🔲',
            requiresComparison: false,
            minDataPoints: 6
        });
    }

    isAvailable(data, dataB, hasCompare, reportType, chartLabels) {
        // Need at least one categorical field for creating multiples
        const categoricalFields = this.getCategoricalFields(data);
        if (categoricalFields.length === 0) return false;

        // Need at least one numeric field
        const numericFields = this.getNumericFields(data);
        if (numericFields.length === 0) return false;

        // Need enough data points to split into meaningful groups
        return data.length >= this.minDataPoints;
    }

    execute(params) {
        throw new Error('SmallMultiples analysis not yet implemented');
    }
}

export const smallMultiplesPlugin = new SmallMultiplesPlugin();
