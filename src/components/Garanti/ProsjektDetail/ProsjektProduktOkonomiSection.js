import React, { useState, memo } from 'react';
import { Grid } from '@mui/material';
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { useToast } from "~/hooks/use-toast";
import { DollarSign, Package, CreditCard, Hash, Edit2, Loader2, Check, X } from 'lucide-react';
import DetailField from './DetailField';

// Hjelpefunksjon for formatering av beløp (samme som på selskapssiden)
const formatAmount = (amount) => {
    if (!amount || amount === '' || amount === '0') return 'Ikke satt';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return 'Ugyldig beløp';
    return `Kr. ${numAmount.toLocaleString('nb-NO')}`;
};

const ProsjektProduktOkonomiSection = memo(({ prosjekt, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        produkt: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Initialiser formData når redigering starter
    const handleStartEdit = () => {
        setFormData({
            produkt: prosjekt?.produkt || ''
        });
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFormData({
            produkt: ''
        });
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(formData);
            setIsEditing(false);
            setFormData({
                produkt: ''
            });
        } catch (error) {
            toast({
                title: "Feil ved lagring",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isEditing) {
        return (
            <div className="bg-white rounded-lg border p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <div>
                            <h3 className="text-lg font-semibold">Rediger Produkt</h3>
                            <p className="text-sm text-muted-foreground">Ramme og kundenummer redigeres på selskap-nivå</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                        >
                            <X className="h-4 w-4 mr-1" />
                            Avbryt
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    Lagrer...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Lagre
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-produkt">Produkt</Label>
                        <Input
                            id="edit-produkt"
                            value={formData.produkt}
                            onChange={(e) => {
                                e.stopPropagation();
                                handleInputChange('produkt', e.target.value);
                            }}
                            onFocus={(e) => e.stopPropagation()}
                            onBlur={(e) => e.stopPropagation()}
                            onSelect={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                            placeholder="Skriv inn produkt"
                        />
                    </div>

                    {/* Vis de andre feltene som read-only */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Ramme (kun lesing)</Label>
                            <Input
                                value={formatAmount(prosjekt?.selskap?.ramme)}
                                readOnly
                                disabled
                                className="bg-gray-50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Kundenummer WIMS (kun lesing)</Label>
                            <Input
                                value={prosjekt?.selskap?.kundenummerWims || 'N/A'}
                                readOnly
                                disabled
                                className="bg-gray-50"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                        <h3 className="text-lg font-semibold">Produkt og Økonomi</h3>
                        <p className="text-xs text-muted-foreground">Kun produkt kan redigeres her</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartEdit}
                >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Rediger
                </Button>
            </div>
            <Grid container spacing={3}>
                <DetailField label="Produkt" value={prosjekt.produkt} icon={Package} />
                <DetailField label="Ramme" value={formatAmount(prosjekt.selskap?.ramme)} icon={CreditCard} />
                <DetailField label="Kundenummer WIMS" value={prosjekt.selskap?.kundenummerWims} icon={Hash} copyable />
            </Grid>
        </div>
    );
});

export default ProsjektProduktOkonomiSection; 