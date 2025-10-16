import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import JsonView from '@uiw/react-json-view';
import {
    FileText,
    ArrowLeft,
    Database,
    Users,
    Target,
    Download,
    Eye,
    Hash,
    Type,
    HardDrive,
    Layers
} from 'lucide-react';

const JsonDataInspector = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('structure'); // 'structure', 'sample', 'full'

    const filename = searchParams.get('file');

    useEffect(() => {
        if (filename) {
            loadFileData();
        } else {
            setError('Ingen fil spesifisert for inspeksjon');
            setLoading(false);
        }
    }, [filename]);

    const loadFileData = async () => {
        try {
            setLoading(true);
            console.log(`🔍 Laster fil for inspeksjon: ${filename}`);

            const result = await window.electron.portfolioFile.loadData(filename);

            if (result.success) {
                setData(result.data);
                console.log('📊 Data lastet for inspeksjon');
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('❌ Feil ved lasting av fil:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    const tilbakeTilDataAdministrasjon = () => {
        navigate('/portefoljeanalyse');
    };

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-lg font-medium text-muted-foreground">Analyserer JSON-struktur...</p>
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
                        <FileText className="h-6 w-6 text-blue-600" />
                        <div>
                            <h1 className="text-xl font-semibold">JSON Data Inspector</h1>
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

            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* View mode selector */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant={viewMode === 'structure' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode('structure')}
                        >
                            <Layers className="h-4 w-4 mr-1" />
                            Struktur
                        </Button>
                        <Button
                            variant={viewMode === 'sample' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode('sample')}
                        >
                            <Eye className="h-4 w-4 mr-1" />
                            Sample Data
                        </Button>
                        <Button
                            variant={viewMode === 'full' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode('full')}
                        >
                            <Database className="h-4 w-4 mr-1" />
                            Full JSON
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Fil-statistikk */}
                {data && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <HardDrive className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="text-sm text-gray-600">Filstørrelse</p>
                                        <p className="text-lg font-bold">
                                            {(new Blob([JSON.stringify(data)]).size / (1024 * 1024)).toFixed(1)} MB
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-green-600" />
                                    <div>
                                        <p className="text-sm text-gray-600">Kunder</p>
                                        <p className="text-lg font-bold">
                                            {data.customers?.length?.toLocaleString() || 0}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-red-600" />
                                    <div>
                                        <p className="text-sm text-gray-600">Skader</p>
                                        <p className="text-lg font-bold">
                                            {data.claimData?.SkadeDetaljer?.length?.toLocaleString() || 0}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <Type className="h-5 w-5 text-purple-600" />
                                    <div>
                                        <p className="text-sm text-gray-600">Hovednøkler</p>
                                        <p className="text-lg font-bold">{Object.keys(data).length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <Hash className="h-5 w-5 text-orange-600" />
                                    <div>
                                        <p className="text-sm text-gray-600">Total poliser</p>
                                        <p className="text-lg font-bold">
                                            {data.customers?.reduce((sum, customer) =>
                                                sum + (customer.PolicyList?.length || 0), 0
                                            )?.toLocaleString() || 0}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Main content based on view mode */}
                {data && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                {viewMode === 'structure' && 'JSON Struktur Oversikt'}
                                {viewMode === 'sample' && 'Sample Data Viewer'}
                                {viewMode === 'full' && 'Full JSON Data'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {viewMode === 'structure' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="font-medium mb-3">Hovednøkler:</h4>
                                            <div className="space-y-2">
                                                {Object.keys(data).map((key, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                        <span className="font-medium text-blue-600">{key}</span>
                                                        <Badge variant="outline">
                                                            {Array.isArray(data[key]) ?
                                                                `Array (${data[key].length})` :
                                                                typeof data[key]
                                                            }
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium mb-3">Data insights:</h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Har customer data:</span>
                                                    <Badge variant={data.customers ? "default" : "outline"}>
                                                        {data.customers ? '✓' : '✗'}
                                                    </Badge>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Har claim data:</span>
                                                    <Badge variant={data.claimData ? "default" : "outline"}>
                                                        {data.claimData ? '✓' : '✗'}
                                                    </Badge>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Har summary:</span>
                                                    <Badge variant={data.summary ? "default" : "outline"}>
                                                        {data.summary ? '✓' : '✗'}
                                                    </Badge>
                                                </div>
                                                {data.claimData?.SkadeDetaljer && (
                                                    <div className="flex justify-between">
                                                        <span>Skadedetaljer:</span>
                                                        <Badge variant="default">
                                                            {data.claimData.SkadeDetaljer.length} skader
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {viewMode === 'sample' && (
                                <div className="space-y-6">
                                    {/* Sample customers */}
                                    {data.customers && data.customers.length > 0 && (
                                        <div>
                                            <h4 className="font-medium mb-3">Sample Customers (første {Math.min(3, data.customers.length)}):</h4>
                                            <JsonView
                                                value={data.customers.slice(0, 3)}
                                                style={{ backgroundColor: '#f8f9fa' }}
                                                collapsed={2}
                                            />
                                        </div>
                                    )}

                                    {/* Sample claims */}
                                    {data.claimData?.SkadeDetaljer && data.claimData.SkadeDetaljer.length > 0 && (
                                        <div>
                                            <h4 className="font-medium mb-3">Sample Claims (første {Math.min(3, data.claimData.SkadeDetaljer.length)}):</h4>
                                            <JsonView
                                                value={data.claimData.SkadeDetaljer.slice(0, 3)}
                                                style={{ backgroundColor: '#f8f9fa' }}
                                                collapsed={2}
                                            />
                                        </div>
                                    )}

                                    {/* Summary */}
                                    {data.summary && (
                                        <div>
                                            <h4 className="font-medium mb-3">Summary Object:</h4>
                                            <JsonView
                                                value={data.summary}
                                                style={{ backgroundColor: '#f8f9fa' }}
                                                collapsed={1}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {viewMode === 'full' && (
                                <div>
                                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            ⚠️ <strong>Advarsel:</strong> Full JSON kan være svært stor ({(new Blob([JSON.stringify(data)]).size / (1024 * 1024)).toFixed(1)} MB).
                                            Dette kan gjøre nettleseren treg.
                                        </p>
                                    </div>
                                    <div className="max-h-[600px] overflow-auto">
                                        <JsonView
                                            value={data}
                                            style={{ backgroundColor: '#f8f9fa' }}
                                            collapsed={3}
                                            displayDataTypes={true}
                                            enableClipboard={true}
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default JsonDataInspector;
