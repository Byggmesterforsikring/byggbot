import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea"; // For eventuelle flertinjes Brreg-felter
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Separator } from "~/components/ui/separator";
import { ArrowLeft, SearchIcon, Send, Loader2, InfoIcon } from 'lucide-react';
import { useToast } from "~/hooks/use-toast";
import authManager from '../../auth/AuthManager';

// Importerer ikoner for visning av Brønnøysund-data
import {
    Building2, MapPin, Calendar, Users, Globe, Factory, Hash, Building
} from 'lucide-react';

// DetailField-komponent for visning av Brønnøysund-data (samme som på SelskapDetailPage)
const DetailField = ({ label, value, icon: Icon, className = "" }) => (
    <div className={`flex items-center space-x-3 py-3 ${className}`}>
        {Icon && (
            <div className="flex-shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
        )}
        <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
                {value || <span className="text-muted-foreground font-normal">Ikke satt</span>}
            </p>
        </div>
    </div>
);

// Hjelpefunksjon for formatering av dato
const formatDate = (dateString) => {
    if (!dateString) return 'Ikke satt';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (error) {
        return 'Ugyldig dato';
    }
};

// Hjelpefunksjon for å beregne år i drift
const calculateYearsInOperation = (foundingDate) => {
    if (!foundingDate) return null;
    const today = new Date();
    const founding = new Date(foundingDate);
    const yearsDiff = today.getFullYear() - founding.getFullYear();
    const monthDiff = today.getMonth() - founding.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < founding.getDate())) {
        return yearsDiff - 1;
    }
    return yearsDiff;
};

const initialSelskapState = {
    organisasjonsnummer: '',
    selskapsnavn: '',
    gateadresse: '',
    postnummer: '',
    poststed: '',
    // Interne/manuelle felter
    kontaktpersonNavn: '',
    kontaktpersonTelefon: '',
    kundenummerWims: '',
    ramme: '',
    // Nye Brreg-felter
    organisasjonsformBeskrivelse: '',
    forretningsKommune: '',
    forretningsKommunenummer: '',
    stiftelsesdato: '', // Vil bli formatert til YYYY-MM-DD for input type="date"
    antallAnsatte: '',   // Blir number
    naeringskode1Beskrivelse: '',
    hjemmeside: '',
};

// Hjelpefunksjoner for telefonnummer
const validatePhoneNumber = (phoneNumber) => {
    if (!phoneNumber || phoneNumber.trim() === '') return { isValid: true, message: '' }; // Tomt er OK

    const cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // Sjekk for gyldige norske nummer
    if (cleaned.startsWith('+47')) {
        const number = cleaned.substring(3);
        if (number.length === 8 && /^\d{8}$/.test(number)) {
            return { isValid: true, message: '' };
        }
        return { isValid: false, message: 'Norske nummer med +47 må ha 8 siffer' };
    }

    // Norske nummer uten landkode
    if (cleaned.length === 8 && /^\d{8}$/.test(cleaned) && !cleaned.startsWith('+')) {
        return { isValid: true, message: '' };
    }

    // Gamle norske nummer (7 siffer)
    if (cleaned.length === 7 && /^\d{7}$/.test(cleaned) && !cleaned.startsWith('+')) {
        return { isValid: true, message: '' };
    }

    // Utenlandske nummer (må starte med + og ha minst 7 siffer)
    if (cleaned.startsWith('+') && cleaned.length >= 8) {
        const number = cleaned.substring(1);
        if (/^\d{7,15}$/.test(number)) { // 7-15 siffer er rimelig for internasjonale nummer
            return { isValid: true, message: '' };
        }
    }

    return {
        isValid: false,
        message: 'Ugyldig telefonnummer. Bruk 8 siffer (norsk) eller +landkode + nummer'
    };
};

// Hjelpefunksjoner for Kundenummer WIMS
const validateKundenummerWims = (kundenummer) => {
    if (!kundenummer || kundenummer.trim() === '') return { isValid: true, message: '' }; // Tomt er OK

    const cleaned = kundenummer.replace(/\D/g, ''); // Fjern alt som ikke er tall

    if (cleaned.length === 5 && /^\d{5}$/.test(cleaned)) {
        return { isValid: true, message: '' };
    }

    return {
        isValid: false,
        message: 'Kundenummer WIMS må bestå av 5 siffer'
    };
};

const formatKundenummerWims = (kundenummer) => {
    if (!kundenummer) return '';
    // Fjern alt som ikke er tall og begrens til 5 siffer
    return kundenummer.replace(/\D/g, '').substring(0, 5);
};

const formatPhoneNumberForInput = (phoneNumber) => {
    if (!phoneNumber || phoneNumber === '') return '';

    const cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // Norske nummer med landkode (+47)
    if (cleaned.startsWith('+47')) {
        const number = cleaned.substring(3);
        if (number.length === 8) {
            return `+47 ${number.substring(0, 2)} ${number.substring(2, 4)} ${number.substring(4, 6)} ${number.substring(6, 8)}`;
        }
        return cleaned;
    }

    // Norske nummer uten landkode
    if (cleaned.length === 8 && !cleaned.startsWith('+')) {
        return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6, 8)}`;
    }

    // Gamle norske nummer (7 siffer)
    if (cleaned.length === 7 && !cleaned.startsWith('+')) {
        return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 5)} ${cleaned.substring(5, 7)}`;
    }

    // For utenlandske nummer, returner som det er
    return phoneNumber;
};

function NyttSelskapSide() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [orgnrInput, setOrgnrInput] = useState('');
    const [selskapData, setSelskapData] = useState(initialSelskapState);
    const [displayPhone, setDisplayPhone] = useState(''); // For formatert visning av telefon
    const [phoneValidation, setPhoneValidation] = useState({ isValid: true, message: '' });
    const [wimsValidation, setWimsValidation] = useState({ isValid: true, message: '' });
    const [isBrregLoading, setIsBrregLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [brregError, setBrregError] = useState(null);
    const [submitError, setSubmitError] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [brregDataFetched, setBrregDataFetched] = useState(false);

    useEffect(() => {
        const userDetails = authManager.getCurrentUserDetails();
        setCurrentUserId(userDetails ? userDetails.id : null);
    }, []);

    // Automatisk henting av Brreg-data når orgnr er komplett
    useEffect(() => {
        if (orgnrInput.length === 9 && !brregDataFetched && !isBrregLoading) {
            // Liten delay for å unngå for mange API-kall hvis bruker redigerer raskt
            const timer = setTimeout(() => {
                if (orgnrInput.length === 9) { // Dobbeltsjekk at det fortsatt er 9 siffer
                    fetchBrregData();
                }
            }, 500); // 500ms delay

            return () => clearTimeout(timer);
        }
    }, [orgnrInput, brregDataFetched, isBrregLoading]);

    const handleOrgnrChange = (e) => {
        setOrgnrInput(e.target.value.replace(/\D/g, '')); // Tillat kun tall
        setBrregDataFetched(false); // Nullstill hvis orgnr endres
        setSelskapData(prev => ({ ...initialSelskapState, organisasjonsnummer: e.target.value.replace(/\D/g, '') }));
        setDisplayPhone(''); // Nullstill telefon-visning
        setPhoneValidation({ isValid: true, message: '' }); // Nullstill validering
        setWimsValidation({ isValid: true, message: '' }); // Nullstill WIMS-validering
        setBrregError(null);
    };

    const fetchBrregData = async () => {
        if (orgnrInput.length !== 9) {
            setBrregError('Organisasjonsnummer må bestå av 9 siffer.');
            toast({ title: "Ugyldig inndata", description: 'Organisasjonsnummer må bestå av 9 siffer.', variant: "warning" });
            return;
        }
        setIsBrregLoading(true);
        setBrregError(null);
        setSelskapData(initialSelskapState); // Nullstill skjema før nytt søk
        setDisplayPhone(''); // Nullstill telefon-visning
        setPhoneValidation({ isValid: true, message: '' }); // Nullstill validering
        setWimsValidation({ isValid: true, message: '' }); // Nullstill WIMS-validering

        try {
            if (window.electron && window.electron.brreg && window.electron.brreg.getEnhetInfo) {
                const result = await window.electron.brreg.getEnhetInfo(orgnrInput);
                if (result.success && result.data) {
                    const brreg = result.data;
                    setSelskapData(prev => ({
                        ...prev, // Behold interne felter som kontaktperson etc.
                        organisasjonsnummer: brreg.organisasjonsnummer || '',
                        selskapsnavn: brreg.navn || '',
                        gateadresse: brreg.forretningsadresse?.adresse?.[0] || '',
                        postnummer: brreg.forretningsadresse?.postnummer || '',
                        poststed: brreg.forretningsadresse?.poststed || '',
                        organisasjonsformBeskrivelse: brreg.organisasjonsform?.beskrivelse || '',
                        forretningsKommune: brreg.forretningsadresse?.kommune || '',
                        forretningsKommunenummer: brreg.forretningsadresse?.kommunenummer || '',
                        stiftelsesdato: brreg.stiftelsesdato || '', // Behold som YYYY-MM-DD streng
                        antallAnsatte: brreg.antallAnsatte !== undefined ? String(brreg.antallAnsatte) : '',
                        naeringskode1Beskrivelse: brreg.naeringskode1?.beskrivelse || '',
                        hjemmeside: brreg.hjemmeside || '',
                    }));
                    setBrregDataFetched(true);
                    toast({ title: "Suksess", description: `Data hentet for ${brreg.navn}.` });
                } else if (result.success && result.data === null) {
                    setBrregError(`Ingen enhet funnet i Brønnøysundregistrene for orgnr: ${orgnrInput}.`);
                    toast({ title: "Ingen treff", description: result.message, variant: "info" });
                    setSelskapData(prev => ({ ...initialSelskapState, organisasjonsnummer: orgnrInput })); // Behold orgnr
                } else {
                    throw new Error(result.error || 'Ukjent feil ved henting fra Brreg.');
                }
            } else {
                throw new Error('API for Brreg-oppslag er ikke tilgjengelig.');
            }
        } catch (err) {
            console.error("Feil ved henting fra Brreg:", err);
            setBrregError(err.message);
            toast({ title: "Feil ved Brreg-oppslag", description: err.message, variant: "destructive" });
        } finally {
            setIsBrregLoading(false);
        }
    };

    const handleSelskapDataChange = (e) => {
        const { name, value } = e.target;
        if (name === 'kontaktpersonTelefon') {
            // Spesiell håndtering for telefon-feltet
            const cleanedPhone = value.replace(/[^\d+]/g, ''); // Lagrer ren versjon
            setSelskapData(prev => ({ ...prev, [name]: cleanedPhone }));

            // Valider telefonnummer
            const validation = validatePhoneNumber(value);
            setPhoneValidation(validation);

            // Formater for visning
            setDisplayPhone(formatPhoneNumberForInput(value));
        } else if (name === 'kundenummerWims') {
            // Spesiell håndtering for kundenummer WIMS
            const formattedWims = formatKundenummerWims(value);
            setSelskapData(prev => ({ ...prev, [name]: formattedWims }));

            // Valider kundenummer
            const validation = validateKundenummerWims(formattedWims);
            setWimsValidation(validation);
        } else {
            setSelskapData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!brregDataFetched && !window.confirm("Data er ikke hentet fra Brreg, eller orgnr er endret. Vil du fortsette å opprette selskapet med manuelt inntastede data?")) {
            return;
        }

        // Valider telefonnummer før andre valideringer
        if (!phoneValidation.isValid) {
            toast({ title: "Valideringsfeil", description: phoneValidation.message, variant: "warning" });
            return;
        }

        // Valider kundenummer WIMS
        if (!wimsValidation.isValid) {
            toast({ title: "Valideringsfeil", description: wimsValidation.message, variant: "warning" });
            return;
        }

        if (!selskapData.organisasjonsnummer || selskapData.organisasjonsnummer.length !== 9) {
            toast({ title: "Valideringsfeil", description: "Organisasjonsnummer må være 9 siffer.", variant: "warning" });
            return;
        }
        if (!selskapData.selskapsnavn) {
            toast({ title: "Valideringsfeil", description: "Selskapsnavn er påkrevd.", variant: "warning" });
            return;
        }
        if (!currentUserId) {
            toast({ title: "Feil", description: "Bruker ikke identifisert. Prøv å last siden på nytt.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        // Forbered data for innsending (fjern tomme strenger for valgfrie felter, konverter tall)
        const dataForApi = { ...selskapData };
        if (dataForApi.antallAnsatte === '' || dataForApi.antallAnsatte === null) {
            delete dataForApi.antallAnsatte;
        } else {
            dataForApi.antallAnsatte = parseInt(dataForApi.antallAnsatte, 10);
            if (isNaN(dataForApi.antallAnsatte)) delete dataForApi.antallAnsatte;
        }
        if (dataForApi.stiftelsesdato === '' || dataForApi.stiftelsesdato === null) {
            delete dataForApi.stiftelsesdato;
        } // Beholdes som streng, Prisma håndterer konvertering til DateTime hvis formatet er riktig (YYYY-MM-DD)

        Object.keys(dataForApi).forEach(key => {
            if (dataForApi[key] === '') dataForApi[key] = null; // Send null for tomme strenger hvis backend forventer det
        });

        try {
            if (window.electron && window.electron.garanti && window.electron.garanti.createSelskap) {
                const result = await window.electron.garanti.createSelskap({
                    selskapData: dataForApi,
                    opprettetAvBrukerId_UserV2: currentUserId
                });
                if (result.success && result.data) {
                    toast({ title: "Suksess!", description: `Selskap "${result.data.selskapsnavn}" er opprettet.` });
                    navigate(`/garanti/selskap/${result.data.id}`); // Naviger til det nye selskapets detaljside
                } else {
                    throw new Error(result.error || 'Ukjent feil ved opprettelse av selskap.');
                }
            } else {
                throw new Error('API for å opprette selskap er ikke tilgjengelig.');
            }
        } catch (err) {
            console.error("Feil ved opprettelse av selskap:", err);
            setSubmitError(err.message);
            toast({ title: "Feil ved opprettelse", description: err.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Enkel funksjon for å rendre et input-felt
    const renderInputField = (id, label, value, onChange, props = {}) => (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} name={id} value={value || ''} onChange={onChange} {...props} />
        </div>
    );

    // Spesiell render for telefonnummer med validering
    const renderPhoneField = () => (
        <div className="space-y-1.5">
            <Label htmlFor="kontaktpersonTelefon">Kontaktperson Telefon</Label>
            <Input
                id="kontaktpersonTelefon"
                name="kontaktpersonTelefon"
                value={displayPhone || ''}
                onChange={handleSelskapDataChange}
                placeholder="Eks: 12 34 56 78 eller +47 12 34 56 78"
            />
            {!phoneValidation.isValid && (
                <p className="text-xs text-destructive mt-1">{phoneValidation.message}</p>
            )}
        </div>
    );

    // Spesiell render for kundenummer WIMS med validering
    const renderWimsField = () => (
        <div className="space-y-1.5">
            <Label htmlFor="kundenummerWims">Kundenummer WIMS</Label>
            <Input
                id="kundenummerWims"
                name="kundenummerWims"
                value={selskapData.kundenummerWims || ''}
                onChange={handleSelskapDataChange}
                placeholder="5 siffer"
                maxLength="5"
            />
            {!wimsValidation.isValid && (
                <p className="text-xs text-destructive mt-1">{wimsValidation.message}</p>
            )}
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={() => navigate('/garanti/selskaper')} className="h-9 w-9">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Tilbake til oversikt</span>
                </Button>
                <h1 className="text-2xl font-semibold text-foreground flex-grow text-center">Registrer Nytt Selskap</h1>
                <div className="w-9"></div> {/* Spacer for balanse */}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Søk i Brønnøysundregistrene</CardTitle>
                    <CardDescription>
                        Skriv inn organisasjonsnummer - data hentes automatisk når du har skrevet 9 siffer.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-3 mb-4">
                        <div className="flex-grow space-y-1.5">
                            <Label htmlFor="orgnrInput">Organisasjonsnummer (9 siffer)</Label>
                            <div className="relative">
                                <Input
                                    id="orgnrInput"
                                    value={orgnrInput}
                                    onChange={handleOrgnrChange}
                                    maxLength={9}
                                    placeholder="F.eks. 987654321"
                                />
                                {isBrregLoading && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                            {orgnrInput.length === 9 && !brregDataFetched && !isBrregLoading && (
                                <p className="text-xs text-muted-foreground">Henter data automatisk...</p>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            onClick={fetchBrregData}
                            disabled={isBrregLoading || orgnrInput.length !== 9}
                            className="text-xs"
                        >
                            {isBrregLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
                            Hent på nytt
                        </Button>
                    </div>
                    {brregError && (
                        <Alert variant="destructive" className="mb-4">
                            <InfoIcon className="h-4 w-4" />
                            <AlertTitle>Feil ved Brreg-oppslag</AlertTitle>
                            <AlertDescription>{brregError}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {brregDataFetched && (
                <>
                    {/* Brønnøysund-data visning (read-only) */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        {selskapData.selskapsnavn}
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-2 mt-1">
                                        <Hash className="h-3 w-3" />
                                        Org.nr: {selskapData.organisasjonsnummer}
                                        {selskapData.organisasjonsformBeskrivelse && (
                                            <span className="ml-2 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs">
                                                {selskapData.organisasjonsformBeskrivelse}
                                            </span>
                                        )}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Venstre kolonne */}
                                <div className="space-y-1">
                                    <DetailField
                                        label="Adresse"
                                        value={selskapData.gateadresse ? `${selskapData.gateadresse}, ${selskapData.postnummer || ''} ${selskapData.poststed || ''}`.trim() : null}
                                        icon={MapPin}
                                    />
                                    <DetailField
                                        label="Kommune"
                                        value={selskapData.forretningsKommune}
                                        icon={Building}
                                    />
                                    {selskapData.hjemmeside && (
                                        <DetailField
                                            label="Hjemmeside"
                                            value={selskapData.hjemmeside}
                                            icon={Globe}
                                        />
                                    )}
                                </div>

                                {/* Høyre kolonne */}
                                <div className="space-y-1">
                                    {selskapData.stiftelsesdato && (
                                        <DetailField
                                            label="Stiftelsesdato"
                                            value={(() => {
                                                const yearsInOperation = calculateYearsInOperation(selskapData.stiftelsesdato);
                                                const dateStr = formatDate(selskapData.stiftelsesdato);
                                                return yearsInOperation !== null
                                                    ? `${dateStr} (${yearsInOperation} år i drift)`
                                                    : dateStr;
                                            })()}
                                            icon={Calendar}
                                        />
                                    )}
                                    {selskapData.antallAnsatte && (
                                        <DetailField
                                            label="Antall ansatte"
                                            value={selskapData.antallAnsatte.toString()}
                                            icon={Users}
                                        />
                                    )}
                                    {selskapData.naeringskode1Beskrivelse && (
                                        <DetailField
                                            label="Bransje"
                                            value={selskapData.naeringskode1Beskrivelse}
                                            icon={Factory}
                                        />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Interne felter form */}
                    <form onSubmit={handleSubmit}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Interne opplysninger</CardTitle>
                                <CardDescription>Fyll ut BMFs interne opplysninger for selskapet.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renderInputField("kontaktpersonNavn", "Kontaktperson Navn", selskapData.kontaktpersonNavn, handleSelskapDataChange)}
                                    {renderPhoneField()}
                                    {renderWimsField()}
                                    {renderInputField("ramme", "Ramme", selskapData.ramme, handleSelskapDataChange)}
                                </div>

                                {submitError && (
                                    <Alert variant="destructive" className="mt-4">
                                        <InfoIcon className="h-4 w-4" />
                                        <AlertTitle>Feil ved opprettelse</AlertTitle>
                                        <AlertDescription>{submitError}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="flex justify-end mt-6">
                                    <Button type="submit" disabled={isSubmitting || !phoneValidation.isValid || !wimsValidation.isValid}>
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Opprett Selskap
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </>
            )}
        </div>
    );
}

export default NyttSelskapSide; 