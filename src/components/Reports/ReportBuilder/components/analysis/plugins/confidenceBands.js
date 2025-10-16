import { AnalysisPlugin } from '../AnalysisPlugin';

class ConfidenceBandsPlugin extends AnalysisPlugin {
    constructor() {
        super({
            id: 'confidenceBands',
            name: 'Konfidensintervall',
            description: 'Vis usikkerhetsområder og konfidensintervaller',
            category: 'advanced',
            complexity: 'high',
            icon: '📏',
            requiresTimeSeries: true,
            minDataPoints: 10
        });
    }

    isAvailable(data, dataB, hasCompare, reportType, chartLabels) {
        return false;
    }

    execute(params) {
        throw new Error('ConfidenceBands analysis not yet implemented');
    }
}

export const confidenceBandsPlugin = new ConfidenceBandsPlugin();
