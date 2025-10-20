import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Plus, CheckCircle, AlertTriangle, Eye, Receipt, FileText, Handshake, Shield, Filter, X } from 'lucide-react';
import { useToast } from "~/hooks/use-toast";

import { getStatusStyle, formatStatusDisplay } from './ProsjektDetail/ProsjektDetailUtils';

// Hjelpefunksjon for å formatere dato
const formatDato = (dato) => {
    if (!dato) return 'N/A';
    return new Date(dato).toLocaleDateString('no-NO');
};

// Eksportert hjelpefunksjon for å bestemme fane-navn basert på tilbudsstatus
export const getTilbudFaneInfo = (tilbudListe) => {
    if (!Array.isArray(tilbudListe) || tilbudListe.length === 0) {
        return { navn: 'Tilbud', ikon: Receipt, beskrivelse: 'Ingen tilbud opprettet' };
    }

    const statuser = tilbudListe.map(t => t.status);
    const harProdusert = statuser.includes('Produsert');
    const harGodkjent = statuser.includes('Godkjent');
    const harAktiveTilbud = statuser.some(s => ['Utkast', 'TilBehandling', 'UnderUWBehandling'].includes(s));
    const harAvslattUtlopt = statuser.some(s => ['Avslatt', 'Utlopt'].includes(s));

    // Prioritet: Produsert > Godkjent > Aktive tilbud > Arkivert
    if (harProdusert) {
        if (harAktiveTilbud || harGodkjent) {
            return { navn: 'Tilbud & Poliser', ikon: Shield, beskrivelse: 'Aktive poliser og tilbud under behandling' };
        }
        return { navn: 'Poliser', ikon: Shield, beskrivelse: 'Produserte forsikringspoliser' };
    }

    if (harGodkjent) {
        if (harAktiveTilbud) {
            return { navn: 'Tilbud & Avtaler', ikon: Handshake, beskrivelse: 'Godkjente avtaler og tilbud under behandling' };
        }
        return { navn: 'Avtaler', ikon: Handshake, beskrivelse: 'Godkjente avtaler' };
    }

    if (harAktiveTilbud) {
        return { navn: 'Tilbud', ikon: Receipt, beskrivelse: 'Tilbud under behandling' };
    }

    if (harAvslattUtlopt) {
        return { navn: 'Arkiv', ikon: FileText, beskrivelse: 'Avslåtte eller utløpte tilbud' };
    }

    return { navn: 'Tilbud', ikon: Receipt, beskrivelse: 'Tilbudsoversikt' };
};

// Hjelpefunksjon for å vise enkelt tilbud
const TilbudCard = ({ tilbud, onTilbudValg, type }) => {

    // Bestem tittel basert på type
    const getTittel = () => {
        switch (type) {
            case 'polise': return `Polise v${tilbud.versjonsnummer}`;
            case 'avtale': return `Avtale v${tilbud.versjonsnummer}`;
            default: return `Tilbud v${tilbud.versjonsnummer}`;
        }
    };

    // Bestem badge-farge basert på status
    const getBadgeVariant = () => {
        switch (tilbud.status) {
            case 'Produsert': return 'default';
            case 'Godkjent': return 'default';
            case 'Utkast': return 'secondary';
            case 'Avslatt': return 'destructive';
            case 'Utlopt': return 'outline';
            default: return 'outline';
        }
    };

    return (
        <Card className="hover:bg-muted/20 transition-colors">
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h4 className="font-medium">
                                {getTittel()}
                            </h4>
                            <Badge variant={getBadgeVariant()}>
                                {tilbud.status}
                            </Badge>
                            {tilbud.produkttype && (
                                <Badge variant="outline">
                                    {tilbud.produkttype}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Opprettet: {formatDato(tilbud.opprettetDato)}</span>
                            <span>Sist endret: {formatDato(tilbud.sistEndret)}</span>
                            {tilbud.beregning?.totalPremie && (
                                <span className="font-medium text-foreground">
                                    Total premie: {parseFloat(tilbud.beregning.totalPremie).toLocaleString('no-NO')} kr
                                </span>
                            )}
                        </div>
                        {tilbud.ansvarligRaadgiver && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                                <span>Ansvarlig: {tilbud.ansvarligRaadgiver.navn}</span>
                                {tilbud.uwAnsvarlig && (
                                    <span>• UW: {tilbud.uwAnsvarlig.navn}</span>
                                )}
                            </div>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTilbudValg(tilbud.id)}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        Åpne
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

// TilbudTab viser kun oversikt - detaljredigering håndteres av TilbudDetailPage

const TilbudTab = React.memo(({
    prosjekt,
    selectedStatus = 'alle_statuser',
    setSelectedStatus = () => { },
    selectedType = 'alle_typer',
    setSelectedType = () => { }
}) => {
    const navigate = useNavigate();
    const [tilbudListe, setTilbudListe] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingTilbud, setIsCreatingTilbud] = useState(false);
    const { toast } = useToast();

    // Grupper tilbud etter status-kategori
    const grupperTilbud = (tilbudListe) => {
        if (!Array.isArray(tilbudListe)) return {};

        return tilbudListe.reduce((grupper, tilbud) => {
            let kategori;
            switch (tilbud.status) {
                case 'Produsert':
                    kategori = 'poliser';
                    break;
                case 'Godkjent':
                    kategori = 'avtaler';
                    break;
                case 'Utkast':
                case 'TilBehandling':
                case 'UnderUWBehandling':
                    kategori = 'aktiveTilbud';
                    break;
                case 'Avslatt':
                case 'Utlopt':
                    kategori = 'arkiverte';
                    break;
                default:
                    kategori = 'andre';
            }

            if (!grupper[kategori]) grupper[kategori] = [];
            grupper[kategori].push(tilbud);
            return grupper;
        }, {});
    };

    // Hent tilbud for prosjekt
    const fetchTilbudListe = async () => {
        if (!prosjekt?.id) return;

        setIsLoading(true);
        try {
            const result = await window.electron.tilbud.getTilbudByProsjektId(prosjekt.id);

            if (result.success) {
                // Sikre at result.data alltid er en array
                const tilbudData = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);

                setTilbudListe(tilbudData);
            } else if (result.error && !result.error.includes('Ingen tilbud funnet')) {
                console.error('Feil ved henting av tilbud:', result.error);
                // Sett tom array ved feil
                setTilbudListe([]);
                toast({
                    title: "Feil ved lasting av tilbud",
                    description: result.error,
                    variant: "destructive"
                });
            } else {
                // Ingen tilbud funnet - sett tom array
                setTilbudListe([]);
            }
        } catch (error) {
            console.error('Feil ved henting av tilbud:', error);
            // Sett tom array ved feil
            setTilbudListe([]);
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
                // Naviger direkte til det nye tilbudet
                navigate(`/garanti/tilbud/${result.data.id}`);
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

    // Håndter tilbudvalg - navigerer til tilbud-detaljside
    const handleTilbudValg = (tilbudId) => {
        navigate(`/garanti/tilbud/${tilbudId}`);
    };

    // Hent data ved komponent-mount eller prosjekt-endring
    useEffect(() => {
        fetchTilbudListe();
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

    // Filter tilbud
    const filteredTilbud = useMemo(() => {
        return tilbudListe.filter(tilbud => {
            const matchesStatus = selectedStatus === 'alle_statuser' || selectedStatus === '' || tilbud.status === selectedStatus;
            const matchesType = selectedType === 'alle_typer' || selectedType === '' || tilbud.produkttype === selectedType;

            return matchesStatus && matchesType;
        });
    }, [tilbudListe, selectedStatus, selectedType]);

    // Hent unike produkttyper for filter-dropdown
    const availableTypes = useMemo(() => {
        const types = [...new Set(tilbudListe.map(t => t.produkttype).filter(Boolean))];
        return types.sort();
    }, [tilbudListe]);

    // Lagre aktive filtere
    const hasActiveFilters = selectedStatus !== 'alle_statuser' || selectedType !== 'alle_typer';

    // Funksjon for å nullstille alle filtere
    const clearAllFilters = () => {
        setSelectedStatus('alle_statuser');
        setSelectedType('alle_typer');
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

    // Beregn fane-info basert på tilbudslisten (bruk original for fane-navn)
    const faneInfo = getTilbudFaneInfo(tilbudListe);
    // Grupper de filtrerte tilbudene
    const grupperteTilbud = grupperTilbud(filteredTilbud);

    // Hvis ingen tilbud finnes - vis opprett-knapp
    if (!tilbudListe || tilbudListe.length === 0) {
        const faneInfo = getTilbudFaneInfo([]);
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <faneInfo.ikon className="h-5 w-5" />
                        {faneInfo.navn}
                    </h2>
                </div>
                <Card>
                    <CardContent className="p-8 text-center">
                        <Receipt className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Ingen tilbud opprettet</h3>
                        <p className="text-muted-foreground mb-6">
                            Dette prosjektet har ikke noen tilbud ennå. Opprett et tilbud for å komme i gang med beregninger og behandling.
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

    // Vis tilbudsoversikt
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <faneInfo.ikon className="h-5 w-5" />
                    {faneInfo.navn} ({Array.isArray(filteredTilbud) ? filteredTilbud.length : 0} av {Array.isArray(tilbudListe) ? tilbudListe.length : 0})
                </h2>
                <div className="flex items-center gap-4">
                    <Badge className={`flex items-center gap-1 ${getStatusStyle(prosjekt?.status)}`}>
                        {getStatusIcon(prosjekt?.status)}
                        {formatStatusDisplay(prosjekt?.status)}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                        {prosjekt?.selskap?.selskapsnavn}
                    </div>
                    <Button
                        onClick={handleCreateTilbud}
                        disabled={isCreatingTilbud}
                        size="sm"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        {isCreatingTilbud ? 'Oppretter...' : 'Nytt tilbud'}
                    </Button>
                </div>
            </div>

            {/* Filter */}
            <Card className="bg-muted/20">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Filter:</span>

                        <div className="flex items-center gap-3 flex-1">
                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                <SelectTrigger
                                    className="w-48"
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={(e) => e.stopPropagation()}
                                >
                                    <SelectValue placeholder="Velg status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="alle_statuser">Alle statuser</SelectItem>
                                    <SelectItem value="Produsert">Produsert</SelectItem>
                                    <SelectItem value="Godkjent">Godkjent</SelectItem>
                                    <SelectItem value="UnderUWBehandling">Under UW behandling</SelectItem>
                                    <SelectItem value="TilBehandling">Til behandling</SelectItem>
                                    <SelectItem value="Utkast">Utkast</SelectItem>
                                    <SelectItem value="Avslatt">Avslått</SelectItem>
                                    <SelectItem value="Utlopt">Utløpt</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger
                                    className="w-48"
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={(e) => e.stopPropagation()}
                                >
                                    <SelectValue placeholder="Velg type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="alle_typer">Alle typer</SelectItem>
                                    {availableTypes.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {hasActiveFilters && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        clearAllFilters();
                                    }}
                                    onFocus={(e) => e.stopPropagation()}
                                    className="flex items-center gap-2"
                                >
                                    <X className="h-4 w-4" />
                                    Fjern filtere
                                </Button>
                            )}
                        </div>

                        <div className="text-sm text-muted-foreground">
                            {hasActiveFilters && (
                                <span>Viser {filteredTilbud.length} av {tilbudListe.length} tilbud</span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Grupperte tilbudsoversikt */}
            {filteredTilbud.length === 0 && tilbudListe.length > 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Filter className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Ingen tilbud matcher filtrene</h3>
                        <p className="text-muted-foreground mb-6">
                            Prøv å justere filterkriteriene for å se flere resultater.
                        </p>
                        <Button
                            variant="outline"
                            onClick={(e) => {
                                e.stopPropagation();
                                clearAllFilters();
                            }}
                            onFocus={(e) => e.stopPropagation()}
                            className="flex items-center gap-2"
                        >
                            <X className="h-4 w-4" />
                            Fjern alle filtere
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* Poliser (Produsert) */}
                    {grupperteTilbud.poliser && (
                        <div className="bg-white border rounded-lg p-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Shield className="h-5 w-5 text-green-600" />
                                    <h3 className="text-lg font-medium text-green-800">Aktive poliser</h3>
                                    <Badge variant="secondary">{grupperteTilbud.poliser.length}</Badge>
                                </div>
                                <div className="grid gap-4">
                                    {grupperteTilbud.poliser.map((tilbud) => (
                                        <TilbudCard key={tilbud.id} tilbud={tilbud} onTilbudValg={handleTilbudValg} type="polise" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Avtaler (Godkjent) */}
                    {grupperteTilbud.avtaler && (
                        <div className="bg-white border rounded-lg p-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Handshake className="h-5 w-5 text-blue-600" />
                                    <h3 className="text-lg font-medium text-blue-800">Godkjente avtaler</h3>
                                    <Badge variant="secondary">{grupperteTilbud.avtaler.length}</Badge>
                                </div>
                                <div className="grid gap-4">
                                    {grupperteTilbud.avtaler.map((tilbud) => (
                                        <TilbudCard key={tilbud.id} tilbud={tilbud} onTilbudValg={handleTilbudValg} type="avtale" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Aktive tilbud */}
                    {grupperteTilbud.aktiveTilbud && (
                        <div className="bg-white border rounded-lg p-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Receipt className="h-5 w-5 text-orange-600" />
                                    <h3 className="text-lg font-medium text-orange-800">Tilbud under behandling</h3>
                                    <Badge variant="secondary">{grupperteTilbud.aktiveTilbud.length}</Badge>
                                </div>
                                <div className="grid gap-4">
                                    {grupperteTilbud.aktiveTilbud.map((tilbud) => (
                                        <TilbudCard key={tilbud.id} tilbud={tilbud} onTilbudValg={handleTilbudValg} type="tilbud" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Arkiverte */}
                    {grupperteTilbud.arkiverte && (
                        <div className="bg-white border rounded-lg p-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-gray-600" />
                                    <h3 className="text-lg font-medium text-gray-800">Arkiverte</h3>
                                    <Badge variant="outline">{grupperteTilbud.arkiverte.length}</Badge>
                                </div>
                                <div className="grid gap-4">
                                    {grupperteTilbud.arkiverte.map((tilbud) => (
                                        <TilbudCard key={tilbud.id} tilbud={tilbud} onTilbudValg={handleTilbudValg} type="arkivert" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Andre/ukjente statuser */}
                    {grupperteTilbud.andre && (
                        <div className="bg-white border rounded-lg p-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Andre</h3>
                                <div className="grid gap-4">
                                    {grupperteTilbud.andre.map((tilbud) => (
                                        <TilbudCard key={tilbud.id} tilbud={tilbud} onTilbudValg={handleTilbudValg} type="annet" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

TilbudTab.displayName = 'TilbudTab';

export default TilbudTab; 