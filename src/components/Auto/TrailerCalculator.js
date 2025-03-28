import React, { useState } from 'react';
// Fjernet MUI imports

// Shadcn UI og Lucide-ikoner
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator"; // Kan være nyttig
import { Caravan, RefreshCcw } from 'lucide-react'; // Bruker Caravan-ikonet
import { formatCurrency } from '../../utils/formatUtils'; // Gjenbruker denne


function TrailerCalculator() {
  const [value, setValue] = useState('');

  // Oppdatert for Shadcn Input onChange event
  const handleValueChange = (event) => {
    // Hent verdien fra event.target.value
    setValue(event.target.value.replace(/\D/g, ''));
  };

  // Ingen endring nødvendig her
  const formatNumber = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const calculateBrannTyveri = () => {
    // Sørg for at value er et tall
    const numericValue = parseInt(value, 10) || 0;
    return Math.round(numericValue * 0.0118);
  };

  const calculateKasko = () => {
    const numericValue = parseInt(value, 10) || 0;
    return Math.round(numericValue * 0.0177);
  };

  const calculateTotalPremium = () => {
    // Kaller funksjonene som allerede håndterer 'value'
    return calculateBrannTyveri() + calculateKasko();
  };

  // Nullstill funksjon
  const handleReset = () => {
    setValue('');
  };

  const numericValue = parseInt(value, 10) || 0;
  const showWarning = numericValue > 100000;
  const totalPremium = calculateTotalPremium(); // Beregn en gang

  return (
    <div className="w-full max-w-5xl mx-auto my-8 space-y-8">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-3">
              <Caravan className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl font-semibold">Tilhenger</CardTitle>
                <CardDescription>Beregn forsikringspremie for tilhenger</CardDescription>
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

      {/* Grid for Input og Resultat */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* Venstre kolonne: Input Card (8 kolonner) */}
        <div className="md:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Verdi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="trailerValue">Verdi på tilhenger (kr)</Label>
                <Input
                  id="trailerValue"
                  value={formatNumber(value)} // Formattert verdi
                  onChange={handleValueChange}
                  placeholder="F.eks. 50000"
                  type="text" // Bruk text for å tillate formatNumber
                  inputMode="numeric" // Hjelper mobil-tastatur
                  className="focus-visible:outline-none" // Lagt til denne klassen
                />
              </div>
              {showWarning && (
                <p className="text-destructive text-sm mt-2"> {/* Bruker text-destructive */}
                  Ved forsikringsum over Kr. 100 000 må UW konfereres for rabatt.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Høyre kolonne: Resultat Card (4 kolonner) */}
        <div className="md:col-span-4">
          {numericValue > 0 ? ( // Vis kun hvis verdi > 0
            <Card className="sticky top-8 bg-card border">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Beregnet årspremie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Totalpris */}
                <div className="bg-primary p-4 rounded-md mb-4">
                  <p className="text-3xl font-bold text-center text-primary-foreground">{formatCurrency(totalPremium)}</p>
                </div>

                <Separator />

                {/* Dekningsfordeling */}
                <div className="text-sm space-y-1">
                  <h4 className="font-medium text-muted-foreground mb-2">Dekninger</h4>
                  <div className="flex justify-between">
                    <span>Brann/Tyveri:</span>
                    <span>{formatCurrency(calculateBrannTyveri())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasko:</span>
                    <span>{formatCurrency(calculateKasko())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="sticky top-8 flex items-center justify-center h-48 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-center text-muted-foreground">Fyll ut verdien for å se beregnet pris.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default TrailerCalculator; 