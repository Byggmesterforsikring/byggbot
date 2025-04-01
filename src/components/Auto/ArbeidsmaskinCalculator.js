import React, { useState } from 'react';
// Fjernet MUI imports

// Shadcn UI og Lucide-ikoner
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Checkbox } from "../ui/checkbox";
import { Separator } from "../ui/separator";
import { Construction, RefreshCcw } from 'lucide-react'; // Bruker Construction og RefreshCcw
import { formatCurrency } from '../../utils/formatUtils';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "../ui/alert-dialog";

// Fjernet MUI ikon-import

// Beholder denne for beregningslogikk og mapping
const INTERNAL_VEHICLE_TYPES = {
  SMALL_EXCAVATOR: 'Gravemaskin / Hjullaster - inntil 3,5t',
  MEDIUM_EXCAVATOR: 'Gravemaskin / Hjullaster - 3,5-7,5t',
  LARGE_EXCAVATOR: 'Gravemaskin / Hjullaster - 7,5-15t',
  XLARGE_EXCAVATOR: 'Gravemaskin / Hjullaster - +15t',
  TRACTOR: 'Traktor',
  WAREHOUSE_TRUCK: 'Truck (Lager)',
  TELESCOPIC_TRUCK: 'Teleskoptruck (Manitou og lignende)',
};

// Nye konstanter for 2-stegs valg
const PRIMARY_TYPES = {
  EXCAVATOR: 'Gravemaskin / Hjullaster',
  TRACTOR: 'Traktor',
  TRUCK: 'Truck'
};

const EXCAVATOR_SUBTYPES = {
  SMALL_EXCAVATOR: 'inntil 3,5t',
  MEDIUM_EXCAVATOR: '3,5-7,5t',
  LARGE_EXCAVATOR: '7,5-15t',
  XLARGE_EXCAVATOR: '+15t'
};

const TRUCK_SUBTYPES = {
  WAREHOUSE_TRUCK: 'Lager',
  TELESCOPIC_TRUCK: 'Teleskoptruck (Manitou o.l.)'
};

const COVERAGE_TYPES = {
  LIABILITY: 'Ansvar',
  FIRE_THEFT: 'Brann/Tyveri',
  KASKO: 'Kasko',
};

const EXTRAS = [
  { id: 'driverAccident', label: 'Fører- og passasjerulykke', price: 210 },
  { id: 'leasing', label: 'Leasing / 3.mannsinteresse', price: 199 },
  { id: 'limitedIdentification', label: 'Begrenset identifikasjon', price: 245 },
  { id: 'craneLiability', label: 'Kranansvar', price: 1700 },
  { id: 'snowPlowing', label: 'Snøbrøyting', price: 1450 },
];

function ArbeidsmaskinCalculator() {
  const [formData, setFormData] = useState({
    vehicleType: '', // Holder den endelige, spesifikke typen (f.eks. MEDIUM_EXCAVATOR)
    value: '',
    coverageType: '',
    extras: ['driverAccident'],
  });
  const [primaryType, setPrimaryType] = useState(''); // Ny state: 'EXCAVATOR', 'TRACTOR', 'TRUCK'
  const [showHighValueAlert, setShowHighValueAlert] = useState(false);

  const handleReset = () => {
    setFormData({
      vehicleType: '',
      value: '',
      coverageType: '',
      extras: ['driverAccident'],
    });
    setPrimaryType(''); // Nullstill også primærtype
  };

  // Generell handler for de fleste felt (value, coverageType)
  const handleFormChange = (name, value) => {
    setFormData((prevData) => {
      let newExtras = [...prevData.extras];
      if (name === 'coverageType' && value !== 'KASKO' && prevData.coverageType === 'KASKO') {
        newExtras = newExtras.filter(
          (extraId) => !['leasing', 'craneLiability'].includes(extraId)
        );
      }

      // Sjekk for høy verdi når value endres
      if (name === 'value') {
        const numericValue = parseFloat(value.replace(/\D/g, '')) || 0;
        if (numericValue > 1000000) { // 1 MNOK
          setShowHighValueAlert(true);
        }
      }

      return {
        ...prevData,
        [name]: name === 'value' ? value.replace(/\D/g, '') : value,
        extras: newExtras,
      };
    });
  };

  // Handler for primær ToggleGroup
  const handlePrimaryTypeChange = (newPrimaryType) => {
    if (!newPrimaryType) return; // Ikke gjør noe hvis man klikker av

    setPrimaryType(newPrimaryType);

    // Hvis Traktor er valgt, sett endelig type direkte
    if (newPrimaryType === 'TRACTOR') {
      setFormData((prevData) => ({ ...prevData, vehicleType: 'TRACTOR' }));
    } else {
      // Ellers, nullstill endelig type til undertype er valgt
      setFormData((prevData) => ({ ...prevData, vehicleType: '' }));
    }
  };

  // Handler for sekundær ToggleGroup (setter den endelige vehicleType)
  const handleSecondaryTypeChange = (finalVehicleTypeKey) => {
    if (!finalVehicleTypeKey) return; // Ikke gjør noe hvis man klikker av
    setFormData((prevData) => ({ ...prevData, vehicleType: finalVehicleTypeKey }));
  };

  // Samme som i TrailerCalculator
  const formatNumber = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Oppdatert for Shadcn Checkbox (mottar checked-verdi)
  const handleExtraChange = (extraId, checked) => {
    setFormData((prevData) => {
      const newExtras = checked
        ? [...prevData.extras, extraId]
        : prevData.extras.filter((id) => id !== extraId);
      return { ...prevData, extras: newExtras };
    });
  };

  // Logikk forblir den samme
  const shouldShowExtra = (extraId) => {
    if (extraId === 'leasing' || extraId === 'craneLiability') {
      return formData.coverageType === 'KASKO';
    }
    return true;
  };

  // Logikk forblir den samme, men pass på at value er et tall
  const calculatePremiums = () => {
    const { vehicleType, value, coverageType, extras } = formData;
    const numericValue = parseFloat(value) || 0;

    let liability = 0;
    let fireTheft = 0;
    let kasko = 0;

    switch (vehicleType) {
      case 'SMALL_EXCAVATOR':
        liability = 1923;
        fireTheft = numericValue * 0.0105084;
        kasko = numericValue * 0.007506;
        break;
      case 'MEDIUM_EXCAVATOR':
        liability = 3078;
        fireTheft = numericValue * 0.007506;
        kasko = numericValue * 0.0060048;
        break;
      case 'LARGE_EXCAVATOR':
        liability = 3847;
        fireTheft = numericValue * 0.007506;
        kasko = numericValue * 0.0060048;
        break;
      case 'XLARGE_EXCAVATOR':
        liability = 4616;
        fireTheft = numericValue * 0.007506;
        kasko = numericValue * 0.0060048;
        break;
      case 'TRACTOR':
        liability = 2308;
        fireTheft = numericValue * 0.0052542;
        kasko = numericValue * 0.0045036;
        break;
      case 'WAREHOUSE_TRUCK':
        liability = 1154;
        fireTheft = numericValue * 0.0052542;
        kasko = numericValue * 0.0052542;
        break;
      case 'TELESCOPIC_TRUCK':
        liability = 2308;
        fireTheft = numericValue * 0.0052542;
        kasko = numericValue * 0.0052542;
        break;
      default:
        break;
    }

    let coverageBasedTotal = 0;
    if (coverageType === 'LIABILITY') {
      coverageBasedTotal = liability;
    } else if (coverageType === 'FIRE_THEFT') {
      coverageBasedTotal = liability + fireTheft;
    } else if (coverageType === 'KASKO') {
      coverageBasedTotal = liability + fireTheft + kasko;
    }

    const extrasCost = extras.reduce((sum, extraId) => {
      const extra = EXTRAS.find((e) => e.id === extraId);
      return sum + (extra ? extra.price : 0);
    }, 0);

    return {
      liability: Math.round(liability),
      fireTheft: Math.round(fireTheft),
      kasko: Math.round(kasko),
      total: Math.round(coverageBasedTotal + extrasCost),
      extrasCost: Math.round(extrasCost),
    };
  };

  const premiums = calculatePremiums();
  const numericValue = parseFloat(formData.value) || 0;

  return (
    <div className="w-full max-w-6xl mx-auto my-8 space-y-8"> {/* Litt bredere? */}
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-3">
              <Construction className="h-8 w-8 text-primary" /> {/* Ikon */}
              <div>
                <CardTitle className="text-2xl font-semibold">Arbeidsmaskin</CardTitle>
                <CardDescription>Beregn forsikringspremie for arbeidsmaskiner</CardDescription>
              </div>
            </div>
            {/* Nullstill knapp */}
            <Button onClick={handleReset} variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Nullstill
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Grid for Input og Resultat (7/5 splitt) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Venstre kolonne: Input Card */}
        <div className="lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle>Informasjon om arbeidsmaskin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Steg 1: Hovedtype (ToggleGroup) */}
              <div className="space-y-2">
                <Label>Type arbeidsmaskin</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={primaryType}
                  onValueChange={handlePrimaryTypeChange}
                  className="flex flex-wrap justify-start"
                >
                  {Object.entries(PRIMARY_TYPES).map(([key, label]) => (
                    <ToggleGroupItem key={key} value={key} aria-label={label} className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      {label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {/* Steg 2: Undertype (Vises kun for EXCAVATOR eller TRUCK) */}
              {primaryType === 'EXCAVATOR' && (
                <div className="space-y-2 pl-4 border-l-2 border-muted ml-2">
                  <Label className="text-sm text-muted-foreground">Velg vektklasse</Label>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={formData.vehicleType} // Bruker den endelige vehicleType her
                    onValueChange={handleSecondaryTypeChange}
                    className="flex flex-wrap justify-start"
                  >
                    {Object.entries(EXCAVATOR_SUBTYPES).map(([key, label]) => (
                      <ToggleGroupItem key={key} value={key} aria-label={label} className="text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        {label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              )}
              {primaryType === 'TRUCK' && (
                <div className="space-y-2 pl-4 border-l-2 border-muted ml-2">
                  <Label className="text-sm text-muted-foreground">Velg trucktype</Label>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={formData.vehicleType}
                    onValueChange={handleSecondaryTypeChange}
                    className="flex flex-wrap justify-start"
                  >
                    {Object.entries(TRUCK_SUBTYPES).map(([key, label]) => (
                      <ToggleGroupItem key={key} value={key} aria-label={label} className="text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        {label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              )}

              {/* Verdi (Input) - Deaktivert til ENDELIG vehicleType er satt */}
              <div className="space-y-2">
                <Label htmlFor="machineValue" className={!formData.vehicleType ? 'text-muted-foreground' : ''}>Verdi (kr)</Label>
                <Input
                  id="machineValue"
                  name="value" // Viktig at name er "value" for handleFormChange
                  value={formatNumber(formData.value)} // Bruker formatert verdi
                  onChange={(e) => handleFormChange('value', e.target.value)} // Sender råverdi til handler
                  placeholder="F.eks. 500000"
                  type="text" // Bruk text for å tillate formatNumber
                  inputMode="numeric" // Hjelper mobil-tastatur
                  className="focus-visible:outline-none"
                  disabled={!formData.vehicleType} // Deaktiver hvis endelig type ikke er valgt
                />
              </div>

              {/* Dekningstype (ToggleGroup) - Deaktivert til verdi er satt */}
              <div className="space-y-2">
                <Label className={!formData.value ? 'text-muted-foreground' : ''}>Dekning</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={formData.coverageType}
                  onValueChange={(value) => { if (value) handleFormChange('coverageType', value); }}
                  className="flex flex-wrap justify-start"
                  disabled={!formData.value} // Deaktiver hvis verdi ikke er satt
                >
                  {Object.entries(COVERAGE_TYPES).map(([key, label]) => (
                    <ToggleGroupItem key={key} value={key} aria-label={label} className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      {label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {/* Tillegg (Checkboxes) - TODO */}
              <div className="space-y-2">
                <Label className={`font-medium ${!formData.coverageType ? 'text-muted-foreground' : ''}`}>Tilleggsdekninger</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {/* Map over EXTRAS, filtrert basert på shouldShowExtra */}
                  {EXTRAS.filter(extra => shouldShowExtra(extra.id)).map(extra => {
                    // Forenklet deaktiveringslogikk: Kun deaktivert hvis ingen dekning er valgt
                    const isCheckboxDisabled =
                      !formData.coverageType;
                    return (
                      <div key={extra.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={extra.id}
                          checked={formData.extras.includes(extra.id)}
                          onCheckedChange={(checked) => handleExtraChange(extra.id, checked)}
                          disabled={isCheckboxDisabled}
                        />
                        <Label htmlFor={extra.id} className={`text-sm font-normal ${isCheckboxDisabled ? 'text-muted-foreground' : ''}`}>
                          {extra.label}
                          {extra.price > 0 && <span className="text-muted-foreground text-xs ml-1">({formatCurrency(extra.price)})</span>}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Høyre kolonne: Resultat Card - TODO */}
        <div className="lg:col-span-5">
          {/* TODO: Resultat Card her, lignende TrailerCalculator */}
          {(numericValue > 0 && formData.coverageType) ? (
            <Card className="sticky top-8 bg-card border">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Beregnet årspremie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Totalpris */}
                <div className="bg-primary p-4 rounded-md mb-4">
                  <p className="text-3xl font-bold text-center text-primary-foreground">{formatCurrency(premiums.total)}</p>
                </div>
                <Separator />
                {/* Dekningsfordeling */}
                <div className="text-sm space-y-1">
                  <h4 className="font-medium text-muted-foreground mb-2">Fordeling (ca.)</h4>
                  {premiums.liability > 0 && (
                    <div className="flex justify-between">
                      <span>Ansvar:</span>
                      <span>{formatCurrency(premiums.liability)}</span>
                    </div>
                  )}
                  {premiums.fireTheft > 0 && formData.coverageType !== 'LIABILITY' && (
                    <div className="flex justify-between">
                      <span>Brann/Tyveri:</span>
                      <span>{formatCurrency(premiums.fireTheft)}</span>
                    </div>
                  )}
                  {premiums.kasko > 0 && formData.coverageType === 'KASKO' && (
                    <div className="flex justify-between">
                      <span>Kasko:</span>
                      <span>{formatCurrency(premiums.kasko)}</span>
                    </div>
                  )}
                  {premiums.extrasCost > 0 && (
                    <div className="flex justify-between font-medium pt-1 border-t mt-1">
                      <span>Tillegg:</span>
                      <span>{formatCurrency(premiums.extrasCost)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="sticky top-8 flex items-center justify-center h-48 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-center text-muted-foreground">Fyll ut type, verdi og dekning for å se pris.</p>
            </div>
          )}
        </div>

      </div>

      {/* High Value Alert Dialog */}
      <AlertDialog open={showHighValueAlert} onOpenChange={setShowHighValueAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Høy verdi på arbeidsmaskin</AlertDialogTitle>
            <AlertDialogDescription>
              Verdien på arbeidsmaskinen overstiger 1 MNOK. Dette må avklares med Underwriting før forsikring kan tegnes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowHighValueAlert(false)}>Forstått</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default ArbeidsmaskinCalculator;
