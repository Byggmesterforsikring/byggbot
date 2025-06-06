import React, { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Calculator, Calendar, DollarSign, Save, RefreshCw, AlertTriangle, Info, Clock } from 'lucide-react';
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
        }
    }, [tilbud]);

    // Automatisk beregning av utførelsestid når startDato eller sluttDato endres
    useEffect(() => {
        if (beregning.startDato && beregning.sluttDato) {
            const months = calculateMonthsBetween(beregning.startDato, beregning.sluttDato);
            if (months && months !== parseInt(beregning.utforelsestid)) {
                setBeregning(prev => ({ ...prev, utforelsestid: months.toString() }));
            }
        }
    }, [beregning.startDato, beregning.sluttDato]);

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
        if (!beregning.startDato || !beregning.sluttDato) {
            toast({
                title: "Manglende utførelsestid",
                description: "Startdato og sluttdato er påkrevd",
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

        if (!beregning.kontraktssum) {
            toast({
                title: "Mangler kontraktssum",
                description: "Kontraktssum er påkrevd",
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Beregning</h2>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleAutomatiskBeregning}
                        disabled={isCalculating || !tilbud?.produkttype}
                    >
                        {isCalculating ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Calculator className="h-4 w-4 mr-2" />
                        )}
                        Automatisk beregning
                    </Button>
                    <Button
                        onClick={handleSaveBeregning}
                        disabled={isSaving}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Lagrer...' : 'Lagre'}
                    </Button>
                </div>
            </div>

            {/* Manuell overstyring */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Beregningsmodus</span>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="manuell-overstyring"
                                checked={beregning.manueltOverstyrt}
                                onCheckedChange={(checked) =>
                                    handleFieldChange('manueltOverstyrt', checked)
                                }
                            />
                            <label htmlFor="manuell-overstyring" className="text-sm text-muted-foreground cursor-pointer">
                                Manuell overstyring
                            </label>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {beregning.manueltOverstyrt ? (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Manuell overstyring er aktivert. Du kan overstyre alle beregnede verdier.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Automatisk modus er aktivert. Rentesatser hentes fra produktkonfigurasjon.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Grunnlagsdata */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Grunnlagsdata
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Kontraktssum (NOK) *
                            </label>
                            <Input
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
                                placeholder="1 000 000"
                                className={errors.kontraktssum ? 'border-destructive' : ''}
                            />
                            {errors.kontraktssum && (
                                <p className="text-sm text-destructive mt-1">{errors.kontraktssum}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Etableringsgebyr (NOK)
                            </label>
                            <Input
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
                                placeholder="5 000"
                                className={errors.etableringsgebyr ? 'border-destructive' : ''}
                            />
                            {errors.etableringsgebyr && (
                                <p className="text-sm text-destructive mt-1">{errors.etableringsgebyr}</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Utførelsestid */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Utførelsestid
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                    Startdato *
                                </label>
                                <Input
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
                                    className={errors.startDato ? 'border-destructive' : ''}
                                />
                                {errors.startDato && (
                                    <p className="text-sm text-destructive mt-1">{errors.startDato}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                    Sluttdato *
                                </label>
                                <Input
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
                                    className={errors.sluttDato ? 'border-destructive' : ''}
                                />
                                {errors.sluttDato && (
                                    <p className="text-sm text-destructive mt-1">{errors.sluttDato}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Utførelsestid (måneder)
                            </label>
                            <Input
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
                                placeholder="Beregnes automatisk fra start/sluttdato"
                                className={`${errors.utforelsestid ? 'border-destructive' : ''} ${beregning.startDato && beregning.sluttDato ? 'bg-muted' : ''}`}
                                readOnly={beregning.startDato && beregning.sluttDato}
                            />
                            {errors.utforelsestid && (
                                <p className="text-sm text-destructive mt-1">{errors.utforelsestid}</p>
                            )}
                            {beregning.startDato && beregning.sluttDato && beregning.utforelsestid && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    Automatisk beregnet fra valgte datoer
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Garantitid */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Garantitid
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Velg garantitid
                            </label>
                            <ToggleGroup
                                type="single"
                                variant="outline"
                                value={beregning.garantitid ? Math.round(parseInt(beregning.garantitid) / 12).toString() : ''}
                                onValueChange={handleGarantitidChange}
                                className="flex flex-wrap justify-start"
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
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Garantitid (måneder)
                            </label>
                            <Input
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
                                placeholder="36"
                                className={errors.garantitid ? 'border-destructive' : ''}
                            />
                            {errors.garantitid && (
                                <p className="text-sm text-destructive mt-1">{errors.garantitid}</p>
                            )}
                        </div>

                        {/* Garantiutløpsdato */}
                        {warrantyEndDate && (
                            <div className="bg-muted/50 p-3 rounded-md">
                                <div className="flex items-center gap-2 text-sm">
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Garantitid utløper:</span>
                                    <Badge variant="outline" className="font-medium">
                                        {warrantyEndDate.toLocaleDateString('no-NO', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </Badge>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Rentesatser og premie */}
            <Card>
                <CardHeader>
                    <CardTitle>Rentesatser og premie</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Rentesats utførelse (%)
                            </label>
                            <Input
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
                                placeholder="0.50"
                                disabled={!beregning.manueltOverstyrt}
                                className={errors.rentesatsUtforelse ? 'border-destructive' : ''}
                            />
                            {errors.rentesatsUtforelse && (
                                <p className="text-sm text-destructive mt-1">{errors.rentesatsUtforelse}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Rentesats garanti (%)
                            </label>
                            <Input
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
                                placeholder="0.25"
                                disabled={!beregning.manueltOverstyrt}
                                className={errors.rentesatsGaranti ? 'border-destructive' : ''}
                            />
                            {errors.rentesatsGaranti && (
                                <p className="text-sm text-destructive mt-1">{errors.rentesatsGaranti}</p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Total premie (NOK)
                            </label>
                            <div className="relative">
                                <Input
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
                                    placeholder="Beregnes automatisk"
                                    disabled={!beregning.manueltOverstyrt}
                                    className="text-lg font-semibold"
                                />
                                {beregning.totalPremie && (
                                    <Badge
                                        variant="secondary"
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                                    >
                                        {formatCurrency(beregning.totalPremie)}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
});

export default TilbudBeregning; 