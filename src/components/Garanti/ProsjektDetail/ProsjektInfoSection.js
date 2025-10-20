import React, { useState, memo } from 'react';
import { Grid } from '@mui/material';
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { useToast } from "~/hooks/use-toast";
import { Edit2, Loader2, Check, X, Info, Type, MapPin, Mail, Navigation, Building } from 'lucide-react';
import DetailField from './DetailField';

// Kombinert komponent som håndterer både visning og redigering internt
const ProsjektInfoSection = memo(({ prosjekt, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        navn: '',
        gateadresse: '',
        postnummer: '',
        poststed: '',
        kommune: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Initialiser formData når redigering starter
    const handleStartEdit = () => {
        setFormData({
            navn: prosjekt?.navn || '',
            gateadresse: prosjekt?.gateadresse || prosjekt?.prosjektGateadresse || '',
            postnummer: prosjekt?.postnummer || prosjekt?.prosjektPostnummer || '',
            poststed: prosjekt?.poststed || prosjekt?.prosjektPoststed || '',
            kommune: prosjekt?.kommune || prosjekt?.prosjektKommune || ''
        });
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFormData({
            navn: '',
            gateadresse: '',
            postnummer: '',
            poststed: '',
            kommune: ''
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
                navn: '',
                gateadresse: '',
                postnummer: '',
                poststed: '',
                kommune: ''
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
                        <Info className="h-5 w-5 text-orange-600" />
                        <h3 className="text-lg font-semibold">Rediger Prosjektinformasjon</h3>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-navn">Prosjektnavn</Label>
                        <Input
                            id="edit-navn"
                            value={formData.navn}
                            onChange={(e) => {
                                e.stopPropagation();
                                handleInputChange('navn', e.target.value);
                            }}
                            onFocus={(e) => e.stopPropagation()}
                            onBlur={(e) => e.stopPropagation()}
                            onSelect={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                            placeholder="Skriv inn prosjektnavn"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-gateadresse">Gateadresse</Label>
                        <Input
                            id="edit-gateadresse"
                            value={formData.gateadresse}
                            onChange={(e) => {
                                e.stopPropagation();
                                handleInputChange('gateadresse', e.target.value);
                            }}
                            onFocus={(e) => e.stopPropagation()}
                            onBlur={(e) => e.stopPropagation()}
                            onSelect={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                            placeholder="Skriv inn gateadresse"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-postnummer">Postnummer</Label>
                        <Input
                            id="edit-postnummer"
                            value={formData.postnummer}
                            onChange={(e) => {
                                e.stopPropagation();
                                handleInputChange('postnummer', e.target.value);
                            }}
                            onFocus={(e) => e.stopPropagation()}
                            onBlur={(e) => e.stopPropagation()}
                            onSelect={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                            placeholder="Skriv inn postnummer"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-poststed">Poststed</Label>
                        <Input
                            id="edit-poststed"
                            value={formData.poststed}
                            onChange={(e) => {
                                e.stopPropagation();
                                handleInputChange('poststed', e.target.value);
                            }}
                            onFocus={(e) => e.stopPropagation()}
                            onBlur={(e) => e.stopPropagation()}
                            onSelect={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                            placeholder="Skriv inn poststed"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="edit-kommune">Kommune</Label>
                        <Input
                            id="edit-kommune"
                            value={formData.kommune}
                            onChange={(e) => {
                                e.stopPropagation();
                                handleInputChange('kommune', e.target.value);
                            }}
                            onFocus={(e) => e.stopPropagation()}
                            onBlur={(e) => e.stopPropagation()}
                            onSelect={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                            placeholder="Skriv inn kommune"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-orange-600" />
                    <h3 className="text-lg font-semibold">Prosjektinformasjon</h3>
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
                <DetailField label="Prosjektnavn" value={prosjekt.navn} icon={Type} />
                <DetailField label="Gateadresse" value={prosjekt.gateadresse || prosjekt.prosjektGateadresse} icon={MapPin} />
                <DetailField label="Postnummer" value={prosjekt.postnummer || prosjekt.prosjektPostnummer} icon={Mail} />
                <DetailField label="Poststed" value={prosjekt.poststed || prosjekt.prosjektPoststed} icon={Navigation} />
                <DetailField label="Kommune" value={prosjekt.kommune || prosjekt.prosjektKommune} icon={Building} />
            </Grid>
        </div>
    );
});

export default ProsjektInfoSection; 