import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Users } from 'lucide-react';

const KundeDrillDown = ({ portefoljeData }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Kunde-analyser
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="p-8 border-2 border-dashed border-purple-200 rounded-lg text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">Kunde-analyser</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Drill-down analyse på kunde-nivå
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                        <p>• Kunde-lønnsomhet</p>
                        <p>• Risikoprofil per kunde</p>
                        <p>• Skadefrekvens per kunde</p>
                        <p>• Kunde-ranking</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default KundeDrillDown;
