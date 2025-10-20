import React, { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Separator } from "~/components/ui/separator";
import {
    Calculator,
    Calendar,
    DollarSign,
    Save,
    RefreshCw,
    AlertTriangle,
    Info,
    Clock,
    TrendingUp,
    CheckCircle2,
    Sparkles,
    FileText,
    Banknote
} from 'lucide-react';
import { useToast } from "~/hooks/use-toast";
import { formatCurrency, formatDate } from '../../../utils/tilbud-konstanter';

// Hjelpefunksjon for å formatere tall med tusenskille
const formatNumberWithSeparator = (value) => {
    if (!value) return '';
    const number = typeof value === 'string' ? parseFloat(value.replace(/\s/g, '')) : value;
    if (isNaN(number)) return value;
    return number.toLocaleString('no-NO');
};

// Hjelpefunksjon for å fjerne tusenskille og konvertere til nummer
const parseNumberFromFormatted = (value) => {
    if (!value) return '';
    return value.toString().replace(/\s/g, '');
};

// Hjelpefunksjon for å beregne måneder mellom to datoer
const calculateMonthsBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return '';

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) return '';

    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    const dayDiff = end.getDate() - start.getDate();

    let totalMonths = yearDiff * 12 + monthDiff;

    // Hvis sluttdatoen er tidligere i måneden enn startdatoen, trekk fra en måned
    if (dayDiff < 0) {
        totalMonths--;
    }

    return Math.max(0, totalMonths);
};

// Hjelpefunksjon for å beregne garantiutløpsdato
const calculateWarrantyEndDate = (endDate, warrantyMonths) => {
    if (!endDate || !warrantyMonths) return null;

    const date = new Date(endDate);
    date.setMonth(date.getMonth() + parseInt(warrantyMonths));
    return date;
};

const TilbudBeregning = memo(({ tilbud, onBeregningUpdate }) => {
    const [beregning, setBeregning] = useState({
        kontraktssum: '',
        startDato: '',
        sluttDato: '',
        utforelsestid: '',
        garantitid: '',
        rentesatsUtforelse: '',
        rentesatsGaranti: '',
        etableringsgebyr: '5000',
        totalPremie: '',
        manueltOverstyrt: false
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [errors, setErrors] = useState({});
    const [hasCalculated, setHasCalculated] = useState(false);
    const { toast } = useToast();

    // Oppdater state fra tilbud-props
    useEffect(() => {
        if (tilbud?.beregning) {
            const b = tilbud.beregning;
            setBeregning({
                kontraktssum: b.kontraktssum ? formatNumberWithSeparator(parseFloat(b.kontraktssum)) : '',
                startDato: b.startDato ? new Date(b.startDato).toISOString().split('T')[0] : '',
                sluttDato: b.sluttDato ? new Date(b.sluttDato).toISOString().split('T')[0] : '',
                utforelsestid: b.utforelsestid ? b.utforelsestid.toString() : '',
                garantitid: b.garantitid ? b.garantitid.toString() : '',
                rentesatsUtforelse: b.rentesatsUtforelse ? (parseFloat(b.rentesatsUtforelse) * 100).toString() : '',
                rentesatsGaranti: b.rentesatsGaranti ? (parseFloat(b.rentesatsGaranti) * 100).toString() : '',
                etableringsgebyr: b.etableringsgebyr ? formatNumberWithSeparator(parseFloat(b.etableringsgebyr)) : '5000',
                totalPremie: b.totalPremie ? parseFloat(b.totalPremie).toString() : '',
                manueltOverstyrt: b.manueltOverstyrt || false
            });
            setHasCalculated(!!b.totalPremie);
        }
    }, [tilbud]);

    // Automatisk beregning av utførelsestid når startDato eller sluttDato endres
    useEffect(() => {
        if (beregning.startDato && beregning.sluttDato && !beregning.manueltOverstyrt) {
            const months = calculateMonthsBetween(beregning.startDato, beregning.sluttDato);
            if (months && months !== parseInt(beregning.utforelsestid)) {
                setBeregning(prev => ({ ...prev, utforelsestid: months.toString() }));
            }
        }
    }, [beregning.startDato, beregning.sluttDato, beregning.manueltOverstyrt]);

    // Valider felt
    const validateField = (name, value) => {
        const newErrors = { ...errors };

        switch (name) {
            case 'kontraktssum':
                const kontraktssum = parseFloat(parseNumberFromFormatted(value));
                if (value && (isNaN(kontraktssum) || kontraktssum < 100000)) {
                    newErrors[name] = 'Kontraktssum må være minst 100.000 NOK';
                } else {
                    delete newErrors[name];
                }
                break;
            case 'utforelsestid':
            case 'garantitid':
                if (value && (isNaN(value) || parseInt(value) < 1 || parseInt(value) > 240)) {
                    newErrors[name] = 'Periode må være mellom 1 og 240 måneder';
                } else {
                    delete newErrors[name];
                }
                break;
            case 'rentesatsUtforelse':
            case 'rentesatsGaranti':
                if (value && (isNaN(value) || parseFloat(value) < 0 || parseFloat(value) > 100)) {
                    newErrors[name] = 'Rentesats må være mellom 0 og 100%';
                } else {
                    delete newErrors[name];
                }
                break;
            case 'etableringsgebyr':
                const etableringsgebyr = parseFloat(parseNumberFromFormatted(value));
                if (value && (isNaN(etableringsgebyr) || etableringsgebyr < 0)) {
                    newErrors[name] = 'Etableringsgebyr må være 0 eller høyere';
                } else {
                    delete newErrors[name];
                }
                break;
            case 'startDato':
            case 'sluttDato':
                // Valider at startdato er før sluttdato hvis begge er satt
                if (beregning.startDato && beregning.sluttDato) {
                    const start = new Date(beregning.startDato);
                    const end = new Date(beregning.sluttDato);
                    if (start >= end) {
                        newErrors.sluttDato = 'Sluttdato må være etter startdato';
                    } else {
                        delete newErrors.startDato;
                        delete newErrors.sluttDato;
                    }
                }
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Håndter feltendringer
    const handleFieldChange = (name, value) => {
        let processedValue = value;

        // Spesiell håndtering for tall med tusenskille
        if (name === 'kontraktssum' || name === 'etableringsgebyr') {
            // Fjern eksisterende tusenskille og legg til nye
            const numberValue = parseNumberFromFormatted(value);
            if (numberValue !== '' && !isNaN(parseFloat(numberValue))) {
                processedValue = formatNumberWithSeparator(numberValue);
            }
        }

        setBeregning(prev => ({ ...prev, [name]: processedValue }));
        validateField(name, processedValue);
    };

    // Håndter garantitid-knapper
    const handleGarantitidChange = (value) => {
        if (value) {
            const months = parseInt(value) * 12; // Konverter år til måneder
            setBeregning(prev => ({ ...prev, garantitid: months.toString() }));
            validateField('garantitid', months.toString());
        }
    };

    // Automatisk beregning
    const handleAutomatiskBeregning = async () => {
        if (!tilbud?.produkttype) {
            toast({
                title: "Mangler produkttype",
                description: "Velg produkttype først for automatisk beregning",
                variant: "destructive"
            });
            return;
        }

        if (!beregning.kontraktssum) {
            toast({
                title: "Mangler kontraktssum",
                description: "Fyll inn kontraktssum for beregning",
                variant: "destructive"
            });
            return;
        }

        setIsCalculating(true);
        try {
            const result = await window.electron.tilbud.beregnPremie({
                produkttype: tilbud.produkttype,
                beregningParams: {
                    kontraktssum: parseFloat(parseNumberFromFormatted(beregning.kontraktssum)),
                    utforelsestid: beregning.utforelsestid ? parseInt(beregning.utforelsestid) : undefined,
                    garantitid: beregning.garantitid ? parseInt(beregning.garantitid) : undefined,
                    etableringsgebyr: beregning.etableringsgebyr ? parseFloat(parseNumberFromFormatted(beregning.etableringsgebyr)) : 5000
                }
            });

            if (result.success) {
                const calc = result.data;
                setBeregning(prev => ({
                    ...prev,
                    utforelsestid: calc.utforelsestid.toString(),
                    garantitid: calc.garantitid.toString(),
                    rentesatsUtforelse: (parseFloat(calc.rentesatsUtforelse) * 100).toString(),
                    rentesatsGaranti: (parseFloat(calc.rentesatsGaranti) * 100).toString(),
                    etableringsgebyr: formatNumberWithSeparator(calc.etableringsgebyr),
                    totalPremie: calc.totalPremie,
                    manueltOverstyrt: false
                }));

                setHasCalculated(true);

                toast({
                    title: "Beregning fullført",
                    description: `Total premie: ${formatCurrency(calc.totalPremie)}`
                });
            } else {
                throw new Error(result.error || 'Beregning feilet');
            }
        } catch (error) {
            console.error('Feil ved automatisk beregning:', error);
            toast({
                title: "Beregningsfeil",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsCalculating(false);
        }
    };

    // Lagre beregning
    const handleSaveBeregning = async () => {
        // Valider påkrevde felt
        if (!beregning.kontraktssum) {
            toast({
                title: "Mangler kontraktssum",
                description: "Kontraktssum er påkrevd",
                variant: "destructive"
            });
            return;
        }

        // Valider alle felt
        const isValid = Object.keys(beregning).every(key =>
            validateField(key, beregning[key])
        );

        if (!isValid) {
            toast({
                title: "Valideringsfeil",
                description: "Rett opp feilene før du lagrer",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            const beregningData = {
                kontraktssum: parseFloat(parseNumberFromFormatted(beregning.kontraktssum)),
                startDato: beregning.startDato || null,
                sluttDato: beregning.sluttDato || null,
                utforelsestid: beregning.utforelsestid ? parseInt(beregning.utforelsestid) : null,
                garantitid: beregning.garantitid ? parseInt(beregning.garantitid) : null,
                rentesatsUtforelse: beregning.rentesatsUtforelse ? parseFloat(beregning.rentesatsUtforelse) / 100 : null,
                rentesatsGaranti: beregning.rentesatsGaranti ? parseFloat(beregning.rentesatsGaranti) / 100 : null,
                etableringsgebyr: beregning.etableringsgebyr ? parseFloat(parseNumberFromFormatted(beregning.etableringsgebyr)) : null,
                totalPremie: beregning.totalPremie ? parseFloat(beregning.totalPremie) : null,
                manueltOverstyrt: beregning.manueltOverstyrt
            };

            const result = await window.electron.tilbud.saveBeregning({
                tilbudId: tilbud.id,
                beregningData
            });

            if (result.success) {
                onBeregningUpdate?.(result.data);
                toast({
                    title: "Beregning lagret",
                    description: "Beregningen er oppdatert"
                });
            } else {
                throw new Error(result.error || 'Kunne ikke lagre beregning');
            }
        } catch (error) {
            console.error('Feil ved lagring av beregning:', error);
            toast({
                title: "Lagringsfeil",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Beregn garantiutløpsdato
    const warrantyEndDate = calculateWarrantyEndDate(beregning.sluttDato, beregning.garantitid);

    // Beregn premiebeløp for visning
    const kontraktssumNumber = parseFloat(parseNumberFromFormatted(beregning.kontraktssum)) || 0;
    const rentesatsUtforelseNumber = parseFloat(beregning.rentesatsUtforelse) || 0;
    const rentesatsGarantiNumber = parseFloat(beregning.rentesatsGaranti) || 0;
    const etableringsgebyrNumber = parseFloat(parseNumberFromFormatted(beregning.etableringsgebyr)) || 0;

    const utforelsesPremie = kontraktssumNumber * (rentesatsUtforelseNumber / 100);
    const garantiPremie = kontraktssumNumber * (rentesatsGarantiNumber / 100);
    const totalPremieBeregnet = utforelsesPremie + garantiPremie + etableringsgebyrNumber;

    // Sjekk om vi har nok data for å vise sammendrag
    const canShowSummary = beregning.kontraktssum && (beregning.totalPremie || (beregning.rentesatsUtforelse && beregning.rentesatsGaranti));

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header med handlinger */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <Calculator className="h-6 w-6" />
                        Premieberegning
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Beregn garantipremie basert på kontraktssum og perioder
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {beregning.manueltOverstyrt && (
                        <Badge variant="outline" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Manuell modus
                        </Badge>
                    )}
                    <Button
                        variant="outline"
                        onClick={handleAutomatiskBeregning}
                        disabled={isCalculating || !tilbud?.produkttype || !beregning.kontraktssum}
                    >
                        {isCalculating ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Beregn automatisk
                    </Button>
                    <Button
                        onClick={handleSaveBeregning}
                        disabled={isSaving || !beregning.kontraktssum}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Lagrer...' : 'Lagre beregning'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Venstre kolonne - Input */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Steg 1: Grunndata */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                    1
                                </span>
                                Grunndata
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="kontraktssum">
                                        Kontraktssum (NOK) *
                                    </Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="kontraktssum"
                                            type="text"
                                            value={beregning.kontraktssum}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleFieldChange('kontraktssum', e.target.value);
                                            }}
                                            onFocus={(e) => e.stopPropagation()}
                                            onBlur={(e) => e.stopPropagation()}
                                            onSelect={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                            }}
                                            onSelectCapture={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                            }}
                                            placeholder="1 000 000"
                                            className={`pl-10 ${errors.kontraktssum ? 'border-destructive' : ''}`}
                                        />
                                    </div>
                                    {errors.kontraktssum && (
                                        <p className="text-sm text-destructive">{errors.kontraktssum}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="etableringsgebyr">
                                        Etableringsgebyr (NOK)
                                    </Label>
                                    <div className="relative">
                                        <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="etableringsgebyr"
                                            type="text"
                                            value={beregning.etableringsgebyr}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleFieldChange('etableringsgebyr', e.target.value);
                                            }}
                                            onFocus={(e) => e.stopPropagation()}
                                            onBlur={(e) => e.stopPropagation()}
                                            onSelect={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                            }}
                                            onSelectCapture={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                            }}
                                            placeholder="5 000"
                                            className={`pl-10 ${errors.etableringsgebyr ? 'border-destructive' : ''}`}
                                        />
                                    </div>
                                    {errors.etableringsgebyr && (
                                        <p className="text-sm text-destructive">{errors.etableringsgebyr}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Steg 2: Perioder */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                    2
                                </span>
                                Perioder
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Utførelsesperiode */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="font-medium">Utførelsesperiode</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="startDato">Startdato</Label>
                                        <Input
                                            id="startDato"
                                            type="date"
                                            value={beregning.startDato}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleFieldChange('startDato', e.target.value);
                                            }}
                                            onFocus={(e) => e.stopPropagation()}
                                            onBlur={(e) => e.stopPropagation()}
                                            onSelect={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                            }}
                                            onSelectCapture={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                            }}
                                            className={errors.startDato ? 'border-destructive' : ''}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sluttDato">Sluttdato</Label>
                                        <Input
                                            id="sluttDato"
                                            type="date"
                                            value={beregning.sluttDato}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleFieldChange('sluttDato', e.target.value);
                                            }}
                                            onFocus={(e) => e.stopPropagation()}
                                            onBlur={(e) => e.stopPropagation()}
                                            onSelect={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                            }}
                                            onSelectCapture={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                            }}
                                            className={errors.sluttDato ? 'border-destructive' : ''}
                                        />
                                        {errors.sluttDato && (
                                            <p className="text-sm text-destructive">{errors.sluttDato}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="utforelsestid">Varighet (mnd)</Label>
                                        <Input
                                            id="utforelsestid"
                                            type="number"
                                            min="1"
                                            max="240"
                                            value={beregning.utforelsestid}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleFieldChange('utforelsestid', e.target.value);
                                            }}
                                            onFocus={(e) => e.stopPropagation()}
                                            onBlur={(e) => e.stopPropagation()}
                                            onSelect={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                            }}
                                            onSelectCapture={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                            }}
                                            placeholder="Auto"
                                            disabled={!beregning.manueltOverstyrt && beregning.startDato && beregning.sluttDato}
                                            className={`${errors.utforelsestid ? 'border-destructive' : ''} ${!beregning.manueltOverstyrt && beregning.startDato && beregning.sluttDato ? 'bg-muted' : ''
                                                }`}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Garantiperiode */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="font-medium">Garantiperiode</h4>
                                </div>
                                <div className="space-y-4">
                                    <ToggleGroup
                                        type="single"
                                        variant="outline"
                                        value={beregning.garantitid ? Math.round(parseInt(beregning.garantitid) / 12).toString() : ''}
                                        onValueChange={handleGarantitidChange}
                                        className="grid grid-cols-3 gap-2"
                                    >
                                        <ToggleGroupItem
                                            value="3"
                                            aria-label="3 år"
                                            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                        >
                                            3 år
                                        </ToggleGroupItem>
                                        <ToggleGroupItem
                                            value="5"
                                            aria-label="5 år"
                                            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                        >
                                            5 år
                                        </ToggleGroupItem>
                                        <ToggleGroupItem
                                            value="7"
                                            aria-label="7 år"
                                            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                        >
                                            7 år
                                        </ToggleGroupItem>
                                    </ToggleGroup>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="garantitid">Egendefinert (mnd)</Label>
                                            <Input
                                                id="garantitid"
                                                type="number"
                                                min="1"
                                                max="240"
                                                value={beregning.garantitid}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleFieldChange('garantitid', e.target.value);
                                                }}
                                                onFocus={(e) => e.stopPropagation()}
                                                onBlur={(e) => e.stopPropagation()}
                                                onSelect={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                }}
                                                onSelectCapture={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                }}
                                                placeholder="36"
                                                className={errors.garantitid ? 'border-destructive' : ''}
                                            />
                                        </div>
                                        {warrantyEndDate && (
                                            <div className="space-y-2">
                                                <Label>Utløper</Label>
                                                <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center">
                                                    <span className="text-sm">
                                                        {warrantyEndDate.toLocaleDateString('no-NO', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Steg 3: Avanserte innstillinger */}
                    <Card className={beregning.manueltOverstyrt ? 'border-amber-200' : ''}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-muted-foreground text-sm font-bold">
                                        3
                                    </span>
                                    Avanserte innstillinger
                                </CardTitle>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="manuell-overstyring"
                                        checked={beregning.manueltOverstyrt}
                                        onCheckedChange={(checked) =>
                                            handleFieldChange('manueltOverstyrt', checked)
                                        }
                                    />
                                    <label htmlFor="manuell-overstyring" className="text-sm font-medium cursor-pointer">
                                        Manuell overstyring
                                    </label>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {beregning.manueltOverstyrt ? (
                                <div className="space-y-4">
                                    <Alert className="border-amber-200 bg-amber-50">
                                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                                        <AlertDescription className="text-amber-800">
                                            Du kan nå overstyre alle beregnede verdier manuelt
                                        </AlertDescription>
                                    </Alert>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="rentesatsUtforelse">
                                                Rentesats utførelse (%)
                                            </Label>
                                            <Input
                                                id="rentesatsUtforelse"
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={beregning.rentesatsUtforelse}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleFieldChange('rentesatsUtforelse', e.target.value);
                                                }}
                                                onFocus={(e) => e.stopPropagation()}
                                                onBlur={(e) => e.stopPropagation()}
                                                onSelect={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                }}
                                                onSelectCapture={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                }}
                                                placeholder="0.50"
                                                className={errors.rentesatsUtforelse ? 'border-destructive' : ''}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="rentesatsGaranti">
                                                Rentesats garanti (%)
                                            </Label>
                                            <Input
                                                id="rentesatsGaranti"
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={beregning.rentesatsGaranti}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleFieldChange('rentesatsGaranti', e.target.value);
                                                }}
                                                onFocus={(e) => e.stopPropagation()}
                                                onBlur={(e) => e.stopPropagation()}
                                                onSelect={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                }}
                                                onSelectCapture={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                }}
                                                placeholder="0.25"
                                                className={errors.rentesatsGaranti ? 'border-destructive' : ''}
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <Label htmlFor="totalPremie">
                                                Total premie (NOK) - Overstyrt
                                            </Label>
                                            <Input
                                                id="totalPremie"
                                                type="number"
                                                min="0"
                                                step="100"
                                                value={beregning.totalPremie}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleFieldChange('totalPremie', e.target.value);
                                                }}
                                                onFocus={(e) => e.stopPropagation()}
                                                onBlur={(e) => e.stopPropagation()}
                                                onSelect={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                }}
                                                onSelectCapture={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                }}
                                                placeholder="Skriv inn manuell premie"
                                                className="text-lg"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        Rentesatser hentes automatisk fra produktkonfigurasjonen
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Høyre kolonne - Sammendrag */}
                <div className="lg:col-span-1">
                    <div className="sticky top-4 space-y-4">
                        {/* Resultat-kort */}
                        <Card className={hasCalculated ? 'border-green-200 shadow-lg' : ''}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Beregningsresultat
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {canShowSummary ? (
                                    <div className="space-y-4">
                                        {/* Hovedbeløp */}
                                        <div className="p-4 bg-primary/5 rounded-lg">
                                            <p className="text-sm text-muted-foreground mb-1">Total premie</p>
                                            <p className="text-3xl font-bold text-primary">
                                                {formatCurrency(beregning.totalPremie || totalPremieBeregnet)}
                                            </p>
                                        </div>

                                        {/* Breakdown */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center py-2 border-b">
                                                <span className="text-sm text-muted-foreground">Kontraktssum</span>
                                                <span className="font-medium">
                                                    {formatCurrency(kontraktssumNumber)}
                                                </span>
                                            </div>

                                            {beregning.rentesatsUtforelse && (
                                                <div className="flex justify-between items-center py-2 border-b">
                                                    <span className="text-sm text-muted-foreground">
                                                        Utførelsespremie ({beregning.rentesatsUtforelse}%)
                                                    </span>
                                                    <span className="font-medium">
                                                        {formatCurrency(utforelsesPremie)}
                                                    </span>
                                                </div>
                                            )}

                                            {beregning.rentesatsGaranti && (
                                                <div className="flex justify-between items-center py-2 border-b">
                                                    <span className="text-sm text-muted-foreground">
                                                        Garantipremie ({beregning.rentesatsGaranti}%)
                                                    </span>
                                                    <span className="font-medium">
                                                        {formatCurrency(garantiPremie)}
                                                    </span>
                                                </div>
                                            )}

                                            {etableringsgebyrNumber > 0 && (
                                                <div className="flex justify-between items-center py-2 border-b">
                                                    <span className="text-sm text-muted-foreground">
                                                        Etableringsgebyr
                                                    </span>
                                                    <span className="font-medium">
                                                        {formatCurrency(etableringsgebyrNumber)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Status */}
                                        {hasCalculated && (
                                            <div className="flex items-center gap-2 text-green-600 text-sm">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span>Beregning utført</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                        <p className="text-muted-foreground text-sm">
                                            Fyll inn kontraktssum og kjør beregning for å se resultat
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Produkt-info */}
                        {tilbud?.produkttype && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Produktinformasjon
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Produkttype</span>
                                            <Badge variant="outline">{tilbud.produkttype}</Badge>
                                        </div>
                                        {tilbud.prosjekttype && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Prosjekttype</span>
                                                <span className="text-sm font-medium">{tilbud.prosjekttype}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default TilbudBeregning; 