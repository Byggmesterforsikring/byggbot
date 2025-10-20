import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { TrendingUp } from 'lucide-react';

const TidsserieAnalyse = ({ portefoljeData }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Tidsserie-analyser
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="p-8 border-2 border-dashed border-blue-200 rounded-lg text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-blue-400" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">Tidsserie-analyser</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Månedlig/kvartalvis utvikling av premie og skader over tid
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                        <p>• Månedlig premie-utvikling</p>
                        <p>• Skadefrekvens over tid</p>
                        <p>• Sesongmønstre</p>
                        <p>• Trend-analyse</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default TidsserieAnalyse;
