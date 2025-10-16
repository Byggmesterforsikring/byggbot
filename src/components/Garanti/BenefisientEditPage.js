import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Checkbox } from "~/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { ArrowLeft, User, Building, Building2, Save, AlertTriangle, FileText, Home, MapPin, Contact, UserCheck, Loader2 } from 'lucide-react';
import { useToast } from "~/hooks/use-toast";
import { Skeleton } from "~/components/ui/skeleton";

const BENEFISIENT_TYPER = [
    { value: 'Fysisk', label: 'Person', icon: User },
    { value: 'Juridisk', label: 'Selskap', icon: Building }
];

// Tab-struktur
const TAB_STRUKTUR = [
    { key: 'grunninfo', label: 'Grunninfo', icon: FileText },
    { key: 'adresse', label: 'Adresse', icon: Home },
    { key: 'matrikkel', label: 'Matrikkel', icon: MapPin },
    { key: 'kontakt', label: 'Kontakt', icon: Contact },
    { key: 'eierandel', label: 'Eierandel', icon: UserCheck },
];

function BenefisientEditPage() {
    const { tilbudId, benefisientId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();

    const isNew = !benefisientId;
    const returnUrl = searchParams.get('returnUrl') || `/garanti/tilbud/${tilbudId}`;
    const enhetIdFromUrl = searchParams.get('enhetId');
    const enhetNummerFromUrl = searchParams.get('enhetNummer');

    const [activeTab, setActiveTab] = useState('grunninfo');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [personnummerInfo, setPersonnummerInfo] = useState(null);
    const [tilbud, setTilbud] = useState(null);
    const [enheter, setEnheter] = useState([]);
    const [originalFormData, setOriginalFormData] = useState(null);
    const [showOwnershipChangeDialog, setShowOwnershipChangeDialog] = useState(false);

    const [formData, setFormData] = useState({
        // Grunnleggende informasjon
        type: 'Fysisk',
        navn: '',
        organisasjonsnummer: '',
        personident: '',
        kjonn: null,
        fodselsdato: null,

        // Adresse
        boenhet: '',
        adresse: '',
        postnummer: '',
        poststed: '',

        // Matrikkel
        gardsnummer: '',
        bruksnummer: '',
        festenummer: '',
        seksjonsnummer: '',

        // Kontakt
        epost: '',
        telefon: '',
        mobiltelefon: '',
        kontaktinformasjon: '',

        // Eierandel og status
        aktiv: true,
        aktivFra: new Date().toISOString().split('T')[0],
        aktivTil: '',
        kommentar: '',
        andel: '',
        enhetId: null
    });

    // Sjekk om det er multi-enhet prosjekt
    const harEnheter = tilbud?.prosjekttype &&
        tilbud.prosjekttype !== 'Enebolig' &&
        tilbud.prosjekttype !== 'Infrastruktur';

    // Hent tilbud og enheter
    const fetchTilbudOgEnheter = async () => {
        try {
            const tilbudResult = await window.electron.tilbud.getTilbudById(tilbudId);

            if (tilbudResult.success) {
                setTilbud(tilbudResult.data);

                // Hent enheter hvis relevant
                if (tilbudResult.data.prosjekttype &&
                    tilbudResult.data.prosjekttype !== 'Enebolig' &&
                    tilbudResult.data.prosjekttype !== 'Infrastruktur') {

                    const enheterResult = await window.electron.tilbud.getEnheter(tilbudId);
                    if (enheterResult.success) {
                        setEnheter(enheterResult.data || []);
                    }
                }
            } else {
                throw new Error(tilbudResult.error || 'Kunne ikke hente tilbud');
            }
        } catch (error) {
            console.error('Feil ved henting av tilbud:', error);
            toast({
                title: "Feil ved lasting",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    // Hent data ved oppstart
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            await fetchTilbudOgEnheter();
            if (!isNew && benefisientId) {
                await fetchBenefisient();
            } else if (isNew && enhetIdFromUrl) {
                // Sett enhetId i formData for nye benefisienter som kommer fra en spesifikk enhet
                setFormData(prev => ({ ...prev, enhetId: enhetIdFromUrl }));
            }
            setIsLoading(false);
        };
        fetchData();
    }, [tilbudId, benefisientId, isNew, enhetIdFromUrl]);

    const fetchBenefisient = async () => {
        try {
            const result = await window.electron.tilbud.getBenefisienter(tilbudId);

            if (result?.success && Array.isArray(result.data)) {
                const benefisient = result.data.find(b => {
                    return b.id === benefisientId || b.id === parseInt(benefisientId) || b.id.toString() === benefisientId;
                });

                if (!benefisient) {
                    throw new Error('Benefisient ikke funnet');
                }

                const loadedData = {
                    type: benefisient.type,
                    navn: benefisient.navn,
                    organisasjonsnummer: benefisient.organisasjonsnummer || '',
                    personident: benefisient.personident || '',
                    kjonn: benefisient.kjonn || null,
                    fodselsdato: benefisient.fodselsdato ? new Date(benefisient.fodselsdato) : null,
                    boenhet: benefisient.boenhet || '',
                    adresse: benefisient.adresse || '',
                    postnummer: benefisient.postnummer || '',
                    poststed: benefisient.poststed || '',
                    gardsnummer: benefisient.gardsnummer || '',
                    bruksnummer: benefisient.bruksnummer || '',
                    festenummer: benefisient.festenummer || '',
                    seksjonsnummer: benefisient.seksjonsnummer || '',
                    epost: benefisient.epost || '',
                    telefon: benefisient.telefon || '',
                    mobiltelefon: benefisient.mobiltelefon || '',
                    kontaktinformasjon: benefisient.kontaktinformasjon || '',
                    aktiv: benefisient.aktiv !== undefined ? benefisient.aktiv : true,
                    aktivFra: benefisient.aktivFra ? new Date(benefisient.aktivFra).toISOString().split('T')[0] : '',
                    aktivTil: benefisient.aktivTil ? new Date(benefisient.aktivTil).toISOString().split('T')[0] : '',
                    kommentar: benefisient.kommentar || '',
                    andel: benefisient.andel ? benefisient.andel.toString() : '',
                    enhetId: benefisient.enhetId || null
                };

                setFormData(loadedData);
                setOriginalFormData(loadedData);

                if (benefisient.type === 'Fysisk' && benefisient.personident) {
                    const validationResult = validateNorwegianPersonNumber(benefisient.personident);
                    if (validationResult.valid) {
                        setPersonnummerInfo(validationResult);
                    }
                }
            } else {
                throw new Error(result?.error || 'Kunne ikke hente benefisienter');
            }
        } catch (error) {
            console.error('Feil ved henting av benefisient:', error);
            toast({
                title: "Feil ved lasting",
                description: error.message,
                variant: "destructive"
            });
            navigate(returnUrl);
        }
    };

    // Norsk fødselsnummer/D-nummer validering
    const validateNorwegianPersonNumber = (personnr) => {
        if (!personnr) return { valid: true };

        if (personnr.length !== 11) {
            return { valid: false, error: `Må være 11 siffer (${personnr.length}/11)` };
        }

        if (!/^\d{11}$/.test(personnr)) {
            return { valid: false, error: 'Kan kun inneholde tall' };
        }

        let dag = parseInt(personnr.substring(0, 2));
        const maaned = parseInt(personnr.substring(2, 4));
        const aar = parseInt(personnr.substring(4, 6));
        const individnr = parseInt(personnr.substring(6, 9));
        const kontroll1 = parseInt(personnr.substring(9, 10));
        const kontroll2 = parseInt(personnr.substring(10, 11));

        const isDnummer = dag >= 41 && dag <= 71;
        if (isDnummer) {
            dag = dag - 40;
        }

        if (maaned < 1 || maaned > 12) {
            return { valid: false, error: 'Ugyldig måned' };
        }

        if (dag < 1 || dag > 31) {
            return { valid: false, error: 'Ugyldig dag' };
        }

        const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (dag > daysInMonth[maaned - 1]) {
            return { valid: false, error: 'Ugyldig dato' };
        }

        const weights1 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
        const weights2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

        let sum1 = 0;
        for (let i = 0; i < 9; i++) {
            sum1 += parseInt(personnr[i]) * weights1[i];
        }
        const calc1 = 11 - (sum1 % 11);
        const kontrollsiffer1 = calc1 === 11 ? 0 : calc1;

        if (kontrollsiffer1 !== kontroll1) {
            return { valid: false, error: 'Ugyldig kontrollsiffer' };
        }

        let sum2 = 0;
        for (let i = 0; i < 10; i++) {
            sum2 += parseInt(personnr[i]) * weights2[i];
        }
        const calc2 = 11 - (sum2 % 11);
        const kontrollsiffer2 = calc2 === 11 ? 0 : calc2;

        if (kontrollsiffer2 !== kontroll2) {
            return { valid: false, error: 'Ugyldig kontrollsiffer' };
        }

        const kjonn = individnr % 2 === 0 ? 'Kvinne' : 'Mann';

        let fullYear;
        if (individnr >= 0 && individnr <= 499) {
            fullYear = 1900 + aar;
        } else if (individnr >= 500 && individnr <= 999) {
            if (aar >= 0 && aar <= 39) {
                fullYear = 2000 + aar;
            } else {
                fullYear = 1900 + aar;
            }
        }

        const fodselsdato = new Date(fullYear, maaned - 1, dag);

        return {
            valid: true,
            isDnummer,
            kjonn,
            fodselsdato,
            info: `${isDnummer ? 'D-nummer' : 'Fødselsnummer'} - ${kjonn} - ${fodselsdato.toLocaleDateString('no-NO')}`
        };
    };

    const validateOrgnr = (orgnr) => {
        if (!orgnr) return true;
        return /^\d{9}$/.test(orgnr);
    };

    const validateEmail = (email) => {
        if (!email) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone) => {
        if (!phone) return true;
        const phoneRegex = /^(\+47\s?)?[0-9\s]{8,}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    };

    const formatNumericInput = (value, maxLength) => {
        return value.replace(/\D/g, '').slice(0, maxLength);
    };

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
                if (formData.type === 'Juridisk' && value && !validateOrgnr(value)) {
                    newErrors[name] = value.length < 9 ?
                        `Organisasjonsnummer må være 9 siffer (${value.length}/9)` :
                        'Organisasjonsnummer må være 9 siffer';
                } else {
                    delete newErrors[name];
                }
                break;
            case 'personident':
                if (formData.type === 'Fysisk' && value) {
                    const validationResult = validateNorwegianPersonNumber(value);
                    if (!validationResult.valid) {
                        newErrors[name] = validationResult.error;
                        setPersonnummerInfo(null);
                    } else {
                        delete newErrors[name];
                        if (validationResult.kjonn && validationResult.fodselsdato) {
                            setPersonnummerInfo(validationResult);
                            setFormData(prev => ({
                                ...prev,
                                kjonn: validationResult.kjonn,
                                fodselsdato: validationResult.fodselsdato
                            }));
                        }
                    }
                } else {
                    delete newErrors[name];
                    setPersonnummerInfo(null);
                    if (formData.type === 'Fysisk') {
                        setFormData(prev => ({
                            ...prev,
                            kjonn: null,
                            fodselsdato: null
                        }));
                    }
                }
                break;
            case 'andel':
                if (value && (isNaN(value) || parseFloat(value) < 0 || parseFloat(value) > 100)) {
                    newErrors[name] = 'Andel må være mellom 0 og 100%';
                } else {
                    delete newErrors[name];
                }
                break;
            case 'epost':
                if (value && !validateEmail(value)) {
                    newErrors[name] = 'Ugyldig e-postadresse';
                } else {
                    delete newErrors[name];
                }
                break;
            case 'telefon':
            case 'mobiltelefon':
                if (value && !validatePhone(value)) {
                    newErrors[name] = 'Ugyldig telefonnummer (8+ siffer)';
                } else {
                    delete newErrors[name];
                }
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFieldChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        validateField(name, value);
    };

    // Sjekk om kritiske felter er endret (indikerer eierskifte)
    const hasOwnershipChanged = () => {
        if (!originalFormData || isNew) return false;

        const criticalFields = ['navn', 'personident', 'organisasjonsnummer'];

        return criticalFields.some(field => {
            const original = originalFormData[field];
            const current = formData[field];

            // Sammenlign verdier (håndter null/undefined)
            return (original || '') !== (current || '');
        });
    };

    const handleSave = async (forceUpdate = false) => {
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

        // Sjekk at enhet er valgt hvis det er påkrevd
        if (harEnheter && enheter.length > 0 && !formData.enhetId) {
            toast({
                title: "Mangler enhet",
                description: "Du må velge hvilken enhet benefisienten tilhører",
                variant: "destructive"
            });
            return;
        }

        // Sjekk om kritiske felter er endret (mulig eierskifte)
        if (!forceUpdate && hasOwnershipChanged()) {
            setShowOwnershipChangeDialog(true);
            return;
        }

        setIsSaving(true);
        try {
            let result;
            const benefisientData = {
                type: formData.type,
                navn: formData.navn.trim(),
                organisasjonsnummer: formData.organisasjonsnummer || null,
                personident: formData.personident || null,
                kjonn: formData.type === 'Fysisk' ? formData.kjonn : null,
                fodselsdato: formData.type === 'Fysisk' ? formData.fodselsdato : null,
                boenhet: formData.boenhet || null,
                adresse: formData.adresse || null,
                postnummer: formData.postnummer || null,
                poststed: formData.poststed || null,
                gardsnummer: formData.gardsnummer || null,
                bruksnummer: formData.bruksnummer || null,
                festenummer: formData.festenummer || null,
                seksjonsnummer: formData.seksjonsnummer || null,
                epost: formData.epost || null,
                telefon: formData.telefon || null,
                mobiltelefon: formData.mobiltelefon || null,
                kontaktinformasjon: formData.kontaktinformasjon || null,
                aktiv: formData.aktiv,
                aktivFra: formData.aktivFra ? new Date(formData.aktivFra) : null,
                aktivTil: formData.aktivTil ? new Date(formData.aktivTil) : null,
                kommentar: formData.kommentar || null,
                andel: formData.andel ? parseFloat(formData.andel) : null,
                enhetId: formData.enhetId || null
            };

            if (isNew) {
                // Legg til tilbudId kun for nye benefisienter
                const dataForCreate = {
                    ...benefisientData,
                    tilbudId: tilbudId
                };

                result = await window.electron.tilbud.createBenefisient({
                    tilbudId: tilbudId,
                    benefisientData: dataForCreate
                });
            } else {
                result = await window.electron.tilbud.updateBenefisient({
                    benefisientId: benefisientId,
                    dataToUpdate: benefisientData
                });
            }

            if (result.success) {
                toast({
                    title: isNew ? "Benefisient opprettet" : "Benefisient oppdatert",
                    description: `${formData.navn} ble ${isNew ? 'lagt til' : 'oppdatert'}`
                });
                // Legg til refresh-parameter når vi navigerer tilbake
                const returnUrlWithRefresh = returnUrl.includes('?')
                    ? `${returnUrl}&refresh=true`
                    : `${returnUrl}?refresh=true`;
                navigate(returnUrlWithRefresh);
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

    // Håndter eierskifte - opprett ny benefisient og deaktiver gammel
    const handleOwnershipChange = async () => {
        setShowOwnershipChangeDialog(false);
        setIsSaving(true);

        try {
            // Først deaktiver den gamle benefisienten
            const deactivateResult = await window.electron.tilbud.updateBenefisient({
                benefisientId: benefisientId,
                dataToUpdate: {
                    aktiv: false,
                    aktivTil: new Date(),
                    kommentar: `Eierskifte - overført til ${formData.navn}`
                }
            });

            if (!deactivateResult.success) {
                throw new Error('Kunne ikke deaktivere eksisterende benefisient');
            }

            // Deretter opprett ny benefisient med de nye dataene
            const benefisientData = {
                tilbudId: tilbudId,
                type: formData.type,
                navn: formData.navn.trim(),
                organisasjonsnummer: formData.organisasjonsnummer || null,
                personident: formData.personident || null,
                kjonn: formData.type === 'Fysisk' ? formData.kjonn : null,
                fodselsdato: formData.type === 'Fysisk' ? formData.fodselsdato : null,
                boenhet: formData.boenhet || null,
                adresse: formData.adresse || null,
                postnummer: formData.postnummer || null,
                poststed: formData.poststed || null,
                gardsnummer: formData.gardsnummer || null,
                bruksnummer: formData.bruksnummer || null,
                festenummer: formData.festenummer || null,
                seksjonsnummer: formData.seksjonsnummer || null,
                epost: formData.epost || null,
                telefon: formData.telefon || null,
                mobiltelefon: formData.mobiltelefon || null,
                kontaktinformasjon: formData.kontaktinformasjon || null,
                aktiv: true,
                aktivFra: new Date(),
                aktivTil: null,
                kommentar: `Eierskifte - overtatt fra ${originalFormData?.navn || 'tidligere eier'}`,
                andel: formData.andel ? parseFloat(formData.andel) : null,
                enhetId: formData.enhetId || null
            };

            const createResult = await window.electron.tilbud.createBenefisient({
                tilbudId: tilbudId,
                benefisientData: benefisientData
            });

            if (createResult.success) {
                toast({
                    title: "Eierskifte registrert",
                    description: `Ny benefisient opprettet og gammel deaktivert`
                });
                // Legg til refresh-parameter når vi navigerer tilbake
                const returnUrlWithRefresh = returnUrl.includes('?')
                    ? `${returnUrl}&refresh=true`
                    : `${returnUrl}?refresh=true`;
                navigate(returnUrlWithRefresh);
            } else {
                throw new Error(createResult.error || 'Kunne ikke opprette ny benefisient');
            }
        } catch (error) {
            console.error('Feil ved håndtering av eierskifte:', error);
            toast({
                title: "Feil ved eierskifte",
                description: error.message,
                variant: "destructive"
            });
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <Button variant="outline" size="icon" className="h-9 w-9">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className='flex-grow'>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96 mt-2" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-1/4" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate(returnUrl)}
                    className="h-9 w-9 flex-shrink-0"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Tilbake</span>
                </Button>
                <div className='flex-grow'>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {isNew ? 'Ny benefisient' : 'Rediger benefisient'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {isNew
                            ? enhetNummerFromUrl
                                ? `Opprett ny benefisient for ${enhetNummerFromUrl}`
                                : 'Opprett ny benefisient for tilbudet'
                            : formData.navn
                                ? `Rediger ${formData.navn}`
                                : 'Rediger benefisient'}
                    </p>
                </div>
                <Button
                    onClick={() => handleSave()}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                >
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    {isSaving ? 'Lagrer...' : 'Lagre'}
                </Button>
            </div>

            {/* Tab-basert layout */}
            <Card>
                <CardContent className="p-0">
                    <Tabs
                        value={activeTab}
                        onValueChange={(newValue) => {
                            if (typeof newValue === 'string') {
                                setActiveTab(newValue);
                            }
                        }}
                        className="w-full"
                        onSelect={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                        }}
                        onSelectCapture={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                        }}
                    >
                        <TabsList className="w-full justify-start h-auto p-1 bg-muted/10 border-b">
                            {TAB_STRUKTUR.map((tab) => (
                                <TabsTrigger
                                    key={`tab-trigger-${tab.key}`}
                                    value={tab.key}
                                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm flex items-center gap-2 px-3 py-2"
                                >
                                    <tab.icon className="h-4 w-4" />
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {/* Tab: Grunninfo */}
                        <TabsContent key="grunninfo-tab" value="grunninfo" className="p-6 space-y-6">
                            <div
                                className="space-y-4"
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                onSelect={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                onSelectCapture={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                            >
                                <h3 className="text-lg font-medium">Grunnleggende informasjon</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Type */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="type">Type *</Label>
                                        <Select
                                            value={formData.type}
                                            onValueChange={(value) => handleFieldChange('type', value)}
                                            disabled={!isNew}
                                        >
                                            <SelectTrigger id="type">
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
                                    <div className="space-y-1.5">
                                        <Label htmlFor="navn">Navn *</Label>
                                        <Input
                                            id="navn"
                                            value={formData.navn}
                                            onChange={(e) => handleFieldChange('navn', e.target.value)}
                                            placeholder={formData.type === 'Fysisk' ? 'Navn på person' : 'Navn på selskap'}
                                            className={errors.navn ? 'border-destructive' : ''}
                                        />
                                        {errors.navn && (
                                            <p className="text-sm text-destructive">{errors.navn}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Enhet (hvis relevant) */}
                                {harEnheter && enheter.length > 0 && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="enhet">Enhet *</Label>
                                        {enhetIdFromUrl ? (
                                            // Vis som read-only når vi kommer fra en spesifikk enhet
                                            <div className="p-3 bg-muted rounded-md border">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">
                                                            {enhetNummerFromUrl || enheter.find(e => e.id === formData.enhetId)?.midlertidigNummer}
                                                        </span>
                                                        {enheter.find(e => e.id === formData.enhetId)?.enhetsnummer && (
                                                            <span className="text-muted-foreground">
                                                                ({enheter.find(e => e.id === formData.enhetId)?.enhetsnummer})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">
                                                        {enheter.find(e => e.id === formData.enhetId)?.andelAvHelhet}% av prosjekt
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            // Vis dropdown når vi ikke har forhåndsvalgt enhet
                                            <>
                                                <Select
                                                    value={formData.enhetId || ''}
                                                    onValueChange={(value) => handleFieldChange('enhetId', value)}
                                                >
                                                    <SelectTrigger id="enhet">
                                                        <SelectValue placeholder="Velg enhet" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {enheter.map((enhet) => (
                                                            <SelectItem key={enhet.id} value={enhet.id}>
                                                                <div className="flex items-center justify-between w-full">
                                                                    <span>{enhet.midlertidigNummer}</span>
                                                                    {enhet.enhetsnummer && (
                                                                        <span className="text-muted-foreground ml-2">
                                                                            ({enhet.enhetsnummer})
                                                                        </span>
                                                                    )}
                                                                    <span className="text-muted-foreground ml-4">
                                                                        {enhet.andelAvHelhet}% av prosjekt
                                                                    </span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {!formData.enhetId && (
                                                    <p className="text-sm text-amber-600">
                                                        Du må velge hvilken enhet benefisienten tilhører
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Identifikator */}
                                <div className="space-y-1.5">
                                    {formData.type === 'Juridisk' ? (
                                        <>
                                            <Label htmlFor="organisasjonsnummer">Organisasjonsnummer (9 siffer) *</Label>
                                            <Input
                                                id="organisasjonsnummer"
                                                value={formData.organisasjonsnummer}
                                                onChange={(e) => {
                                                    const formatted = formatNumericInput(e.target.value, 9);
                                                    handleFieldChange('organisasjonsnummer', formatted);
                                                }}
                                                placeholder="123456789"
                                                maxLength={9}
                                                className={errors.organisasjonsnummer ? 'border-destructive' : ''}
                                            />
                                            {errors.organisasjonsnummer && (
                                                <p className="text-sm text-destructive">{errors.organisasjonsnummer}</p>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Label htmlFor="personident">Fødsels-/personnummer (11 siffer) *</Label>
                                            <Input
                                                id="personident"
                                                value={formData.personident}
                                                onChange={(e) => {
                                                    const formatted = formatNumericInput(e.target.value, 11);
                                                    handleFieldChange('personident', formatted);
                                                }}
                                                placeholder="12345678901"
                                                maxLength={11}
                                                className={errors.personident ? 'border-destructive' : ''}
                                            />
                                            {errors.personident && (
                                                <p className="text-sm text-destructive">{errors.personident}</p>
                                            )}
                                            {personnummerInfo && personnummerInfo.valid && (
                                                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                                                    <p className="text-green-800 font-medium text-sm">
                                                        ✓ Gyldig {personnummerInfo.isDnummer ? 'D-nummer' : 'fødselsnummer'}
                                                    </p>
                                                    <p className="text-green-700 text-sm">
                                                        Kjønn: {personnummerInfo.kjonn} |
                                                        Fødselsdato: {personnummerInfo.fodselsdato?.toLocaleDateString('no-NO')}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab: Adresse */}
                        <TabsContent key="adresse-tab" value="adresse" className="p-6 space-y-6">
                            <div
                                className="space-y-4"
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                onSelect={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                onSelectCapture={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                            >
                                <h3 className="text-lg font-medium">Adresseinformasjon</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="boenhet">Boenhet</Label>
                                        <Input
                                            id="boenhet"
                                            value={formData.boenhet}
                                            onChange={(e) => handleFieldChange('boenhet', e.target.value)}
                                            placeholder="Leilighet 101, Blokk A..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="adresse">Adresse</Label>
                                        <Input
                                            id="adresse"
                                            value={formData.adresse}
                                            onChange={(e) => handleFieldChange('adresse', e.target.value)}
                                            placeholder="Storgata 15"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="postnummer">Postnummer</Label>
                                        <Input
                                            id="postnummer"
                                            value={formData.postnummer}
                                            onChange={(e) => {
                                                const formatted = formatNumericInput(e.target.value, 4);
                                                handleFieldChange('postnummer', formatted);
                                            }}
                                            placeholder="0150"
                                            maxLength={4}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="poststed">Poststed</Label>
                                        <Input
                                            id="poststed"
                                            value={formData.poststed}
                                            onChange={(e) => handleFieldChange('poststed', e.target.value)}
                                            placeholder="Oslo"
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab: Matrikkel */}
                        <TabsContent key="matrikkel-tab" value="matrikkel" className="p-6 space-y-6">
                            <div
                                className="space-y-4"
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                onSelect={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                onSelectCapture={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                            >
                                <h3 className="text-lg font-medium">Matrikkelinformasjon</h3>
                                <p className="text-sm text-muted-foreground">Eiendomsinformasjon fra kartverket</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="gardsnummer">Gårdsnummer</Label>
                                        <Input
                                            id="gardsnummer"
                                            value={formData.gardsnummer}
                                            onChange={(e) => handleFieldChange('gardsnummer', e.target.value)}
                                            placeholder="123"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="bruksnummer">Bruksnummer</Label>
                                        <Input
                                            id="bruksnummer"
                                            value={formData.bruksnummer}
                                            onChange={(e) => handleFieldChange('bruksnummer', e.target.value)}
                                            placeholder="456"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="festenummer">Festenummer (valgfritt)</Label>
                                        <Input
                                            id="festenummer"
                                            value={formData.festenummer}
                                            onChange={(e) => handleFieldChange('festenummer', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="seksjonsnummer">Seksjonsnummer (valgfritt)</Label>
                                        <Input
                                            id="seksjonsnummer"
                                            value={formData.seksjonsnummer}
                                            onChange={(e) => handleFieldChange('seksjonsnummer', e.target.value)}
                                            placeholder="101"
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab: Kontakt */}
                        <TabsContent key="kontakt-tab" value="kontakt" className="p-6 space-y-6">
                            <div
                                className="space-y-4"
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                onSelect={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                onSelectCapture={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                            >
                                <h3 className="text-lg font-medium">Kontaktinformasjon</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="epost">E-post</Label>
                                        <Input
                                            id="epost"
                                            type="email"
                                            value={formData.epost}
                                            onChange={(e) => handleFieldChange('epost', e.target.value)}
                                            placeholder="navn@example.com"
                                            className={errors.epost ? 'border-destructive' : ''}
                                        />
                                        {errors.epost && (
                                            <p className="text-sm text-destructive">{errors.epost}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="telefon">Telefon</Label>
                                        <Input
                                            id="telefon"
                                            type="tel"
                                            value={formData.telefon}
                                            onChange={(e) => handleFieldChange('telefon', e.target.value)}
                                            placeholder="12345678 eller +47 123 45 678"
                                            className={errors.telefon ? 'border-destructive' : ''}
                                        />
                                        {errors.telefon && (
                                            <p className="text-sm text-destructive">{errors.telefon}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="mobiltelefon">Mobiltelefon</Label>
                                        <Input
                                            id="mobiltelefon"
                                            type="tel"
                                            value={formData.mobiltelefon}
                                            onChange={(e) => handleFieldChange('mobiltelefon', e.target.value)}
                                            placeholder="12345678 eller +47 123 45 678"
                                            className={errors.mobiltelefon ? 'border-destructive' : ''}
                                        />
                                        {errors.mobiltelefon && (
                                            <p className="text-sm text-destructive">{errors.mobiltelefon}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label htmlFor="kontaktinformasjon">Annen informasjon</Label>
                                        <Textarea
                                            id="kontaktinformasjon"
                                            value={formData.kontaktinformasjon}
                                            onChange={(e) => handleFieldChange('kontaktinformasjon', e.target.value)}
                                            placeholder="LinkedIn, firma, notater..."
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab: Eierandel */}
                        <TabsContent key="eierandel-tab" value="eierandel" className="p-6 space-y-6">
                            <div
                                className="space-y-4"
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                onSelect={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                onSelectCapture={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                            >
                                <h3 className="text-lg font-medium">Eierandel og status</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="andel">Andel (%) {harEnheter ? 'av enheten' : 'av prosjektet'} *</Label>
                                        <Input
                                            id="andel"
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
                                            <p className="text-sm text-destructive">{errors.andel}</p>
                                        )}
                                        {harEnheter && formData.enhetId && (
                                            <p className="text-xs text-muted-foreground">
                                                Dette er andelen av {enheter.find(e => e.id === formData.enhetId)?.midlertidigNummer || 'enheten'},
                                                ikke hele prosjektet
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>Status</Label>
                                        <div className="flex items-center space-x-2 p-3 border rounded-md">
                                            <Checkbox
                                                id="aktiv"
                                                checked={formData.aktiv}
                                                onCheckedChange={(checked) => handleFieldChange('aktiv', checked)}
                                            />
                                            <Label
                                                htmlFor="aktiv"
                                                className="text-sm font-normal cursor-pointer"
                                            >
                                                Aktiv benefisient
                                            </Label>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Fjern haken hvis andelen er solgt eller overført
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="aktivFra">Aktiv fra</Label>
                                        <Input
                                            id="aktivFra"
                                            type="date"
                                            value={formData.aktivFra}
                                            onChange={(e) => handleFieldChange('aktivFra', e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="aktivTil">Aktiv til {!formData.aktiv && "*"}</Label>
                                        <Input
                                            id="aktivTil"
                                            type="date"
                                            value={formData.aktivTil}
                                            onChange={(e) => handleFieldChange('aktivTil', e.target.value)}
                                            disabled={formData.aktiv}
                                            className={formData.aktiv ? 'bg-muted' : ''}
                                        />
                                        {formData.aktiv ? (
                                            <p className="text-xs text-muted-foreground">
                                                Settes automatisk når status endres til inaktiv
                                            </p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                Når ble andelen solgt/overført?
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label htmlFor="kommentar">Kommentar / Notater</Label>
                                        <Textarea
                                            id="kommentar"
                                            value={formData.kommentar}
                                            onChange={(e) => handleFieldChange('kommentar', e.target.value)}
                                            placeholder="Forklaring på endringer, salg av andel, overføring..."
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Dialog for eierskifte */}
            <AlertDialog open={showOwnershipChangeDialog} onOpenChange={setShowOwnershipChangeDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            <AlertDialogTitle>Mulig eierskifte oppdaget</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="space-y-2">
                            <p>Du har endret kritiske felter som kan indikere et eierskifte:</p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {originalFormData?.navn !== formData.navn && originalFormData?.navn && (
                                    <li>Navn endret fra "{originalFormData.navn}" til "{formData.navn}"</li>
                                )}
                                {originalFormData?.personident !== formData.personident && formData.type === 'Fysisk' && (
                                    <li>Personnummer endret</li>
                                )}
                                {originalFormData?.organisasjonsnummer !== formData.organisasjonsnummer && formData.type === 'Juridisk' && (
                                    <li>Organisasjonsnummer endret</li>
                                )}
                            </ul>
                            <p className="mt-3">Hva ønsker du å gjøre?</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowOwnershipChangeDialog(false)}>
                            Avbryt
                        </AlertDialogCancel>
                        <Button variant="outline" onClick={() => {
                            setShowOwnershipChangeDialog(false);
                            handleSave(true);
                        }}>
                            Oppdater eksisterende
                        </Button>
                        <AlertDialogAction onClick={handleOwnershipChange}>
                            Registrer eierskifte
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default BenefisientEditPage; 