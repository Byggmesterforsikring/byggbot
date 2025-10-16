import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { PortfolioAnalysisEngine } from '../utils/portfolioAnalysisEngine';
import { POLICY_STATUS_RULES } from '../utils/portfolioBusinessRules';
import {
    BarChart3,
    TrendingUp,
    Users,
    FileText,
    AlertCircle
} from 'lucide-react';

const PortfolioAnalysisTest = ({ portefoljeData }) => {
    const [analysisEngine, setAnalysisEngine] = useState(null);
    const [portefoljeOversikt, setPortefoljeOversikt] = useState(null);
    const [kvartalSammenligning, setKvartalSammenligning] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (portefoljeData) {
            console.log('🚀 Initialiserer PortfolioAnalysisEngine...');
            const engine = new PortfolioAnalysisEngine(portefoljeData);
            setAnalysisEngine(engine);
        }
    }, [portefoljeData]);

    const kjørPortefoljeOversikt = () => {
        if (!analysisEngine) return;

        setLoading(true);
        console.log('📊 Kjører portefølje-oversikt...');

        try {
            const oversikt = analysisEngine.getPortefoljeOversikt();
            setPortefoljeOversikt(oversikt);
            console.log('✅ Portefølje-oversikt:', oversikt);
        } catch (error) {
            console.error('❌ Feil i portefølje-oversikt:', error);
        } finally {
            setLoading(false);
        }
    };

    const kjørKvartalSammenligning = () => {
        if (!analysisEngine) return;

        setLoading(true);
        console.log('📊 Kjører Q1 2024 vs Q1 2025 sammenligning...');

        try {
            const sammenligning = analysisEngine.sammenlignKvartaler(2024, 2025, 1);
            setKvartalSammenligning(sammenligning);
            console.log('✅ Kvartal-sammenligning:', sammenligning);
        } catch (error) {
            console.error('❌ Feil i kvartal-sammenligning:', error);
        } finally {
            setLoading(false);
        }
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
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                        Test analyse-motor
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-3">
                        <Button
                            onClick={kjørPortefoljeOversikt}
                            disabled={loading || !analysisEngine}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Portefølje-oversikt
                        </Button>

                        <Button
                            onClick={kjørKvartalSammenligning}
                            disabled={loading || !analysisEngine}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Q1 2024 vs Q1 2025
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Portefølje-oversikt resultater */}
            {portefoljeOversikt && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                            Portefølje-oversikt
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-purple-50 p-3 rounded border">
                                <p className="text-sm font-medium">Kunder</p>
                                <p className="text-lg font-bold text-purple-600">
                                    {portefoljeOversikt.oversikt.antallKunder}
                                </p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded border">
                                <p className="text-sm font-medium">Aktive avtaler</p>
                                <p className="text-lg font-bold text-blue-600">
                                    {portefoljeOversikt.oversikt.antallAktiveAvtaler}
                                </p>
                            </div>
                            <div className="bg-green-50 p-3 rounded border">
                                <p className="text-sm font-medium">Valide skader</p>
                                <p className="text-lg font-bold text-green-600">
                                    {portefoljeOversikt.oversikt.antallValideSkader}
                                </p>
                            </div>
                            <div className="bg-orange-50 p-3 rounded border">
                                <p className="text-sm font-medium">Skade-ratio</p>
                                <p className="text-lg font-bold text-orange-600">
                                    {portefoljeOversikt.økonomi.skadeRatio.toFixed(1)}%
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded">
                            <h4 className="font-medium mb-2">Økonomisk oversikt:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="font-medium">Total premie:</span>
                                    <br />
                                    {portefoljeOversikt.økonomi.totalPremie.toLocaleString('nb-NO')} kr
                                </div>
                                <div>
                                    <span className="font-medium">Total skadekostnad:</span>
                                    <br />
                                    {portefoljeOversikt.økonomi.totalSkadekostnad.toLocaleString('nb-NO')} kr
                                </div>
                                <div>
                                    <span className="font-medium">Netto resultat:</span>
                                    <br />
                                    <span className={portefoljeOversikt.økonomi.nettoResultat >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {portefoljeOversikt.økonomi.nettoResultat.toLocaleString('nb-NO')} kr
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Kvartal-sammenligning resultater */}
            {kvartalSammenligning && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            Q1 2024 vs Q1 2025 sammenligning
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Q1 2024 */}
                            <div className="bg-gray-50 p-4 rounded">
                                <h4 className="font-medium mb-3">Q1 2024</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Covers:</span>
                                        <span className="font-medium">{kvartalSammenligning[2024].covers}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Skader:</span>
                                        <span className="font-medium">{kvartalSammenligning[2024].skader}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Premie:</span>
                                        <span className="font-medium">{kvartalSammenligning[2024].premie.toLocaleString('nb-NO')} kr</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Skade-ratio:</span>
                                        <span className="font-medium">{kvartalSammenligning[2024].skadeRatio.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Q1 2025 */}
                            <div className="bg-blue-50 p-4 rounded">
                                <h4 className="font-medium mb-3">Q1 2025</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Covers:</span>
                                        <span className="font-medium">{kvartalSammenligning[2025].covers}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Skader:</span>
                                        <span className="font-medium">{kvartalSammenligning[2025].skader}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Premie:</span>
                                        <span className="font-medium">{kvartalSammenligning[2025].premie.toLocaleString('nb-NO')} kr</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Skade-ratio:</span>
                                        <span className="font-medium">{kvartalSammenligning[2025].skadeRatio.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sammenligning */}
                        <div className="mt-4 bg-green-50 p-4 rounded">
                            <h4 className="font-medium mb-3">Endringer (2024 → 2025)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="font-medium">Premie-endring:</span>
                                    <br />
                                    <span className={kvartalSammenligning.sammenligning.premieEndring >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {kvartalSammenligning.sammenligning.premieEndring.toFixed(1)}%
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium">Skade-endring:</span>
                                    <br />
                                    <span className={kvartalSammenligning.sammenligning.skadeEndring <= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {kvartalSammenligning.sammenligning.skadeEndring.toFixed(1)}%
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium">Skade-ratio endring:</span>
                                    <br />
                                    <span className={kvartalSammenligning.sammenligning.skadeRatioEndring <= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {kvartalSammenligning.sammenligning.skadeRatioEndring.toFixed(1)}%
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

export default PortfolioAnalysisTest;
