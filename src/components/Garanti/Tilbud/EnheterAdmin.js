import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useToast } from "~/hooks/use-toast";
import {
    Building2,
    Building,
    Trash2,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Home,
    Edit,
    Users,
    User,
    UserPlus
} from 'lucide-react';

function EnheterAdmin({ tilbud, onEnheterChange }) {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [enheter, setEnheter] = useState([]);
    const [benefisienter, setBenefisienter] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Hent enheter og benefisienter
    const fetchData = async () => {
        if (!tilbud?.id) return;

        setIsLoading(true);
        try {
            const result = await window.electron.tilbud.getEnheter(tilbud.id);

            if (result.success) {
                setEnheter(result.data || []);
                if (onEnheterChange) {
                    onEnheterChange(result.data);
                }
            } else {
                throw new Error(result.error || 'Kunne ikke hente enheter');
            }

            // For prosjekter uten enheter, hent benefisienter direkte
            if (tilbud.prosjekttype === 'Enebolig' || tilbud.prosjekttype === 'Infrastruktur') {
                const benefisienterResult = await window.electron.tilbud.getBenefisienter(tilbud.id);
                if (benefisienterResult.success) {
                    setBenefisienter(benefisienterResult.data || []);
                }
            }
        } catch (error) {
            console.error('Feil ved henting av data:', error);
            toast({
                title: "Feil ved henting",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-generer enheter
    const handleAutoGenererEnheter = async () => {
        if (!tilbud?.prosjekttype || !tilbud?.antallEnheter) {
            toast({
                title: "Manglende informasjon",
                description: "Du må velge prosjekttype og antall enheter først",
                variant: "destructive"
            });
            return;
        }

        setIsGenerating(true);
        try {
            const result = await window.electron.tilbud.autoGenererEnheter({
                tilbudId: tilbud.id,
                antallEnheter: tilbud.antallEnheter,
                prosjekttype: tilbud.prosjekttype
            });

            if (result.success) {
                setEnheter(result.data || []);
                toast({
                    title: "Enheter generert",
                    description: `${result.data.length} enheter ble opprettet`
                });
                if (onEnheterChange) {
                    onEnheterChange(result.data);
                }
            } else {
                throw new Error(result.error || 'Kunne ikke generere enheter');
            }
        } catch (error) {
            console.error('Feil ved generering av enheter:', error);
            toast({
                title: "Feil ved generering",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Slett alle enheter
    const handleSlettAlleEnheter = async () => {
        if (!window.confirm('Er du sikker på at du vil slette alle enheter? Dette vil også slette alle tilknyttede benefisienter.')) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await window.electron.tilbud.slettAlleEnheter(tilbud.id);

            if (result.success) {
                setEnheter([]);
                toast({
                    title: "Enheter slettet",
                    description: `${result.data.antallSlettet} enheter ble slettet`
                });
                if (onEnheterChange) {
                    onEnheterChange([]);
                }
            } else {
                throw new Error(result.error || 'Kunne ikke slette enheter');
            }
        } catch (error) {
            console.error('Feil ved sletting av enheter:', error);
            toast({
                title: "Feil ved sletting",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Beregn total andel
    const totalAndel = enheter.reduce((sum, enhet) => {
        return sum + parseFloat(enhet.andelAvHelhet || 0);
    }, 0);

    // Sjekk om alle enheter har aktive benefisienter som summerer til 100%
    const enheterMedMangler = enheter.filter(enhet => {
        const aktiveBenefisienter = enhet.benefisienter?.filter(b => b.aktiv) || [];

        if (aktiveBenefisienter.length === 0) return true;

        const totalBenefisientAndel = aktiveBenefisienter.reduce((sum, b) => {
            return sum + parseFloat(b.andel || 0);
        }, 0);

        return Math.abs(totalBenefisientAndel - 100) > 0.01;
    });

    // Naviger til ny benefisient for en spesifikk enhet
    const handleAddBenefisient = (enhetId, enhetNummer) => {
        const returnUrl = `/garanti/tilbud/${tilbud.id}?tab=enheter`;
        navigate(`/garanti/tilbud/${tilbud.id}/benefisient/ny?enhetId=${enhetId}&enhetNummer=${enhetNummer}&returnUrl=${encodeURIComponent(returnUrl)}`);
    };

    // Naviger til redigering av benefisient
    const handleEditBenefisient = (benefisientId) => {
        const returnUrl = `/garanti/tilbud/${tilbud.id}?tab=enheter`;
        navigate(`/garanti/tilbud/${tilbud.id}/benefisient/${benefisientId}?returnUrl=${encodeURIComponent(returnUrl)}`);
    };

    // Naviger til benefisient-side
    const handleNyBenefisient = (enhetId, enhetNummer) => {
        navigate(`/garanti/tilbud/${tilbud.id}/benefisient/ny?enhetId=${enhetId}&enhetNummer=${encodeURIComponent(enhetNummer)}&returnUrl=${encodeURIComponent(window.location.pathname)}`);
    };

    // Håndter når vi kommer tilbake fra benefisient-redigering
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('refresh') === 'true') {
            // Fjern refresh-parameteren fra URL
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('refresh');
            window.history.replaceState({}, '', newUrl);

            // Last inn benefisienter på nytt
            fetchData();
        }
    }, [window.location.search]);

    useEffect(() => {
        fetchData();
    }, [tilbud?.id]);

    // Vis ingenting hvis det ikke er valgt prosjekttype
    if (!tilbud?.prosjekttype) {
        return null;
    }

    // Hvis det ikke er multi-enhet prosjekt, vis forenklet benefisient-oversikt
    if (tilbud.prosjekttype === 'Enebolig' || tilbud.prosjekttype === 'Infrastruktur') {
        const aktiveBenefisienter = benefisienter.filter(b => b.aktiv);
        const totalAndel = aktiveBenefisienter.reduce((sum, b) => sum + parseFloat(b.andel || 0), 0);
        const erKomplett = Math.abs(totalAndel - 100) < 0.01;

        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Home className="h-5 w-5" />
                            Benefisienter
                            <span className="text-sm font-normal text-muted-foreground">
                                ({aktiveBenefisienter.length} aktive{benefisienter.length > aktiveBenefisienter.length && `, ${benefisienter.length} totalt`})
                            </span>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {erKomplett ? (
                                <Badge variant="success">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    100% tildelt
                                </Badge>
                            ) : (
                                <Badge variant={totalAndel > 0 ? "warning" : "destructive"}>
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {totalAndel.toFixed(0)}% tildelt
                                </Badge>
                            )}
                            <Button
                                size="sm"
                                onClick={() => {
                                    const returnUrl = `/garanti/tilbud/${tilbud.id}?tab=enheter`;
                                    navigate(`/garanti/tilbud/${tilbud.id}/benefisient/ny?returnUrl=${encodeURIComponent(returnUrl)}`);
                                }}
                            >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Ny benefisient
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            For {tilbud.prosjekttype.toLowerCase()} håndteres benefisienter direkte uten enhetsinndeling.
                        </p>

                        {benefisienter.length === 0 ? (
                            <div className="text-center py-8 border rounded-lg bg-muted/50">
                                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                                <p className="text-muted-foreground">Ingen benefisienter registrert</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {benefisienter.map((benefisient) => (
                                    <div key={benefisient.id} className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${benefisient.aktiv ? 'hover:bg-muted/50' : 'bg-gray-50 opacity-60'
                                        }`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${benefisient.aktiv ? 'bg-primary/10' : 'bg-gray-200'
                                                }`}>
                                                {benefisient.type === 'Fysisk' ?
                                                    <User className={`h-4 w-4 ${benefisient.aktiv ? 'text-primary' : 'text-gray-500'}`} /> :
                                                    <Building className={`h-4 w-4 ${benefisient.aktiv ? 'text-primary' : 'text-gray-500'}`} />
                                                }
                                            </div>
                                            <div>
                                                <p className={`font-medium ${!benefisient.aktiv ? 'line-through' : ''}`}>
                                                    {benefisient.navn}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {benefisient.type === 'Fysisk' ? 'Person' : 'Selskap'} •
                                                    {benefisient.organisasjonsnummer || benefisient.personident || 'Ingen ID'}
                                                    {!benefisient.aktiv && ' • Avsluttet'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={benefisient.aktiv ? 'outline' : 'secondary'}>
                                                {benefisient.andel}%
                                            </Badge>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleEditBenefisient(benefisient.id)}
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Enhetsadministrasjon
                    </CardTitle>
                    <div className="flex gap-2">
                        {enheter.length === 0 && tilbud.antallEnheter > 0 && (
                            <Button
                                onClick={handleAutoGenererEnheter}
                                disabled={isGenerating}
                                variant="default"
                            >
                                {isGenerating ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Genererer...
                                    </>
                                ) : (
                                    <>
                                        <Building2 className="mr-2 h-4 w-4" />
                                        Generer {tilbud.antallEnheter} enheter
                                    </>
                                )}
                            </Button>
                        )}
                        {enheter.length > 0 && (
                            <Button
                                onClick={handleSlettAlleEnheter}
                                disabled={isLoading}
                                variant="destructive"
                                size="sm"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Slett alle
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Vis advarsel hvis prosjekttype/antall ikke er satt */}
                {(!tilbud.prosjekttype || !tilbud.antallEnheter) && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Velg prosjekttype og angi antall enheter i grunninfo-fanen før du kan generere enheter.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Vis oversikt hvis enheter finnes */}
                {enheter.length > 0 && (
                    <div className="space-y-4">
                        {/* Statusoversikt */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-muted/50 p-4 rounded-lg border">
                                <div className="flex items-center gap-2 mb-1">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm font-medium text-muted-foreground">Totalt antall enheter</p>
                                </div>
                                <p className="text-2xl font-bold">{enheter.length}</p>
                            </div>
                            <div className={`p-4 rounded-lg border ${enheterMedMangler.length === 0
                                ? 'bg-green-50 border-green-200'
                                : enheterMedMangler.length < enheter.length / 2
                                    ? 'bg-yellow-50 border-yellow-200'
                                    : 'bg-red-50 border-red-200'
                                }`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle2 className={`h-4 w-4 ${enheterMedMangler.length === 0
                                        ? 'text-green-600'
                                        : enheterMedMangler.length < enheter.length / 2
                                            ? 'text-yellow-600'
                                            : 'text-red-600'
                                        }`} />
                                    <p className="text-sm font-medium text-muted-foreground">Enheter komplett</p>
                                </div>
                                <p className="text-2xl font-bold">
                                    {enheter.length > 0
                                        ? Math.round(((enheter.length - enheterMedMangler.length) / enheter.length) * 100)
                                        : 0}%
                                </p>
                                {enheter.length > 0 && (
                                    <p className={`text-xs ${enheterMedMangler.length === 0
                                        ? 'text-green-600'
                                        : enheterMedMangler.length < enheter.length / 2
                                            ? 'text-yellow-600'
                                            : 'text-red-600'
                                        }`}>
                                        {enheter.length - enheterMedMangler.length} av {enheter.length} OK
                                    </p>
                                )}
                            </div>
                            <div className={`p-4 rounded-lg border ${enheterMedMangler.length === 0
                                ? 'bg-muted/50'
                                : 'bg-amber-50 border-amber-200'
                                }`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle className={`h-4 w-4 ${enheterMedMangler.length === 0
                                        ? 'text-muted-foreground'
                                        : 'text-amber-600'
                                        }`} />
                                    <p className="text-sm font-medium text-muted-foreground">Enheter med mangler</p>
                                </div>
                                <p className="text-2xl font-bold">
                                    {enheter.length > 0
                                        ? Math.round((enheterMedMangler.length / enheter.length) * 100)
                                        : 0}%
                                </p>
                                {enheterMedMangler.length > 0 && (
                                    <p className="text-xs text-amber-600">
                                        {enheterMedMangler.length} av {enheter.length} mangler benefisienter
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Enhetsliste */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Enheter ({enheter.length})</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {enheter.map((enhet) => {
                                    const aktiveBenefisienter = enhet.benefisienter?.filter(b => b.aktiv) || [];
                                    const totalBenefisientAndel = aktiveBenefisienter.reduce((sum, b) => {
                                        return sum + parseFloat(b.andel || 0);
                                    }, 0);

                                    const harMangler = aktiveBenefisienter.length === 0 ||
                                        Math.abs(totalBenefisientAndel - 100) > 0.01;

                                    return (
                                        <div
                                            key={enhet.id}
                                            className="border rounded-lg p-3 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h5 className="font-medium">{enhet.midlertidigNummer}</h5>
                                                    {enhet.enhetsnummer && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Kartverket: {enhet.enhetsnummer}
                                                        </p>
                                                    )}
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {enhet.type} • {enhet.andelAvHelhet}% av prosjekt
                                                    </p>
                                                    {enhet.adresse && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {enhet.adresse}
                                                        </p>
                                                    )}
                                                </div>
                                                {harMangler ? (
                                                    <Badge variant="destructive" className="ml-2">
                                                        <AlertCircle className="h-3 w-3 mr-1" />
                                                        Mangler
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="success" className="ml-2">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        OK
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Benefisient-status */}
                                            <div className="mt-3 pt-3 border-t">
                                                <div className="flex items-center justify-between text-xs mb-2">
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        {aktiveBenefisienter.length} aktive
                                                        {enhet.benefisienter?.length > aktiveBenefisienter.length &&
                                                            ` (${enhet.benefisienter.length} totalt)`
                                                        }
                                                    </span>
                                                    <span className={totalBenefisientAndel === 100 ? 'text-green-600' : 'text-amber-600'}>
                                                        {totalBenefisientAndel.toFixed(0)}% tildelt
                                                    </span>
                                                </div>

                                                {/* Vis eksisterende benefisienter */}
                                                {enhet.benefisienter?.length > 0 && (
                                                    <div className="mb-2 space-y-1">
                                                        {enhet.benefisienter.map((benefisient, index) => (
                                                            <div
                                                                key={benefisient.id}
                                                                className={`flex items-center justify-between text-xs ${index >= 3 ? 'hidden' : ''} ${!benefisient.aktiv ? 'opacity-50' : ''
                                                                    }`}
                                                            >
                                                                <button
                                                                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground truncate"
                                                                    onClick={() => handleEditBenefisient(benefisient.id)}
                                                                >
                                                                    <Edit className="h-3 w-3 opacity-50" />
                                                                    <span className={`truncate ${!benefisient.aktiv ? 'line-through' : ''}`}>
                                                                        {benefisient.navn}
                                                                    </span>
                                                                </button>
                                                                <span className="font-medium text-muted-foreground">
                                                                    {benefisient.andel}%{!benefisient.aktiv && ' (Avsluttet)'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {enhet.benefisienter.length > 3 && (
                                                            <details className="text-xs text-muted-foreground cursor-pointer">
                                                                <summary className="hover:text-foreground">
                                                                    Vis {enhet.benefisienter.length - 3} til...
                                                                </summary>
                                                                <div className="mt-1 space-y-1">
                                                                    {enhet.benefisienter.slice(3).map((benefisient) => (
                                                                        <div key={benefisient.id} className={`flex items-center justify-between ${!benefisient.aktiv ? 'opacity-50' : ''
                                                                            }`}>
                                                                            <button
                                                                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground truncate"
                                                                                onClick={() => handleEditBenefisient(benefisient.id)}
                                                                            >
                                                                                <Edit className="h-3 w-3 opacity-50" />
                                                                                <span className={`truncate ${!benefisient.aktiv ? 'line-through' : ''}`}>
                                                                                    {benefisient.navn}
                                                                                </span>
                                                                            </button>
                                                                            <span className="font-medium">
                                                                                {benefisient.andel}%{!benefisient.aktiv && ' (Avsluttet)'}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </details>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Handlingsknapper */}
                                                <Button
                                                    size="sm"
                                                    variant={harMangler ? "default" : "outline"}
                                                    className="w-full"
                                                    onClick={() => handleAddBenefisient(enhet.id, enhet.midlertidigNummer)}
                                                >
                                                    <UserPlus className="h-3 w-3 mr-1" />
                                                    Legg til benefisient
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default EnheterAdmin; 