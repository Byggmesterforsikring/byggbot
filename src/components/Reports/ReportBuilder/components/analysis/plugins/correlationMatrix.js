import { AnalysisPlugin } from '../AnalysisPlugin';

class CorrelationMatrixPlugin extends AnalysisPlugin {
    constructor() {
        super({
            id: 'correlationMatrix',
            name: 'Korrelasjonsmatrise',
            description: 'Vis sammenhenger mellom ulike numeriske variabler',
            category: 'advanced',
            complexity: 'high',
            icon: '🔗',
            requiresComparison: false,
            minDataPoints: 10
        });
    }

    isAvailable(data, dataB, hasCompare, reportType, chartLabels) {
        return false;
    }

    execute(params) {
        throw new Error('CorrelationMatrix analysis not yet implemented');
    }
}

export const correlationMatrixPlugin = new CorrelationMatrixPlugin();
