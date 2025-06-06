import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Grid, TextField as MuiTextField, Alert as MuiAlert } from '@mui/material'; // Bruker MuiTextField for enkelhet, kan byttes til ShadCN Input
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Input } from "~/components/ui/input"; // ShadCN Input
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { useToast } from "~/hooks/use-toast";
import authManager from '../../auth/AuthManager'; // For å hente brukerId

function GarantiProsjektCreatePage() {
    const navigate = useNavigate();
    const location = useLocation(); // For å hente evt. prefill fra query params
    const { toast } = useToast();

    // Initialiserer med tomme verdier
    const [formData, setFormData] = useState({
        organisasjonsnummer: '',
        selskapsnavn: '',
        gateadresse: '',
        postnummer: '',
        poststed: '',
        kontaktpersonNavn: '',
        kontaktpersonTelefon: '',
        kundenummerWims: '',
        ramme: '',
        prosjektNavn: '',
        prosjektGateadresse: '',
        prosjektPostnummer: '',
        prosjektPoststed: '',
        prosjektKommune: '',
        produkt: '', // Tømmes, kan settes til 'Garanti' hvis det er en fast default
        kommentarKunde: '',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingSelskap, setIsLoadingSelskap] = useState(false); // For lasting av prefill data
    const [error, setError] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isSelskapPrefilled, setIsSelskapPrefilled] = useState(false); // Ny state

    useEffect(() => {
        // const user = authManager.getCurrentAccount(); // Gammelt kall
        const userDetails = authManager.getCurrentUserDetails(); // Nytt kall

        // TODO: Trenger en måte å mappe Entra ID/brukernavn til UserV2 ID.
        // For nå, bruker placeholder. Denne må fikses i en reell implementasjon.
        // Dette er IDen til brukeren som er logget inn og utfører handlingen
        // setCurrentUserId(user ? 1 : null); // Gammel logikk
        setCurrentUserId(userDetails ? userDetails.id : null); // Bruk ID fra userDetails

        // Sjekk om selskapId er sendt via query params (f.eks. fra SelskapDetailPage)
        const queryParams = new URLSearchParams(location.search);
        const prefillSelskapId = queryParams.get('selskapId');

        if (prefillSelskapId) {
            const fetchPrefillSelskapData = async () => {
                setIsLoadingSelskap(true);
                try {
                    if (window.electron && window.electron.garanti && window.electron.garanti.getSelskapById) {
                        const result = await window.electron.garanti.getSelskapById(prefillSelskapId);
                        if (result.success && result.data) {
                            const selskap = result.data;
                            setFormData(prev => ({
                                ...prev, // Behold prosjektdata fra testdata/tidligere state
                                organisasjonsnummer: selskap.organisasjonsnummer || '',
                                selskapsnavn: selskap.selskapsnavn || '',
                                gateadresse: selskap.gateadresse || '',
                                postnummer: selskap.postnummer || '',
                                poststed: selskap.poststed || '',
                                kontaktpersonNavn: selskap.kontaktpersonNavn || '',
                                kontaktpersonTelefon: selskap.kontaktpersonTelefon || '',
                                kundenummerWims: selskap.kundenummerWims || '',
                                ramme: selskap.ramme || '',
                            }));
                            setIsSelskapPrefilled(true);
                        } else {
                            toast({ title: "Feil", description: `Kunne ikke hente data for selskap ID: ${prefillSelskapId}. Feil: ${result.error}`, variant: "destructive" });
                        }
                    } else {
                        throw new Error('API for getSelskapById ikke tilgjengelig.')
                    }
                } catch (err) {
                    toast({ title: "Feil", description: `Feil ved henting av selskapsdata: ${err.message}`, variant: "destructive" });
                } finally {
                    setIsLoadingSelskap(false);
                }
            };
            fetchPrefillSelskapData();
        } else if (formData.organisasjonsnummer === '123456789') { // Anta at dette er testdata
            // Hvis det er testdata og ingen prefillSelskapId, ikke gjør noe, behold testdata.
        } else {
            // Hvis ingen prefillSelskapId og ingen testdata, reset til tomt skjema (eller behold eksisterende hvis man har begynt å skrive)
            // Denne logikken kan justeres. For nå lar vi testdata stå hvis ingen prefill.
        }
    }, [location.search, toast]); // formData var fjernet fra deps, det er bra.

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!currentUserId) {
            toast({ title: "Feil", description: "Kunne ikke identifisere bruker. Prøv å logge inn på nytt.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const requestData = { ...formData };
        // Fjern tomme strenger for valgfrie felter for å unngå å sende dem hvis de ikke er fylt ut
        // Backend (createSelskap/createProsjekt) filtrerer også undefined, men greit her også.
        Object.keys(requestData).forEach(key => {
            if (requestData[key] === '') {
                delete requestData[key];
            }
        });

        try {
            if (window.electron && window.electron.garanti && window.electron.garanti.createSak) {
                const result = await window.electron.garanti.createSak({
                    requestData,
                    opprettetAvBrukerId_UserV2: currentUserId
                });

                if (result.success && result.data) {
                    toast({ title: "Suksess!", description: `Prosjekt "${result.data.navn || 'Navnløst'}" for ${result.data.selskap?.selskapsnavn} er opprettet.` });
                    navigate(`/garanti/prosjekt/${result.data.id}`); // Naviger til det nye prosjektets detaljside
                } else {
                    throw new Error(result.error || 'Ukjent feil ved opprettelse av garantiprosess.');
                }
            } else {
                throw new Error('Garanti API (createSak/handleNewGuaranteeRequest) er ikke tilgjengelig.');
            }
        } catch (err) {
            console.error("Feil ved opprettelse av garantiprosess:", err);
            setError(err.message);
            toast({ title: "Feil ved opprettelse", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
            <Button variant="outline" onClick={() => navigate(-1)} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake
            </Button>

            <Typography variant="h4" component="h1" className="text-2xl font-semibold mb-6">
                Start Nytt Garantiprosjekt
            </Typography>

            {isLoadingSelskap && <Typography>Laster selskapsdata...</Typography>}

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Card>
                            <CardHeader><CardTitle>Selskapsinformasjon</CardTitle>
                                {isSelskapPrefilled && <CardDescription>Selskapsdata er forhåndsutfylt.</CardDescription>}</CardHeader>
                            <CardContent className="space-y-4">
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Label htmlFor="organisasjonsnummer">Organisasjonsnummer (påkrevd)</Label>
                                        <Input id="organisasjonsnummer" name="organisasjonsnummer" value={formData.organisasjonsnummer} onChange={handleChange} required disabled={isSelskapPrefilled} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Label htmlFor="selskapsnavn">Selskapsnavn (påkrevd hvis nytt)</Label>
                                        <Input id="selskapsnavn" name="selskapsnavn" value={formData.selskapsnavn} onChange={handleChange} required disabled={isSelskapPrefilled} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Label htmlFor="gateadresse">Gateadresse</Label>
                                        <Input id="gateadresse" name="gateadresse" value={formData.gateadresse} onChange={handleChange} disabled={isSelskapPrefilled} />
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Label htmlFor="postnummer">Postnummer</Label>
                                        <Input id="postnummer" name="postnummer" value={formData.postnummer} onChange={handleChange} disabled={isSelskapPrefilled} />
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Label htmlFor="poststed">Poststed</Label>
                                        <Input id="poststed" name="poststed" value={formData.poststed} onChange={handleChange} disabled={isSelskapPrefilled} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Label htmlFor="kontaktpersonNavn">Kontaktperson Navn</Label>
                                        <Input id="kontaktpersonNavn" name="kontaktpersonNavn" value={formData.kontaktpersonNavn} onChange={handleChange} disabled={isSelskapPrefilled} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Label htmlFor="kontaktpersonTelefon">Kontaktperson Telefon</Label>
                                        <Input id="kontaktpersonTelefon" name="kontaktpersonTelefon" value={formData.kontaktpersonTelefon} onChange={handleChange} disabled={isSelskapPrefilled} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Label htmlFor="kundenummerWims">Kundenummer WIMS</Label>
                                        <Input id="kundenummerWims" name="kundenummerWims" value={formData.kundenummerWims} onChange={handleChange} disabled={isSelskapPrefilled} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Label htmlFor="ramme">Ramme</Label>
                                        <Input id="ramme" name="ramme" value={formData.ramme} onChange={handleChange} disabled={isSelskapPrefilled} />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12}>
                        <Card>
                            <CardHeader><CardTitle>Prosjektinformasjon</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <Label htmlFor="prosjektNavn">Prosjektnavn</Label>
                                        <Input id="prosjektNavn" name="prosjektNavn" value={formData.prosjektNavn} onChange={handleChange} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Label htmlFor="prosjektGateadresse">Prosjekt Gateadresse</Label>
                                        <Input id="prosjektGateadresse" name="prosjektGateadresse" value={formData.prosjektGateadresse} onChange={handleChange} />
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Label htmlFor="prosjektPostnummer">Prosjekt Postnummer</Label>
                                        <Input id="prosjektPostnummer" name="prosjektPostnummer" value={formData.prosjektPostnummer} onChange={handleChange} />
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Label htmlFor="prosjektPoststed">Prosjekt Poststed</Label>
                                        <Input id="prosjektPoststed" name="prosjektPoststed" value={formData.prosjektPoststed} onChange={handleChange} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Label htmlFor="prosjektKommune">Prosjekt Kommune</Label>
                                        <Input id="prosjektKommune" name="prosjektKommune" value={formData.prosjektKommune} onChange={handleChange} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Label htmlFor="produkt">Produkt/Tjeneste</Label>
                                        <Input id="produkt" name="produkt" value={formData.produkt} onChange={handleChange} />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Label htmlFor="kommentarKunde">Kommentar fra Kunde</Label>
                                        <Textarea id="kommentarKunde" name="kommentarKunde" value={formData.kommentarKunde} onChange={handleChange} />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {error && (
                        <Grid item xs={12}>
                            <MuiAlert severity="error" sx={{ mb: 2 }}>{error}</MuiAlert>
                        </Grid>
                    )}

                    <Grid item xs={12} className="flex justify-end">
                        <Button type="submit" disabled={isLoading || isLoadingSelskap} className="min-w-[120px]">
                            {(isLoading || isLoadingSelskap) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Opprett Prosjekt
                        </Button>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
}

export default GarantiProsjektCreatePage; 