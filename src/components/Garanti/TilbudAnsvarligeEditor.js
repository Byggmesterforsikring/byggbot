import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from "~/hooks/use-toast";
import { Badge } from '../ui/badge';
import { Loader2, Save, User, Shield, Settings } from 'lucide-react';

const TilbudAnsvarligeEditor = ({ tilbud, onAnsvarligeUpdate, disabled = false }) => {
    const [brukere, setBrukere] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [localAnsvarlige, setLocalAnsvarlige] = useState({
        ansvarligRaadgiverId: tilbud?.ansvarligRaadgiverId || null,
        uwAnsvarligId: tilbud?.uwAnsvarligId || null,
        produksjonsansvarligId: tilbud?.produksjonsansvarligId || null
    });
    const { toast } = useToast();

    // Hent brukere
    const fetchBrukere = async () => {
        setIsLoading(true);
        try {
            const result = await window.electron.userV2.getAllUsers();
            if (result.success) {
                setBrukere(result.data || []);
            } else {
                console.error('Feil ved henting av brukere:', result.error);
            }
        } catch (error) {
            console.error('Feil ved henting av brukere:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Lagre endringer
    const handleSave = async () => {
        if (!tilbud?.id) return;

        setIsSaving(true);
        try {
            // Konverter til integers eller null
            const dataToUpdate = {
                ansvarligRaadgiverId: localAnsvarlige.ansvarligRaadgiverId ? parseInt(localAnsvarlige.ansvarligRaadgiverId) : null,
                uwAnsvarligId: localAnsvarlige.uwAnsvarligId ? parseInt(localAnsvarlige.uwAnsvarligId) : null,
                produksjonsansvarligId: localAnsvarlige.produksjonsansvarligId ? parseInt(localAnsvarlige.produksjonsansvarligId) : null
            };

            const result = await window.electron.tilbud.updateTilbud({
                tilbudId: tilbud.id,
                dataToUpdate
            });

            if (result.success) {
                toast({
                    title: "Ansvarlige oppdatert",
                    description: "Endringene er lagret"
                });
                if (onAnsvarligeUpdate) {
                    onAnsvarligeUpdate(result.data);
                }
            } else {
                throw new Error(result.error || 'Kunne ikke oppdatere ansvarlige');
            }
        } catch (error) {
            console.error('Feil ved lagring:', error);
            toast({
                title: "Feil ved lagring",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Sjekk om det er endringer
    const hasChanges = () => {
        return (
            localAnsvarlige.ansvarligRaadgiverId !== (tilbud?.ansvarligRaadgiverId?.toString() || null) ||
            localAnsvarlige.uwAnsvarligId !== (tilbud?.uwAnsvarligId?.toString() || null) ||
            localAnsvarlige.produksjonsansvarligId !== (tilbud?.produksjonsansvarligId?.toString() || null)
        );
    };

    // Få bruker navn basert på ID
    const getBrukerNavn = (brukerId) => {
        if (!brukerId) return null;
        const bruker = brukere.find(b => b.id.toString() === brukerId.toString());
        return bruker ? bruker.navn : `Bruker ${brukerId}`;
    };

    // Initialiser data når tilbud endres
    useEffect(() => {
        if (tilbud) {
            setLocalAnsvarlige({
                ansvarligRaadgiverId: tilbud.ansvarligRaadgiverId?.toString() || null,
                uwAnsvarligId: tilbud.uwAnsvarligId?.toString() || null,
                produksjonsansvarligId: tilbud.produksjonsansvarligId?.toString() || null
            });
        }
    }, [tilbud]);

    useEffect(() => {
        fetchBrukere();
    }, []);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Ansvarlige
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Tilbudsspesifikke ansvarlige
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Hver tilbud kan ha egne ansvarlige som er uavhengige av prosjektets ansvarlige
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Ansvarlig rådgiver */}
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Ansvarlig rådgiver
                    </label>
                    <Select
                        value={localAnsvarlige.ansvarligRaadgiverId || 'none'}
                        onValueChange={(value) => setLocalAnsvarlige(prev => ({
                            ...prev,
                            ansvarligRaadgiverId: value === 'none' ? null : value
                        }))}
                        disabled={disabled || isSaving}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Velg ansvarlig rådgiver" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Ikke satt</SelectItem>
                            {brukere.map((bruker) => (
                                <SelectItem key={bruker.id} value={bruker.id.toString()}>
                                    {bruker.navn} ({bruker.email})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {tilbud?.ansvarligRaadgiverId && (
                        <div className="text-xs text-muted-foreground">
                            Nåværende: {getBrukerNavn(tilbud.ansvarligRaadgiverId)}
                        </div>
                    )}
                </div>

                {/* UW ansvarlig */}
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        UW ansvarlig
                    </label>
                    <Select
                        value={localAnsvarlige.uwAnsvarligId || 'none'}
                        onValueChange={(value) => setLocalAnsvarlige(prev => ({
                            ...prev,
                            uwAnsvarligId: value === 'none' ? null : value
                        }))}
                        disabled={disabled || isSaving}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Velg UW ansvarlig" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Ikke satt</SelectItem>
                            {brukere.map((bruker) => (
                                <SelectItem key={bruker.id} value={bruker.id.toString()}>
                                    {bruker.navn} ({bruker.email})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {tilbud?.uwAnsvarligId && (
                        <div className="text-xs text-muted-foreground">
                            Nåværende: {getBrukerNavn(tilbud.uwAnsvarligId)}
                        </div>
                    )}
                </div>

                {/* Produksjonsansvarlig */}
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Produksjonsansvarlig
                    </label>
                    <Select
                        value={localAnsvarlige.produksjonsansvarligId || 'none'}
                        onValueChange={(value) => setLocalAnsvarlige(prev => ({
                            ...prev,
                            produksjonsansvarligId: value === 'none' ? null : value
                        }))}
                        disabled={disabled || isSaving}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Velg produksjonsansvarlig" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Ikke satt</SelectItem>
                            {brukere.map((bruker) => (
                                <SelectItem key={bruker.id} value={bruker.id.toString()}>
                                    {bruker.navn} ({bruker.email})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {tilbud?.produksjonsansvarligId && (
                        <div className="text-xs text-muted-foreground">
                            Nåværende: {getBrukerNavn(tilbud.produksjonsansvarligId)}
                        </div>
                    )}
                </div>

                {/* Status indicator */}
                <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {hasChanges() ? (
                                <Badge variant="destructive">Ulagrede endringer</Badge>
                            ) : (
                                <Badge variant="outline">Lagret</Badge>
                            )}
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={!hasChanges() || disabled || isSaving}
                            size="sm"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            {isSaving ? 'Lagrer...' : 'Lagre endringer'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default TilbudAnsvarligeEditor; 