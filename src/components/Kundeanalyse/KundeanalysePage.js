import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
    Search,
    User,
    TrendingUp,
    AlertTriangle,
    Shield,
    BarChart3,
    PieChart,
    Calendar
} from 'lucide-react';

import { useKundeData } from './hooks/useKundeData';
import { useRisikoBeregning } from './hooks/useRisikoBeregning';
import { usePrediksjoner } from './hooks/usePrediksjoner';
import { processCustomerDataUnified } from './utils/dataProcessing';

import KundeOversikt from './components/KundeOversikt';
import TidsserieAnalyse from './components/TidsserieAnalyse';
import ProduktAnalyse from './components/ProduktAnalyse';
import SkadeAnalyse from './components/SkadeAnalyse';
import Prediksjoner from './components/Prediksjoner';
import FornyelsesAnbefaling from './components/FornyelsesAnbefaling';

const KundeanalysePage = () => {
    const [kundenummer, setKundenummer] = useState('');
    const [søktKundenummer, setSøktKundenummer] = useState('');
    const terskler = { skadeProsent: 70 }; // Hardkodet terskel

    const { data: rawKundeData, loading, error, refetch } = useKundeData(søktKundenummer);

    // Prosesser all kundedata sentralisert for konsistens
    const kundeData = rawKundeData ? processCustomerDataUnified(rawKundeData) : null;

    const risikoAnalyse = useRisikoBeregning(kundeData, terskler);
    const prediksjoner = usePrediksjoner(kundeData, terskler);

    const handleSøk = () => {
        if (kundenummer.trim()) {
            setSøktKundenummer(kundenummer.trim());
        }
    };

    const getRiskBadge = (riskScore) => {
        if (!riskScore) return null;

        const colorMap = {
            høy: 'destructive',
            moderat: 'secondary',
            lav: 'default'
        };

        return (
            <Badge variant={colorMap[riskScore.score] || 'default'}>
                {riskScore.label}
            </Badge>
        );
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header og søk */}
            <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Kundeanalyse</h1>
                        <p className="text-muted-foreground">
                            Omfattende analyse for fornyelse av forsikringsavtaler
                        </p>
                    </div>
                    {risikoAnalyse && (
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            {getRiskBadge(risikoAnalyse.overallRiskScore)}
                        </div>
                    )}
                </div>

                {/* Søkefelt */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5" />
                            Kundeoppslag
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4 items-end max-w-md">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="kundenummer">Kundenummer</Label>
                                <Input
                                    id="kundenummer"
                                    type="text"
                                    placeholder="Skriv inn kundenummer..."
                                    value={kundenummer}
                                    onChange={(e) => setKundenummer(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSøk();
                                        }
                                    }}
                                />
                            </div>
                            <Button onClick={handleSøk} disabled={loading || !kundenummer.trim()}>
                                {loading ? 'Søker...' : 'Søk'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>


            </div>

            {/* Error handling */}
            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Loading state */}
            {loading && (
                <Card>
                    <CardContent className="p-8">
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-3">Henter kundedata...</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Hovedinnhold */}
            {kundeData && !loading && (
                <Tabs defaultValue="oversikt" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="oversikt" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Oversikt
                        </TabsTrigger>
                        <TabsTrigger value="tidsserier" className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Tidsserier
                        </TabsTrigger>
                        <TabsTrigger value="produkter" className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Produkter
                        </TabsTrigger>
                        <TabsTrigger value="skader" className="flex items-center gap-2">
                            <PieChart className="h-4 w-4" />
                            Skader
                        </TabsTrigger>
                        <TabsTrigger value="prediksjoner" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Prediksjoner
                        </TabsTrigger>
                        <TabsTrigger value="anbefaling" className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Anbefaling
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="oversikt">
                        <KundeOversikt
                            kundeData={kundeData}
                            risikoAnalyse={risikoAnalyse}
                            terskler={terskler}
                        />
                    </TabsContent>

                    <TabsContent value="tidsserier">
                        <TidsserieAnalyse
                            kundeData={kundeData}
                            risikoAnalyse={risikoAnalyse}
                        />
                    </TabsContent>

                    <TabsContent value="produkter">
                        <ProduktAnalyse
                            kundeData={kundeData}
                            terskler={terskler}
                        />
                    </TabsContent>

                    <TabsContent value="skader">
                        <SkadeAnalyse
                            kundeData={kundeData}
                        />
                    </TabsContent>

                    <TabsContent value="prediksjoner">
                        <Prediksjoner
                            kundeData={kundeData}
                            prediksjoner={prediksjoner}
                            terskler={terskler}
                        />
                    </TabsContent>

                    <TabsContent value="anbefaling">
                        <FornyelsesAnbefaling
                            kundeData={kundeData}
                            risikoAnalyse={risikoAnalyse}
                            prediksjoner={prediksjoner}
                            terskler={terskler}
                        />
                    </TabsContent>
                </Tabs>
            )}

            {/* Ingen data state */}
            {!kundeData && !loading && !error && søktKundenummer && (
                <Card>
                    <CardContent className="p-8 text-center">
                        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Ingen data funnet</h3>
                        <p className="text-muted-foreground">
                            Fant ingen data for kundenummer {søktKundenummer}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default KundeanalysePage;
