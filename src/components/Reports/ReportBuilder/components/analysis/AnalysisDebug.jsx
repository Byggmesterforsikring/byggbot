import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../ui/card';
import { Badge } from '../../../../ui/badge';

const AnalysisDebug = ({ availableAnalyses, data, hasCompare, reportType }) => {
    if (process.env.NODE_ENV !== 'development') return null;

    return (
        <Card className="mb-4 border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm text-yellow-800">🔧 Analyse Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="text-xs">
                <div className="space-y-2">
                    <div>
                        <strong>Dataegenskaper:</strong>
                        <ul className="ml-4 mt-1">
                            <li>• Rader: {data?.length || 0}</li>
                            <li>• Sammenligning: {hasCompare ? 'Ja' : 'Nei'}</li>
                            <li>• Rapporttype: {reportType}</li>
                            {data && data.length > 0 && (
                                <li>• Kolonner: {Object.keys(data[0]).join(', ')}</li>
                            )}
                        </ul>
                    </div>

                    <div>
                        <strong>Tilgjengelige analyser ({availableAnalyses.length}):</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {availableAnalyses.length === 0 ? (
                                <span className="text-muted-foreground">Ingen tilgjengelig</span>
                            ) : (
                                availableAnalyses.map(analysis => (
                                    <Badge
                                        key={analysis.id}
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        {analysis.icon} {analysis.name}
                                    </Badge>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default AnalysisDebug;
