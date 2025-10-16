import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Calendar } from 'lucide-react';

const PeriodeSammenligning = ({ portefoljeData }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    Periode-sammenligninger
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="p-8 border-2 border-dashed border-green-200 rounded-lg text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-green-400" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">Periode-sammenligninger</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Sammenlign ulike tidsperioder for trend-analyse
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                        <p>• Q1 2024 vs Q1 2025</p>
                        <p>• År-over-år sammenligning</p>
                        <p>• Måned-over-måned</p>
                        <p>• Custom periode-sammenligning</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default PeriodeSammenligning;
