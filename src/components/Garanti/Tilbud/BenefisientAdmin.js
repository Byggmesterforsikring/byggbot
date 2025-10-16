import React, { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { Textarea } from "~/components/ui/textarea";
import { Users, Plus, Edit, Trash2, Building, User, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from "~/hooks/use-toast";
import { Alert, AlertDescription } from "~/components/ui/alert";

const BENEFISIENT_TYPER = [
    { value: 'Fysisk', label: 'Fysisk person (Eier)', icon: User },
    { value: 'Juridisk', label: 'Juridisk person (Selskap)', icon: Building }
];

const BenefisientAdmin = memo(({ tilbud }) => {
    const navigate = useNavigate();
    const [benefisienter, setBenefisienter] = useState([]);
    const [enheter, setEnheter] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    // State for slettingsbekreftelse
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [benefisientToDelete, setBenefisientToDelete] = useState(null);

    // Sjekk om dette er et prosjekt med enheter
    const harEnheter = tilbud?.prosjekttype &&
        tilbud.prosjekttype !== 'Enebolig' &&
        tilbud.prosjekttype !== 'Infrastruktur';

    // Hent benefisienter og enheter
    const fetchData = async () => {
        if (!tilbud?.id) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            // Hent benefisienter
            const benefisienterResult = await window.electron.tilbud.getBenefisienter(tilbud.id);
            if (benefisienterResult?.success && Array.isArray(benefisienterResult.data)) {
                setBenefisienter(benefisienterResult.data);
            } else {
                setBenefisienter([]);
            }

            // Hent enheter hvis relevant
            if (harEnheter) {
                const enheterResult = await window.electron.tilbud.getEnheter(tilbud.id);
                if (enheterResult?.success && Array.isArray(enheterResult.data)) {
                    setEnheter(enheterResult.data);
                } else {
                    setEnheter([]);
                }
            } else {
                setEnheter([]);
            }
        } catch (error) {
            console.error('Feil ved henting av data:', error);
            setBenefisienter([]);
            setEnheter([]);
            toast({
                title: "Feil ved lasting",
                description: "Kunne ikke laste benefisienter",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Naviger til ny benefisient side
    const handleNewBenefisient = (enhetId = null) => {
        const returnUrl = `/garanti/tilbud/${tilbud.id}?tab=benefisienter`;
        let url = `/garanti/tilbud/${tilbud.id}/benefisient/ny?returnUrl=${encodeURIComponent(returnUrl)}`;

        if (enhetId) {
            url += `&enhetId=${enhetId}`;
        }

        navigate(url);
    };

    // Naviger til rediger benefisient side
    const handleEditBenefisient = (benefisient) => {
        const returnUrl = `/garanti/tilbud/${tilbud.id}?tab=benefisienter`;
        navigate(`/garanti/tilbud/${tilbud.id}/benefisient/${benefisient.id}?returnUrl=${encodeURIComponent(returnUrl)}`);
    };

    // Åpne bekreftelsesdialog for sletting
    const openDeleteConfirm = (benefisient) => {
        setBenefisientToDelete(benefisient);
        setDeleteConfirmOpen(true);
    };

    // Lukk bekreftelsesdialog
    const closeDeleteConfirm = () => {
        setBenefisientToDelete(null);
        setDeleteConfirmOpen(false);
    };

    // Slett benefisient
    const handleDeleteBenefisient = async () => {
        if (!benefisientToDelete) return;

        try {
            const result = await window.electron.tilbud.deleteBenefisient(benefisientToDelete.id);

            if (result.success) {
                await fetchData();
                toast({
                    title: "Benefisient slettet",
                    description: `${benefisientToDelete.navn} ble slettet`
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
        } finally {
            closeDeleteConfirm();
        }
    };

    // Beregn total andel for en enhet
    const beregnTotalAndelForEnhet = (enhetId) => {
        const enhetsBenefisienter = benefisienter.filter(b => b.enhetId === enhetId);
        return enhetsBenefisienter.reduce((sum, b) => sum + parseFloat(b.andel || 0), 0);
    };

    // Hent data ved mount
    useEffect(() => {
        fetchData();
    }, [tilbud?.id]);

    if (!tilbud) {
        return (
            <div className="space-y-6">
                <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Ingen tilbudsdata tilgjengelig</p>
                </div>
            </div>
        );
    }

    // Visning for prosjekter med enheter
    if (harEnheter) {
        const benefisienterUtenEnhet = benefisienter.filter(b => !b.enhetId);

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Benefisienter per enhet</h2>
                    {enheter.length === 0 && (
                        <Button variant="outline" onClick={() => navigate(`/garanti/tilbud/${tilbud.id}?tab=enheter`)}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Gå til enhetsadministrasjon
                        </Button>
                    )}
                </div>

                {enheter.length === 0 ? (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Du må generere enheter før du kan legge til benefisienter.
                            Gå til "Enheter"-fanen for å generere enheter basert på prosjekttype og antall.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <>
                        {/* Vis hver enhet med sine benefisienter */}
                        {enheter.map((enhet) => {
                            const enhetsBenefisienter = benefisienter.filter(b => b.enhetId === enhet.id);
                            const totalAndel = beregnTotalAndelForEnhet(enhet.id);
                            const erKomplett = Math.abs(totalAndel - 100) < 0.01;

                            return (
                                <Card key={enhet.id}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center gap-2">
                                                <Building2 className="h-5 w-5" />
                                                {enhet.midlertidigNummer}
                                                {enhet.enhetsnummer && (
                                                    <span className="text-sm font-normal text-muted-foreground">
                                                        ({enhet.enhetsnummer})
                                                    </span>
                                                )}
                                                <Badge variant="secondary">{enhet.andelAvHelhet}% av prosjekt</Badge>
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                {erKomplett ? (
                                                    <Badge variant="success">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        {totalAndel.toFixed(0)}% tildelt
                                                    </Badge>
                                                ) : (
                                                    <Badge variant={totalAndel > 0 ? "warning" : "destructive"}>
                                                        <AlertCircle className="h-3 w-3 mr-1" />
                                                        {totalAndel.toFixed(0)}% tildelt
                                                    </Badge>
                                                )}
                                                <Button size="sm" onClick={() => handleNewBenefisient(enhet.id)}>
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Legg til benefisient
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {enhetsBenefisienter.length === 0 ? (
                                            <p className="text-muted-foreground text-center py-4">
                                                Ingen benefisienter registrert for denne enheten
                                            </p>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Navn</TableHead>
                                                        <TableHead>Identifikator</TableHead>
                                                        <TableHead className="text-right">Andel av enhet</TableHead>
                                                        <TableHead className="text-right">Handlinger</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {enhetsBenefisienter.map((benefisient) => (
                                                        <TableRow key={benefisient.id}>
                                                            <TableCell>
                                                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                                    {benefisient.type === 'Fysisk' ?
                                                                        <User className="h-3 w-3" /> :
                                                                        <Building className="h-3 w-3" />
                                                                    }
                                                                    {benefisient.type === 'Fysisk' ? 'Person' : 'Selskap'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="font-medium">{benefisient.navn}</TableCell>
                                                            <TableCell className="font-mono text-sm">
                                                                {benefisient.organisasjonsnummer || benefisient.personident || '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium">
                                                                {benefisient.andel}%
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex gap-2 justify-end">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleEditBenefisient(benefisient)}
                                                                    >
                                                                        <Edit className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => openDeleteConfirm(benefisient)}
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
                            );
                        })}

                        {/* Vis benefisienter uten enhet (skal ikke forekomme normalt) */}
                        {benefisienterUtenEnhet.length > 0 && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {benefisienterUtenEnhet.length} benefisient(er) er ikke tilknyttet noen enhet.
                                    Dette kan skape problemer med andelfordeling.
                                </AlertDescription>
                            </Alert>
                        )}
                    </>
                )}
            </div>
        );
    }

    // Standard visning for prosjekter uten enheter (enebolig, infrastruktur)
    const totalAndel = benefisienter.reduce((sum, b) => sum + parseFloat(b.andel || 0), 0);
    const erKomplett = Math.abs(totalAndel - 100) < 0.01;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Benefisienter</h2>
                <div className="flex items-center gap-2">
                    {erKomplett ? (
                        <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {totalAndel.toFixed(0)}% tildelt
                        </Badge>
                    ) : (
                        <Badge variant={totalAndel > 0 ? "warning" : "destructive"}>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {totalAndel.toFixed(0)}% tildelt
                        </Badge>
                    )}
                    <Button onClick={() => handleNewBenefisient()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Ny benefisient
                    </Button>
                </div>
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
                                    <TableHead>Boenhet/Adresse</TableHead>
                                    <TableHead className="text-right">Andel</TableHead>
                                    <TableHead className="text-right">Handlinger</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {benefisienter.map((benefisient) => (
                                    <TableRow key={benefisient.id}>
                                        <TableCell>
                                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                {benefisient.type === 'Fysisk' ?
                                                    <User className="h-3 w-3" /> :
                                                    <Building className="h-3 w-3" />
                                                }
                                                {benefisient.type === 'Fysisk' ? 'Person' : 'Selskap'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{benefisient.navn}</TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {benefisient.organisasjonsnummer || benefisient.personident || '-'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <div>
                                                {benefisient.boenhet && (
                                                    <div className="font-medium">{benefisient.boenhet}</div>
                                                )}
                                                {benefisient.adresse && (
                                                    <div className="text-muted-foreground">{benefisient.adresse}</div>
                                                )}
                                                {(benefisient.postnummer || benefisient.poststed) && (
                                                    <div className="text-muted-foreground">
                                                        {benefisient.postnummer} {benefisient.poststed}
                                                    </div>
                                                )}
                                                {!benefisient.boenhet && !benefisient.adresse && !benefisient.postnummer && !benefisient.poststed && '-'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {benefisient.andel}%
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditBenefisient(benefisient)}
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openDeleteConfirm(benefisient)}
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

            {/* Bekreftelsesdialog for sletting */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bekreft sletting</AlertDialogTitle>
                        <AlertDialogDescription>
                            Er du sikker på at du vil slette benefisienten <strong>{benefisientToDelete?.navn}</strong>?
                            <br />
                            Denne handlingen kan ikke angres.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={closeDeleteConfirm}>
                            Avbryt
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteBenefisient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Slett benefisient
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
});

export default BenefisientAdmin; 