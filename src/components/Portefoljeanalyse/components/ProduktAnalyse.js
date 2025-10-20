import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { PieChart } from 'lucide-react';

const ProduktAnalyse = ({ portefoljeData }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-orange-600" />
                    Produkt-analyser
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="p-8 border-2 border-dashed border-orange-200 rounded-lg text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-4 text-orange-400" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">Produkt-analyser</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Analyse per produkttype, forsikringsgiver og dekning
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                        <p>• Lønnsomhet per produkttype</p>
                        <p>• Forsikringsgiver-sammenligning</p>
                        <p>• Dekning-analyse (Ansvar, Kasko, osv.)</p>
                        <p>• Premie-fordeling</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ProduktAnalyse;
