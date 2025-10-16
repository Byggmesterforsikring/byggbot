import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import JsonView from '@uiw/react-json-view';
import {
    BarChart3,
    ArrowLeft,
    FileText,
    BarChart,
    Eye
} from 'lucide-react';

// Import komponenter
import ReportTypeSelector from './ReportTypeSelector';
import CompactPeriodFilter from './CompactPeriodFilter';
import Skaderapport from './reports/Skaderapport';
import PortfolioReport from './reports/PortfolioReport';

const OptimizedDataContainer = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [portefoljeData, setPortefoljeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentView, setCurrentView] = useState(() => {
        return window.location.pathname.includes('inspiser') ? 'json' : 'analyse';
    });
    const [selectedReport, setSelectedReport] = useState(null);
    const [selectedPeriods, setSelectedPeriods] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [selectedCovers, setSelectedCovers] = useState([]);
    const [selectedInsurers, setSelectedInsurers] = useState([]);
    const [selectedCustomerType, setSelectedCustomerType] = useState('alle'); // 'alle', 'privat', 'bedrift'

    const filename = searchParams.get('file');

    useEffect(() => {
        if (filename) {
            loadPortefoljedata();
        } else {
            setError('Ingen fil spesifisert');
            setLoading(false);
        }
    }, [filename]);

    const loadPortefoljedata = async () => {
        try {
            setLoading(true);
            console.log(`📂 Laster porteføljedata fra: ${filename}`);

            const result = await window.electron.portfolioFile.loadData(filename);

            if (result.success) {
                console.log('🔧 Data lastet for både JSON og analyse visning');
                setPortefoljeData(result.data);
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('❌ Feil ved lasting av data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const tilbakeTilDataAdministrasjon = () => {
        navigate('/portefoljeanalyse');
    };

    const handleReportSelect = (reportType) => {
        setSelectedReport(reportType);
        console.log('📊 Rapport valgt:', reportType);
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
            {/* Header med sømløs navigering */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">
                        {currentView === 'analyse' ? (
                            <BarChart3 className="h-6 w-6 text-purple-600" />
                        ) : (
                            <FileText className="h-6 w-6 text-blue-600" />
                        )}
                        <div>
                            <h1 className="text-xl font-semibold">
                                {currentView === 'analyse' ? 'Porteføljeanalyse' : 'JSON Data Inspector'}
                            </h1>
                            <p className="text-sm text-gray-600">{filename}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Sømløs toggle mellom visninger */}
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            <Button
                                size="sm"
                                variant={currentView === 'analyse' ? "default" : "ghost"}
                                onClick={() => setCurrentView('analyse')}
                                className="flex items-center gap-2"
                            >
                                <BarChart className="h-4 w-4" />
                                Analyse
                            </Button>
                            <Button
                                size="sm"
                                variant={currentView === 'json' ? "default" : "ghost"}
                                onClick={() => setCurrentView('json')}
                                className="flex items-center gap-2"
                            >
                                <Eye className="h-4 w-4" />
                                JSON
                            </Button>
                        </div>

                        {/* Bytt rapport knapp (kun synlig når rapport er valgt) */}
                        {selectedReport && currentView === 'analyse' && (
                            <Button
                                onClick={() => setSelectedReport(null)}
                                variant="outline"
                                size="sm"
                            >
                                Bytt rapport
                            </Button>
                        )}

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
            </div>

            {/* Hovedinnhold - optimalisert for rask bytte */}
            <div className="max-w-7xl mx-auto p-6">
                {!portefoljeData ? (
                    <div className="text-center p-8">
                        <p className="text-muted-foreground">Ingen data tilgjengelig</p>
                    </div>
                ) : currentView === 'analyse' ? (
                    /* ANALYSE VISNING - Start med rapport-selector */
                    <div className="space-y-6">
                        {!selectedReport ? (
                            /* Rapport-type selector */
                            <ReportTypeSelector
                                portefoljeData={portefoljeData}
                                onReportSelect={handleReportSelect}
                            />
                        ) : (
                            /* Valgt rapport med filter-system */
                            <div className="space-y-6">
                                {/* Filter-system for valgt rapport */}
                                <CompactPeriodFilter
                                    portefoljeData={portefoljeData}
                                    reportType={selectedReport.id}
                                    onFilterChange={(periods, products, covers, insurers, customerType) => {
                                        setSelectedPeriods(periods);
                                        setSelectedProducts(products);
                                        setSelectedCovers(covers);
                                        setSelectedInsurers(insurers);
                                        setSelectedCustomerType(customerType);
                                        console.log(`📊 ${selectedReport.title} - Filter endret:`, {
                                            periods,
                                            products,
                                            covers,
                                            insurers,
                                            customerType
                                        });
                                    }}
                                />

                                {/* Rapport-innhold basert på valgt type */}
                                {selectedReport.id === 'claims' ? (
                                    <Skaderapport
                                        portefoljeData={portefoljeData}
                                        selectedPeriods={selectedPeriods}
                                        selectedProducts={selectedProducts}
                                        selectedCustomerType={selectedCustomerType}
                                    />
                                ) : selectedReport.id === 'portfolio' ? (
                                    <PortfolioReport
                                        portefoljeData={portefoljeData}
                                        selectedPeriods={selectedPeriods}
                                        selectedProducts={selectedProducts}
                                        selectedCovers={selectedCovers}
                                        selectedInsurers={selectedInsurers}
                                        selectedCustomerType={selectedCustomerType}
                                    />
                                ) : (
                                    <Card>
                                        <CardContent className="p-8 text-center">
                                            <h3 className="text-lg font-medium text-gray-600 mb-2">
                                                {selectedReport.title} kommer snart
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                Spesialiserte analyse-komponenter for {selectedReport.title.toLowerCase()}
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    /* JSON VISNING - Optimalisert */
                    <div className="space-y-6">
                        {/* Fil-statistikk */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                <p className="text-sm text-blue-600">Filstørrelse</p>
                                <p className="text-lg font-bold">
                                    {(new Blob([JSON.stringify(portefoljeData)]).size / (1024 * 1024)).toFixed(1)} MB
                                </p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                <p className="text-sm text-green-600">Kunder</p>
                                <p className="text-lg font-bold">
                                    {portefoljeData.customers?.length?.toLocaleString() || 0}
                                </p>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                <p className="text-sm text-red-600">Skader</p>
                                <p className="text-lg font-bold">
                                    {portefoljeData.claimData?.SkadeDetaljer?.length?.toLocaleString() || 0}
                                </p>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                                <p className="text-sm text-purple-600">Hovednøkler</p>
                                <p className="text-lg font-bold">{Object.keys(portefoljeData).length}</p>
                            </div>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                                <p className="text-sm text-orange-600">Total poliser</p>
                                <p className="text-lg font-bold">
                                    {portefoljeData.customers?.reduce((sum, customer) =>
                                        sum + (customer.PolicyList?.length || 0), 0
                                    )?.toLocaleString() || 0}
                                </p>
                            </div>
                        </div>

                        {/* To-panel layout: Sample + Full JSON */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Sample Data Panel */}
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="text-lg font-semibold mb-4 text-green-600">📋 Sample Data</h3>

                                {/* Sample Customer */}
                                {portefoljeData.customers && portefoljeData.customers.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="font-medium mb-2">Første kunde (eksempel):</h4>
                                        <JsonView
                                            value={portefoljeData.customers[0]}
                                            style={{ backgroundColor: '#f8f9fa', fontSize: '12px' }}
                                            collapsed={2}
                                            enableClipboard={true}
                                            displayDataTypes={false}
                                        />
                                    </div>
                                )}

                                {/* Sample Claim */}
                                {portefoljeData.claimData?.SkadeDetaljer && portefoljeData.claimData.SkadeDetaljer.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="font-medium mb-2">Første skade (eksempel):</h4>
                                        <JsonView
                                            value={portefoljeData.claimData.SkadeDetaljer[0]}
                                            style={{ backgroundColor: '#f8f9fa', fontSize: '12px' }}
                                            collapsed={1}
                                            enableClipboard={true}
                                            displayDataTypes={false}
                                        />
                                    </div>
                                )}

                                {/* Summary */}
                                {portefoljeData.summary && (
                                    <div>
                                        <h4 className="font-medium mb-2">Summary objekt:</h4>
                                        <JsonView
                                            value={portefoljeData.summary}
                                            style={{ backgroundColor: '#f8f9fa', fontSize: '12px' }}
                                            collapsed={1}
                                            enableClipboard={true}
                                            displayDataTypes={false}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Full JSON Structure Panel */}
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="text-lg font-semibold mb-4 text-blue-600">🗂️ Full JSON Structure</h3>

                                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                    <p className="text-sm text-yellow-800">
                                        ⚠️ Full JSON er {(new Blob([JSON.stringify(portefoljeData)]).size / (1024 * 1024)).toFixed(1)} MB.
                                        Collapsed som standard for performance.
                                    </p>
                                </div>

                                <div className="max-h-[600px] overflow-auto">
                                    <JsonView
                                        value={portefoljeData}
                                        style={{ backgroundColor: '#f8f9fa', fontSize: '11px' }}
                                        collapsed={3}
                                        enableClipboard={true}
                                        displayDataTypes={true}
                                        displayObjectSize={true}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OptimizedDataContainer;
