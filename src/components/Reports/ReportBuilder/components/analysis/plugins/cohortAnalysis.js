import { AnalysisPlugin } from '../AnalysisPlugin';

class CohortAnalysisPlugin extends AnalysisPlugin {
    constructor() {
        super({
            id: 'cohortAnalysis',
            name: 'Kohort-analyse',
            description: 'Spor grupper over tid og analyser retensjon/utvikling',
            category: 'advanced',
            complexity: 'high',
            icon: '👥',
            requiresTimeSeries: true,
            minDataPoints: 12
        });
    }

    isAvailable(data, dataB, hasCompare, reportType, chartLabels) {
        return false;
    }

    execute(params) {
        throw new Error('CohortAnalysis analysis not yet implemented');
    }
}

export const cohortAnalysisPlugin = new CohortAnalysisPlugin();
