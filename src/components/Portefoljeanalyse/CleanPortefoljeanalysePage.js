import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import {
    BarChart3,
    ArrowLeft
} from 'lucide-react';

// Import auto-sammenligning filter
import AutoComparisonFilter from './AutoComparisonFilter';

const CleanPortefoljeanalysePage = () => {
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
            {/* Header */}
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

            {/* Hovedinnhold med smart filter-system */}
            <div className="max-w-7xl mx-auto p-6">
                {portefoljeData ? (
                    <div className="space-y-6">
                        {/* Auto Comparison Filter */}
                        <AutoComparisonFilter
                            portefoljeData={portefoljeData}
                            onFilterChange={handleFilterChange}
                        />

                        {/* Analyse-innhold basert på valgte perioder */}
                        <Card>
                            <CardContent className="p-8 text-center">
                                <h3 className="text-lg font-medium text-gray-600 mb-2">
                                    Analyse-innhold kommer her
                                </h3>
                                {comparisonMode ? (
                                    <div className="space-y-2">
                                        <p className="text-sm text-green-600 font-medium">
                                            🔄 Sammenligning aktiv - {selectedPeriods.length} perioder valgt
                                        </p>
                                        <div className="text-xs text-gray-500">
                                            {selectedPeriods.map((period, index) => (
                                                <div key={index}>
                                                    Periode {index + 1}: {period.type} {period.value}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">
                                        Enkelt periode-filter aktivt
                                    </p>
                                )}
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

export default CleanPortefoljeanalysePage;
