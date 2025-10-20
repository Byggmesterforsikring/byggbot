import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
    Building2,
    Home,
    Building,
    Store,
    Layers,
    Route,
    HelpCircle
} from 'lucide-react';

const PROSJEKT_TYPER = [
    {
        id: 'Boligblokk',
        navn: 'Boligblokk',
        beskrivelse: 'Fleretasjes boligbygg med mange enheter',
        ikon: Building2,
        harEnheter: true,
        typiskAntall: { min: 20, max: 200 },
        enhetLabel: 'leiligheter',
        eksempler: 'Blokkleiligheter, høyhus'
    },
    {
        id: 'Rekkehus',
        navn: 'Rekkehus/Småhus',
        beskrivelse: 'Sammenbygde eller frittstående småhus',
        ikon: Home,
        harEnheter: true,
        typiskAntall: { min: 4, max: 20 },
        enhetLabel: 'boenheter',
        eksempler: 'Rekkehus, kjedehus, tomannsboliger'
    },
    {
        id: 'Enebolig',
        navn: 'Enebolig',
        beskrivelse: 'Enkeltstående bolig for én familie',
        ikon: Home,
        harEnheter: true,
        typiskAntall: { min: 1, max: 1 },
        enhetLabel: 'boenhet',
        eksempler: 'Villa, enebolig'
    },
    {
        id: 'Naeringsbygg',
        navn: 'Næringsbygg',
        beskrivelse: 'Bygg for kommersiell virksomhet',
        ikon: Store,
        harEnheter: true,
        typiskAntall: null,
        enhetLabel: 'seksjoner/enheter',
        eksempler: 'Kontor, butikk, lager, hotell'
    },
    {
        id: 'Kombinasjonsbygg',
        navn: 'Kombinasjonsbygg',
        beskrivelse: 'Blanding av bolig og næring',
        ikon: Layers,
        harEnheter: true,
        typiskAntall: null,
        enhetLabel: 'enheter',
        eksempler: 'Bolig med næring i 1. etasje'
    },
    {
        id: 'Infrastruktur',
        navn: 'Infrastruktur',
        beskrivelse: 'Vei, bro, tunnel og andre anlegg',
        ikon: Route,
        harEnheter: false,
        eksempler: 'Veiprosjekt, bro, tunnel, kai'
    },
    {
        id: 'Annet',
        navn: 'Annet',
        beskrivelse: 'Andre typer prosjekter',
        ikon: HelpCircle,
        harEnheter: true,
        typiskAntall: null,
        enhetLabel: 'enheter',
        eksempler: 'Spesialprosjekter'
    }
];

function ProsjektTypeVelger({ selectedType, onTypeChange, antallEnheter, onAntallEnheterChange, disabled = false }) {
    const [lokalAntall, setLokalAntall] = useState(antallEnheter || '');

    useEffect(() => {
        setLokalAntall(antallEnheter || '');
    }, [antallEnheter]);

    const selectedTypeInfo = PROSJEKT_TYPER.find(t => t.id === selectedType);

    const handleAntallChange = (value) => {
        console.log('handleAntallChange called with:', value);
        // Tillat kun tall
        if (value === '' || /^\d+$/.test(value)) {
            setLokalAntall(value);
            if (onAntallEnheterChange) {
                onAntallEnheterChange(value);
            }
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Prosjekttype og omfang</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Kompakt grid for prosjekttyper */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {PROSJEKT_TYPER.map((type) => {
                        const isSelected = selectedType === type.id;
                        const Icon = type.ikon;

                        return (
                            <button
                                key={type.id}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTypeChange(type.id);
                                }}
                                onFocus={(e) => e.stopPropagation()}
                                disabled={disabled}
                                className={`
                                    p-3 rounded-md border transition-all text-center
                                    ${isSelected
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                    }
                                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                                title={type.beskrivelse}
                            >
                                <Icon className={`h-5 w-5 mx-auto mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                <p className="text-xs font-medium line-clamp-1">{type.navn}</p>
                            </button>
                        );
                    })}
                </div>

                {selectedType && selectedTypeInfo && (
                    <div className="space-y-3">
                        {/* Beskrivelse og antall enheter på samme linje */}
                        <div className="flex flex-col md:flex-row md:items-end gap-4">
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">
                                    {selectedTypeInfo.beskrivelse}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Eksempler: {selectedTypeInfo.eksempler}
                                </p>
                            </div>

                            {/* Antall enheter input */}
                            {selectedTypeInfo.harEnheter && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onSelect={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }}
                                    onSelectCapture={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }}
                                    className="flex items-end gap-3"
                                >
                                    <div className="space-y-1.5">
                                        <Label htmlFor="antall-enheter" className="text-xs">
                                            Antall {selectedTypeInfo.enhetLabel || 'enheter'} *
                                        </Label>
                                        <Input
                                            id="antall-enheter"
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={lokalAntall}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleAntallChange(e.target.value);
                                            }}
                                            onSelect={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                            }}
                                            onSelectCapture={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                            }}
                                            placeholder={
                                                selectedTypeInfo.typiskAntall
                                                    ? `${selectedTypeInfo.typiskAntall.min === selectedTypeInfo.typiskAntall.max
                                                        ? selectedTypeInfo.typiskAntall.min
                                                        : `${selectedTypeInfo.typiskAntall.min}-${selectedTypeInfo.typiskAntall.max}`}`
                                                    : 'Antall'
                                            }
                                            disabled={disabled}
                                            className="w-24"
                                        />
                                    </div>
                                    {lokalAntall && (
                                        <Badge variant="secondary" className="mb-0.5">
                                            {lokalAntall} {parseInt(lokalAntall) === 1
                                                ? selectedTypeInfo.enhetLabel?.replace(/er$/, '') || 'enhet'
                                                : selectedTypeInfo.enhetLabel || 'enheter'}
                                        </Badge>
                                    )}
                                </form>
                            )}
                        </div>

                        {/* Validering feedback */}
                        {selectedTypeInfo.typiskAntall && lokalAntall && (
                            <p className="text-xs text-muted-foreground">
                                {parseInt(lokalAntall) < selectedTypeInfo.typiskAntall.min &&
                                    `💡 Færre enn typisk for ${selectedTypeInfo.navn.toLowerCase()} (typisk ${selectedTypeInfo.typiskAntall.min}+)`}
                                {parseInt(lokalAntall) > selectedTypeInfo.typiskAntall.max &&
                                    `💡 Flere enn typisk for ${selectedTypeInfo.navn.toLowerCase()} (typisk maks ${selectedTypeInfo.typiskAntall.max})`}
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default ProsjektTypeVelger; 