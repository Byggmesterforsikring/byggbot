import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Settings,
  Lightbulb,
  ArrowUp,
  Target,
  Plus,
  Minus,
  MessageSquare,
  Clock,
  Star
} from 'lucide-react';
import { formatCurrency, formatPercent, formatNumber, processProductData, processClaimData } from '../utils/dataProcessing';
import { calculateAdvancedNextClaimPrediction } from '../utils/advancedPredictionModels';
import { processDataForAdvancedPredictions } from '../utils/predictionDataProcessor';

const FornyelsesAnbefaling = ({ kundeData, risikoAnalyse, prediksjoner, terskler }) => {
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [premieJusteringer, setPremieJusteringer] = useState({});

  if (!kundeData) return null;

  // Definer variabler som brukes i hele komponenten først
  const aktivePolicies = kundeData.aktivePolicies || [];
  const årsdata = kundeData.årsdata || [];

  // Beregn overordnet fornyelsesanbefaling
  const calculateRenewalRecommendation = () => {
    // FIKSET: Bruk samme beregningsmetode som Oversikt for konsistente data
    if (årsdata.length === 0) return { decision: 'UKJENT', confidence: 'lav' };

    // Beregn historiske totaler (samme som Oversikt)
    const totalPremie = årsdata.reduce((sum, år) => sum + (år.økonomi?.premie || 0), 0);
    const totalSkadebeløp = årsdata.reduce((sum, år) => sum + (år.økonomi?.skadebeløp || 0), 0);
    const antallSkader = årsdata.reduce((sum, år) => sum + (år.volum?.antallSkader || 0), 0);
    const skadeProsent = totalPremie > 0 ? (totalSkadebeløp / totalPremie) * 100 : 0;

    // Beslutningsmatrise med justerte terskler for mer realistiske anbefalinger
    const baseResult = {
      historiskSkadeProsent: skadeProsent,
      totalPremie,
      antallSkader
    };

    if (skadeProsent > 150) {
      return {
        ...baseResult,
        decision: 'AVSLÅ',
        confidence: 'høy',
        reason: 'Ekstrem høy skadeprosent',
        color: 'destructive'
      };
    } else if (skadeProsent > terskler.skadeProsent + 20) { // Redusert fra +30 til +20
      return {
        ...baseResult,
        decision: 'BETINGET_FORNYELSE',
        confidence: 'høy',
        reason: 'Høy skadeprosent krever endringer',
        color: 'destructive'
      };
    } else if (skadeProsent > terskler.skadeProsent) {
      return {
        ...baseResult,
        decision: 'FORNYE_MED_JUSTERING',
        confidence: 'høy',
        reason: 'Over risiko-terskel',
        color: 'secondary'
      };
    } else if (skadeProsent > terskler.skadeProsent * 0.8) { // Ny kategori: 80% av terskel
      return {
        ...baseResult,
        decision: 'OVERVÅK_NØYE',
        confidence: 'moderat',
        reason: 'Nærmer seg risiko-terskel',
        color: 'warning'
      };
    } else if (totalPremie > 1000000 && skadeProsent < 50) {
      return {
        ...baseResult,
        decision: 'PREFERANSE_KUNDE',
        confidence: 'høy',
        reason: 'Høyverdi-kunde med god lønnsomhet',
        color: 'default'
      };
    } else {
      return {
        ...baseResult,
        decision: 'STANDARD_FORNYELSE',
        confidence: 'moderat',
        reason: 'Akseptabel risikoprofil',
        color: 'outline'
      };
    }
  };

  const renewalRecommendation = calculateRenewalRecommendation();

  // Beregn siste 12 måneders data for sammenligning (samme som Oversikt)
  const calculate12MonthData = () => {
    const prosesserteSkader = kundeData.prosesserteSkader || [];
    const aktivePolicies = kundeData.aktivePolicies || [];

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const skaderSiste12Mnd = prosesserteSkader.filter(skade =>
      skade.skadeDato && skade.skadeDato > twelveMonthsAgo
    );

    const årligPremie = aktivePolicies.reduce((sum, policy) => sum + (policy.økonomi?.årsPremie || 0), 0);
    const skadebeløpSiste12Mnd = skaderSiste12Mnd.reduce((sum, skade) => sum + (skade.totalKostnad || 0), 0);
    const skadeprosentSiste12Mnd = årligPremie > 0 ? (skadebeløpSiste12Mnd / årligPremie) * 100 : 0;

    return {
      skadeprosentSiste12Mnd,
      antallSkaderSiste12Mnd: skaderSiste12Mnd.length,
      trendFaktor: renewalRecommendation.historiskSkadeProsent > 0 ? skadeprosentSiste12Mnd / renewalRecommendation.historiskSkadeProsent : 1
    };
  };

  const twelveMonthData = calculate12MonthData();

  // FIKSET: Bruk samme korrekte beregningslogikk som i ProduktAnalyse
  const prosesserteSkader = processClaimData(kundeData.skadehistorikk || []);
  console.log('🔍 FornyelsesAnbefaling - prosesserteSkader:', prosesserteSkader.length);

  // Variabler allerede definert øverst

  // Beregn produktdata med korrekt skade-kobling (kopiert fra ProduktAnalyse)
  const calculateCorrectProductData = () => {
    const currentYear = new Date().getFullYear();

    // Bruk alle skader (5-års periode som standard)
    const filteredSkader = prosesserteSkader;
    const filteredÅrsdata = årsdata; // Alle år

    // Beregn produktdata fra bunnen av
    const produktMap = new Map();

    // Initialiser produkter fra aktive policyer
    aktivePolicies.forEach(policy => {
      const key = `${policy.produktNummer}-${policy.produktNavn}`;
      if (!produktMap.has(key)) {
        produktMap.set(key, {
          produktKode: policy.produktNummer.toString(),
          produktNavn: policy.produktNavn,
          opptjentPremie: 0,
          antallForsikringer: 0,
          skadebeløp: 0,
          antallSkader: 0,
          åpneSkader: 0
        });
      }
      produktMap.get(key).antallForsikringer += 1;
    });

    // Beregn premie basert på historiske data
    const totalÅrligPremie = aktivePolicies.reduce((sum, policy) => sum + (policy.økonomi?.årsPremie || 0), 0);
    const historiskTotalPremie = filteredÅrsdata.reduce((sum, år) => sum + (år.økonomi?.premie || 0), 0);

    produktMap.forEach((produkt, key) => {
      const produktNummer = parseInt(produkt.produktKode);
      const produktPolicies = aktivePolicies.filter(p => p.produktNummer === produktNummer);
      const produktÅrligPremie = produktPolicies.reduce((sum, p) => sum + (p.økonomi?.årsPremie || 0), 0);

      // Beregn andel og historisk premie
      const produktAndel = totalÅrligPremie > 0 ? produktÅrligPremie / totalÅrligPremie : 0;
      produkt.opptjentPremie = historiskTotalPremie * produktAndel;
    });

    // KRITISK: Legg til skadedata for perioden (dette er det som manglet!)
    filteredSkader.forEach(skade => {
      const produktKey = Array.from(produktMap.keys()).find(key =>
        key.startsWith(`${skade.produktKode}-`)
      );

      if (produktKey) {
        const produkt = produktMap.get(produktKey);
        produkt.skadebeløp += skade.totalKostnad || 0;
        produkt.antallSkader += 1;
        if (skade.åpen === 1) {
          produkt.åpneSkader += 1;
        }
      }
    });

    // Konverter til array med korrekt skadeprosent-beregning
    return Array.from(produktMap.values()).map(produkt => ({
      ...produkt,
      skadeProsent: produkt.opptjentPremie > 0 ? (produkt.skadebeløp / produkt.opptjentPremie) * 100 : 0,
      skaderPerÅr: årsdata.length > 0 ? produkt.antallSkader / årsdata.length : 0,
      skaderPer100kPremie: produkt.opptjentPremie > 0 ? (produkt.antallSkader / (produkt.opptjentPremie / 100000)) : 0
    }));
  };

  const korrektProduktData = calculateCorrectProductData();
  console.log('🔍 FornyelsesAnbefaling - korrektProduktData (MED skadekostnader):', korrektProduktData);

  // Konverter til det formatet som resten av koden forventer  
  const konverterteProduktData = korrektProduktData.map(produkt => ({
    produktNummer: parseInt(produkt.produktKode),
    produktNavn: produkt.produktNavn,
    årsPremie: produkt.opptjentPremie,
    økonomi: {
      opptjentPremie: produkt.opptjentPremie,
      skadeProsent: produkt.skadeProsent,
      skadeProsent12Mnd: produkt.skadeProsent, // Bruk samme for alle perioder foreløpig
      skadeProsent3År: produkt.skadeProsent
    },
    skadefrekvens: {
      siste12Mnd: produkt.antallSkader,
      siste3År: produkt.antallSkader,
      totalt: produkt.antallSkader
    }
  }));

  console.log('🔍 FornyelsesAnbefaling - FINAL konverterteProduktData (MED riktige skadeprosenter!):', konverterteProduktData);

  // FIKSET: Beregn korrekt neste skade-prediksjon med samme logikk som Prediksjoner-komponenten
  const prediksjonsData = processDataForAdvancedPredictions(kundeData);
  const avansertNesteSkade = calculateAdvancedNextClaimPrediction(
    prediksjonsData.processedClaims,
    prediksjonsData.processedYearData,
    kundeData
  );
  console.log('🔍 FornyelsesAnbefaling - avansertNesteSkade (korrekt modell):', avansertNesteSkade);

  // Beregn fremtidig skadeprosent basert på prediksjoner og premiejusteringer
  const calculateFutureClaimRatio = (produkt, premieØkning = 0) => {
    try {
      const nåværendeÅrsPremie = produkt?.årsPremie || 0;
      const nyÅrsPremie = nåværendeÅrsPremie * (1 + (premieØkning || 0) / 100);

      // Bruk siste 12 måneders skadekostnad som basis for neste år (mest relevant)
      const skadeProsent12Mnd = produkt?.økonomi?.skadeProsent12Mnd || 0;
      const skadekostnad12Mnd = (skadeProsent12Mnd / 100) * nåværendeÅrsPremie;

      // Faktor for predikert skadeøkning (fra prediksjoner eller default 5% inflasjon)
      const skadeInflasjon = prediksjoner?.trendAnalyse?.costTrend || 5;
      const skadeInflasjonsFaktor = 1 + (skadeInflasjon / 100);
      const predikertSkadekostnad = skadekostnad12Mnd * skadeInflasjonsFaktor;

      // Beregn fremtidig skadeprosent
      const fremtidSkadeProsent = nyÅrsPremie > 0 ? (predikertSkadekostnad / nyÅrsPremie) * 100 : 0;

      return {
        nåværendeSkadeProsent12Mnd: skadeProsent12Mnd,
        fremtidSkadeProsent: fremtidSkadeProsent,
        nyÅrsPremie: nyÅrsPremie,
        predikertSkadekostnad: predikertSkadekostnad,
        grunnlag: 'Siste 12 måneder',
        skadeInflasjon: skadeInflasjon
      };
    } catch (error) {
      console.error('Feil i calculateFutureClaimRatio:', error);
      return {
        nåværendeSkadeProsent12Mnd: 0,
        fremtidSkadeProsent: 0,
        nyÅrsPremie: produkt?.årsPremie || 0,
        predikertSkadekostnad: 0,
        grunnlag: 'Beregningsfeil',
        skadeInflasjon: 5
      };
    }
  };

  // Generer spesifikke anbefalinger
  const generateSpecificRecommendations = () => {
    const recommendations = [];
    const nøkkeltall = kundeData.nøkkeltallSammendrag;

    console.log('🔍 generateSpecificRecommendations - konverterteProduktData:', konverterteProduktData);
    console.log('🔍 generateSpecificRecommendations - terskler:', terskler);

    // Produktspesifikke anbefalinger - nå med korrekte skadeprosenter!

    konverterteProduktData.forEach(produkt => {
      console.log('🔍 Sjekker produkt:', produkt.produktNavn, 'Skadeprosent:', produkt.økonomi?.skadeProsent, 'Terskel:', terskler.skadeProsent);

      if (produkt.økonomi?.skadeProsent > terskler.skadeProsent) {
        const foreslåttØkning = Math.min(50, Math.round((produkt.økonomi.skadeProsent - terskler.skadeProsent) / 2));
        console.log('✅ Legger til HØY prioritet anbefaling for:', produkt.produktNavn);
        recommendations.push({
          type: 'PREMIE_JUSTERING',
          priority: 'HØY',
          product: produkt.produktNavn,
          title: `${produkt.produktNavn} - Premieøkning`,
          description: `Skadeprosent på ${produkt.økonomi.skadeProsent.toFixed(1)}% krever handling`,
          action: `Øk premie med ${foreslåttØkning}% eller juster vilkår`,
          impact: `Potensielt ${formatCurrency(produkt.økonomi.opptjentPremie * (foreslåttØkning / 100))} i økt premie`,
          currentValue: produkt.økonomi.skadeProsent,
          threshold: terskler.skadeProsent
        });
      } else {
        console.log('❌ Produkt under terskel:', produkt.produktNavn, produkt.økonomi?.skadeProsent, 'vs', terskler.skadeProsent);
      }
    });

    // Nå har vi korrekte skadeprosenter, så fallback er ikke nødvendig lengre
    console.log('🔍 Antall anbefalinger generert:', recommendations.length);

    // Trend-baserte anbefalinger
    if (risikoAnalyse?.skadefrekvenseTrend?.trend === 'økende') {
      recommendations.push({
        type: 'RISIKO_OPPFØLGING',
        priority: risikoAnalyse.skadefrekvenseTrend.severity === 'høy' ? 'HØY' : 'MODERAT',
        title: 'Økende skadefrekvens',
        description: `Skadefrekvensen øker med ${risikoAnalyse.skadefrekvenseTrend.endring.toFixed(1)} skader per år`,
        action: 'Kundesamtale om risikoreduserende tiltak',
        impact: 'Kan redusere fremtidige skader med 10-30%'
      });
    }

    // Åpne skader
    const åpneSkader = kundeData.skadehistorikk?.filter(s => s.åpen === 1) || [];
    if (åpneSkader.length > 2) {
      recommendations.push({
        type: 'SAKSBEHANDLING',
        priority: 'MODERAT',
        title: `${åpneSkader.length} åpne skader`,
        description: 'Mange åpne skader kan påvirke fornyelse',
        action: 'Prioriter lukking av åpne saker før fornyelse',
        impact: `Potensielt ${formatCurrency(åpneSkader.reduce((sum, s) => sum + (s.økonomi?.reservert || 0), 0))} i reserverte beløp`
      });
    }

    // Positive anbefalinger
    const lavRisikoProdukter = konverterteProduktData.filter(p => p.økonomi?.skadeProsent < 30 && p.økonomi?.opptjentPremie > 100000);
    if (lavRisikoProdukter.length > 0) {
      recommendations.push({
        type: 'MULIGHET',
        priority: 'LAV',
        title: 'Utvidelsesmuligheter',
        description: `${lavRisikoProdukter.length} produkter med utmerket lønnsomhet`,
        action: 'Vurder utvidelse av dekning eller cross-selling',
        impact: 'Potensiell økt premie uten økt risiko'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { 'HØY': 3, 'MODERAT': 2, 'LAV': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const recommendations = generateSpecificRecommendations();

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HØY': return 'error';        // Rød bakgrunn for høy prioritet
      case 'MODERAT': return 'warning';   // Gul bakgrunn for moderat prioritet  
      case 'LAV': return 'success';       // Grønn bakgrunn for lav prioritet
      default: return 'outline';
    }
  };

  const getDecisionIcon = (decision) => {
    switch (decision) {
      case 'AVSLÅ': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'BETINGET_FORNYELSE': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'FORNYE_MED_JUSTERING': return <Settings className="h-5 w-5 text-yellow-600" />;
      case 'OVERVÅK_NØYE': return <Target className="h-5 w-5 text-orange-600" />;
      case 'PREFERANSE_KUNDE': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'STANDARD_FORNYELSE': return <Shield className="h-5 w-5 text-blue-600" />;
      default: return <Shield className="h-5 w-5 text-gray-600" />;
    }
  };

  const getDecisionText = (decision) => {
    switch (decision) {
      case 'AVSLÅ': return 'Anbefaler avslag';
      case 'BETINGET_FORNYELSE': return 'Betinget fornyelse';
      case 'FORNYE_MED_JUSTERING': return 'Fornye med justeringer';
      case 'OVERVÅK_NØYE': return 'Overvåk nøye';
      case 'PREFERANSE_KUNDE': return 'Preferanse-kunde';
      case 'STANDARD_FORNYELSE': return 'Standard fornyelse';
      default: return 'Ukjent anbefaling';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hovedanbefaling */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Fornyelsesanbefaling
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getDecisionIcon(renewalRecommendation.decision)}
              <div>
                <h3 className="text-xl font-bold">{getDecisionText(renewalRecommendation.decision)}</h3>
                <p className="text-sm text-muted-foreground">{renewalRecommendation.reason}</p>
              </div>
            </div>
            <Badge variant={renewalRecommendation.color}>
              {renewalRecommendation.confidence} konfidensgrad
            </Badge>
          </div>

          {/* Sammendrag av nøkkeltall */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold">{formatPercent(renewalRecommendation.historiskSkadeProsent || 0)}</p>
              <p className="text-xs text-muted-foreground">Skadeprosent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{formatCurrency(renewalRecommendation.totalPremie || 0)}</p>
              <p className="text-xs text-muted-foreground">Total premie</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{formatNumber(renewalRecommendation.antallSkader || 0)}</p>
              <p className="text-xs text-muted-foreground">Antall skader</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{formatNumber(kundeData.aktivePolicies?.length || 0)}</p>
              <p className="text-xs text-muted-foreground">Aktive poliser</p>
            </div>
          </div>

          {/* Trendanalyse sammendrag (samme som Oversikt) */}
          {twelveMonthData.trendFaktor > 1.5 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h4 className="font-medium text-red-800">Alarmerende utvikling</h4>
              </div>
              <p className="text-sm text-red-700">
                {formatPercent(twelveMonthData.skadeprosentSiste12Mnd)} siste 12 mnd vs {formatPercent(renewalRecommendation.historiskSkadeProsent)} historisk
                ({formatPercent((twelveMonthData.trendFaktor - 1) * 100)} økning)
              </p>
              <p className="text-xs text-red-600 mt-1">
                {twelveMonthData.antallSkaderSiste12Mnd} skader siste år
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spesifikke anbefalinger */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Detaljerte anbefalinger ({recommendations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedRecommendation(selectedRecommendation === index ? null : index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={getPriorityColor(rec.priority)}>
                      {rec.priority}
                    </Badge>
                    <div>
                      <h4 className="font-medium">{rec.title}</h4>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    {selectedRecommendation === index ? '−' : '+'}
                  </Button>
                </div>

                {selectedRecommendation === index && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-blue-800">Anbefalt handling:</h5>
                        <p className="text-sm text-blue-700">{rec.action}</p>
                      </div>

                      {rec.impact && (
                        <div>
                          <h5 className="font-medium text-blue-800">Forventet effekt:</h5>
                          <p className="text-sm text-blue-700">{rec.impact}</p>
                        </div>
                      )}

                      {rec.currentValue && rec.threshold && (
                        <div>
                          <h5 className="font-medium text-blue-800">Nåværende vs terskel:</h5>
                          <p className="text-sm text-blue-700">
                            {rec.currentValue.toFixed(1)}% (terskel: {rec.threshold}%)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {recommendations.length === 0 && (
              <div className="text-center p-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-700 mb-2">Ingen kritiske anbefalinger</h3>
                <p className="text-sm text-green-600">
                  Kunden har en akseptabel risikoprofil for standard fornyelse.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fornyelsesparametere - FORBEDRET DESIGN */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Foreslåtte fornyelsesparametere
            </div>
            <Badge variant="outline" className="text-xs">
              {konverterteProduktData.filter(produkt => produkt.økonomi?.skadeProsent > terskler.skadeProsent).length} produkter krever justering
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Premiejusteringer - justert design */}
            {(() => {
              // Sorter produkter etter alvorlighetsgrad (høyest skadeprosent først)
              const produkterSomTrengerJustering = konverterteProduktData
                .filter(produkt => produkt.økonomi?.skadeProsent > terskler.skadeProsent)
                .sort((a, b) => b.økonomi.skadeProsent - a.økonomi.skadeProsent);

              return produkterSomTrengerJustering.map((produkt, index) => {
                const produktKey = `${produkt.produktNummer}`;
                const standardForeslåttØkning = Math.min(50, Math.round((produkt.økonomi.skadeProsent - terskler.skadeProsent) / 2));
                const aktuelleØkning = premieJusteringer[produktKey] !== undefined ? premieJusteringer[produktKey] : standardForeslåttØkning;
                const fremtidAnalyse = calculateFutureClaimRatio(produkt, aktuelleØkning);

                const adjustPremie = (delta) => {
                  const newValue = Math.max(-20, Math.min(50, aktuelleØkning + delta));
                  setPremieJusteringer(prev => ({
                    ...prev,
                    [produktKey]: newValue
                  }));
                };

                return (
                  <div key={index} className="border rounded-lg p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-semibold">{produkt.produktNavn}</h5>
                      <Badge variant="error">Krever justering</Badge>
                    </div>

                    {/* Hovedmetriker */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-xs font-medium text-muted-foreground">Nåværende</span>
                        </div>
                        <p className="text-xl font-bold">{formatPercent(produkt.økonomi.skadeProsent)}</p>
                        <p className="text-xs text-muted-foreground">skadeprosent</p>
                      </div>

                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <ArrowUp className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">Anbefalt økning</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() => adjustPremie(-1)}
                            disabled={aktuelleØkning <= -20}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <div className="text-xl font-bold min-w-[60px]">
                            {aktuelleØkning >= 0 ? '+' : ''}{aktuelleØkning}%
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() => adjustPremie(+1)}
                            disabled={aktuelleØkning >= 50}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {aktuelleØkning !== standardForeslåttØkning ? (
                            <span>justert (anbefalt: {standardForeslåttØkning >= 0 ? '+' : ''}{standardForeslåttØkning}%)</span>
                          ) : (
                            'automatisk anbefaling'
                          )}
                        </p>
                      </div>

                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <DollarSign className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">Ny premie</span>
                        </div>
                        <p className="text-lg font-bold">{formatCurrency(fremtidAnalyse.nyÅrsPremie)}</p>
                        <p className="text-xs text-muted-foreground">årlig</p>
                      </div>

                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Target className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">Predikert</span>
                        </div>
                        <p className="text-lg font-bold">{formatPercent(fremtidAnalyse.fremtidSkadeProsent)}</p>
                        <p className="text-xs text-muted-foreground">med ny premie</p>
                      </div>
                    </div>

                    {/* Anbefaling og metodikk */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800 mb-1">Anbefalte tiltak:</p>
                          <p className="text-sm text-gray-700">
                            {aktuelleØkning >= 0 ? 'Øk' : 'Reduser'} premie med {Math.abs(aktuelleØkning)}% for å oppnå målskadeprosent på {formatPercent(fremtidAnalyse.fremtidSkadeProsent)}.
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Basert på: {fremtidAnalyse.grunnlag} • Est. inflasjon: +{fremtidAnalyse.skadeInflasjon}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}

            {konverterteProduktData.filter(produkt => produkt.økonomi?.skadeProsent > terskler.skadeProsent).length === 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  Ingen produkter krever premiejustering basert på nåværende terskler.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kundesamtale-punkter - FORBEDRET DESIGN */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Kundesamtale-punkter
            </div>
            <Badge variant="outline" className="text-xs">
              Forbered til kundemøte
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Utfordringer - moderne kort-design */}
            {(() => {
              const høyrisikoProdukter = konverterteProduktData
                .filter(produkt => produkt.økonomi?.skadeProsent > terskler.skadeProsent)
                .sort((a, b) => b.økonomi.skadeProsent - a.økonomi.skadeProsent);

              const trendsUtfordringer = [];
              if (risikoAnalyse?.skadefrekvenseTrend?.trend === 'økende') {
                trendsUtfordringer.push({
                  type: 'trend',
                  tekst: `Økende skadefrekvens: +${risikoAnalyse.skadefrekvenseTrend.endring.toFixed(1)} skader/år`,
                  ikon: <TrendingUp className="h-4 w-4 text-orange-500" />
                });
              }

              // FIKSET: Bruk korrekt avansert prediksjonsmodell
              if (avansertNesteSkade && !avansertNesteSkade.insufficient_data && avansertNesteSkade.daysUntilNext < 90) {
                const konfidensText = avansertNesteSkade.confidence === 'høy' ? ' (høy sikkerhet)' :
                  avansertNesteSkade.confidence === 'lav' ? ' (usikker)' : '';
                trendsUtfordringer.push({
                  type: 'predikert',
                  tekst: `Ny skade forventet innen ${avansertNesteSkade.daysUntilNext} dager${konfidensText}`,
                  ikon: <Clock className="h-4 w-4 text-orange-500" />
                });
              }

              const totaleUtfordringer = høyrisikoProdukter.length + trendsUtfordringer.length;

              return (
                <div className="border-2 border-red-100 rounded-xl bg-red-50/30 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-red-800 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Utfordringer å diskutere
                    </h4>
                    <Badge variant="error" className="text-xs">
                      {totaleUtfordringer} punkter
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {/* Høyrisiko produkter */}
                    {høyrisikoProdukter.map((produkt, index) => (
                      <div key={`product-${index}`} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-red-200">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-red-700">#{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{produkt.produktNavn}</p>
                          <p className="text-sm text-red-600">{formatPercent(produkt.økonomi.skadeProsent)} skadeprosent</p>
                        </div>
                        <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      </div>
                    ))}

                    {/* Trend-utfordringer */}
                    {trendsUtfordringer.map((utfordring, index) => (
                      <div key={`trend-${index}`} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          {utfordring.ikon}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{utfordring.tekst}</p>
                        </div>
                      </div>
                    ))}

                    {totaleUtfordringer === 0 && (
                      <div className="text-center py-6 text-green-600">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                        <p className="font-medium">Ingen kritiske utfordringer</p>
                        <p className="text-sm text-muted-foreground">Kunden har en stabil risikoprofil</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Positive punkter - moderne kort-design */}
            {(() => {
              const lavrisikoProdukter = konverterteProduktData
                .filter(p => p.økonomi?.skadeProsent < 30)
                .sort((a, b) => a.økonomi.skadeProsent - b.økonomi.skadeProsent);

              const positiveTrends = [];
              if (risikoAnalyse?.skadefrekvenseTrend?.trend === 'synkende') {
                positiveTrends.push({
                  tekst: `Synkende skadefrekvens: ${risikoAnalyse.skadefrekvenseTrend.endring.toFixed(1)} skader/år`,
                  ikon: <TrendingDown className="h-4 w-4 text-green-500" />
                });
              }

              // Kundelojalitet
              const kundeÅr = (kundeData.kundeInfo?.kundeStartDato &&
                new Date().getFullYear() - parseInt(kundeData.kundeInfo.kundeStartDato.split('-')[2])) || 0;

              const andrePosiiver = [
                {
                  tekst: `${kundeÅr > 0 ? kundeÅr : 'Flere'} års kundeforhold`,
                  ikon: <Star className="h-4 w-4 text-yellow-500" />
                }
              ];

              const totalePositive = lavrisikoProdukter.length + positiveTrends.length + andrePosiiver.length;

              return (
                <div className="border-2 border-green-100 rounded-xl bg-green-50/30 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-green-800 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Positive punkter å fremheve
                    </h4>
                    <Badge variant="success" className="text-xs">
                      {totalePositive} punkter
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {/* Lavrisiko produkter */}
                    {lavrisikoProdukter.map((produkt, index) => (
                      <div key={`good-product-${index}`} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{produkt.produktNavn}</p>
                          <p className="text-sm text-green-600">Kun {formatPercent(produkt.økonomi.skadeProsent)} skadeprosent</p>
                        </div>
                        <Star className="h-4 w-4 text-green-500 flex-shrink-0" />
                      </div>
                    ))}

                    {/* Positive trender */}
                    {positiveTrends.map((trend, index) => (
                      <div key={`positive-trend-${index}`} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          {trend.ikon}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{trend.tekst}</p>
                        </div>
                      </div>
                    ))}

                    {/* Andre positive faktorer */}
                    {andrePosiiver.map((punkt, index) => (
                      <div key={`other-positive-${index}`} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                          {punkt.ikon}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{punkt.tekst}</p>
                          <p className="text-sm text-green-600">Lojal kunde med lang historie</p>
                        </div>
                      </div>
                    ))}

                    {totalePositive === 0 && (
                      <div className="text-center py-6 text-gray-500">
                        <FileText className="h-8 w-8 mx-auto mb-2" />
                        <p className="font-medium">Ingen fremtredende positive punkter</p>
                        <p className="text-sm text-muted-foreground">Standard risikoprofil</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FornyelsesAnbefaling;
