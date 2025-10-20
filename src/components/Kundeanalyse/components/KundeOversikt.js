import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
    User,
    Building,
    Phone,
    Mail,
    MapPin,
    Calendar,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Shield,
    DollarSign,
    FileText,
    Activity,
    History,
    Clock,
    ChevronDown,
    ChevronRight,
    Target,
    BarChart3,
    Gauge
} from 'lucide-react';
import { formatCurrency, formatPercent, formatNumber, formatDate, calculateCurrentMetrics } from '../utils/dataProcessing';

const KundeOversikt = ({ kundeData, risikoAnalyse, terskler }) => {
    const [expandedPolicies, setExpandedPolicies] = useState(new Set());

    // Generer detaljert risikoforklaring
    const generateRiskExplanation = (risikoAnalyse, kundeData) => {
        if (!risikoAnalyse?.overallRiskScore || !kundeData) return null;

        const årsdata = kundeData.årsdata || [];
        if (årsdata.length === 0) return "Ingen historiske data tilgjengelig for risikovurdering.";

        // Beregn verdier for forklaring - BRUK SAMME BEREGNING SOM I NØKKELTALL
        const totalPremie = årsdata.reduce((sum, år) => sum + (år.økonomi?.premie || 0), 0);
        const totalSkadebeløp = årsdata.reduce((sum, år) => sum + (år.økonomi?.skadebeløp || 0), 0);
        const totalSkader = årsdata.reduce((sum, år) => sum + (år.volum?.antallSkader || 0), 0);

        const samletSkadeProsent = totalPremie > 0 ? (totalSkadebeløp / totalPremie) * 100 : 0;
        const gjennomsnittligSkaderPerÅr = totalSkader / årsdata.length;
        const antallÅr = årsdata.length;

        const riskScore = risikoAnalyse.overallRiskScore.score;
        const terskel = terskler.skadeProsent || 70;

        let explanation = "";
        let reasons = [];

        // Beregn 12 mnd vs historisk trend for forklaring
        const prosesserteSkader = kundeData.prosesserteSkader || [];
        const aktivePolicies = kundeData.aktivePolicies || [];

        let trendInfo = null;
        if (prosesserteSkader.length > 0 && aktivePolicies.length > 0) {
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

            const skaderSiste12Mnd = prosesserteSkader.filter(skade =>
                skade.skadeDato && skade.skadeDato > twelveMonthsAgo
            );

            const årligPremie = aktivePolicies.reduce((sum, policy) => sum + (policy.økonomi?.årsPremie || 0), 0);
            const skadebeløpSiste12Mnd = skaderSiste12Mnd.reduce((sum, skade) => sum + (skade.totalKostnad || 0), 0);
            const skadeprosentSiste12Mnd = årligPremie > 0 ? (skadebeløpSiste12Mnd / årligPremie) * 100 : 0;

            if (skadeprosentSiste12Mnd > 0 && samletSkadeProsent > 0) {
                const trendFaktor = skadeprosentSiste12Mnd / samletSkadeProsent;
                trendInfo = {
                    skadeprosentSiste12Mnd,
                    trendFaktor,
                    antallSkaderSiste12Mnd: skaderSiste12Mnd.length
                };
            }
        }

        if (riskScore === 'høy') {
            explanation = "Kunden er klassifisert som høy risiko på grunn av følgende faktorer:";

            if (samletSkadeProsent >= terskel) {
                reasons.push(`Skadeprosenten på ${samletSkadeProsent.toFixed(1)}% overstiger grenseverdien på ${terskel}%`);
            }

            if (gjennomsnittligSkaderPerÅr >= 10) {
                reasons.push(`Høy skadefrekvens med ${gjennomsnittligSkaderPerÅr.toFixed(1)} skader per år (over 10 skader/år)`);
            } else if (gjennomsnittligSkaderPerÅr >= 5) {
                reasons.push(`Moderat til høy skadefrekvens med ${gjennomsnittligSkaderPerÅr.toFixed(1)} skader per år`);
            }

            // Legg til trendanalyse
            if (trendInfo && trendInfo.trendFaktor > 1.5) {
                reasons.push(`⚠️ Alarmerende utvikling: ${trendInfo.skadeprosentSiste12Mnd.toFixed(1)}% siste 12 mnd vs ${samletSkadeProsent.toFixed(1)}% historisk (${(trendInfo.trendFaktor * 100).toFixed(0)}% økning)`);
            } else if (trendInfo && trendInfo.trendFaktor < 0.7) {
                reasons.push(`✅ Positiv utvikling: ${trendInfo.skadeprosentSiste12Mnd.toFixed(1)}% siste 12 mnd vs ${samletSkadeProsent.toFixed(1)}% historisk (${((1 - trendInfo.trendFaktor) * 100).toFixed(0)}% bedring)`);
            }

            // Legg til ekstra kontekst
            reasons.push(`Totalt ${totalSkader} skader over ${antallÅr} år med samlet skadekostnad på ${(totalSkadebeløp / 1000000).toFixed(1)} mill. kr`);

            // Sjekk for trendanalyse
            if (risikoAnalyse.skadefrekvenseTrend?.trend === 'økende') {
                reasons.push(`Økende skadetrend med ${risikoAnalyse.skadefrekvenseTrend.endring > 0 ? '+' : ''}${risikoAnalyse.skadefrekvenseTrend.endring.toFixed(1)} endring per år`);
            }

        } else if (riskScore === 'moderat') {
            explanation = "Kunden er klassifisert som moderat risiko:";

            if (samletSkadeProsent >= 30) {
                reasons.push(`Skadeprosenten på ${samletSkadeProsent.toFixed(1)}% er over moderat-grensen (30%)`);
            }

            if (gjennomsnittligSkaderPerÅr >= 5) {
                reasons.push(`Skadefrekvensen på ${gjennomsnittligSkaderPerÅr.toFixed(1)} skader per år krever oppmerksomhet`);
            }

            // Legg til trendanalyse for moderat risiko
            if (trendInfo && trendInfo.trendFaktor > 2.0) {
                reasons.push(`🔴 Kritisk utvikling: ${trendInfo.skadeprosentSiste12Mnd.toFixed(1)}% siste 12 mnd vs ${samletSkadeProsent.toFixed(1)}% historisk - kan oppjusteres til høy risiko`);
            } else if (trendInfo && trendInfo.trendFaktor > 1.5) {
                reasons.push(`⚠️ Negativ utvikling: ${trendInfo.skadeprosentSiste12Mnd.toFixed(1)}% siste 12 mnd vs ${samletSkadeProsent.toFixed(1)}% historisk - krever ekstra oppmerksomhet`);
            } else if (trendInfo && trendInfo.trendFaktor < 0.5) {
                reasons.push(`✅ Positiv utvikling: ${trendInfo.skadeprosentSiste12Mnd.toFixed(1)}% siste 12 mnd vs ${samletSkadeProsent.toFixed(1)}% historisk - kan nedjusteres til lav risiko`);
            }

            reasons.push(`Basert på ${totalSkader} skader over ${antallÅr} år`);

            // Sjekk for åpne skader - bruk samme beregning som i risikoIndikatorer
            const åpneSkader = kundeData.skadehistorikk?.filter(s => s.åpen === 1)?.length || 0;
            if (åpneSkader > 0) {
                reasons.push(`${åpneSkader} åpne skader krever oppfølging`);
            }

        } else {
            explanation = "Kunden har lav risikoprofil:";
            reasons.push(`Skadeprosenten på ${samletSkadeProsent.toFixed(1)}% er under grenseverdiene`);
            reasons.push(`Lav skadefrekvens med ${gjennomsnittligSkaderPerÅr.toFixed(1)} skader per år`);

            // Legg til trendanalyse for lav risiko
            if (trendInfo && trendInfo.trendFaktor > 1.5) {
                reasons.push(`⚠️ Obs: ${trendInfo.skadeprosentSiste12Mnd.toFixed(1)}% siste 12 mnd vs ${samletSkadeProsent.toFixed(1)}% historisk - følg med på utviklingen`);
            } else if (trendInfo && trendInfo.trendFaktor < 0.7) {
                reasons.push(`✅ Fortsatt positiv utvikling: ${trendInfo.skadeprosentSiste12Mnd.toFixed(1)}% siste 12 mnd bekrefter lav risiko`);
            } else {
                reasons.push(`Stabil risikoprofil basert på ${antallÅr} år med data`);
            }
        }

        return {
            explanation,
            reasons,
            details: {
                skadeProsent: samletSkadeProsent,
                skaderPerÅr: gjennomsnittligSkaderPerÅr,
                antallÅr,
                totalSkader,
                totalSkadebeløp
            }
        };
    };

    const riskExplanation = generateRiskExplanation(risikoAnalyse, kundeData);

    if (!kundeData) return null;

    // Handle different data structures
    const kundeInfo = kundeData.kundeInfo || kundeData.customer || {};
    const nøkkeltallSammendrag = kundeData.nøkkeltallSammendrag || {};
    const aktivePolicies = kundeData.aktivePolicies || [];

    // Bruk sentralisert konsistente nøkkeltall
    const currentMetrics = kundeData.konsistenteNøkkeltall || calculateCurrentMetrics(kundeData);

    // Beregn historiske totaler fra årsdata for 5-års oversikt
    const årsdata = kundeData.årsdata || [];
    const totalOpptjentPremie = årsdata.reduce((sum, år) => sum + (år.økonomi?.premie || 0), 0);
    const totalSkadebeløp = årsdata.reduce((sum, år) => sum + (år.økonomi?.skadebeløp || 0), 0);

    const beregnetSkadeProsent = totalOpptjentPremie > 0 ? (totalSkadebeløp / totalOpptjentPremie) * 100 : 0;

    const historiskeTotaler = {
        totalOpptjentPremie,
        totalSkadebeløp,
        totalAntallSkader: årsdata.reduce((sum, år) => sum + (år.volum?.antallSkader || 0), 0),
        // FIKSET: Bruk samme beregningsmetode som risikoprofil
        samletSkadeProsent: beregnetSkadeProsent,
        eldsteDataÅr: nøkkeltallSammendrag.eldsteDataÅr || (årsdata.length > 0 ? Math.min(...årsdata.map(å => å.år)) : null),
        nyesteDataÅr: nøkkeltallSammendrag.nyesteDataÅr || (årsdata.length > 0 ? Math.max(...årsdata.map(å => å.år)) : null)
    };

    // Sikre at vi har fallback-verdier for skadeprosent
    const historiskSkadeProsent = historiskeTotaler.samletSkadeProsent ||
        (currentMetrics?.skadeprosentSiste12Mnd) || 0;

    // Grupper forsikringer etter polise-nummer
    const groupedByPolicy = aktivePolicies.reduce((acc, forsikring) => {
        const policyNr = forsikring.policyNummer;
        if (!acc[policyNr]) {
            acc[policyNr] = {
                policyNummer: policyNr,
                policyStatus: forsikring.policyStatus,
                startDato: forsikring.startDato,
                sluttDato: forsikring.sluttDato,
                forsikringer: [],
                totalPremie: 0,
                antallObjekter: 0,
                produktTyper: new Set()
            };
        }
        acc[policyNr].forsikringer.push(forsikring);
        acc[policyNr].totalPremie += forsikring.økonomi?.årsPremie || 0;
        acc[policyNr].antallObjekter += forsikring.objekter?.length || 0;

        // Legg til produkttype (forkortet versjon)
        const produktNavn = forsikring.produktNavn;
        if (produktNavn) {
            // Lag forkortelser for vanlige produkter
            let kortNavn = produktNavn;
            if (produktNavn.includes('Alminnelig ansvar')) kortNavn = 'Ansvar';
            else if (produktNavn.includes('Bygg-/anlegg')) kortNavn = 'Bygg/anlegg';
            else if (produktNavn.includes('Bilflåte')) kortNavn = 'Bilflåte';
            else if (produktNavn.includes('Arbeidsmaskin')) kortNavn = 'Arbeidsmaskin';
            else if (produktNavn.includes('Næringslivs')) kortNavn = 'Næringsliv';
            else if (produktNavn.includes('Styreansvar')) kortNavn = 'Styreansvar';
            else if (produktNavn.includes('Garanti')) kortNavn = 'Garanti';
            else if (produktNavn.includes('Motor')) kortNavn = 'Motor';
            else if (produktNavn.length > 15) kortNavn = produktNavn.substring(0, 12) + '...';

            acc[policyNr].produktTyper.add(kortNavn);
        }

        return acc;
    }, {});

    const poliser = Object.values(groupedByPolicy);

    const togglePolicyExpansion = (policyNr) => {
        const newExpanded = new Set(expandedPolicies);
        if (newExpanded.has(policyNr)) {
            newExpanded.delete(policyNr);
        } else {
            newExpanded.add(policyNr);
        }
        setExpandedPolicies(newExpanded);
    };

    const getRiskColor = (riskScore) => {
        const colorMap = {
            høy: 'text-red-600 bg-red-50',
            moderat: 'text-yellow-600 bg-yellow-50',
            lav: 'text-green-600 bg-green-50'
        };
        return colorMap[riskScore] || 'text-gray-600 bg-gray-50';
    };

    const getRiskIcon = (riskScore) => {
        if (riskScore === 'høy') return <AlertTriangle className="h-5 w-5" />;
        if (riskScore === 'moderat') return <TrendingUp className="h-5 w-5" />;
        return <Shield className="h-5 w-5" />;
    };

    return (
        <div className="space-y-6">
            {/* Kundeinformasjon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Kundeinformasjon
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center gap-3">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">{kundeInfo.kundeNavn}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Org.nr: {kundeInfo.organisasjonsnummer}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm">
                                        {kundeInfo.adresse}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {kundeInfo.postnummer} {kundeInfo.poststed}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm">{kundeInfo.telefon}</p>
                                    {kundeInfo.mobil && (
                                        <p className="text-sm text-muted-foreground">
                                            Mobil: {kundeInfo.mobil}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {kundeInfo.epost && (
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm">{kundeInfo.epost}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm">
                                        Kunde siden: {formatDate(kundeInfo.kundeStartDato)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Rapport generert: {formatDate(kundeInfo.rapportDato)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Forbedret risikoprofil med visuell gauge */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gauge className="h-5 w-5" />
                            Risikoprofil
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Hovedrisiko med visuell indikator */}
                        {risikoAnalyse?.overallRiskScore && (
                            <div className="space-y-4">
                                <div className={`flex items-center gap-3 p-4 rounded-lg ${getRiskColor(risikoAnalyse.overallRiskScore.score)}`}>
                                    {getRiskIcon(risikoAnalyse.overallRiskScore.score)}
                                    <div className="flex-1">
                                        <p className="font-bold text-lg">{risikoAnalyse.overallRiskScore.label}</p>
                                        <p className="text-sm opacity-75">
                                            Basert på skadeprosent og frekvens
                                        </p>
                                    </div>
                                </div>

                                {/* Detaljert risikoforklaring */}
                                {riskExplanation && (
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <h4 className="font-semibold text-sm mb-3 text-gray-700">
                                            {riskExplanation.explanation}
                                        </h4>
                                        <ul className="space-y-2">
                                            {riskExplanation.reasons.map((reason, index) => (
                                                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                                    <span>{reason}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* Vis nøkkeltall */}
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                <div>
                                                    <p className="text-gray-500">Skadeprosent</p>
                                                    <p className="font-semibold">{riskExplanation.details.skadeProsent.toFixed(1)}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Skader/år</p>
                                                    <p className="font-semibold">{riskExplanation.details.skaderPerÅr.toFixed(1)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Dataperiode</p>
                                                    <p className="font-semibold">{riskExplanation.details.antallÅr} år</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Tot. skader</p>
                                                    <p className="font-semibold">{riskExplanation.details.totalSkader}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Risiko-meter visuell */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Lav risiko</span>
                                        <span>Høy risiko</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${risikoAnalyse.overallRiskScore.score === 'høy' ? 'bg-red-500 w-5/6' :
                                                risikoAnalyse.overallRiskScore.score === 'moderat' ? 'bg-yellow-500 w-1/2' :
                                                    'bg-green-500 w-1/4'
                                                }`}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Kompakte risiko-indikatorer - kun vis hvis hovedrisiko ikke er høy */}
                        {risikoAnalyse?.overallRiskScore?.score !== 'høy' && (
                            risikoAnalyse?.risikoIndikatorer?.indicators?.length > 0 ? (
                                <div className="space-y-2">
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                        <Target className="h-4 w-4" />
                                        Viktigste risikoer:
                                    </h4>
                                    <div className="space-y-1">
                                        {risikoAnalyse.risikoIndikatorer.indicators.slice(0, 2).map((indicator, index) => (
                                            <div key={index} className={`flex items-center gap-2 p-2 rounded text-xs ${indicator.severity === 'høy' ? 'bg-red-50 text-red-700' :
                                                indicator.severity === 'moderat' ? 'bg-yellow-50 text-yellow-700' :
                                                    'bg-blue-50 text-blue-700'
                                                }`}>
                                                <AlertTriangle className="h-3 w-3" />
                                                <span className="flex-1">{indicator.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : risikoAnalyse?.overallRiskScore?.score === 'lav' ? (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-green-700">
                                        <Shield className="h-4 w-4" />
                                        <span className="text-sm font-medium">Ingen kritiske risikoer identifisert</span>
                                    </div>
                                </div>
                            ) : null
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Forbedret nøkkeltall med prioritering */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Nøkkeltall og ytelse
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="nåværende" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="nåværende" className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Nåværende (12 mnd)
                            </TabsTrigger>
                            <TabsTrigger value="historisk" className="flex items-center gap-2">
                                <History className="h-4 w-4" />
                                Historisk oversikt
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="nåværende" className="space-y-4">
                            {currentMetrics && (
                                <>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                        <Card className="border-green-200 bg-green-50">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-green-600" />
                                                    <div>
                                                        <p className="text-2xl font-bold text-green-700">{formatNumber(currentMetrics.aktive?.antallAvtaler || 0)}</p>
                                                        <p className="text-xs text-green-600">Aktive avtaler</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-teal-200 bg-teal-50">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Building className="h-4 w-4 text-teal-600" />
                                                    <div>
                                                        <p className="text-2xl font-bold text-teal-700">{formatNumber(currentMetrics.aktive?.antallForsikringer || 0)}</p>
                                                        <p className="text-xs text-teal-600">Aktive forsikringer</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-blue-200 bg-blue-50">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4 text-blue-600" />
                                                    <div>
                                                        <p className="text-2xl font-bold text-blue-700">{formatCurrency(currentMetrics.aktive?.totalPremie || 0)}</p>
                                                        <p className="text-xs text-blue-600">Årspremie</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-orange-200 bg-orange-50">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Activity className="h-4 w-4 text-orange-600" />
                                                    <div>
                                                        <p className="text-2xl font-bold text-orange-700">{formatNumber(currentMetrics.siste12Mnd?.antallSkader || 0)}</p>
                                                        <p className="text-xs text-orange-600">Skader (12 mnd)</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className={`border-2 ${(currentMetrics.siste12Mnd?.skadeprosent || 0) > 70 ? 'border-red-300 bg-red-50' :
                                            (currentMetrics.siste12Mnd?.skadeprosent || 0) > 50 ? 'border-yellow-300 bg-yellow-50' :
                                                'border-green-300 bg-green-50'
                                            }`}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className={`h-4 w-4 ${(currentMetrics.siste12Mnd?.skadeprosent || 0) > 70 ? 'text-red-600' :
                                                        (currentMetrics.siste12Mnd?.skadeprosent || 0) > 50 ? 'text-yellow-600' :
                                                            'text-green-600'
                                                        }`} />
                                                    <div>
                                                        <p className={`text-2xl font-bold ${(currentMetrics.siste12Mnd?.skadeprosent || 0) > 70 ? 'text-red-700' :
                                                            (currentMetrics.siste12Mnd?.skadeprosent || 0) > 50 ? 'text-yellow-700' :
                                                                'text-green-700'
                                                            }`}>
                                                            {formatPercent(currentMetrics.siste12Mnd?.skadeprosent || 0)}
                                                        </p>
                                                        <p className={`text-xs ${(currentMetrics.siste12Mnd?.skadeprosent || 0) > 70 ? 'text-red-600' :
                                                            (currentMetrics.siste12Mnd?.skadeprosent || 0) > 50 ? 'text-yellow-600' :
                                                                'text-green-600'
                                                            }`}>
                                                            Skadeprosent (12 mnd)
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                    </div>

                                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        <span>Periode: Siste 12 måneder (inkl. inneværende år)</span>
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        <TabsContent value="historisk" className="space-y-4">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card className="border-purple-200 bg-purple-50">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-purple-600" />
                                                <div>
                                                    <p className="text-2xl font-bold text-purple-700">{formatCurrency(historiskeTotaler.totalOpptjentPremie)}</p>
                                                    <p className="text-xs text-purple-600">Premie (siste {årsdata.length} år)</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-indigo-200 bg-indigo-50">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-4 w-4 text-indigo-600" />
                                                <div>
                                                    <p className="text-2xl font-bold text-indigo-700">{formatPercent(historiskSkadeProsent)}</p>
                                                    <p className="text-xs text-indigo-600">Skadeprosent (siste {årsdata.length} år)</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-slate-200 bg-slate-50">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-slate-600" />
                                                <div>
                                                    <p className="text-2xl font-bold text-slate-700">{formatNumber(historiskeTotaler.totalAntallSkader)}</p>
                                                    <p className="text-xs text-slate-600">Skader (siste {årsdata.length} år)</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-red-200 bg-red-50">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <TrendingDown className="h-4 w-4 text-red-600" />
                                                <div>
                                                    <p className="text-2xl font-bold text-red-700">{formatCurrency(historiskeTotaler.totalSkadebeløp)}</p>
                                                    <p className="text-xs text-red-600">Skadeutbetalinger (siste {årsdata.length} år)</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <History className="h-4 w-4" />
                                    <span>
                                        Analyseperiode: {historiskeTotaler.eldsteDataÅr || 'N/A'} - {historiskeTotaler.nyesteDataÅr || new Date().getFullYear()}
                                        (totalt {årsdata.length} år med data)
                                    </span>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Aktive poliser oversikt */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Aktive poliser ({poliser.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {poliser.map((polise, index) => (
                            <div key={index} className="border rounded-lg">
                                {/* Polise-header (klikkbar) */}
                                <div
                                    className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                                    onClick={() => togglePolicyExpansion(polise.policyNummer)}
                                >
                                    <div className="flex items-center gap-3">
                                        {expandedPolicies.has(polise.policyNummer) ? (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <div>
                                            <h4 className="font-medium">Polise {polise.policyNummer}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {polise.forsikringer.length} forsikringer • {formatCurrency(polise.totalPremie)} årspremie
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {Array.from(polise.produktTyper).map((produktType, typeIndex) => (
                                                    <Badge key={typeIndex} variant="outline" className="text-xs px-2 py-0">
                                                        {produktType}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{polise.policyStatus}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(polise.startDato)} - {formatDate(polise.sluttDato)}
                                        </span>
                                    </div>
                                </div>

                                {/* Utvidbar forsikringer-liste */}
                                {expandedPolicies.has(polise.policyNummer) && (
                                    <div className="border-t bg-gray-50 p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {polise.forsikringer.map((forsikring, forsikringIndex) => (
                                                <div key={forsikringIndex} className="bg-white border rounded-lg p-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <h5 className="font-medium text-sm">{forsikring.produktNavn}</h5>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {forsikring.produktKode}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground space-y-1">
                                                        <p>Årspremie: {formatCurrency(forsikring.økonomi?.årsPremie || 0)}</p>
                                                        <p>Objekter: {forsikring.objekter?.length || 0}</p>
                                                        <p>Egenandel: {formatCurrency(forsikring.økonomi?.gjennomsnittsEgenandel || 0)}</p>
                                                        <p>Dekninger: {forsikring.økonomi?.antallDekninger || 0}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Høyrisiko produkter varsel */}
            {risikoAnalyse?.høyrisikoProdukter?.length > 0 && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Høyrisiko produkter identifisert:</strong> {' '}
                        {risikoAnalyse.høyrisikoProdukter.map(p => p.produktNavn).join(', ')} {' '}
                        har skadeprosent over {terskler.skadeProsent}%.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
};

export default KundeOversikt;