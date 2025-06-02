import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography as MuiTypography, Grid } from '@mui/material'; // Bruker Grid for layout
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "~/components/ui/card";
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import authManager from '../../auth/AuthManager'; // Importer authManager
import { useToast } from '~/hooks/use-toast'; // Korrigert sti

// Mock-data for brukere (erstatt med faktisk API-kall)
const mockUsers = [
    { id: 1, navn: 'Ola Nordmann (Rådgiver)', epost: 'ola@example.com', rolle: 'RAADGIVER' },
    { id: 2, navn: 'Kari Normann (UW)', epost: 'kari@example.com', rolle: 'UW' },
    { id: 3, navn: 'Per Produksjon (Prod)', epost: 'per@example.com', rolle: 'PRODUKSJON' },
    { id: 4, navn: 'Admin Adminsson', epost: 'admin@example.com', rolle: 'ADMIN' },
];

function GarantiSakCreatePage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        organisasjonsnummer: '',
        selskapsnavn: '',
        gateadresse: '',
        postnummer: '',
        poststed: '',
        kontaktpersonNavn: '',
        kontaktpersonTelefon: '',
        ansvarligRaadgiverId: '',
        uwAnsvarligId: '',
        produksjonsansvarligId: '',
        kommentarKunde: '',
        kommentarIntern: '',
        kundenummerWims: '',
        ramme: '',
        produkt: '',
    });
    const [allUsersV2, setAllUsersV2] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const { toast } = useToast(); // Ny hook

    useEffect(() => {
        const fetchAllV2Users = async () => {
            setIsLoading(true);
            try {
                if (window.electron && window.electron.garanti && window.electron.garanti.getUsersV2) {
                    const result = await window.electron.garanti.getUsersV2();
                    if (result.success && Array.isArray(result.data)) {
                        setAllUsersV2(result.data);
                    } else {
                        console.error("Kunne ikke hente V2-brukere, uventet format:", result);
                        setAllUsersV2([]);
                    }
                } else {
                    console.error("API for å hente V2-brukere er ikke tilgjengelig.");
                    setAllUsersV2([]);
                }
            } catch (e) {
                console.error("Feil ved henting av V2-brukere:", e);
                setError("Kunne ikke laste brukerlisten for valg av ansvarlige.");
                setAllUsersV2([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllV2Users();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        if (!formData.organisasjonsnummer || !formData.selskapsnavn) {
            setError('Organisasjonsnummer og selskapsnavn er påkrevd.');
            setIsLoading(false);
            return;
        }
        if (formData.organisasjonsnummer.length !== 9 || !/^\d+$/.test(formData.organisasjonsnummer)) {
            setError('Organisasjonsnummer må være 9 siffer.');
            setIsLoading(false);
            return;
        }

        const currentUserAccount = authManager.getCurrentAccount();
        let faktiskOpprettetAvBrukerId_UserV2 = null;

        if (currentUserAccount && currentUserAccount.username && allUsersV2.length > 0) {
            const loggedInUserEmail = currentUserAccount.username.toLowerCase();
            const matchedUser = allUsersV2.find(u => u.email && u.email.toLowerCase() === loggedInUserEmail);
            if (matchedUser) {
                faktiskOpprettetAvBrukerId_UserV2 = matchedUser.id;
                console.log(`Fant UserV2 ID ${faktiskOpprettetAvBrukerId_UserV2} for innlogget bruker ${loggedInUserEmail}`);
            } else {
                console.warn(`Kunne ikke finne UserV2 ID for ${loggedInUserEmail} i listen over V2-brukere.`);
            }
        } else {
            console.warn('Ingen innlogget bruker funnet via authManager eller brukerliste (allUsersV2) er tom.');
        }

        if (!faktiskOpprettetAvBrukerId_UserV2) {
            console.warn('Setter opprettetAv (UserV2) ID til en placeholder (f.eks. første admin) da bruker ikke ble funnet. BØR FIKSES FOR PRODUKSJON!');
            const fallbackAdmin = allUsersV2.find(u => u.roller?.includes('Systemadministrator'));
            faktiskOpprettetAvBrukerId_UserV2 = fallbackAdmin ? fallbackAdmin.id : (allUsersV2.length > 0 ? allUsersV2[0].id : 1);
        }

        try {
            const payload = {
                ...formData,
                ansvarligRaadgiverId: formData.ansvarligRaadgiverId ? parseInt(formData.ansvarligRaadgiverId) : null,
                uwAnsvarligId: formData.uwAnsvarligId ? parseInt(formData.uwAnsvarligId) : null,
                produksjonsansvarligId: formData.produksjonsansvarligId ? parseInt(formData.produksjonsansvarligId) : null,
            };

            if (window.electron && window.electron.garanti && window.electron.garanti.createSak) {
                const result = await window.electron.garanti.createSak(payload, faktiskOpprettetAvBrukerId_UserV2);
                if (result.success) {
                    toast({
                        title: "Sak Opprettet",
                        description: `Garantisak for ${result.data.selskapsnavn} (ID: ${result.data.id}) er opprettet.`
                    });
                    setTimeout(() => navigate(`/garanti/saker`), 2000);
                } else {
                    throw new Error(result.error || 'Ukjent feil ved opprettelse av sak.');
                }
            } else {
                throw new Error('API for å opprette garantisak er ikke tilgjengelig.');
            }
        } catch (err) {
            console.error("Feil ved innsending av garantisak:", err);
            toast({
                title: "Feil ved Opprettelse",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const raadgivere = allUsersV2.filter(u => u.roller?.includes('Garantisaksbehandler') || u.roller?.includes('Systemadministrator'));
    const uwAnsvarlige = allUsersV2.filter(u => u.roller?.includes('Garantileder_UW') || u.roller?.includes('Systemadministrator'));
    const produksjonsAnsvarlige = allUsersV2;

    const renderUserSelect = (fieldId, label, userList) => (
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor={fieldId}>{label}</Label>
            <Select
                value={formData[fieldId] || undefined}
                onValueChange={(value) => handleSelectChange(fieldId, value)}
                disabled={isLoading}
            >
                <SelectTrigger id={fieldId} className={!formData[fieldId] ? "text-muted-foreground" : ""}>
                    <SelectValue placeholder={`Velg ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={undefined}>
                        <em>Ingen valgt</em>
                    </SelectItem>
                    {userList.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                            {user.navn}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <Box sx={{ p: 3 }} className="w-full max-w-4xl mx-auto">
            <Button
                variant="outline"
                onClick={() => navigate('/garanti/saker')}
                className="mb-4"
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake til oversikten
            </Button>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Opprett Ny Garantisak</CardTitle>
                        <CardDescription>Fyll ut detaljene for den nye garantisaken.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isLoading && !allUsersV2.length && <MuiTypography>Laster brukerdata for skjema...</MuiTypography>}
                        <MuiTypography variant="h6" component="h2" sx={{ fontSize: '1.1rem', fontWeight: 500, borderBottom: '1px solid #e0e0e0', pb: 1, mb: 3 }}>Selskapsinformasjon</MuiTypography>
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={6}>
                                <div className="space-y-1.5">
                                    <Label htmlFor="organisasjonsnummer">Organisasjonsnummer *</Label>
                                    <Input id="organisasjonsnummer" name="organisasjonsnummer" value={formData.organisasjonsnummer} onChange={handleChange} placeholder="9 siffer" maxLength={9} required disabled={isLoading} />
                                </div>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <div className="space-y-1.5">
                                    <Label htmlFor="selskapsnavn">Selskapsnavn *</Label>
                                    <Input id="selskapsnavn" name="selskapsnavn" value={formData.selskapsnavn} onChange={handleChange} placeholder="Selskapets navn" required disabled={isLoading} />
                                </div>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <div className="space-y-1.5">
                                    <Label htmlFor="gateadresse">Gateadresse</Label>
                                    <Input id="gateadresse" name="gateadresse" value={formData.gateadresse} onChange={handleChange} placeholder="Gatenavn og nummer" disabled={isLoading} />
                                </div>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <div className="space-y-1.5">
                                    <Label htmlFor="postnummer">Postnummer</Label>
                                    <Input id="postnummer" name="postnummer" value={formData.postnummer} onChange={handleChange} placeholder="Eks: 0123" maxLength={4} disabled={isLoading} />
                                </div>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <div className="space-y-1.5">
                                    <Label htmlFor="poststed">Poststed</Label>
                                    <Input id="poststed" name="poststed" value={formData.poststed} onChange={handleChange} placeholder="Eks: Oslo" disabled={isLoading} />
                                </div>
                            </Grid>
                        </Grid>

                        <MuiTypography variant="h6" component="h2" sx={{ mt: 4, fontSize: '1.1rem', fontWeight: 500, borderBottom: '1px solid #e0e0e0', pb: 1, mb: 3 }}>Kontaktperson</MuiTypography>
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={6}>
                                <div className="space-y-1.5">
                                    <Label htmlFor="kontaktpersonNavn">Navn</Label>
                                    <Input id="kontaktpersonNavn" name="kontaktpersonNavn" value={formData.kontaktpersonNavn} onChange={handleChange} disabled={isLoading} />
                                </div>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <div className="space-y-1.5">
                                    <Label htmlFor="kontaktpersonTelefon">Telefon</Label>
                                    <Input id="kontaktpersonTelefon" name="kontaktpersonTelefon" value={formData.kontaktpersonTelefon} onChange={handleChange} disabled={isLoading} />
                                </div>
                            </Grid>
                        </Grid>

                        <MuiTypography variant="h6" component="h2" sx={{ mt: 4, fontSize: '1.1rem', fontWeight: 500, borderBottom: '1px solid #e0e0e0', pb: 1, mb: 3 }}>Intern Info og Ansvarlige</MuiTypography>
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={4}>{renderUserSelect("ansvarligRaadgiverId", "Ansvarlig Rådgiver", raadgivere)}</Grid>
                            <Grid item xs={12} md={4}>{renderUserSelect("uwAnsvarligId", "UW Ansvarlig", uwAnsvarlige)}</Grid>
                            <Grid item xs={12} md={4}>{renderUserSelect("produksjonsansvarligId", "Produksjonsansvarlig", produksjonsAnsvarlige)}</Grid>
                            <Grid item xs={12} md={6}>
                                <div className="space-y-1.5">
                                    <Label htmlFor="kundenummerWims">Kundenummer Wims</Label>
                                    <Input id="kundenummerWims" name="kundenummerWims" value={formData.kundenummerWims} onChange={handleChange} disabled={isLoading} />
                                </div>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <div className="space-y-1.5">
                                    <Label htmlFor="produkt">Produkt</Label>
                                    <Input id="produkt" name="produkt" value={formData.produkt} onChange={handleChange} placeholder="F.eks. Byggsikkerhetsgaranti" disabled={isLoading} />
                                </div>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <div className="space-y-1.5">
                                    <Label htmlFor="ramme">Ramme</Label>
                                    <Input id="ramme" name="ramme" value={formData.ramme} onChange={handleChange} placeholder="Økonomisk ramme" disabled={isLoading} />
                                </div>
                            </Grid>
                        </Grid>

                        <MuiTypography variant="h6" component="h2" sx={{ mt: 4, fontSize: '1.1rem', fontWeight: 500, borderBottom: '1px solid #e0e0e0', pb: 1, mb: 3 }}>Kommentarer</MuiTypography>
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={6}>
                                <div className="space-y-1.5">
                                    <Label htmlFor="kommentarKunde">Kommentar fra Kunde</Label>
                                    <Textarea id="kommentarKunde" name="kommentarKunde" value={formData.kommentarKunde} onChange={handleChange} placeholder="Eventuell kommentar fra kunden..." rows={4} disabled={isLoading} />
                                </div>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <div className="space-y-1.5">
                                    <Label htmlFor="kommentarIntern">Intern Kommentar</Label>
                                    <Textarea id="kommentarIntern" name="kommentarIntern" value={formData.kommentarIntern} onChange={handleChange} placeholder="Interne notater om saken..." rows={4} disabled={isLoading} />
                                </div>
                            </Grid>
                        </Grid>

                        {error && <MuiTypography color="error" sx={{ mt: 3, textAlign: 'center' }}>{error}</MuiTypography>}
                        {successMessage && <MuiTypography color="primary.main" sx={{ mt: 3, textAlign: 'center' }}>{successMessage}</MuiTypography>}

                    </CardContent>
                    <CardFooter className="flex justify-end pt-6">
                        <Button type="button" variant="outline" onClick={() => navigate('/garanti/saker')} className="mr-2" disabled={isLoading}>
                            Avbryt
                        </Button>
                        <Button type="submit" disabled={isLoading || !allUsersV2.length}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {isLoading ? 'Behandler...' : 'Lagre Garantisak'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Box>
    );
}

export default GarantiSakCreatePage; 