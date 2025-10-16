import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Check, Package } from 'lucide-react';
import { useToast } from "~/hooks/use-toast";

const ProduktVelger = ({ selectedProdukttype, onProduktypeChange, disabled = false }) => {
    const [produkter, setProdukter] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Hent produktkonfigurasjoner
    useEffect(() => {
        const fetchProdukter = async () => {
            setIsLoading(true);
            try {
                const result = await window.electron.tilbud.getProduktKonfigurasjoner();
                if (result.success) {
                    setProdukter(result.data || []);
                } else {
                    throw new Error(result.error || 'Kunne ikke hente produkter');
                }
            } catch (error) {
                console.error('Feil ved henting av produkter:', error);
                toast({
                    title: "Feil ved lasting",
                    description: "Kunne ikke laste produkttyper",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProdukter();
    }, [toast]);

    const handleProduktTypeChange = async (produkttype) => {
        setIsSaving(true);
        try {
            const success = await onProduktypeChange(produkttype);
            if (success) {
                toast({
                    title: "Produkttype oppdatert",
                    description: `Endret til ${produkttype}`
                });
            }
        } catch (error) {
            console.error('Feil ved oppdatering av produkttype:', error);
            toast({
                title: "Feil ved lagring",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Produkttype
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        Laster produkttyper...
                    </div>
                ) : (
                    <Select
                        value={selectedProdukttype || ""}
                        onValueChange={handleProduktTypeChange}
                        disabled={disabled || isSaving}
                    >
                        <SelectTrigger
                            className="w-full"
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => e.stopPropagation()}
                        >
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
                )}

                {/* Status */}
                {isSaving && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        Lagrer produkttype...
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ProduktVelger; 