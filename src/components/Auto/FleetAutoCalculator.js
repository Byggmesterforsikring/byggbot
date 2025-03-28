import React, { useState } from 'react';
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Car, Truck, Zap, Tag, Trash2, Group, RefreshCcw } from 'lucide-react';
import {
  COVERAGE_TYPES,
  BONUS_LEVELS,
  BUDGET_CAR_BRANDS,
  MILEAGE_OPTIONS,
  EXTRAS,
  TARIFFS,
  BUDGET_TARIFFS,
} from './constants/tariffData';
import { formatCurrency } from '../../utils/formatUtils';

const VEHICLE_TYPES_FLÅTE = {
  PRIVATE_LIGHT: 'Firmabiler inntil 3,5 tonn',
  ELECTRIC_LIGHT: 'El-biler inntil 3,5 tonn',
  BUDGET: 'Rimeligere biler (spesialtariff)',
};

function FleetAutoCalculator() {
  const [formData, setFormData] = useState({
    vehicleName: '',
    vehicleType: '',
    carBrand: '',
    mileage: '20000',
    coverage: '',
    bonusLevel: '75%',
    extras: ['driverAccident'],
  });

  const [fleet, setFleet] = useState([]);

  const handleFormChange = (name, value) => {
    setFormData(prevData => {
      let newData = {
        ...prevData,
        [name]: value
      };

      if (name === 'coverage' && value !== 'FULL_KASKO') {
        newData.extras = prevData.extras.filter(extraId =>
          !['bilEkstra', 'rentalCar15', 'rentalCar30'].includes(extraId)
        );
      }
      if (name === 'vehicleType' && value !== 'BUDGET') {
        newData.carBrand = '';
      }

      return newData;
    });
  };

  const handleExtraChange = (extraId, checked) => {
    setFormData(prevData => {
      let newExtras = [...prevData.extras];
      const isCurrentlyChecked = prevData.extras.includes(extraId);

      if (extraId === 'bilEkstra') {
        if (checked) {
          newExtras.push(extraId);
          if (!newExtras.includes('rentalCar30')) {
            newExtras = newExtras.filter(id => id !== 'rentalCar15');
            newExtras.push('rentalCar30');
          }
        } else {
          newExtras = newExtras.filter(id => id !== extraId);
        }
      } else if (extraId === 'rentalCar30' && !checked && prevData.extras.includes('bilEkstra')) {
        return prevData;
      } else if (extraId === 'rentalCar15' && checked && prevData.extras.includes('bilEkstra')) {
        return prevData;
      } else if (extraId === 'rentalCar15' || extraId === 'rentalCar30') {
        newExtras = newExtras.filter(id => id !== 'rentalCar15' && id !== 'rentalCar30');
        if (checked) {
          newExtras.push(extraId);
        }
      } else {
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
        return false;
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

  const calculatePremiumDistribution = (vehicleData) => {
    const data = vehicleData || formData;

    if (!data.vehicleType || !data.coverage || !data.bonusLevel || !data.mileage) {
      return { liability: 0, partialKasko: 0, kasko: 0, extras: [], total: 0 };
    }

    let basePremium;
    if (data.vehicleType === 'BUDGET') {
      basePremium = BUDGET_TARIFFS[data.coverage]?.[data.bonusLevel] || 0;
    } else {
      basePremium = TARIFFS[data.vehicleType]?.[data.coverage]?.[data.bonusLevel] || 0;
    }

    const mileageOption = MILEAGE_OPTIONS.find(opt => opt.value === parseInt(data.mileage));
    if (mileageOption) {
      basePremium *= mileageOption.factor;
    }

    const extrasDetails = data.extras
      .filter(extraId => extraId !== 'bilEkstra')
      .map(extraId => {
        const extra = EXTRAS.find(e => e.id === extraId);
        return { id: extraId, label: extra.label, price: extra.price };
      });

    const extrasCost = extrasDetails.reduce((sum, extra) => sum + extra.price, 0);

    let distribution = {
      liability: 0,
      partialKasko: 0,
      kasko: 0,
      extras: extrasDetails,
      total: Math.round(basePremium + extrasCost)
    };

    switch (data.coverage) {
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
    }

    distribution.liability = Math.max(0, Math.round(distribution.liability));
    distribution.partialKasko = Math.max(0, Math.round(distribution.partialKasko));
    distribution.kasko = Math.max(0, Math.round(distribution.kasko));

    if (data.extras.includes('bilEkstra')) {
      const bilEkstra = EXTRAS.find(e => e.id === 'bilEkstra');
      const bilEkstraPrice = bilEkstra.price + (distribution.total * 0.1);
      distribution.extras.push({ id: 'bilEkstra', label: bilEkstra.label, price: Math.round(bilEkstraPrice) });
      distribution.total = Math.round(distribution.total + bilEkstraPrice);
    }

    return distribution;
  };

  const handleAddToFleet = () => {
    if (!formData.vehicleType || !formData.coverage || !formData.bonusLevel || !formData.mileage) {
      alert('Vennligst fyll ut alle nødvendige felter for kjøretøyet.');
      return;
    }
    const premium = calculatePremiumDistribution(formData);
    const newVehicle = {
      ...formData,
      id: Date.now(),
      premium: premium
    };
    setFleet(prevFleet => [...prevFleet, newVehicle]);
    setFormData(prevData => ({
      ...prevData,
      vehicleName: '',
    }));
  };

  const calculateFleetAverage = (type) => {
    if (fleet.length === 0) return 0;
    const total = fleet.reduce((sum, vehicle) => sum + (vehicle.premium?.total || 0), 0);
    return Math.round(total / fleet.length);
  };

  const calculateFleetTotal = () => {
    return fleet.reduce((sum, vehicle) => sum + (vehicle.premium?.total || 0), 0);
  };

  const handleNameChange = (index, newName) => {
    setFleet(prevFleet =>
      prevFleet.map((vehicle, i) =>
        i === index ? { ...vehicle, vehicleName: newName } : vehicle
      )
    );
  };

  const handleDeleteVehicle = (index) => {
    setFleet(prevFleet => prevFleet.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setFormData({
      vehicleName: '',
      vehicleType: '',
      carBrand: '',
      mileage: '20000',
      coverage: '',
      bonusLevel: '75%',
      extras: ['driverAccident']
    });
    setFleet([]);
  };

  const getVehicleIcon = (key) => {
    switch (key) {
      case 'PRIVATE_LIGHT': return <Car className="h-4 w-4 mr-2" />;
      case 'ELECTRIC_LIGHT': return <Zap className="h-4 w-4 mr-2" />;
      case 'BUDGET': return <Tag className="h-4 w-4 mr-2" />;
      default: return null;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto my-8 space-y-8">

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-3">
              <Group className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl font-semibold">Bilflåte Kalkulator</CardTitle>
                <CardDescription>Beregn forsikringspremie for bilflåte.</CardDescription>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleReset} variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Nullstill
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        <div className="lg:col-span-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Legg til kjøretøy i flåten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="vehicleName">Navn/Reg.nr (valgfritt)</Label>
                <Input
                  id="vehicleName"
                  name="vehicleName"
                  value={formData.vehicleName}
                  onChange={(e) => handleFormChange('vehicleName', e.target.value)}
                  placeholder="E.g., Varebil 1 / EL12345"
                />
              </div>

              <div className="space-y-2">
                <Label>Kjøretøytype</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={formData.vehicleType}
                  onValueChange={(value) => { if (value) handleFormChange('vehicleType', value); }}
                  className="flex flex-wrap justify-start"
                >
                  {Object.entries(VEHICLE_TYPES_FLÅTE).map(([key, label]) => (
                    <ToggleGroupItem key={key} value={key} aria-label={label} className="flex items-center data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      {getVehicleIcon(key)}
                      {label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {formData.vehicleType === 'BUDGET' && (
                <div className="space-y-2">
                  <Label htmlFor="carBrand" className={!formData.vehicleType ? 'text-muted-foreground' : ''}>Merke (budsjettbil)</Label>
                  <Select name="carBrand" value={formData.carBrand} onValueChange={(value) => handleFormChange('carBrand', value)} disabled={!formData.vehicleType}>
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

              <div className="space-y-2">
                <Label className={!formData.vehicleType ? 'text-muted-foreground' : ''}>Årlig kjørelengde</Label>
                <ToggleGroup type="single" variant="outline" value={formData.mileage} onValueChange={(value) => { if (value) handleFormChange('mileage', value); }} className="flex flex-wrap justify-start" disabled={!formData.vehicleType}>
                  {MILEAGE_OPTIONS.map((option) => (
                    <ToggleGroupItem key={option.value} value={option.value.toString()} aria-label={option.label} className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      {option.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="space-y-2">
                <Label className={!formData.vehicleType ? 'text-muted-foreground' : ''}>Bonus</Label>
                <ToggleGroup type="single" variant="outline" value={formData.bonusLevel} onValueChange={(value) => { if (value) handleFormChange('bonusLevel', value); }} className="flex flex-wrap justify-start" disabled={!formData.vehicleType}>
                  {BONUS_LEVELS.map((level) => (
                    <ToggleGroupItem key={level} value={level} aria-label={level} className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      {level}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="space-y-2">
                <Label className={!formData.vehicleType ? 'text-muted-foreground' : ''}>Dekningstype</Label>
                <ToggleGroup type="single" variant="outline" value={formData.coverage} onValueChange={(value) => { if (value) handleFormChange('coverage', value); }} className="flex flex-wrap justify-start" disabled={!formData.vehicleType}>
                  {Object.entries(COVERAGE_TYPES).map(([key, label]) => (
                    <ToggleGroupItem key={key} value={key} aria-label={label} className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      {label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="space-y-2">
                <Label className={`font-medium ${!formData.coverage ? 'text-muted-foreground' : ''}`}>Tilleggsdekninger</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {EXTRAS.filter(extra => shouldShowExtra(extra.id)).map(extra => {
                    const extraInfo = EXTRAS.find(e => e.id === extra.id);
                    const isCheckboxDisabled =
                      !formData.coverage ||
                      (extra.id === 'rentalCar30' && formData.extras.includes('bilEkstra')) ||
                      (extra.id === 'rentalCar15' && formData.extras.includes('bilEkstra'));
                    return (
                      <div key={extra.id} className="flex items-center space-x-2">
                        <Checkbox id={extra.id} checked={formData.extras.includes(extra.id)} onCheckedChange={(checked) => handleExtraChange(extra.id, checked)} disabled={isCheckboxDisabled} />
                        <Label htmlFor={extra.id} className={`text-sm font-normal ${isCheckboxDisabled ? 'text-muted-foreground' : ''}`}>
                          {extra.label}
                          {extraInfo && extraInfo.price > 0 && <span className="text-muted-foreground text-xs ml-1">({formatCurrency(extraInfo.price)})</span>}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button onClick={handleAddToFleet} className="w-full" disabled={!formData.vehicleType || !formData.coverage || !formData.mileage || !formData.bonusLevel}>Legg til i flåte</Button>

            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-6 space-y-8">

          {fleet.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Flåteoppsummering</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-primary text-primary-foreground p-4 rounded-md">
                  <p className="text-sm text-primary-foreground/80 mb-1">Gjennomsnittlig total premie</p>
                  <p className="text-2xl font-semibold">{formatCurrency(calculateFleetAverage('total'))}</p>
                </div>
                <div className="bg-muted p-4 rounded-md flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Samlet årspremie</p>
                    <p className="text-lg font-semibold">{formatCurrency(calculateFleetTotal())}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Antall kjøretøy</p>
                    <p className="text-lg font-semibold">{fleet.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Registrerte kjøretøy i flåten ({fleet.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {fleet.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {fleet.map((vehicle, index) => (
                    <AccordionItem value={`item-${index}`} key={vehicle.id}>
                      <AccordionTrigger>{vehicle.vehicleName || `Kjøretøy ${index + 1}`} ({VEHICLE_TYPES_FLÅTE[vehicle.vehicleType]})</AccordionTrigger>
                      <AccordionContent>
                        <p>Dekning: {COVERAGE_TYPES[vehicle.coverage]}</p>
                        <p>Bonus: {vehicle.bonusLevel}</p>
                        <p>Km: {MILEAGE_OPTIONS.find(opt => opt.value === parseInt(vehicle.mileage))?.label}</p>
                        <p>Premie: {formatCurrency(vehicle.premium?.total)}</p>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive mt-4" onClick={() => handleDeleteVehicle(index)}><Trash2 className="h-4 w-4 mr-2" /> Slett</Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-muted-foreground">Ingen kjøretøy lagt til i flåten ennå.</p>
              )}
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}

export default FleetAutoCalculator;
