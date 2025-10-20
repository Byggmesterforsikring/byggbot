import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
    BarChart3,
    Calendar,
    Users,
    FileText,
    ArrowLeft,
    TrendingUp,
    PieChart,
    Filter,
    Download,
    Target,
    Clock
} from 'lucide-react';

// Import analyse-komponenter og nytt dashboard
import AnalyseDashboard from './AnalyseDashboard';
import PortefoljeOversikt from './components/PortefoljeOversikt';
import TidsserieAnalyse from './components/TidsserieAnalyse';
import PeriodeSammenligning from './components/PeriodeSammenligning';
import ProduktAnalyse from './components/ProduktAnalyse';
import KundeDrillDown from './components/KundeDrillDown';
import ViewDateAnalyse from './components/ViewDateAnalyse';
import UWYearAnalyse from './components/UWYearAnalyse';
import CSVExportSammenligning from './components/CSVExportSammenligning';
import CSVSammenligning from './components/CSVSammenligning';

const PortefoljeAnalysePage = () => {
    console.log('🏠 PortefoljeAnalysePage COMPONENT RENDER - ALWAYS RUNS');

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [portefoljeData, setPortefoljeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [useDashboard, setUseDashboard] = useState(true); // Ny state for å velge visning

    const filename = searchParams.get('file');

    useEffect(() => {
        if (filename) {
            lastPortefoljedata();
        } else {
            setError('Ingen fil spesifisert for analyse');
            setLoading(false);
        }
    }, [filename]);

    // Debug useEffect for portefoljeData changes
    useEffect(() => {
        console.log('🎯 portefoljeData state CHANGED:', {
            hasData: !!portefoljeData,
            keys: portefoljeData ? Object.keys(portefoljeData) : null,
            loading: loading,
            error: error
        });
    }, [portefoljeData, loading, error]);

    const lastPortefoljedata = async () => {
        try {
            setLoading(true);
            console.log(`📂 Laster porteføljedata fra: ${filename}`);

            const result = await window.electron.portfolioFile.loadData(filename);

            if (result.success) {
                console.log('🔧 SETTER porteføljedata i state - hasData:', !!result.data);
                setPortefoljeData(result.data);
                console.log('📊 Porteføljedata lastet for analyse:', result.data.summary);
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

    const formatNorskDato = (dateString) => {
        return new Date(dateString).toLocaleDateString('nb-NO');
    };

    const tilbakeTilDataAdministrasjon = () => {
        navigate('/portefoljeanalyse');
    };

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-purple-600 animate-pulse" />
                        <p className="text-lg font-medium">Laster porteføljedata...</p>
                        <p className="text-sm text-muted-foreground">Fil: {filename}</p>
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
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header med tilbake-knapp og visnings-toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Porteføljeanalyse</h1>
                        <p className="text-muted-foreground">
                            UW-analyser basert på {filename}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Button
                            variant={useDashboard ? "default" : "outline"}
                            size="sm"
                            onClick={() => setUseDashboard(true)}
                        >
                            Dashboard
                        </Button>
                        <Button
                            variant={!useDashboard ? "default" : "outline"}
                            size="sm"
                            onClick={() => setUseDashboard(false)}
                        >
                            Tabs
                        </Button>
                    </div>
                    <Button
                        onClick={tilbakeTilDataAdministrasjon}
                        variant="outline"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Tilbake
                    </Button>
                </div>
            </div>

            {/* Data-oversikt */}
            {portefoljeData && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                            Datasett-oversikt
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-purple-50 p-3 rounded border">
                                <div className="flex items-center gap-2 mb-1">
                                    <Users className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-medium">Kunder</span>
                                </div>
                                <p className="text-xl font-bold text-purple-800">
                                    {portefoljeData.summary.totalCustomers.toLocaleString('nb-NO')}
                                </p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded border">
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium">Policies</span>
                                </div>
                                <p className="text-xl font-bold text-blue-800">
                                    {portefoljeData.summary.totalPolicies.toLocaleString('nb-NO')}
                                </p>
                            </div>
                            <div className="bg-green-50 p-3 rounded border">
                                <div className="flex items-center gap-2 mb-1">
                                    <BarChart3 className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium">Covers</span>
                                </div>
                                <p className="text-xl font-bold text-green-800">
                                    {portefoljeData.summary.totalCovers.toLocaleString('nb-NO')}
                                </p>
                            </div>
                            <div className="bg-orange-50 p-3 rounded border">
                                <div className="flex items-center gap-2 mb-1">
                                    <Target className="h-4 w-4 text-orange-600" />
                                    <span className="text-sm font-medium">Skader</span>
                                </div>
                                <p className="text-xl font-bold text-orange-800">
                                    {portefoljeData.summary.totalClaims?.toLocaleString('nb-NO') || 0}
                                </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded border">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="h-4 w-4 text-gray-600" />
                                    <span className="text-sm font-medium">Periode</span>
                                </div>
                                <p className="text-sm font-bold text-gray-800">
                                    {formatNorskDato(portefoljeData.summary.periode.startDate)} - {formatNorskDato(portefoljeData.summary.periode.endDate)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Hovedinnhold - Dashboard eller Tabs */}
            {console.log('🎯 PortefoljeanalysePage render - ALLTID:', {
                hasPortefoljeData: !!portefoljeData,
                loading: loading,
                error: error,
                useDashboard: useDashboard,
                portefoljeDataKeys: portefoljeData ? Object.keys(portefoljeData) : null
            })}

            {portefoljeData ? (
                useDashboard ? (
                    // Nytt Dashboard-system
                    <AnalyseDashboard
                        portefoljeData={portefoljeData}
                        filename={filename}
                    />
                ) : (
                    // Gammelt Tab-system
                    <Tabs defaultValue="oversikt" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-7">
                            <TabsTrigger value="oversikt" className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                Oversikt
                            </TabsTrigger>
                            <TabsTrigger value="uwyear" className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                UW-Årganger
                            </TabsTrigger>
                            <TabsTrigger value="tidsserier" className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Tidsserier
                            </TabsTrigger>
                            <TabsTrigger value="sammenligning" className="flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Sammenligning
                            </TabsTrigger>
                            <TabsTrigger value="produkter" className="flex items-center gap-2">
                                <PieChart className="h-4 w-4" />
                                Produkter
                            </TabsTrigger>
                            <TabsTrigger value="kunder" className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Kunder
                            </TabsTrigger>
                            <TabsTrigger value="viewdate" className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                ViewDate
                            </TabsTrigger>
                            <TabsTrigger value="csv-export" className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                CSV Export
                            </TabsTrigger>
                            <TabsTrigger value="csv-sammenligning" className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                CSV Sammenligning
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="oversikt">
                            <PortefoljeOversikt portefoljeData={portefoljeData} filename={filename} />
                        </TabsContent>

                        <TabsContent value="uwyear">
                            <UWYearAnalyse
                                portfolioData={portefoljeData}
                                claimsData={portefoljeData}
                            />
                        </TabsContent>

                        <TabsContent value="tidsserier">
                            <TidsserieAnalyse portefoljeData={portefoljeData} />
                        </TabsContent>

                        <TabsContent value="sammenligning">
                            <PeriodeSammenligning portefoljeData={portefoljeData} />
                        </TabsContent>

                        <TabsContent value="produkter">
                            <ProduktAnalyse portefoljeData={portefoljeData} />
                        </TabsContent>

                        <TabsContent value="kunder">
                            <KundeDrillDown portefoljeData={portefoljeData} />
                        </TabsContent>

                        <TabsContent value="viewdate">
                            <ViewDateAnalyse portefoljeData={portefoljeData} />
                        </TabsContent>

                        <TabsContent value="csv-export">
                            <CSVExportSammenligning portefoljeData={portefoljeData} />
                        </TabsContent>

                        <TabsContent value="csv-sammenligning">
                            <CSVSammenligning portefoljeData={portefoljeData} />
                        </TabsContent>
                    </Tabs>
                )
            ) : (
                <div className="text-center p-8">
                    <p className="text-muted-foreground">
                        {loading ? 'Laster data...' : 'Ingen porteføljedata tilgjengelig'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default PortefoljeAnalysePage;