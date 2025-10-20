import React, { useState } from 'react';
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import {
    Truck, TruckIcon, Package, Container, BoxSelect,
    Calendar, Weight, MapPin, ShieldCheck, Tag, RefreshCcw, Minus, Plus,
    ListFilter, Briefcase, Snowflake, FileText, ArrowUpDown, Construction, Wrench,
    AlertTriangle
} from 'lucide-react'; // Bruk tilgjengelige ikoner
import { formatCurrency } from '../../utils/formatUtils'; // Antar at denne finnes
import {
    ALPHA_GRUNNPRIS,
    FAKTORER_KJOERETOEYTYPE,
    FAKTORER_EGENANDEL_KASKO,
    FAKTORER_EGENANDEL_ANSVAR,
    FAKTORER_KJOERELENGDE,
    FAKTORER_KJOEREOMRAADE,
    FAKTORER_TOTALVEKT,
    FAKTORER_ALDER,
    TILLEGG_PRISER,
} from './constants/lastebilTariffData'; // <--- Importer alle faktorer

// --- Konstanter (kan flyttes til egen fil senere) ---

const TRUCK_TYPES = {
    SKAP_PLAN_LETT: "Skapbil / Planbil inntil 7 500 kg",
    TREKKBIL: "Trekkbil",
    SKAPBIL: "Skapbil",
    PLANBIL: "Planbil",
    TIPP_KROK: "Tippbil / Krokbil",
    CONTAINERBIL: "Containerbil"
};

const TOTAL_WEIGHTS = [
    "Inntil 7 500 kg",
    "Inntil 10 000 kg",
    "Inntil 13 000 kg",
    "Inntil 17 000 kg",
    "Inntil 21 000 kg",
    "Inntil 27 000 kg", // Merk: Du listet denne to ganger, jeg inkluderer den én gang
    "Inntil 36 000 kg",
    "Inntil 43 000 kg"
];

const MILEAGE_OPTIONS = [
    { value: '8000', label: '8 000 km' },
    { value: '12000', label: '12 000 km' },
    { value: '16000', label: '16 000 km' },
    { value: '20000', label: '20 000 km' },
    { value: '25000', label: '25 000 km' },
    { value: '30000', label: '30 000 km' },
    { value: '40000', label: '40 000 km' },
    { value: '60000', label: '60 000 km' },
    { value: '80000', label: '80 000 km' },
    { value: '100000', label: '100 000 km' },
    { value: '120000', label: '120 000 km' },
    { value: 'UBEGRENSET', label: 'Ubegrenset' },
];

const DRIVING_AREAS = {
    NORGE: "Norge",
    NORDEN: "Norden",
    EUROPA_MINUS: "Europa - Untatt Russland, Belarus og Kosovo"
};

const COVERAGE_TYPES = {
    ANSVAR: "Ansvar inkl. Fører- og passasjerulykke",
    DELKASKO: "Delkasko",
    KASKO: "Kasko"
};

const KASKO_DEDUCTIBLES = [
    { value: '6000', label: '6 000 kr' },
    { value: '10000', label: '10 000 kr' },
    { value: '20000', label: '20 000 kr' },
    { value: '50000', label: '50 000 kr' },
    { value: '100000', label: '100 000 kr' }
];

const LIABILITY_DEDUCTIBLES = [
    { value: '5000', label: '5 000 kr' },
    { value: '10000', label: '10 000 kr' }
];

// --- Komponent ---

// Hjelpefunksjon for å velge ikoner for kjøretøytyper
const getVehicleIcon = (key) => {
    // Bruk samme ikon (TruckIcon) for alle kjøretøytyper
    return <TruckIcon className="h-4 w-4 mr-2" />;
};

function LastebilCalculator() {
    const [formData, setFormData] = useState({
        kjoeretoeytype: '',
        registreringsaar: '',
        totalvekt: '',
        kjoerelengde: '',
        kjoereomraade: '',
        dekning: '',
        egenandelKasko: '',
        egenandelAnsvar: '0', // Standard 0
        lastebilverdi: '', // Ny: Verdi av lastebil inkl. kran/tilleggsutstyr
        tillegg: {
            avbrudd: false,
            avbruddBeloep: '',
            begrensetIdent: false,
            yrkesloesoereVarer: false,
            annetAnsvar: false,
            forsikringsattest: false,
        }
    });

    // Ny tilstand for å spore tillegg som krever underwriter-godkjenning
    const [underwriterRequired, setUnderwriterRequired] = useState(false);
    // Ny tilstand for å spore om Europa er valgt som kjøreområde
    const [europeWarningVisible, setEuropeWarningVisible] = useState(false);
    // Ny tilstand for å spore om lastebilverdi krever UW-godkjenning
    const [valueWarningVisible, setValueWarningVisible] = useState(false);

    // List over tillegg som krever godkjenning av underwriter
    const needsUnderwriterApproval = ['godsansvar', 'annetAnsvar', 'avbrudd'];

    // --- Handlers ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'lastebilverdi') {
            // Fjern alle ikke-numeriske tegn unntatt mellomrom
            const numericValue = value.replace(/[^\d]/g, '');
            // Formater med tusenskille (mellomrom)
            const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

            setFormData(prev => ({ ...prev, [name]: formattedValue }));

            // Sjekk om lastebilverdi krever UW-godkjenning
            const cleanNumericValue = parseFloat(numericValue);
            setValueWarningVisible(!isNaN(cleanNumericValue) && cleanNumericValue > 1500000);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => {
            let newState = { ...prev, [name]: value };
            // Reset kasko egenandel if dekning is not KASKO
            if (name === 'dekning' && value !== 'KASKO') {
                newState.egenandelKasko = '';
            }
            // Reset avbrudd beløp if avbrudd is deselected indirectly via handleCheckboxChange
            if (name === 'avbrudd' && !value) {
                newState.tillegg.avbruddBeloep = '';
            }

            // Sjekk om kjøreområde er satt til Europa
            if (name === 'kjoereomraade') {
                setEuropeWarningVisible(value === 'EUROPA_MINUS');
            }

            return newState;
        });
    };

    const handleToggleChange = (name, value) => {
        if (value) { // Sørger for at verdien ikke blir tom ved avklikking
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCheckboxChange = (name, checked) => {
        setFormData(prev => {
            let newTillegg = { ...prev.tillegg, [name]: checked };

            // Reset beløp hvis checkbox fjernes
            if (name === 'avbrudd' && !checked) {
                newTillegg.avbruddBeloep = '';
            }

            // Sjekk om noen tillegg som krever underwriter-godkjenning er valgt
            const requiresUnderwriter = Object.entries(newTillegg)
                .some(([key, value]) => value && needsUnderwriterApproval.includes(key));

            setUnderwriterRequired(requiresUnderwriter);

            return { ...prev, tillegg: newTillegg };
        });
    };

    const handleTilleggInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            tillegg: { ...prev.tillegg, [name]: value }
        }));
    };


    const handleReset = () => {
        setFormData({
            kjoeretoeytype: '',
            registreringsaar: '',
            totalvekt: '',
            kjoerelengde: '',
            kjoereomraade: '',
            dekning: '',
            egenandelKasko: '',
            egenandelAnsvar: '0',
            lastebilverdi: '',
            tillegg: {
                avbrudd: false,
                avbruddBeloep: '',
                begrensetIdent: false,
                yrkesloesoereVarer: false,
                annetAnsvar: false,
                forsikringsattest: false,
            }
        });
        // Reset også varsler
        setValueWarningVisible(false);
        setEuropeWarningVisible(false);
        setUnderwriterRequired(false);
        // Ikke reset calculatedResult her
    };

    // Oppdatert calculatePremium
    const calculatePremium = () => {
        // Sjekk om nødvendige felter er fylt ut
        const requiredFields = [
            formData.kjoeretoeytype,
            formData.totalvekt,
            formData.kjoerelengde,
            formData.kjoereomraade,
            formData.dekning,
            formData.egenandelAnsvar,
            formData.registreringsaar
        ];
        if (formData.dekning === 'KASKO') {
            requiredFields.push(formData.egenandelKasko);
        }
        // Enkel validering for registreringsår
        const regYear = parseInt(formData.registreringsaar, 10);
        const currentYear = new Date().getFullYear();
        if (!regYear || regYear < 1900 || regYear > currentYear + 1) { // Tillater inneværende + neste år
            console.log("Ugyldig registreringsår");
            requiredFields.push(null); // Marker som manglende hvis ugyldig
        }

        if (requiredFields.some(field => !field)) {
            console.log("Mangler påkrevde felter eller ugyldig registreringsår for beregning");
            // Sikrer at tillegg også nullstilles ved retur
            return { ansvarBasis: 0, delkaskoBasis: 0, kaskoBasis: 0, ansvarFaktorert: 0, delkaskoFaktorert: 0, kaskoFaktorert: 0, ansvarEndelig: 0, delkaskoEndelig: 0, kaskoEndelig: 0, tillegg: [], total: 0 };
        }

        let calculated = {
            ansvarBasis: 0,
            delkaskoBasis: 0,
            kaskoBasis: 0,
            ansvarFaktorert: 0,
            delkaskoFaktorert: 0,
            kaskoFaktorert: 0,
            ansvarEndelig: 0,
            delkaskoEndelig: 0,
            kaskoEndelig: 0,
            tillegg: [], // Initialiseres tom
            total: 0,
        };

        // 1. Hent basispriser (Alpha)
        if (['ANSVAR', 'DELKASKO', 'KASKO'].includes(formData.dekning)) {
            calculated.ansvarBasis = ALPHA_GRUNNPRIS.ANSVAR;
        }
        if (['DELKASKO', 'KASKO'].includes(formData.dekning)) {
            calculated.delkaskoBasis = ALPHA_GRUNNPRIS.DELKASKO;
        }
        if (formData.dekning === 'KASKO') {
            calculated.kaskoBasis = ALPHA_GRUNNPRIS.KASKO;
        }

        // 2. Hent faktorer basert på valg
        const kjoeretoeyFaktor = FAKTORER_KJOERETOEYTYPE[formData.kjoeretoeytype] || { A: 1, D: 1, K: 1 };
        const egenandelAnsvarFaktor = FAKTORER_EGENANDEL_ANSVAR[formData.egenandelAnsvar] || { A: 1 };
        const egenandelKaskoFaktor = FAKTORER_EGENANDEL_KASKO[formData.egenandelKasko] || { K: 1 };
        const kjoerelengdeFaktor = FAKTORER_KJOERELENGDE[formData.kjoerelengde] || { A: 1, D: 1, K: 1 };
        const kjoereomraadeFaktor = FAKTORER_KJOEREOMRAADE[formData.kjoereomraade] || { A: 1, D: 1, K: 1 };
        const totalvektFaktor = FAKTORER_TOTALVEKT[formData.totalvekt] || { A: 1, D: 1, K: 1 };

        // 3. Beregn FØRSTE faktorering (uten alder)
        calculated.ansvarFaktorert = calculated.ansvarBasis *
            kjoeretoeyFaktor.A *
            egenandelAnsvarFaktor.A *
            kjoerelengdeFaktor.A *
            kjoereomraadeFaktor.A *
            totalvektFaktor.A;

        if (calculated.delkaskoBasis > 0) {
            calculated.delkaskoFaktorert = calculated.delkaskoBasis *
                kjoeretoeyFaktor.D *
                kjoerelengdeFaktor.D *
                kjoereomraadeFaktor.D *
                totalvektFaktor.D;
        }

        if (calculated.kaskoBasis > 0 && formData.egenandelKasko) {
            calculated.kaskoFaktorert = calculated.kaskoBasis *
                kjoeretoeyFaktor.K *
                egenandelKaskoFaktor.K *
                kjoerelengdeFaktor.K *
                kjoereomraadeFaktor.K *
                totalvektFaktor.K;
        }

        // 4. Hent og anvend ALDERSFAKTOR
        const alder = currentYear - regYear;
        let aldersFaktor = FAKTORER_ALDER.find(f => f.alder === alder);
        if (!aldersFaktor) {
            if (alder < 0) {
                aldersFaktor = FAKTORER_ALDER.find(f => f.alder === 0) || { A: 1, D: 1, K: 1 }; // Bruk faktor for alder 0 hvis negativ
            } else { // alder > 50
                aldersFaktor = FAKTORER_ALDER.find(f => f.alder === 50) || { A: 1, D: 1, K: 1 }; // Bruk faktor for alder 50 hvis over
            }
        }
        // Bruk default 1.0 hvis find returnerte undefined (selv om det ikke skal skje med logikken over)
        aldersFaktor = aldersFaktor || { A: 1, D: 1, K: 1 };

        // Anvend aldersfaktor på de allerede faktorerte prisene
        calculated.ansvarEndelig = calculated.ansvarFaktorert * aldersFaktor.A;
        calculated.delkaskoEndelig = calculated.delkaskoFaktorert * aldersFaktor.D;
        calculated.kaskoEndelig = calculated.kaskoFaktorert * aldersFaktor.K;

        // Mellomsteg: Beregn grunnlag for faktortillegg
        const grunnlagFoerTillegg = calculated.ansvarEndelig + calculated.delkaskoEndelig + calculated.kaskoEndelig;

        // 5. Beregn TILLEGG
        let tilleggsTotal = 0;
        const aktiveTillegg = []; // Liste for UI

        Object.entries(formData.tillegg).forEach(([key, value]) => {
            if (value && TILLEGG_PRISER[key]) {
                const tilleggInfo = TILLEGG_PRISER[key];
                let tilleggsPris = 0;

                switch (tilleggInfo.type) {
                    case 'fixed':
                        tilleggsPris = tilleggInfo.value;
                        break;
                    case 'factor':
                        tilleggsPris = grunnlagFoerTillegg * tilleggInfo.value;
                        break;
                    case 'special':
                        if (key === 'avbrudd') {
                            const dagsbelop = parseFloat(formData.tillegg.avbruddBeloep);
                            if (!isNaN(dagsbelop) && dagsbelop > 0) {
                                tilleggsPris = dagsbelop * tilleggInfo.factor;
                            } else {
                                console.warn("Avbrudd valgt, men ugyldig dagsbeløp angitt.");
                                tilleggsPris = 0;
                            }
                        }
                        break;
                    default:
                        tilleggsPris = 0;
                }

                if (tilleggsPris > 0) {
                    const prisRounded = Math.round(tilleggsPris);
                    aktiveTillegg.push({ id: key, label: tilleggInfo.label, price: prisRounded });
                    tilleggsTotal += prisRounded;
                }
                else if (['special'].includes(tilleggInfo.type)) {
                    aktiveTillegg.push({ id: key, label: tilleggInfo.label, price: 0 });
                }
            }
        });

        calculated.tillegg = aktiveTillegg; // Oppdater med beregnede tillegg

        // 6. Summer totalen (grunnlag + tillegg)
        calculated.total = Math.round(grunnlagFoerTillegg + tilleggsTotal);

        console.log("Beregnet med tillegg:", calculated); // For debugging
        return calculated;
    };

    const premiumResult = calculatePremium();

    // --- UI ---
    return (
        <div className="w-full max-w-5xl mx-auto my-8 space-y-8">
            {/* Header Card */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                            <TruckIcon className="h-8 w-8 text-primary" />
                            <div>
                                <CardTitle className="text-2xl font-semibold">Lastebil</CardTitle>
                                <CardDescription>Beregn forsikringspremie for lastebil</CardDescription>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <Button variant="outline" size="sm">Se tegningsregler</Button>
                            <Button onClick={handleReset} variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive">
                                <RefreshCcw className="h-4 w-4 mr-2" />
                                Nullstill
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Grid: Skjema + Resultat */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                {/* Venstre kolonne: Skjema */}
                <div className="md:col-span-8">
                    <Card>
                        <CardContent className="pt-6 space-y-8">

                            {/* Seksjon: Kjøretøyinformasjon */}
                            <section>
                                <h3 className="text-lg font-semibold mb-4">Kjøretøyinformasjon</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label>Kjøretøytype</Label>
                                        <ToggleGroup
                                            type="single"
                                            variant="outline"
                                            value={formData.kjoeretoeytype}
                                            onValueChange={(value) => { if (value) handleSelectChange('kjoeretoeytype', value); }}
                                            className="flex flex-wrap justify-start"
                                        >
                                            {Object.entries(TRUCK_TYPES).map(([key, label]) => (
                                                <ToggleGroupItem
                                                    key={key}
                                                    value={key}
                                                    aria-label={label}
                                                    className="flex items-center data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                                >
                                                    {getVehicleIcon(key)}
                                                    {label}
                                                </ToggleGroupItem>
                                            ))}
                                        </ToggleGroup>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="registreringsaar">Registreringsår</Label>
                                        <Input id="registreringsaar" name="registreringsaar" type="number" value={formData.registreringsaar} onChange={handleInputChange} placeholder="F.eks. 2022" className={!formData.kjoeretoeytype ? 'bg-muted' : ''} disabled={!formData.kjoeretoeytype} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastebilverdi">Verdi av lastebil inkl. kran/tilleggsutstyr</Label>
                                        <Input
                                            id="lastebilverdi"
                                            name="lastebilverdi"
                                            type="text"
                                            value={formData.lastebilverdi}
                                            onChange={handleInputChange}
                                            placeholder="F.eks. 1 200 000"
                                            className={!formData.kjoeretoeytype ? 'bg-muted' : ''}
                                            disabled={!formData.kjoeretoeytype}
                                        />

                                        {/* Vis varsel hvis verdi > 1 500 000 */}
                                        {valueWarningVisible && (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-2 flex items-start space-x-2">
                                                <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                                <div className="text-sm text-yellow-700">
                                                    <p className="font-bold">UW-godkjenning kreves</p>
                                                    <p>Verdier over 1 500 000 kr må vurderes av underwriter før forsikringen kan tegnes.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2"> {/* Endret til normal bredde */}
                                        <Label htmlFor="totalvekt" className={!formData.kjoeretoeytype ? 'text-muted-foreground' : ''}>Totalvekt</Label>
                                        <Select
                                            name="totalvekt"
                                            value={formData.totalvekt}
                                            onValueChange={(value) => handleSelectChange('totalvekt', value)}
                                            disabled={!formData.kjoeretoeytype}
                                        >
                                            <SelectTrigger id="totalvekt">
                                                <SelectValue placeholder="Velg totalvekt" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectLabel>Vektklasser</SelectLabel>
                                                    {TOTAL_WEIGHTS.map((weight) => (
                                                        <SelectItem key={weight} value={weight}>{weight}</SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </section>

                            {/* Seksjon: Bruksinformasjon */}
                            <section>
                                <h3 className="text-lg font-semibold mb-4">Bruksinformasjon</h3>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className={!formData.kjoeretoeytype || !formData.totalvekt ? 'text-muted-foreground' : ''}>Årlig kjørelengde</Label>
                                        <ToggleGroup
                                            type="single"
                                            variant="outline"
                                            value={formData.kjoerelengde}
                                            onValueChange={(value) => { if (value) handleToggleChange('kjoerelengde', value); }}
                                            className="flex flex-wrap justify-start"
                                            disabled={!formData.kjoeretoeytype || !formData.totalvekt}
                                        >
                                            {MILEAGE_OPTIONS.map((option) => (
                                                <ToggleGroupItem
                                                    key={option.value}
                                                    value={option.value}
                                                    aria-label={option.label}
                                                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                                >
                                                    {option.label}
                                                </ToggleGroupItem>
                                            ))}
                                        </ToggleGroup>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className={!formData.kjoeretoeytype || !formData.totalvekt || !formData.kjoerelengde ? 'text-muted-foreground' : ''}>Kjøreområde</Label>
                                        <ToggleGroup
                                            type="single"
                                            variant="outline"
                                            value={formData.kjoereomraade}
                                            onValueChange={(value) => { if (value) handleSelectChange('kjoereomraade', value); }}
                                            className="flex flex-wrap justify-start"
                                            disabled={!formData.kjoeretoeytype || !formData.totalvekt || !formData.kjoerelengde}
                                        >
                                            {Object.entries(DRIVING_AREAS).map(([key, label]) => (
                                                <ToggleGroupItem
                                                    key={key}
                                                    value={key}
                                                    aria-label={label}
                                                    className="flex items-center data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                                >
                                                    {label}
                                                </ToggleGroupItem>
                                            ))}
                                        </ToggleGroup>

                                        {/* Vis advarsel hvis Europa er valgt */}
                                        {europeWarningVisible && (
                                            <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-2 flex items-start space-x-2">
                                                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                <div className="text-sm text-red-700">
                                                    <p>Kjøring utenfor Norden forsikres ikke</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Seksjon: Dekning og Egenandeler */}
                            <section>
                                <h3 className="text-lg font-semibold mb-4">Dekning og Egenandeler</h3>
                                <div className="space-y-6">
                                    {/* Dekningstype */}
                                    <div className="space-y-2">
                                        <Label className={!formData.kjoerelengde || !formData.kjoereomraade ? 'text-muted-foreground' : ''}>Dekningstype</Label>
                                        <ToggleGroup
                                            type="single"
                                            variant="outline"
                                            value={formData.dekning}
                                            onValueChange={(value) => { if (value) handleSelectChange('dekning', value); }}
                                            className="flex flex-wrap justify-start"
                                            disabled={!formData.kjoerelengde || !formData.kjoereomraade}
                                        >
                                            {Object.entries(COVERAGE_TYPES).map(([key, label]) => (
                                                <ToggleGroupItem
                                                    key={key}
                                                    value={key}
                                                    aria-label={label}
                                                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                                >
                                                    {label}
                                                </ToggleGroupItem>
                                            ))}
                                        </ToggleGroup>
                                    </div>

                                    {/* Egenandel Kasko (vises kun ved Kasko) */}
                                    {formData.dekning === 'KASKO' && (
                                        <div className="space-y-2">
                                            <Label>Egenandel Kasko</Label>
                                            <ToggleGroup
                                                type="single"
                                                variant="outline"
                                                value={formData.egenandelKasko}
                                                onValueChange={(value) => { if (value) handleToggleChange('egenandelKasko', value); }}
                                                className="flex flex-wrap justify-start"
                                            >
                                                {KASKO_DEDUCTIBLES.map((option) => (
                                                    <ToggleGroupItem
                                                        key={option.value}
                                                        value={option.value}
                                                        aria-label={option.label}
                                                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                                    >
                                                        {option.label}
                                                    </ToggleGroupItem>
                                                ))}
                                            </ToggleGroup>
                                        </div>
                                    )}

                                    {/* Egenandel Ansvar */}
                                    <div className="space-y-2">
                                        <Label className={!formData.dekning ? 'text-muted-foreground' : ''}>Egenandel Ansvar</Label>
                                        <ToggleGroup
                                            type="single"
                                            variant="outline"
                                            value={formData.egenandelAnsvar}
                                            onValueChange={(value) => { if (value) handleToggleChange('egenandelAnsvar', value); }}
                                            className="flex flex-wrap justify-start"
                                            disabled={!formData.dekning}
                                        >
                                            {LIABILITY_DEDUCTIBLES.map((option) => (
                                                <ToggleGroupItem
                                                    key={option.value}
                                                    value={option.value}
                                                    aria-label={option.label}
                                                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                                >
                                                    {option.label}
                                                </ToggleGroupItem>
                                            ))}
                                        </ToggleGroup>
                                    </div>
                                </div>
                            </section>

                            {/* Seksjon: Tilleggsdekninger */}
                            <section>
                                <h3 className={`text-lg font-semibold mb-4 ${!formData.egenandelAnsvar || (formData.dekning === 'KASKO' && !formData.egenandelKasko) ? 'text-muted-foreground' : ''}`}>Tilleggsdekninger</h3>

                                {/* Vis advarsel hvis noen av de spesielle tilleggene er valgt */}
                                {underwriterRequired && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-start space-x-2">
                                        <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-yellow-700">
                                            <p className="font-medium">Godkjenning kreves</p>
                                            <p>En eller flere av de valgte tilleggsdekningene må avklares med underwriter før de kan legges til.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">

                                    {/* Avbrudd */}
                                    <div className="flex items-center space-x-2 col-span-2 sm:col-span-1">
                                        <Checkbox
                                            id="avbrudd"
                                            checked={formData.tillegg.avbrudd}
                                            onCheckedChange={(checked) => handleCheckboxChange('avbrudd', checked)}
                                            disabled={!formData.egenandelAnsvar || (formData.dekning === 'KASKO' && !formData.egenandelKasko)}
                                        />
                                        <Label htmlFor="avbrudd" className={`flex-1 ${!formData.egenandelAnsvar || (formData.dekning === 'KASKO' && !formData.egenandelKasko) ? 'text-muted-foreground' : ''} flex items-center`}>
                                            Avbrudd (dagsbeløp)
                                            {formData.tillegg.avbrudd && (
                                                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 ml-1.5" />
                                            )}
                                        </Label>
                                        {formData.tillegg.avbrudd && (
                                            <Input
                                                type="number"
                                                name="avbruddBeloep"
                                                value={formData.tillegg.avbruddBeloep}
                                                onChange={handleTilleggInputChange}
                                                placeholder="Beløp"
                                                className="h-8 w-28" // Mindre inputfelt
                                            />
                                        )}
                                    </div>

                                    {/* Andre tillegg (enkle Ja/Nei checkboxes) */}
                                    {[
                                        { id: 'begrensetIdent', label: 'Begrenset identifikasjon' },
                                        { id: 'yrkesloesoereVarer', label: 'Yrkesløsøre og varer' },
                                        {
                                            id: 'godsansvar',
                                            label: 'Godsansvar',
                                            needsUnderwriter: true
                                        },
                                        {
                                            id: 'annetAnsvar',
                                            label: 'Kranansvar',
                                            needsUnderwriter: true
                                        },
                                        { id: 'forsikringsattest', label: 'Forsikringsattest (Panthaver/Leasing)' },
                                    ].map(tillegg => (
                                        <div key={tillegg.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={tillegg.id}
                                                checked={formData.tillegg[tillegg.id]}
                                                onCheckedChange={(checked) => handleCheckboxChange(tillegg.id, checked)}
                                                disabled={!formData.egenandelAnsvar || (formData.dekning === 'KASKO' && !formData.egenandelKasko)}
                                            />
                                            <Label
                                                htmlFor={tillegg.id}
                                                className={`text-sm font-normal ${!formData.egenandelAnsvar || (formData.dekning === 'KASKO' && !formData.egenandelKasko) ? 'text-muted-foreground' : ''} ${tillegg.needsUnderwriter ? 'flex items-center' : ''}`}
                                            >
                                                {tillegg.label}
                                                {tillegg.needsUnderwriter && formData.tillegg[tillegg.id] && (
                                                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 ml-1.5" />
                                                )}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </section>

                        </CardContent>
                    </Card>
                </div>

                {/* Høyre kolonne: Resultat */}
                <div className="md:col-span-4">
                    <Card className="sticky top-8 bg-card border">
                        <CardHeader>
                            <CardTitle className="text-lg font-medium">Beregnet årspremie</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {premiumResult && premiumResult.total > 0 ? (
                                <>
                                    <div className="bg-primary p-4 rounded-md mb-4">
                                        <p className="text-3xl font-bold text-center text-primary-foreground">{formatCurrency(premiumResult.total)}</p>
                                    </div>
                                    <Separator className="my-4" />
                                    <div className="text-sm space-y-1">
                                        <h4 className="font-medium text-muted-foreground mb-2">Dekninger (endelig pris)</h4>
                                        {premiumResult.ansvarEndelig > 0 &&
                                            <div className="flex justify-between">
                                                <span>Ansvar (inkl. F/P):</span>
                                                <span>{formatCurrency(Math.round(premiumResult.ansvarEndelig))}</span>
                                            </div>
                                        }
                                        {premiumResult.delkaskoEndelig > 0 &&
                                            <div className="flex justify-between">
                                                <span>Delkasko:</span>
                                                <span>{formatCurrency(Math.round(premiumResult.delkaskoEndelig))}</span>
                                            </div>
                                        }
                                        {premiumResult.kaskoEndelig > 0 &&
                                            <div className="flex justify-between">
                                                <span>Kasko:</span>
                                                <span>{formatCurrency(Math.round(premiumResult.kaskoEndelig))}</span>
                                            </div>
                                        }
                                        {/* --- Tillegg listes opp her senere --- */}
                                        {premiumResult.tillegg.length > 0 && (
                                            <div className="pt-3">
                                                <h4 className="font-medium text-muted-foreground mb-1">Tillegg</h4>
                                                <ul className="list-none space-y-1">
                                                    {premiumResult.tillegg.map(extra => (
                                                        <li key={extra.id} className="flex justify-between">
                                                            <span className="text-sm">{extra.label}:</span>
                                                            <span className="text-sm">{formatCurrency(extra.price)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-24 bg-muted/50 rounded-lg border border-dashed">
                                    <p className="text-center text-muted-foreground">Fyll ut alle påkrevde felt (inkl. gyldig reg.år) for å se pris.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}

export default LastebilCalculator;