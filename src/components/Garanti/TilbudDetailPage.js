import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ArrowLeft, Receipt, Calculator, User, Building2, ExternalLink, Calendar, Clock } from 'lucide-react';
import { useToast } from "~/hooks/use-toast";

// Import sub-komponenter
import ProduktVelger from './Tilbud/ProduktVelger';
import ProsjektTypeVelger from './Tilbud/ProsjektTypeVelger';
import TilbudBeregning from './Tilbud/TilbudBeregning';
import EnheterAdmin from './Tilbud/EnheterAdmin';
import TilbudAnsvarligeEditor from './TilbudAnsvarligeEditor';
import { getStatusStyle, formatStatusDisplay } from './ProsjektDetail/ProsjektDetailUtils';

const TAB_STRUKTUR = [
    { key: 'grunninfo', label: 'Grunninfo', icon: Receipt },
    { key: 'enheter', label: 'Enheter', icon: Building2 },
    { key: 'beregning', label: 'Beregning', icon: Calculator },
    { key: 'ansvarlige', label: 'Ansvarlige', icon: User },
];

function TilbudDetailPage() {
    console.log('TilbudDetailPage rendres');

    const { tilbudId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();

    // State
    const [tilbud, setTilbud] = useState(null);
    const [prosjekt, setProsjekt] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('grunninfo');
    const [error, setError] = useState(null);

    // State for prosjekttype og antall enheter
    const [prosjekttype, setProsjekttype] = useState(null);
    const [antallEnheter, setAntallEnheter] = useState('');

    // Hent tilbud og prosjektdata
    const fetchTilbudData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Hent tilbud direkte med ID
            const result = await window.electron.tilbud.getTilbudById(tilbudId);

            if (result?.success && result.data) {
                setTilbud(result.data);
                setProsjekt(result.data.prosjekt || null);
                // Sett prosjekttype og antall enheter fra databasen
                setProsjekttype(result.data.prosjekttype || null);
                setAntallEnheter(result.data.antallEnheter ? result.data.antallEnheter.toString() : '');
            } else {
                throw new Error(result?.error || 'Tilbud ikke funnet');
            }
        } catch (err) {
            console.error("Feil ved henting av tilbud:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [tilbudId]);

    // Oppdater tilbud
    const handleUpdateTilbud = async (updateData) => {
        if (!tilbud?.id) return;

        setIsSaving(true);
        try {
            const result = await window.electron.tilbud.updateTilbud({
                tilbudId: tilbud.id,
                dataToUpdate: updateData
            });

            if (result.success) {
                setTilbud(result.data);
                toast({
                    title: "Tilbud oppdatert",
                    description: "Endringene er lagret"
                });
                return true;
            } else {
                throw new Error(result.error || 'Kunne ikke oppdatere tilbud');
            }
        } catch (error) {
            console.error('Feil ved oppdatering:', error);
            toast({
                title: "Feil ved lagring",
                description: error.message,
                variant: "destructive"
            });
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    // Handlers
    const handleNavigateBack = () => {
        if (prosjekt?.id) {
            navigate(`/garanti/prosjekt/${prosjekt.id}?tab=tilbud`);
        } else {
            navigate(-1);
        }
    };

    const handleNavigateToProject = () => {
        if (prosjekt?.id) {
            navigate(`/garanti/prosjekt/${prosjekt.id}`);
        }
    };

    const handleNavigateToSelskap = () => {
        if (prosjekt?.selskapId) {
            navigate(`/garanti/selskap/${prosjekt.selskapId}`);
        }
    };

    const handleProduktypeChange = async (produkttype) => {
        return await handleUpdateTilbud({ produkttype });
    };

    const handleStatusChange = async (status) => {
        return await handleUpdateTilbud({ status });
    };

    const handleProsjekttypeChange = async (type) => {
        console.log('Prosjekttype endret til:', type);
        setProsjekttype(type);

        // Lagre til database
        const success = await handleUpdateTilbud({
            prosjekttype: type,
            antallEnheter: null // Nullstill antall enheter når type endres
        });

        if (success) {
            // Nullstill antall enheter i lokal state også
            setAntallEnheter('');
        }
    };

    const handleAntallEnheterChange = async (antall) => {
        console.log('Antall enheter:', antall);
        setAntallEnheter(antall);

        // Ikke lagre hvis feltet er tomt
        if (antall === '') {
            return;
        }

        // Lagre til database
        await handleUpdateTilbud({
            antallEnheter: parseInt(antall, 10)
        });
    };

    // Formater dato
    const formatDato = (dato) => {
        if (!dato) return 'N/A';
        return new Date(dato).toLocaleDateString('no-NO');
    };

    // Hent data ved mount
    useEffect(() => {
        fetchTilbudData();
    }, [fetchTilbudData]);

    // Håndter tab-parameter fra URL
    useEffect(() => {
        const tabFromUrl = searchParams.get('tab');
        if (tabFromUrl && TAB_STRUKTUR.find(tab => tab.key === tabFromUrl)) {
            setActiveTab(tabFromUrl);
        }
    }, [searchParams]);

    // Debug: Logg når activeTab endres
    useEffect(() => {
        console.log('ActiveTab endret til:', activeTab);
    }, [activeTab]);

    // Loading state
    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <Button variant="outline" size="icon" onClick={handleNavigateBack} className="h-9 w-9 flex-shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className='flex-grow'>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96 mt-2" />
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <Button variant="outline" size="icon" onClick={handleNavigateBack} className="h-9 w-9 flex-shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className='flex-grow'>
                        <h1 className="text-2xl font-semibold text-foreground">Tilbud</h1>
                    </div>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-red-600 mb-4">Feil ved lasting av tilbud: {error}</p>
                            <Button onClick={fetchTilbudData}>Prøv på nytt</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Not found state
    if (!tilbud) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <Button variant="outline" size="icon" onClick={handleNavigateBack} className="h-9 w-9 flex-shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className='flex-grow'>
                        <h1 className="text-2xl font-semibold text-foreground">Tilbud</h1>
                    </div>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center">Tilbud ikke funnet.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <Button variant="outline" size="icon" onClick={handleNavigateBack} className="h-9 w-9 flex-shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Tilbake</span>
                </Button>
                <div className='flex-grow'>
                    <h1 className="text-2xl font-semibold text-foreground">
                        Tilbud v{tilbud.versjonsnummer}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {prosjekt?.navn || 'Ukjent prosjekt'} • {prosjekt?.selskap?.selskapsnavn} • Tilbud ID: {tilbud.id}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Opprettet: {formatDato(tilbud.opprettetDato)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Sist endret: {formatDato(tilbud.sistEndret)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Badge variant={tilbud.status === 'Utkast' ? 'secondary' : 'default'}>
                                {tilbud.status}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {prosjekt && (
                        <>
                            <Button variant="outline" onClick={handleNavigateToProject}>
                                <Building2 className="mr-2 h-4 w-4" />
                                Gå til prosjekt
                            </Button>
                            {prosjekt.selskap && (
                                <Button variant="outline" onClick={handleNavigateToSelskap}>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Gå til selskap
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Tab-basert layout */}
            <Card>
                <CardContent className="p-0">
                    <Tabs
                        value={activeTab}
                        onValueChange={(newValue) => {
                            // VIKTIG: Kun aksepter strings som gyldige tab-verdier
                            // Sjekk også at det faktisk er en gyldig tab
                            if (typeof newValue === 'string' && TAB_STRUKTUR.find(tab => tab.key === newValue)) {
                                console.log('Tab endret til:', newValue);
                                setActiveTab(newValue);
                            } else {
                                console.log('Ignorerer ugyldig tab-endring:', newValue);
                            }
                        }}
                        className="w-full"
                    >
                        <TabsList className="w-full justify-start h-auto p-1 bg-muted/10 border-b">
                            {TAB_STRUKTUR.map((tab) => (
                                <TabsTrigger
                                    key={tab.key}
                                    value={tab.key}
                                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:border-primary data-[state=active]:border-b-2 hover:bg-muted/20 flex items-center gap-2 px-3 py-2 transition-all duration-200 border border-transparent relative"
                                >
                                    <tab.icon className="h-4 w-4" />
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {/* Tab: Grunninfo */}
                        <TabsContent key="grunninfo-tab" value="grunninfo" className="p-6 space-y-6">
                            {/* Status og produkttype side om side øverst */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Tilbudsstatus kort */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Status</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <select
                                            value={tilbud.status || 'Utkast'}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleStatusChange(e.target.value);
                                            }}
                                            onFocus={(e) => e.stopPropagation()}
                                            onBlur={(e) => e.stopPropagation()}
                                            disabled={isSaving}
                                            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                                        >
                                            <option value="Utkast">Utkast</option>
                                            <option value="TilBehandling">Til behandling</option>
                                            <option value="UnderUWBehandling">Under UW-behandling</option>
                                            <option value="Godkjent">Godkjent</option>
                                            <option value="Avslatt">Avslått</option>
                                            <option value="Produsert">Produsert</option>
                                            <option value="Utlopt">Utløpt</option>
                                        </select>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Sist endret: {formatDato(tilbud.sistEndret)}
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Produkttype kort */}
                                <ProduktVelger
                                    key="produktvelger-section"
                                    selectedProdukttype={tilbud.produkttype}
                                    onProduktypeChange={handleProduktypeChange}
                                    disabled={isSaving}
                                />
                            </div>

                            {/* Prosjekttype-velger - full bredde men mer kompakt */}
                            <div
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                onBlur={(e) => e.stopPropagation()}
                                onChange={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                onKeyUp={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onMouseUp={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                onPointerUp={(e) => e.stopPropagation()}
                            >
                                <ProsjektTypeVelger
                                    key="prosjekttype-section"
                                    selectedType={prosjekttype}
                                    onTypeChange={handleProsjekttypeChange}
                                    antallEnheter={antallEnheter}
                                    onAntallEnheterChange={handleAntallEnheterChange}
                                    disabled={isSaving}
                                />
                            </div>
                        </TabsContent>

                        {/* Tab: Enheter */}
                        <TabsContent key="enheter-tab" value="enheter" className="p-6">
                            <EnheterAdmin
                                key="enheter-section"
                                tilbud={tilbud}
                                onEnheterChange={(enheter) => {
                                    // Oppdater tilstand hvis nødvendig
                                    console.log('Enheter oppdatert:', enheter.length);
                                }}
                            />
                        </TabsContent>

                        {/* Tab: Beregning */}
                        <TabsContent key="beregning-tab" value="beregning" className="p-6">
                            <TilbudBeregning
                                key="beregning-section"
                                tilbud={tilbud}
                                onBeregningUpdate={(beregningData) => {
                                    setTilbud(prev => ({
                                        ...prev,
                                        beregning: beregningData
                                    }));
                                }}
                            />
                        </TabsContent>

                        {/* Tab: Ansvarlige */}
                        <TabsContent key="ansvarlige-tab" value="ansvarlige" className="p-6">
                            <TilbudAnsvarligeEditor
                                key="ansvarlige-section"
                                tilbud={tilbud}
                                onAnsvarligeUpdate={(oppdatertTilbud) => {
                                    setTilbud(oppdatertTilbud);
                                }}
                                disabled={isSaving}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

export default TilbudDetailPage; 