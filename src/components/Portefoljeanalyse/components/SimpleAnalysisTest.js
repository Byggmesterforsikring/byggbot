import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { SimplePortfolioAnalysis, RULE_BUILDER } from '../utils/portfolioBusinessRules';
import {
    BarChart3,
    Search,
    Users,
    FileText,
    AlertCircle
} from 'lucide-react';

const SimpleAnalysisTest = ({ portefoljeData }) => {
    const [analysisEngine, setAnalysisEngine] = useState(null);
    const [grunnleggendeOversikt, setGrunnleggendeOversikt] = useState(null);
    const [policyStatusAnalyse, setPolicyStatusAnalyse] = useState(null);
    const [regelTest, setRegelTest] = useState(null);

    useEffect(() => {
        if (portefoljeData) {
            console.log('🚀 Initialiserer SimplePortfolioAnalysis...');
            const engine = new SimplePortfolioAnalysis(portefoljeData);
            setAnalysisEngine(engine);
        }
    }, [portefoljeData]);

    const kjørGrunnleggendeOversikt = () => {
        if (!analysisEngine) return;

        console.log('📊 Kjører grunnleggende oversikt (ingen filtrering)...');
        const oversikt = analysisEngine.getGrunnleggendeOversikt();
        setGrunnleggendeOversikt(oversikt);
        console.log('✅ Grunnleggende oversikt:', oversikt);
    };

    const analyserPolicyStatuser = () => {
        if (!analysisEngine) return;

        console.log('🔍 Analyserer policy-statuser...');
        const analyse = analysisEngine.analyserPolicyStatuser();
        setPolicyStatusAnalyse(analyse);
        console.log('✅ Policy-status analyse:', analyse);
    };

    const testAktivRegelKun3 = () => {
        if (!analysisEngine) return;

        console.log('🧪 Tester regel: Kun PolicyStatusID = 3...');
        const test = analysisEngine.testPolicyStatusRule(['Aktiv'], [3]);
        setRegelTest({
            navn: 'Kun Aktiv (ID=3)',
            resultat: test
        });
        console.log('✅ Regel-test resultat:', test);
    };

    if (!portefoljeData) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-muted-foreground">Ingen porteføljedata lastet</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Analyse-kontroller */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-purple-600" />
                        Iterativ regel-utvikling
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-purple-50 p-3 rounded border border-purple-200">
                        <p className="text-sm text-purple-800">
                            Bygg business-regler én om gangen med bruker-validering
                        </p>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                        <Button
                            onClick={kjørGrunnleggendeOversikt}
                            disabled={!analysisEngine}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            size="sm"
                        >
                            <Users className="h-4 w-4 mr-2" />
                            Grunnleggende oversikt
                        </Button>

                        <Button
                            onClick={analyserPolicyStatuser}
                            disabled={!analysisEngine}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            size="sm"
                        >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Analyser policy-statuser
                        </Button>

                        <Button
                            onClick={testAktivRegelKun3}
                            disabled={!analysisEngine}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                        >
                            <Search className="h-4 w-4 mr-2" />
                            Test "Aktiv" regel
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Grunnleggende oversikt */}
            {grunnleggendeOversikt && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-purple-600" />
                            Grunnleggende oversikt (ingen filtrering)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-purple-50 p-3 rounded border">
                                <p className="text-sm font-medium">Kunder</p>
                                <p className="text-lg font-bold text-purple-600">
                                    {grunnleggendeOversikt.kunder}
                                </p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded border">
                                <p className="text-sm font-medium">Policies (alle)</p>
                                <p className="text-lg font-bold text-blue-600">
                                    {grunnleggendeOversikt.policies}
                                </p>
                            </div>
                            <div className="bg-green-50 p-3 rounded border">
                                <p className="text-sm font-medium">Skader (alle)</p>
                                <p className="text-lg font-bold text-green-600">
                                    {grunnleggendeOversikt.skader}
                                </p>
                            </div>
                            <div className="bg-orange-50 p-3 rounded border">
                                <p className="text-sm font-medium">Periode</p>
                                <p className="text-sm font-bold text-orange-600">
                                    {grunnleggendeOversikt.periode?.startDate} - {grunnleggendeOversikt.periode?.endDate}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Policy-status analyse */}
            {policyStatusAnalyse && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            Policy-status fordeling
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Status-navn fordeling */}
                            <div>
                                <h4 className="font-medium mb-3">Status-navn fordeling:</h4>
                                <div className="space-y-2">
                                    {Object.keys(policyStatusAnalyse.statusNavnFordeling).map(status => {
                                        const antall = policyStatusAnalyse.statusNavnFordeling[status].length;
                                        const prosent = (antall / grunnleggendeOversikt.policies * 100).toFixed(1);
                                        return (
                                            <div key={status} className="flex justify-between text-sm">
                                                <span className="font-medium">{status}:</span>
                                                <span>{antall} ({prosent}%)</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Status-ID fordeling */}
                            <div>
                                <h4 className="font-medium mb-3">Status-ID fordeling:</h4>
                                <div className="space-y-2">
                                    {Object.keys(policyStatusAnalyse.statusIdFordeling).map(id => {
                                        const antall = policyStatusAnalyse.statusIdFordeling[id].length;
                                        const prosent = (antall / grunnleggendeOversikt.policies * 100).toFixed(1);
                                        return (
                                            <div key={id} className="flex justify-between text-sm">
                                                <span className="font-medium">ID {id}:</span>
                                                <span>{antall} ({prosent}%)</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Regel-test resultat */}
            {regelTest && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5 text-green-600" />
                            Regel-test: {regelTest.navn}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-green-50 p-4 rounded border border-green-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="font-medium">Totalt policies:</span>
                                    <br />
                                    {regelTest.resultat.testResultat.totaltPolicies}
                                </div>
                                <div>
                                    <span className="font-medium">Matchende policies:</span>
                                    <br />
                                    {regelTest.resultat.testResultat.matchendePolicies}
                                </div>
                                <div>
                                    <span className="font-medium">Prosent av totalt:</span>
                                    <br />
                                    <span className="text-green-600 font-bold">
                                        {regelTest.resultat.testResultat.prosent}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default SimpleAnalysisTest;
