import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../ui/card';
import { Button } from '../../../../../ui/button';
import { Badge } from '../../../../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../../ui/dialog';
import { Brain, TrendingUp, BarChart3, Zap } from 'lucide-react';
import AnalysisConfigDialog from './AnalysisConfigDialog';

const AnalysisSelector = ({
    availableAnalyses,
    onSelectAnalysis,
    isLoading = false,
    data = null,
    hasCompare = false,
    reportType = 'general',
    chartLabels = null
}) => {
    const [selectedAnalysis, setSelectedAnalysis] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showConfig, setShowConfig] = useState(false);

    if (!availableAnalyses || availableAnalyses.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Analyser
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-8">
                        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Ingen analyser tilgjengelig for dette datasettet</p>
                        <p className="text-sm mt-1">
                            Prøv å justere filtre eller legge til sammenligning for flere analysemuligheter
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'comparison': return <BarChart3 className="h-4 w-4" />;
            case 'trend': return <TrendingUp className="h-4 w-4" />;
            case 'distribution': return <Brain className="h-4 w-4" />;
            case 'advanced': return <Zap className="h-4 w-4" />;
            default: return <Brain className="h-4 w-4" />;
        }
    };

    const getComplexityColor = (complexity) => {
        switch (complexity) {
            case 'low': return 'bg-green-100 text-green-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'high': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const groupedAnalyses = availableAnalyses.reduce((groups, analysis) => {
        const category = analysis.category || 'other';
        if (!groups[category]) groups[category] = [];
        groups[category].push(analysis);
        return groups;
    }, {});

    const categoryNames = {
        comparison: 'Sammenlign Perioder',
        trend: 'Trends og Utvikling',
        distribution: 'Fordelinger og Mønstre',
        advanced: 'Avanserte Analyser',
        other: 'Andre Analyser'
    };

    const handleAnalysisClick = (analysis) => {
        setSelectedAnalysis(analysis);
        setShowDetails(true);
    };

    const handleExecuteAnalysis = () => {
        if (selectedAnalysis) {
            if (isAnalysisImplemented(selectedAnalysis.id)) {
                // For implemented analyses, show config dialog
                setShowDetails(false);
                setShowConfig(true);
            } else {
                // For non-implemented analyses, show the old behavior
                onSelectAnalysis(selectedAnalysis);
                setShowDetails(false);
            }
        }
    };

    const handleConfiguredExecution = (config) => {
        if (selectedAnalysis) {
            onSelectAnalysis(selectedAnalysis, config);
            setShowConfig(false);
        }
    };

    // Check if analysis is fully implemented
    const isAnalysisImplemented = (analysisId) => {
        const implementedAnalyses = [
            'topMovers',
            'changeRates',
            'pareto',
            'seasonalOverlay',
            'stackedContribution',
            'waterfall',
            'anomalyDetection',
            'skadefrekvens'
        ];
        return implementedAnalyses.includes(analysisId);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Tilgjengelige Analyser
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Object.entries(groupedAnalyses).map(([category, analyses]) => (
                            <div key={category}>
                                <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                                    {getCategoryIcon(category)}
                                    {categoryNames[category] || category}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {analyses.map(analysis => (
                                        <Button
                                            key={analysis.id}
                                            variant="outline"
                                            className="h-auto p-4 text-left justify-start hover:bg-muted/50 transition-colors"
                                            onClick={() => handleAnalysisClick(analysis)}
                                            disabled={isLoading}
                                        >
                                            <div className="flex items-start gap-3 w-full">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium shrink-0">
                                                    {getCategoryIcon(analysis.category)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-medium text-sm text-foreground">{analysis.name}</div>
                                                        {!isAnalysisImplemented(analysis.id) && (
                                                            <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                                                Under utvikling
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate mt-1">
                                                        {analysis.description}
                                                    </div>
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-xs mt-2 ${getComplexityColor(analysis.complexity)}`}
                                                    >
                                                        {analysis.complexity === 'low' ? 'Enkel' :
                                                            analysis.complexity === 'medium' ? 'Middels' : 'Avansert'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Analysis Details Dialog */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
                                {getCategoryIcon(selectedAnalysis?.category)}
                            </div>
                            {selectedAnalysis?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {selectedAnalysis?.description}
                        </p>

                        {selectedAnalysis?.userExplanation && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h4 className="text-sm font-medium text-blue-900 mb-1">Hva gjør denne analysen?</h4>
                                <p className="text-xs text-blue-800">
                                    {selectedAnalysis.userExplanation}
                                </p>
                            </div>
                        )}

                        {selectedAnalysis?.useCase && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <h4 className="text-sm font-medium text-green-900 mb-1">Når skal jeg bruke dette?</h4>
                                <p className="text-xs text-green-800">
                                    {selectedAnalysis.useCase}
                                </p>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <Badge variant="outline">
                                {categoryNames[selectedAnalysis?.category] || selectedAnalysis?.category}
                            </Badge>
                            <Badge
                                variant="secondary"
                                className={getComplexityColor(selectedAnalysis?.complexity)}
                            >
                                {selectedAnalysis?.complexity === 'low' ? 'Enkel' :
                                    selectedAnalysis?.complexity === 'medium' ? 'Middels' : 'Avansert'}
                            </Badge>
                        </div>

                        {selectedAnalysis?.requiresComparison && (
                            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                📊 Krever sammenligning av to perioder
                            </div>
                        )}

                        {selectedAnalysis?.requiresTimeSeries && (
                            <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                                📈 Krever tidsseriedata
                            </div>
                        )}

                        <div className="flex gap-2 pt-4">
                            <Button
                                onClick={handleExecuteAnalysis}
                                disabled={isLoading}
                                className="flex-1"
                            >
                                {isLoading ? 'Kjører...' :
                                    !isAnalysisImplemented(selectedAnalysis?.id) ? 'Test (Under utvikling)' :
                                        'Velg Data og Kjør →'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowDetails(false)}
                            >
                                Avbryt
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Analysis Configuration Dialog */}
            <AnalysisConfigDialog
                isOpen={showConfig}
                onClose={() => setShowConfig(false)}
                analysisPlugin={selectedAnalysis}
                data={data}
                chartLabels={chartLabels}
                onExecute={handleConfiguredExecution}
                isLoading={isLoading}
            />
        </>
    );
};

export default AnalysisSelector;
