import React, { useState } from 'react';

// Shadcn UI og Lucide-ikoner
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input"; // Brukes ikke direkte her, men kan være nyttig for andre felt senere
import { Label } from "../ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Car, Truck, Zap, Tag, RefreshCcw } from 'lucide-react'; // Lagt til flere ikoner

import {
  VEHICLE_TYPES,
  COVERAGE_TYPES,
  BONUS_LEVELS,
  BUDGET_CAR_BRANDS,
  MILEAGE_OPTIONS,
  EXTRAS,
  TARIFFS,
  BUDGET_TARIFFS
} from './constants/tariffData';
import { formatCurrency } from '../../utils/formatUtils'; // Antar at denne finnes

function AutoCalculator() {
  const [formData, setFormData] = useState({
    vehicleType: '',
    carBrand: '',
    mileage: '',
    coverage: '',
    bonusLevel: '',
    extras: ['driverAccident'] // Førerulykke er standard
  });

  // Oppdatert handleChange for å håndtere Shadcn Select 'onValueChange'
  const handleSelectChange = (name, value) => {
    setFormData(prevData => {
      let newData = {
        ...prevData,
        [name]: value
      };

      // Hvis dekningstype endres og ikke er FULL_KASKO lenger
      if (name === 'coverage' && value !== 'FULL_KASKO') {
        // Fjern BilEkstra og leiebil-tillegg
        newData.extras = prevData.extras.filter(extraId =>
          !['bilEkstra', 'rentalCar15', 'rentalCar30'].includes(extraId)
        );
      }

      // Reset carBrand hvis vehicleType ikke er BUDGET
      if (name === 'vehicleType' && value !== 'BUDGET') {
        newData.carBrand = '';
      }

      return newData;
    });
  };

  // Oppdatert handleExtraChange for å håndtere Shadcn Checkbox 'onCheckedChange'
  const handleExtraChange = (extraId, checked) => {
    setFormData(prevData => {
      let newExtras = [...prevData.extras];
      const isCurrentlyChecked = prevData.extras.includes(extraId);

      // Samme logikk som før, men bruker 'checked' direkte
      if (extraId === 'bilEkstra') {
        if (checked) {
          // Når BilEkstra velges
          newExtras.push(extraId);
          // Legg til leiebil30 hvis den ikke allerede er valgt
          if (!newExtras.includes('rentalCar30')) {
            newExtras = newExtras.filter(id => id !== 'rentalCar15');
            newExtras.push('rentalCar30');
          }
        } else {
          // Når BilEkstra fjernes
          newExtras = newExtras.filter(id => id !== extraId);
        }
      } else if (extraId === 'rentalCar30' && !checked && prevData.extras.includes('bilEkstra')) {
        // Hindre fjerning av leiebil30 når BilEkstra er aktiv
        return prevData;
      } else if (extraId === 'rentalCar15' && checked && prevData.extras.includes('bilEkstra')) {
        // Hindre valg av leiebil15 når BilEkstra er aktiv
        return prevData;
      } else if (extraId === 'rentalCar15' || extraId === 'rentalCar30') {
        // Fjern begge leiebilvalgene først
        newExtras = newExtras.filter(id => id !== 'rentalCar15' && id !== 'rentalCar30');
        // Legg til det valgte hvis det ble sjekket av
        if (checked) {
          newExtras.push(extraId);
        }
      } else {
        // Standard håndtering for andre tillegg
        if (checked) {
          if (!isCurrentlyChecked) {
            newExtras.push(extraId);
          }
        } else {
          newExtras = newExtras.filter(id => id !== extraId);
        }
      }

      return {
        ...prevData,
        extras: newExtras
      };
    });
  };

  const shouldShowExtra = (extraId) => {
    const isKasko = formData.coverage === 'FULL_KASKO';

    switch (extraId) {
      case 'driverAccident':
        return true;
      case 'craneLiability':
        return formData.vehicleType === 'TRUCK';
      case 'rentalCar15':
      case 'rentalCar30':
        return isKasko;
      case 'leasing':
        return isKasko;
      case 'bilEkstra':
        return isKasko;
      default:
        return true;
    }
  };

  const calculatePremiumDistribution = () => {
    if (!formData.vehicleType || !formData.coverage || !formData.bonusLevel || !formData.mileage) {
      return {
        liability: 0,
        partialKasko: 0,
        kasko: 0,
        extras: [],
        total: 0
      };
    }

    // Beregn basispremie uten tillegg
    let basePremium;
    if (formData.vehicleType === 'BUDGET') {
      basePremium = BUDGET_TARIFFS[formData.coverage]?.[formData.bonusLevel] || 0;
    } else {
      basePremium = TARIFFS[formData.vehicleType]?.[formData.coverage]?.[formData.bonusLevel] || 0;
    }

    const mileageOption = MILEAGE_OPTIONS.find(opt => opt.value === parseInt(formData.mileage));
    if (mileageOption) {
      basePremium *= mileageOption.factor;
    }

    // Beregn tilleggsdekninger, men ekskluder BilEkstra først
    const extrasWithoutBilEkstra = formData.extras
      .filter(extraId => extraId !== 'bilEkstra')
      .map(extraId => {
        const extra = EXTRAS.find(e => e.id === extraId);
        return {
          id: extraId,
          label: extra.label,
          price: extra.price
        };
      });

    const extrasCostWithoutBilEkstra = extrasWithoutBilEkstra.reduce((sum, extra) => sum + extra.price, 0);

    // Fordel premie basert på dekningstype og kjøretøytype
    let distribution = {
      liability: 0,
      partialKasko: 0,
      kasko: 0,
      extras: extrasWithoutBilEkstra,
      total: Math.round(basePremium + extrasCostWithoutBilEkstra)
    };

    // For lette kjøretøy og budsjettbiler
    if (['PRIVATE_LIGHT', 'ELECTRIC_LIGHT', 'BUDGET'].includes(formData.vehicleType)) {
      switch (formData.coverage) {
        case 'LIABILITY':
          distribution.liability = basePremium;
          break;
        case 'PARTIAL_KASKO':
          distribution.liability = 2949;
          distribution.partialKasko = Math.max(0, basePremium - 2949);
          break;
        case 'FULL_KASKO':
          distribution.liability = 2949;
          distribution.partialKasko = Math.max(0, basePremium * 0.28);
          distribution.kasko = Math.max(0, basePremium - 2949 - (basePremium * 0.28));
          break;
        default:
          break; // Håndter ukjent dekning
      }
    }
    // For mellomtunge kjøretøy (3,5 - 7,499 tonn)
    else if (formData.vehicleType === 'PRIVATE_MEDIUM') {
      switch (formData.coverage) {
        case 'LIABILITY':
          distribution.liability = basePremium;
          break;
        case 'PARTIAL_KASKO':
          distribution.liability = 3449;
          distribution.partialKasko = Math.max(0, basePremium - 3449);
          break;
        case 'FULL_KASKO':
          distribution.liability = 3449;
          distribution.partialKasko = Math.max(0, basePremium * 0.25);
          distribution.kasko = Math.max(0, basePremium - 3449 - (basePremium * 0.25));
          break;
        default:
          break;
      }
    }
    // For lastebiler (7,5 tonn og over)
    else if (formData.vehicleType === 'TRUCK') {
      switch (formData.coverage) {
        case 'LIABILITY':
          distribution.liability = basePremium;
          break;
        case 'PARTIAL_KASKO':
          distribution.liability = 4842;
          distribution.partialKasko = Math.max(0, basePremium - 4842);
          break;
        case 'FULL_KASKO':
          distribution.liability = 4842;
          distribution.partialKasko = Math.max(0, basePremium * 0.36);
          distribution.kasko = Math.max(0, basePremium - 4842 - (basePremium * 0.36));
          break;
        default:
          break;
      }
    }

    // Sørg for at ingen del er negativ
    distribution.liability = Math.max(0, Math.round(distribution.liability));
    distribution.partialKasko = Math.max(0, Math.round(distribution.partialKasko));
    distribution.kasko = Math.max(0, Math.round(distribution.kasko));

    // Juster total basert på avrundede deler hvis nødvendig for nøyaktighet, eller behold opprinnelig avrundet total
    // distribution.total = distribution.liability + distribution.partialKasko + distribution.kasko + extrasCostWithoutBilEkstra;

    // Legg til BilEkstra hvis valgt
    if (formData.extras.includes('bilEkstra')) {
      const bilEkstra = EXTRAS.find(e => e.id === 'bilEkstra');
      // Beregn BilEkstra basert på summen FØR BilEkstra legges til
      const bilEkstraPrice = bilEkstra.price + (distribution.total * 0.1); // Bruker den initielle totalen

      distribution.extras.push({
        id: 'bilEkstra',
        label: bilEkstra.label,
        price: Math.round(bilEkstraPrice)
      });

      distribution.total = Math.round(distribution.total + bilEkstraPrice); // Oppdater totalen
    }

    return distribution;
  };

  // Funksjon for å nullstille skjema (fjerner reset av calculatedResult)
  const handleReset = () => {
    setFormData({
      vehicleType: '',
      carBrand: '',
      mileage: '',
      coverage: '',
      bonusLevel: '',
      extras: ['driverAccident']
    });
  };

  // Kall calculatePremiumDistribution direkte for live oppdatering
  const premiumDistribution = calculatePremiumDistribution();

  // Hjelpefunksjon for å velge ikon basert på kjøretøytype-nøkkel
  const getVehicleIcon = (key) => {
    switch (key) {
      case 'PRIVATE_LIGHT':
      case 'PRIVATE_MEDIUM':
        return <Car className="h-4 w-4 mr-2" />;
      case 'ELECTRIC_LIGHT':
        return <Zap className="h-4 w-4 mr-2" />;
      case 'TRUCK':
        return <Truck className="h-4 w-4 mr-2" />;
      case 'BUDGET':
        return <Tag className="h-4 w-4 mr-2" />; // Bruker Tag for BUDGET
      default:
        return null;
    }
  };

  // Bruk Shadcn komponenter og Tailwind for layout
  return (
    // Ytre container for padding/margin om nødvendig
    <div className="w-full max-w-5xl mx-auto my-8 space-y-8"> {/* Bruk space-y for avstand mellom header-kort og grid */}

      {/* Separat Card for Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start"> {/* Flex container for tittel/desc og knapper */}
            <div className="flex items-center space-x-3"> {/* Ikon og tittel/desc */}
              <Car className="h-8 w-8 text-primary" /> {/* Ikon */}
              <div>
                <CardTitle className="text-2xl font-semibold">Auto</CardTitle> {/* Endret tittel */}
                <CardDescription>Beregn forsikringspremie for kjøretøy</CardDescription> {/* Endret beskrivelse */}
              </div>
            </div>
            <div className="flex space-x-2"> {/* Knapper til høyre */}
              <Button variant="outline" size="sm">Se tegningsregler</Button>
              <Button onClick={handleReset} variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Nullstill
              </Button>
            </div>
          </div>
        </CardHeader>
        {/* Ingen CardContent eller CardFooter nødvendig for header-kortet */}
      </Card>

      {/* Grid Container for Skjema og Resultat */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* Venstre kolonne: Card for Skjema (8 kolonner på md+) */}
        <div className="md:col-span-8">
          <Card>
            <CardContent className="pt-6 space-y-8"> {/* Legg til padding og space-y her */}
              {/* Seksjon: Kjøretøyinformasjon */}
              <section> {/* Fjernet mb-6 her, håndteres av space-y i CardContent */}
                <h3 className="text-lg font-semibold mb-4">Kjøretøyinformasjon</h3>
                <div className="space-y-2">
                  <Label>Kjøretøytype</Label>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={formData.vehicleType}
                    onValueChange={(value) => {
                      if (value) handleSelectChange('vehicleType', value);
                    }}
                    className="flex flex-wrap justify-start"
                  >
                    {Object.entries(VEHICLE_TYPES).map(([key, label]) => (
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
                {formData.vehicleType === 'BUDGET' && (
                  <div className="space-y-2 pt-4">
                    <Label htmlFor="carBrand">Merke (budsjettbil)</Label>
                    <Select name="carBrand" value={formData.carBrand} onValueChange={(value) => handleSelectChange('carBrand', value)}>
                      <SelectTrigger id="carBrand">
                        <SelectValue placeholder="Velg merke" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Merker</SelectLabel>
                          {BUDGET_CAR_BRANDS.map((brand) => (
                            <SelectItem key={brand} value={brand}>
                              {brand}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </section>

              {/* Seksjon: Bruksinformasjon */}
              <section> {/* Fjernet mb-6 */}
                <h3 className="text-lg font-semibold mb-4">Bruksinformasjon</h3>
                <div className="space-y-6">
                  {/* Kjørelengde */}
                  <div className="space-y-2">
                    <Label className={!formData.vehicleType ? 'text-muted-foreground' : ''}>Årlig kjørelengde</Label>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      value={formData.mileage}
                      onValueChange={(value) => { if (value) handleSelectChange('mileage', value); }}
                      className="flex flex-wrap justify-start"
                      disabled={!formData.vehicleType}
                    >
                      {MILEAGE_OPTIONS.map((option) => (
                        <ToggleGroupItem
                          key={option.value}
                          value={option.value.toString()}
                          aria-label={option.label}
                          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                          {option.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                  {/* Bonus */}
                  <div className="space-y-2">
                    <Label className={!formData.vehicleType ? 'text-muted-foreground' : ''}>Bonus</Label>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      value={formData.bonusLevel}
                      onValueChange={(value) => { if (value) handleSelectChange('bonusLevel', value); }}
                      className="flex flex-wrap justify-start"
                      disabled={!formData.vehicleType}
                    >
                      {BONUS_LEVELS.map((level) => (
                        <ToggleGroupItem
                          key={level}
                          value={level}
                          aria-label={level}
                          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                          {level}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                </div>
              </section>

              {/* Seksjon: Dekning */}
              <section> {/* Fjernet mb-6 */}
                <h3 className="text-lg font-semibold mb-4">Dekning</h3>
                <div className="space-y-2">
                  <Label className={!formData.vehicleType ? 'text-muted-foreground' : ''}>Dekningstype</Label>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={formData.coverage}
                    onValueChange={(value) => { if (value) handleSelectChange('coverage', value); }}
                    className="flex flex-wrap justify-start"
                    disabled={!formData.vehicleType}
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
              </section>

              {/* Seksjon: Tilleggsvalg */}
              <section> {/* Ingen mb-6 her heller */}
                <h3 className={`text-lg font-semibold mb-4 ${!formData.coverage ? 'text-muted-foreground' : ''}`}>Tilleggsdekninger</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {EXTRAS.filter(extra => shouldShowExtra(extra.id)).map(extra => {
                    const extraInfo = EXTRAS.find(e => e.id === extra.id);
                    // Bestem om checkboxen skal være deaktivert
                    const isCheckboxDisabled =
                      !formData.coverage || // Alltid deaktivert hvis ingen dekning er valgt
                      (extra.id === 'rentalCar30' && formData.extras.includes('bilEkstra')) ||
                      (extra.id === 'rentalCar15' && formData.extras.includes('bilEkstra'));

                    return (
                      <div key={extra.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={extra.id}
                          checked={formData.extras.includes(extra.id)}
                          onCheckedChange={(checked) => handleExtraChange(extra.id, checked)}
                          disabled={isCheckboxDisabled} // Bruk den sammensatte deaktiveringslogikken
                        />
                        <Label
                          htmlFor={extra.id}
                          className={`text-sm font-normal ${isCheckboxDisabled ? 'text-muted-foreground' : ''}`} // Grå ut label hvis deaktivert
                        >
                          {extra.label}
                          {extraInfo && extraInfo.price > 0 &&
                            <span className="text-muted-foreground text-xs ml-1">({formatCurrency(extraInfo.price)})</span>
                          }
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </section>
            </CardContent>
          </Card>
        </div> {/* Slutt på venstre kolonne (Card) */}

        {/* Høyre kolonne: Resultatvisning (4 kolonner på md+) - allerede en Card */}
        <div className="md:col-span-4">
          {premiumDistribution && premiumDistribution.total > 0 ? (
            <Card className="sticky top-8 bg-card border">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Beregnet årspremie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4"> {/* Økt space-y her for mer luft */}
                {/* Egen div for totalpris med bakgrunn */}
                <div className="bg-primary p-4 rounded-md mb-4"> {/* Bruk bg-primary, padding, avrunding */}
                  <p className="text-3xl font-bold text-center text-primary-foreground">{formatCurrency(premiumDistribution.total)}</p>
                </div>

                {/* Separator flyttes etter bakgrunnsboksen? Eller fjernes hvis unødvendig? La oss beholde den foreløpig. */}
                <Separator />

                <div className="text-sm space-y-1">
                  <h4 className="font-medium text-muted-foreground mb-2">Dekninger</h4>
                  <div className="flex justify-between">
                    <span>Ansvar:</span>
                    <span>{formatCurrency(premiumDistribution.liability)}</span>
                  </div>
                  {premiumDistribution.partialKasko > 0 &&
                    <div className="flex justify-between">
                      <span>Delkasko:</span>
                      <span>{formatCurrency(premiumDistribution.partialKasko)}</span>
                    </div>
                  }
                  {premiumDistribution.kasko > 0 &&
                    <div className="flex justify-between">
                      <span>Kasko:</span>
                      <span>{formatCurrency(premiumDistribution.kasko)}</span>
                    </div>
                  }
                  {premiumDistribution.extras.length > 0 && (
                    <div className="pt-3">
                      <h4 className="font-medium text-muted-foreground mb-1">Tillegg</h4>
                      <ul className="list-none space-y-1">
                        {premiumDistribution.extras.map(extra => (
                          <li key={extra.id} className="flex justify-between">
                            <span className="text-sm">{extra.label}:</span>
                            <span className="text-sm">{formatCurrency(extra.price)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="sticky top-8 flex items-center justify-center h-48 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-center text-muted-foreground">Fyll ut skjemaet for å se beregnet pris.</p>
            </div>
          )}
        </div> {/* Slutt på høyre kolonne */}

      </div> {/* Slutt på Grid Container */}

    </div> /* Slutt på ytre container */
  );
}

export default AutoCalculator; 