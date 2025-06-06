import React, { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Package, Check, X } from 'lucide-react';
import { useToast } from "~/hooks/use-toast";

const ProduktVelger = memo(({ selectedProdukttype, onProduktypeChange, disabled = false }) => {
    const [produkter, setProdukter] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Hent produktkonfigurasjoner
    const fetchProdukter = async () => {
        setIsLoading(true);
        try {
            const result = await window.electron.tilbud.getProduktKonfigurasjoner();
            if (result.success) {
                setProdukter(result.data);
            } else {
                throw new Error(result.error || 'Kunne ikke hente produktkonfigurasjoner');
            }
        } catch (error) {
            console.error('Feil ved henting av produkter:', error);
            toast({
                title: "Feil ved lasting",
                description: "Kunne ikke laste produktkonfigurasjoner",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Håndter produkttype-endring
    const handleProduktTypeChange = async (produktnavn) => {
        if (produktnavn === selectedProdukttype || isSaving) return;

        setIsSaving(true);
        try {
            const success = await onProduktypeChange(produktnavn);
            if (success) {
                toast({
                    title: "Produkttype oppdatert",
                    description: `Produkttype endret til "${produktnavn}"`
                });
            }
        } catch (error) {
            console.error('Feil ved endring av produkttype:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Hent data ved mount
    useEffect(() => {
        fetchProdukter();
    }, []);

    // Finn valgt produkt
    const selectedProdukt = produkter.find(p => p.produktnavn === selectedProdukttype);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produkttype
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Velg produkttype
                            </label>
                            <Select
                                value={selectedProdukttype || ""}
                                onValueChange={handleProduktTypeChange}
                                disabled={disabled || isSaving}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Velg produkttype..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {produkter.map((produkt) => (
                                        <SelectItem key={produkt.id} value={produkt.produktnavn}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>{produkt.produktnavn}</span>
                                                {produkt.produktnavn === selectedProdukttype && (
                                                    <Check className="h-4 w-4 text-primary ml-2" />
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Vis detaljer for valgt produkt */}
                        {selectedProdukt && (
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                                <h4 className="font-medium mb-3">Produktinformasjon</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Utførelsesprosent:</span>
                                        <div className="font-medium">
                                            {(parseFloat(selectedProdukt.standardUtforelseProsent) * 100).toFixed(2)}%
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Garantiprosent:</span>
                                        <div className="font-medium">
                                            {(parseFloat(selectedProdukt.standardGarantiProsent) * 100).toFixed(2)}%
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Standard garantitid:</span>
                                        <div className="font-medium">{selectedProdukt.standardGarantitid} måneder</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Maks kontraktssum:</span>
                                        <div className="font-medium">
                                            {selectedProdukt.maksKontraktssum ?
                                                parseFloat(selectedProdukt.maksKontraktssum).toLocaleString('nb-NO', {
                                                    style: 'currency',
                                                    currency: 'NOK',
                                                    minimumFractionDigits: 0
                                                }) :
                                                'Ingen grense'
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Status */}
                        {isSaving && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                Lagrer produkttype...
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

export default ProduktVelger; 