import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Receipt, Plus, Calculator, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from "~/hooks/use-toast";
import ProduktVelger from './Tilbud/ProduktVelger';
import TilbudBeregning from './Tilbud/TilbudBeregning';
import BenefisientAdmin from './Tilbud/BenefisientAdmin';

import { getStatusStyle, formatStatusDisplay } from './ProsjektDetail/ProsjektDetailUtils';

const TAB_STRUKTUR = [
    { key: 'grunninfo', label: 'Grunninfo', icon: Receipt },
    { key: 'beregning', label: 'Beregning', icon: Calculator },
    { key: 'benefisienter', label: 'Benefisienter', icon: Users },
];

const TilbudTab = ({ prosjekt }) => {
    const [tilbud, setTilbud] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingTilbud, setIsCreatingTilbud] = useState(false);
    const [activeTab, setActiveTab] = useState('grunninfo');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Hent tilbud for prosjekt
    const fetchTilbud = async () => {
        if (!prosjekt?.id) return;

        setIsLoading(true);
        try {
            const result = await window.electron.tilbud.getTilbudByProsjektId(prosjekt.id);
            if (result.success) {
                setTilbud(result.data);
            } else if (result.error && !result.error.includes('ikke funnet')) {
                console.error('Feil ved henting av tilbud:', result.error);
                toast({
                    title: "Feil ved lasting av tilbud",
                    description: result.error,
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Feil ved henting av tilbud:', error);
            toast({
                title: "Feil ved lasting av tilbud",
                description: "Kunne ikke laste tilbudsdata",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Opprett nytt tilbud
    const handleCreateTilbud = async () => {
        if (!prosjekt?.id) return;

        setIsCreatingTilbud(true);
        try {
            const result = await window.electron.tilbud.createTilbud({
                prosjektId: prosjekt.id,
                tilbudData: {
                    status: 'Utkast'
                }
            });

            if (result.success) {
                setTilbud(result.data);
                toast({
                    title: "Tilbud opprettet",
                    description: "Et nytt tilbud er opprettet for dette prosjektet"
                });
            } else {
                throw new Error(result.error || 'Kunne ikke opprette tilbud');
            }
        } catch (error) {
            console.error('Feil ved opprettelse av tilbud:', error);
            toast({
                title: "Feil ved opprettelse",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsCreatingTilbud(false);
        }
    };

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

    // Håndter produkttype-endring
    const handleProduktypeChange = async (produkttype) => {
        return await handleUpdateTilbud({ produkttype });
    };

    // Hent data ved komponent-mount eller prosjekt-endring
    useEffect(() => {
        fetchTilbud();
    }, [prosjekt?.id]);

    // Funksjon for å få riktig ikon basert på prosjektstatus
    const getStatusIcon = (status) => {
        switch (status) {
            case 'Godkjent':
            case 'Produsert':
                return <CheckCircle className="h-4 w-4" />;
            case 'Avslaatt':
                return <AlertTriangle className="h-4 w-4" />;
            default:
                return <Receipt className="h-4 w-4" />;
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Tilbud</h2>
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

    // Hvis ingen tilbud finnes - vis opprett-knapp
    if (!tilbud) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Tilbud</h2>
                </div>
                <Card>
                    <CardContent className="p-8 text-center">
                        <Receipt className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Ingen tilbud opprettet</h3>
                        <p className="text-muted-foreground mb-6">
                            Dette prosjektet har ikke et tilbud ennå. Opprett et tilbud for å komme i gang med beregninger og behandling.
                        </p>
                        <Button
                            onClick={handleCreateTilbud}
                            disabled={isCreatingTilbud}
                            size="lg"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            {isCreatingTilbud ? 'Oppretter...' : 'Opprett tilbud'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Vis eksisterende tilbud med fullstendig redigeringsgrensesnitt
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Tilbud</h2>
                <div className="flex items-center gap-4">
                    <Badge className={`flex items-center gap-1 ${getStatusStyle(prosjekt?.status)}`}>
                        {getStatusIcon(prosjekt?.status)}
                        {formatStatusDisplay(prosjekt?.status)}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                        v{tilbud.versjonsnummer} • {prosjekt?.selskap?.selskapsnavn}
                    </div>
                </div>
            </div>



            {/* Tab-basert redigeringsgrensesnitt */}
            <div className="bg-white border rounded-lg">
                <Tabs
                    value={activeTab}
                    onValueChange={(newValue) => {
                        if (typeof newValue === 'string') {
                            setActiveTab(newValue);
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ProduktVelger
                                selectedProdukttype={tilbud.produkttype}
                                onProduktypeChange={handleProduktypeChange}
                                disabled={isSaving}
                            />

                            <Card>
                                <CardHeader>
                                    <CardTitle>Tilbudsinformasjon</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Prosjektstatus</label>
                                            <div className="mt-1">
                                                <Badge className={`flex items-center gap-1 w-fit ${getStatusStyle(prosjekt?.status)}`}>
                                                    {getStatusIcon(prosjekt?.status)}
                                                    {formatStatusDisplay(prosjekt?.status)}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Tilbudsversjon</label>
                                            <div className="mt-1 text-sm">v{tilbud.versjonsnummer}</div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Opprettet</label>
                                            <div className="mt-1 text-sm">
                                                {tilbud.opprettetDato ? new Date(tilbud.opprettetDato).toLocaleDateString('no-NO') : 'N/A'}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Sist endret</label>
                                            <div className="mt-1 text-sm">
                                                {tilbud.sistEndret ? new Date(tilbud.sistEndret).toLocaleDateString('no-NO') : 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Tab: Beregning */}
                    <TabsContent key="beregning-tab" value="beregning" className="p-6">
                        <TilbudBeregning
                            tilbud={tilbud}
                            onBeregningUpdate={(beregningData) => {
                                // Oppdater tilbud med ny beregning
                                setTilbud(prev => ({
                                    ...prev,
                                    beregning: beregningData
                                }));
                            }}
                        />
                    </TabsContent>

                    {/* Tab: Benefisienter */}
                    <TabsContent key="benefisienter-tab" value="benefisienter" className="p-6">
                        <BenefisientAdmin
                            tilbud={tilbud}
                            onBenefisienterUpdate={(benefisienter) => {
                                // Oppdater tilbud med nye benefisienter
                                setTilbud(prev => ({
                                    ...prev,
                                    benefisienter
                                }));
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default TilbudTab; 