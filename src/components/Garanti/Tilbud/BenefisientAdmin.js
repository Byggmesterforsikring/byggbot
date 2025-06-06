import React, { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Users, Plus, Edit, Trash2, Building, User } from 'lucide-react';
import { useToast } from "~/hooks/use-toast";

const BENEFISIENT_TYPER = [
    { value: 'EIER', label: 'Eier', icon: User },
    { value: 'INTERESSENT', label: 'Interessent', icon: Building }
];

const BenefisientAdmin = memo(({ tilbud, onBenefisienterUpdate }) => {
    const [benefisienter, setBenefisienter] = useState([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBenefisient, setEditingBenefisient] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        type: 'EIER',
        navn: '',
        organisasjonsnummer: '',
        personident: '',
        andel: '',
        kontaktinformasjon: ''
    });

    // Hent benefisienter
    const fetchBenefisienter = async () => {
        if (!tilbud?.id) return;

        setIsLoading(true);
        try {
            const result = await window.electron.tilbud.getBenefisienter(tilbud.id);
            if (result.success) {
                setBenefisienter(result.data);
                onBenefisienterUpdate?.(result.data);
            } else {
                throw new Error(result.error || 'Kunne ikke hente benefisienter');
            }
        } catch (error) {
            console.error('Feil ved henting av benefisienter:', error);
            toast({
                title: "Feil ved lasting",
                description: "Kunne ikke laste benefisienter",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Valider organisasjonsnummer (9 siffer)
    const validateOrgnr = (orgnr) => {
        return /^\d{9}$/.test(orgnr);
    };

    // Valider personnummer (11 siffer)
    const validatePersonnr = (personnr) => {
        return /^\d{11}$/.test(personnr);
    };

    // Valider felt
    const validateField = (name, value) => {
        const newErrors = { ...errors };

        switch (name) {
            case 'navn':
                if (!value || value.trim().length < 2) {
                    newErrors[name] = 'Navn må være minst 2 tegn';
                } else {
                    delete newErrors[name];
                }
                break;
            case 'organisasjonsnummer':
                if (formData.type === 'INTERESSENT' && value && !validateOrgnr(value)) {
                    newErrors[name] = 'Organisasjonsnummer må være 9 siffer';
                } else {
                    delete newErrors[name];
                }
                break;
            case 'personident':
                if (formData.type === 'EIER' && value && !validatePersonnr(value)) {
                    newErrors[name] = 'Personnummer må være 11 siffer';
                } else {
                    delete newErrors[name];
                }
                break;
            case 'andel':
                if (value && (isNaN(value) || parseFloat(value) < 0 || parseFloat(value) > 100)) {
                    newErrors[name] = 'Andel må være mellom 0 og 100%';
                } else {
                    delete newErrors[name];
                }
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Håndter feltendringer
    const handleFieldChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        validateField(name, value);
    };

    // Åpne redigeringsdialog
    const openEditDialog = (benefisient = null) => {
        if (benefisient) {
            setEditingBenefisient(benefisient);
            setFormData({
                type: benefisient.type,
                navn: benefisient.navn,
                organisasjonsnummer: benefisient.organisasjonsnummer || '',
                personident: benefisient.personident || '',
                andel: benefisient.andel ? benefisient.andel.toString() : '',
                kontaktinformasjon: benefisient.kontaktinformasjon || ''
            });
        } else {
            setEditingBenefisient(null);
            setFormData({
                type: 'EIER',
                navn: '',
                organisasjonsnummer: '',
                personident: '',
                andel: '',
                kontaktinformasjon: ''
            });
        }
        setErrors({});
        setIsDialogOpen(true);
    };

    // Lukk dialog
    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingBenefisient(null);
        setFormData({
            type: 'EIER',
            navn: '',
            organisasjonsnummer: '',
            personident: '',
            andel: '',
            kontaktinformasjon: ''
        });
        setErrors({});
    };

    // Lagre benefisient
    const handleSaveBenefisient = async () => {
        // Valider alle felt
        const isValid = Object.keys(formData).every(key =>
            validateField(key, formData[key])
        );

        if (!isValid) {
            toast({
                title: "Valideringsfeil",
                description: "Rett opp feilene før du lagrer",
                variant: "destructive"
            });
            return;
        }

        if (!formData.navn) {
            toast({
                title: "Mangler navn",
                description: "Navn er påkrevd",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            let result;
            const benefisientData = {
                tilbudId: tilbud.id,
                type: formData.type,
                navn: formData.navn.trim(),
                organisasjonsnummer: formData.organisasjonsnummer || null,
                personident: formData.personident || null,
                andel: formData.andel ? parseFloat(formData.andel) : null,
                kontaktinformasjon: formData.kontaktinformasjon || null
            };

            if (editingBenefisient) {
                // Oppdater eksisterende
                result = await window.electron.tilbud.updateBenefisient({
                    benefisientId: editingBenefisient.id,
                    dataToUpdate: benefisientData
                });
            } else {
                // Opprett ny
                result = await window.electron.tilbud.createBenefisient(benefisientData);
            }

            if (result.success) {
                await fetchBenefisienter();
                closeDialog();
                toast({
                    title: editingBenefisient ? "Benefisient oppdatert" : "Benefisient opprettet",
                    description: `${formData.navn} ble ${editingBenefisient ? 'oppdatert' : 'lagt til'}`
                });
            } else {
                throw new Error(result.error || 'Kunne ikke lagre benefisient');
            }
        } catch (error) {
            console.error('Feil ved lagring av benefisient:', error);
            toast({
                title: "Lagringsfeil",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Slett benefisient
    const handleDeleteBenefisient = async (benefisientId) => {
        if (!confirm('Er du sikker på at du vil slette denne benefisienten?')) return;

        try {
            const result = await window.electron.tilbud.deleteBenefisient(benefisientId);
            if (result.success) {
                await fetchBenefisienter();
                toast({
                    title: "Benefisient slettet",
                    description: "Benefisienten ble fjernet"
                });
            } else {
                throw new Error(result.error || 'Kunne ikke slette benefisient');
            }
        } catch (error) {
            console.error('Feil ved sletting av benefisient:', error);
            toast({
                title: "Slettingsfeil",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    // Hent data ved mount
    useEffect(() => {
        fetchBenefisienter();
    }, [tilbud?.id]);

    // Beregn total andel
    const totalAndel = benefisienter.reduce((sum, b) => sum + (parseFloat(b.andel) || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Benefisienter</h2>
                <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ny benefisient
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Oversikt
                        <Badge variant="secondary">{benefisienter.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                            <p className="text-muted-foreground mt-2">Laster benefisienter...</p>
                        </div>
                    ) : benefisienter.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Ingen benefisienter registrert</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Navn</TableHead>
                                    <TableHead>Identifikator</TableHead>
                                    <TableHead className="text-right">Andel</TableHead>
                                    <TableHead className="text-right">Handlinger</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {benefisienter.map((benefisient) => (
                                    <TableRow key={benefisient.id}>
                                        <TableCell>
                                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                {benefisient.type === 'EIER' ?
                                                    <User className="h-3 w-3" /> :
                                                    <Building className="h-3 w-3" />
                                                }
                                                {benefisient.type === 'EIER' ? 'Eier' : 'Interessent'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{benefisient.navn}</TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {benefisient.organisasjonsnummer || benefisient.personident || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {benefisient.andel ? `${benefisient.andel}%` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEditDialog(benefisient)}
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteBenefisient(benefisient.id)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Dialog for redigering */}
            <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingBenefisient ? 'Rediger benefisient' : 'Ny benefisient'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Type */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Type *
                            </label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) => handleFieldChange('type', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BENEFISIENT_TYPER.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            <div className="flex items-center gap-2">
                                                <type.icon className="h-4 w-4" />
                                                {type.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Navn */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Navn *
                            </label>
                            <Input
                                value={formData.navn}
                                onChange={(e) => handleFieldChange('navn', e.target.value)}
                                placeholder="Navn på person eller selskap"
                                className={errors.navn ? 'border-destructive' : ''}
                            />
                            {errors.navn && (
                                <p className="text-sm text-destructive mt-1">{errors.navn}</p>
                            )}
                        </div>

                        {/* Identifikator basert på type */}
                        {formData.type === 'INTERESSENT' ? (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                    Organisasjonsnummer
                                </label>
                                <Input
                                    value={formData.organisasjonsnummer}
                                    onChange={(e) => handleFieldChange('organisasjonsnummer', e.target.value)}
                                    placeholder="123456789"
                                    maxLength={9}
                                    className={errors.organisasjonsnummer ? 'border-destructive' : ''}
                                />
                                {errors.organisasjonsnummer && (
                                    <p className="text-sm text-destructive mt-1">{errors.organisasjonsnummer}</p>
                                )}
                            </div>
                        ) : (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                    Personnummer
                                </label>
                                <Input
                                    value={formData.personident}
                                    onChange={(e) => handleFieldChange('personident', e.target.value)}
                                    placeholder="12345678901"
                                    maxLength={11}
                                    className={errors.personident ? 'border-destructive' : ''}
                                />
                                {errors.personident && (
                                    <p className="text-sm text-destructive mt-1">{errors.personident}</p>
                                )}
                            </div>
                        )}

                        {/* Andel */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Andel (%)
                            </label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={formData.andel}
                                onChange={(e) => handleFieldChange('andel', e.target.value)}
                                placeholder="25.5"
                                className={errors.andel ? 'border-destructive' : ''}
                            />
                            {errors.andel && (
                                <p className="text-sm text-destructive mt-1">{errors.andel}</p>
                            )}
                        </div>

                        {/* Kontaktinformasjon */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Kontaktinformasjon
                            </label>
                            <Textarea
                                value={formData.kontaktinformasjon}
                                onChange={(e) => handleFieldChange('kontaktinformasjon', e.target.value)}
                                placeholder="E-post, telefon, adresse..."
                                rows={3}
                            />
                        </div>

                        {/* Handlinger */}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={closeDialog}>
                                Avbryt
                            </Button>
                            <Button onClick={handleSaveBenefisient} disabled={isSaving}>
                                {isSaving ? 'Lagrer...' : editingBenefisient ? 'Oppdater' : 'Opprett'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
});

export default BenefisientAdmin; 