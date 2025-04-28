import React, { useState } from 'react';

// Shadcn UI og Lucide-ikoner
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Car, RefreshCcw, Timer } from 'lucide-react';

import {
    VETERANBIL_TARIFFER,
    AARSMODELL_GRUPPER,
    FORSIKRINGSSUMMER,
    DEKNINGSTYPER,
    VETERANBIL_CUTOFF_YEAR
} from './constants/veterankjoeretoyTariffData';
import { formatCurrency } from '../../utils/formatUtils';

function VeterankjoeretoyCalculator() {
    const [formData, setFormData] = useState({
        aarsmodell: '',
        forsikringssum: '',
        dekningstype: ''
    });

    // Handler for select-felt
    const handleSelectChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Reset-funksjon
    const handleReset = () => {
        setFormData({
            aarsmodell: '',
            forsikringssum: '',
            dekningstype: ''
        });
    };

    // Beregn årspremie basert på brukervalg
    const calculatePremium = () => {
        const { aarsmodell, forsikringssum, dekningstype } = formData;

        // Sjekk at alle nødvendige felt er fylt ut
        if (!aarsmodell || !forsikringssum || !dekningstype) {
            return { total: 0 };
        }

        // Slå opp direkte i tariff-tabellen
        const premie = VETERANBIL_TARIFFER[aarsmodell]?.[forsikringssum]?.[dekningstype];

        return {
            total: premie || 0,
            details: {
                aarsmodell: AARSMODELL_GRUPPER.find(gruppe => gruppe.value === aarsmodell)?.label || aarsmodell,
                forsikringssum: FORSIKRINGSSUMMER.find(sum => sum.value === forsikringssum)?.label || forsikringssum,
                dekningstype: DEKNINGSTYPER[dekningstype] || dekningstype
            }
        };
    };

    const premiumResult = calculatePremium();

    return (
        <div className="w-full max-w-5xl mx-auto my-8 space-y-8">
            {/* Header Card */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                            <Timer className="h-8 w-8 text-primary" />
                            <div>
                                <CardTitle className="text-2xl font-semibold">Veterankjøretøy</CardTitle>
                                <CardDescription>Beregn forsikringspremie for veterankjøretøy ({VETERANBIL_CUTOFF_YEAR} og eldre)</CardDescription>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <Button variant="outline" size="sm">Se tegningsregler</Button>
                            <Button
                                onClick={handleReset}
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                            >
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

                                {/* Årsmodell */}
                                <div className="space-y-2 mb-4">
                                    <Label htmlFor="aarsmodell">Årsmodell</Label>
                                    <Select
                                        name="aarsmodell"
                                        value={formData.aarsmodell}
                                        onValueChange={(value) => handleSelectChange('aarsmodell', value)}
                                    >
                                        <SelectTrigger id="aarsmodell">
                                            <SelectValue placeholder="Velg årsmodell" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {AARSMODELL_GRUPPER.map((gruppe) => (
                                                    <SelectItem key={gruppe.value} value={gruppe.value}>
                                                        {gruppe.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Forsikringssum */}
                                <div className="space-y-2 mb-4">
                                    <Label htmlFor="forsikringssum">Forsikringssum (1. risiko)</Label>
                                    <Select
                                        name="forsikringssum"
                                        value={formData.forsikringssum}
                                        onValueChange={(value) => handleSelectChange('forsikringssum', value)}
                                        disabled={!formData.aarsmodell}
                                    >
                                        <SelectTrigger id="forsikringssum">
                                            <SelectValue placeholder="Velg forsikringssum" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {FORSIKRINGSSUMMER.map((sum) => (
                                                    <SelectItem key={sum.value} value={sum.value}>
                                                        {sum.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </section>

                            {/* Seksjon: Dekning */}
                            <section>
                                <h3 className="text-lg font-semibold mb-4">Dekning</h3>
                                <div className="space-y-2">
                                    <Label className={!formData.forsikringssum ? 'text-muted-foreground' : ''}>Dekningstype</Label>
                                    <ToggleGroup
                                        type="single"
                                        variant="outline"
                                        value={formData.dekningstype}
                                        onValueChange={(value) => { if (value) handleSelectChange('dekningstype', value); }}
                                        className="flex flex-wrap justify-start"
                                        disabled={!formData.forsikringssum}
                                    >
                                        {Object.entries(DEKNINGSTYPER).map(([key, label]) => (
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
                                <div className="mt-6 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
                                    <p className="font-medium">Merk:</p>
                                    <ul className="list-disc list-inside space-y-1 mt-1">
                                        <li>Priser er inklusiv fører- og passasjerulykke</li>
                                        <li>Veterankjøretøy gjelder for biler fra {VETERANBIL_CUTOFF_YEAR} og eldre</li>
                                        <li>Leiebil og Ekstra trygghet tilbys ikke</li>
                                        <li>For forsikringssum over 500 000 kr, kontakt UW</li>
                                    </ul>
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
                                    {/* Detaljer */}
                                    <div className="text-sm space-y-3">
                                        <div className="space-y-1">
                                            <h4 className="font-medium text-muted-foreground mb-1">Valgt dekning</h4>
                                            <p>{premiumResult.details.dekningstype}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-medium text-muted-foreground mb-1">Detaljer</h4>
                                            <div className="flex justify-between">
                                                <span>Årsmodell:</span>
                                                <span>{premiumResult.details.aarsmodell}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Forsikringssum:</span>
                                                <span>{premiumResult.details.forsikringssum}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-24 bg-muted/50 rounded-lg border border-dashed">
                                    <p className="text-center text-muted-foreground">Fyll ut alle feltene for å se pris.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}

export default VeterankjoeretoyCalculator; 