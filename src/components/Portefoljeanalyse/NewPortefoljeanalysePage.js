import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
    BarChart3,
    ArrowLeft
} from 'lucide-react';

const NewPortefoljeanalysePage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [portefoljeData, setPortefoljeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPeriods, setSelectedPeriods] = useState([]);
    const [comparisonMode, setComparisonMode] = useState(false);

    const filename = searchParams.get('file');

    useEffect(() => {
        if (filename) {
            lastPortefoljedata();
        } else {
            setError('Ingen fil spesifisert for analyse');
            setLoading(false);
        }
    }, [filename]);

    const lastPortefoljedata = async () => {
        try {
            setLoading(true);
            console.log(`📂 Laster porteføljedata fra: ${filename}`);

            const result = await window.electron.portfolioFile.loadData(filename);

            if (result.success) {
                console.log('🔧 SETTER porteføljedata i state - hasData:', !!result.data);
                setPortefoljeData(result.data);
                console.log('📊 porteføljedata lastet for analyse:', result.data.summary);

            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('❌ Feil ved lasting av porteføljedata:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const tilbakeTilDataAdministrasjon = () => {
        navigate('/portefoljeanalyse');
    };

    // Håndterer filter-endringer fra SmartPeriodFilter
    const handleFilterChange = (periods, isComparison) => {
        setSelectedPeriods(periods);
        setComparisonMode(isComparison);
        console.log('📊 Nye filter-valg:', { periods, isComparison });
    };

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-lg font-medium text-muted-foreground">Laster porteføljedata...</p>
                        <p className="text-sm text-muted-foreground mt-2">Fra fil: {filename}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="mb-6">
                    <Button
                        onClick={tilbakeTilDataAdministrasjon}
                        variant="outline"
                        className="mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Tilbake til data-administrasjon
                    </Button>
                </div>

                <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">
                        ❌ {error}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Minimal header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="h-6 w-6 text-purple-600" />
                        <div>
                            <h1 className="text-xl font-semibold">Porteføljeanalyse</h1>
                            <p className="text-sm text-gray-600">{filename}</p>
                        </div>
                    </div>
                    <Button
                        onClick={tilbakeTilDataAdministrasjon}
                        variant="outline"
                        size="sm"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Tilbake
                    </Button>
                </div>
            </div>

            {/* Hovedinnhold - Tom for iterativ utvikling */}
            <div className="max-w-7xl mx-auto p-6">
                {portefoljeData ? (
                    <div className="space-y-6">
                        {/* Filter-knapper */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                    Velg periode
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        variant={activeFilter === 'alle' ? "default" : "outline"}
                                        onClick={() => setActiveFilter('alle')}
                                        className="flex items-center gap-2"
                                    >
                                        <Database className="h-4 w-4" />
                                        Alle data
                                    </Button>

                                    <Button
                                        variant={activeFilter === 'siste12' ? "default" : "outline"}
                                        onClick={() => setActiveFilter('siste12')}
                                        className="flex items-center gap-2"
                                    >
                                        <Calendar className="h-4 w-4" />
                                        Siste 12 måneder
                                    </Button>

                                    <Button
                                        variant={activeFilter === 'iaar' ? "default" : "outline"}
                                        onClick={() => setActiveFilter('iaar')}
                                        className="flex items-center gap-2"
                                    >
                                        <Calendar className="h-4 w-4" />
                                        I år (2025)
                                    </Button>

                                    {/* År-knapper basert på data */}
                                    <Button
                                        variant={activeFilter === '2024' ? "default" : "outline"}
                                        onClick={() => setActiveFilter('2024')}
                                    >
                                        2024
                                    </Button>

                                    <Button
                                        variant={activeFilter === '2023' ? "default" : "outline"}
                                        onClick={() => setActiveFilter('2023')}
                                    >
                                        2023
                                    </Button>

                                    <Button
                                        variant={activeFilter === '2022' ? "default" : "outline"}
                                        onClick={() => setActiveFilter('2022')}
                                    >
                                        2022
                                    </Button>

                                    <Button
                                        variant={activeFilter === '2021' ? "default" : "outline"}
                                        onClick={() => setActiveFilter('2021')}
                                    >
                                        2021
                                    </Button>
                                </div>

                                {/* Smart kvartal-filtre */}
                                <div className="mt-4 pt-4 border-t">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Kvartaler (alle år):</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant={activeFilter === 'q1' ? "default" : "outline"}
                                            onClick={() => setActiveFilter('q1')}
                                            size="sm"
                                        >
                                            Q1
                                        </Button>

                                        <Button
                                            variant={activeFilter === 'q2' ? "default" : "outline"}
                                            onClick={() => setActiveFilter('q2')}
                                            size="sm"
                                        >
                                            Q2
                                        </Button>

                                        <Button
                                            variant={activeFilter === 'q3' ? "default" : "outline"}
                                            onClick={() => setActiveFilter('q3')}
                                            size="sm"
                                        >
                                            Q3
                                        </Button>

                                        <Button
                                            variant={activeFilter === 'q4' ? "default" : "outline"}
                                            onClick={() => setActiveFilter('q4')}
                                            size="sm"
                                        >
                                            Q4
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Viser valgt kvartal på tvers av alle år i datasettet
                                    </p>
                                </div>

                                {/* Status for valgt filter med datoer */}
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-blue-700 font-medium">
                                                <strong>Aktivt filter:</strong> {
                                                    activeFilter === 'alle' ? 'Alle data' :
                                                        activeFilter === 'siste12' ? 'Siste 12 måneder' :
                                                            activeFilter === 'iaar' ? 'I år (2025)' :
                                                                ['q1', 'q2', 'q3', 'q4'].includes(activeFilter) ? `${activeFilter.toUpperCase()} (alle år)` :
                                                                    `År ${activeFilter}`
                                                }
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-blue-600">
                                                <strong>Periode:</strong> {getPeriodeDatoer(activeFilter).beskrivelse}
                                            </p>
                                            <p className="text-xs text-blue-500 mt-1">
                                                🕐 Norsk tidssone (Europe/Oslo): {new Date().toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Placeholder for analyse-innhold */}
                        <Card>
                            <CardContent className="p-8 text-center">
                                <h3 className="text-lg font-medium text-gray-600 mb-2">
                                    Analyse-innhold kommer her
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Basert på filter: <Badge variant="outline">{activeFilter}</Badge>
                                </p>
                                <div className="mt-4 text-xs text-gray-400">
                                    <p>📊 Data lastet fra: {filename}</p>
                                    <p>✅ {portefoljeData.customers?.length || 0} kunder tilgjengelig</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="text-center p-8">
                        <p className="text-muted-foreground">
                            Ingen porteføljedata tilgjengelig
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewPortefoljeanalysePage;
