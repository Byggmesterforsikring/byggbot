/**
 * Avanserte prediksjonsmodeller med detaljerte algoritmer og forklaringer
 */

/**
 * Robust dato-parser som håndterer forskjellige formater
 */
const parseDate = (dateInput) => {
    if (dateInput instanceof Date) {
        return dateInput;
    }

    if (typeof dateInput === 'string') {
        // Håndter DD-MM-YYYY format
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateInput)) {
            const [day, month, year] = dateInput.split('-');
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }

        // Håndter YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            return new Date(dateInput);
        }

        // Prøv standard Date parsing
        const parsed = new Date(dateInput);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    // Hvis alt feiler, returner null
    console.warn('Kunne ikke parse dato:', dateInput);
    return null;
};

/**
 * Avansert neste skade-prediksjon med sesong, trend og risikofaktorer
 */
export const calculateAdvancedNextClaimPrediction = (skadehistorikk, årsdata, kundeData) => {
    if (!skadehistorikk || skadehistorikk.length < 3) {
        return {
            insufficient_data: true,
            reason: 'Trenger minst 3 skader for pålitelig prediksjon'
        };
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // 1. Grunnleggende frekvensanalyse
    const baselineAnalysis = calculateBaselineFrequency(skadehistorikk);

    // 2. Sesonganalyse (hvilken måned er vi i?)
    const seasonalAnalysis = calculateSeasonalAdjustment(skadehistorikk, currentMonth);

    // 3. Trendanalyse (øker eller synker skadefrekvensen?)
    const trendAnalysis = calculateFrequencyTrend(skadehistorikk, årsdata);

    // 4. Produktrisiko-analyse (hvilke produkter er mest aktive?)
    const productRiskAnalysis = calculateProductActivityTrend(skadehistorikk, kundeData);

    // 5. Tid siden siste skade (påvirker sannsynlighet?)
    const timeSinceLastClaim = calculateTimeSinceLastClaim(skadehistorikk);

    // 6. Kombinert prediksjon
    const prediction = combinePredictionFactors(
        baselineAnalysis,
        seasonalAnalysis,
        trendAnalysis,
        productRiskAnalysis,
        timeSinceLastClaim,
        currentMonth
    );

    return {
        prediction: prediction.beskrivelse,
        daysUntilNext: Math.round(prediction.forventetDager),
        confidence: prediction.konfidensgrad,
        detaljertAnalyse: {
            grunnfrekvens: baselineAnalysis,
            sesongpåvirkning: seasonalAnalysis,
            trendpåvirkning: trendAnalysis,
            produktrisiko: productRiskAnalysis,
            tidSistSkade: timeSinceLastClaim
        },
        justeringsfaktorer: prediction.justeringer,
        metodikk: prediction.metodikk
    };
};

/**
 * Avansert scenario-analyse basert på multiple faktorer
 */
export const calculateAdvancedScenarios = (kundeData, årsdata) => {
    const skadehistorikk = kundeData.skadehistorikk || [];
    const produkter = kundeData.nøkkeltallSammendrag?.perProdukt || [];

    // Beregn grunnleggende statistikk
    const stats = calculateBaselineStats(årsdata, skadehistorikk, produkter);
    console.log('Advanced algorithm - baseline stats:', stats);

    // Analyser trender
    const trendAnalyse = analyzeTrends(årsdata);

    // Risikoanalyse per produkt
    const produktRisiko = analyzeProductRisks(produkter, skadehistorikk);

    // Sesongvariasjoner
    const sesongEffekter = analyzeSeasonalEffects(skadehistorikk);

    // Beregn scenarioer basert på faktisk analyse
    const scenarios = {
        optimistisk: calculateOptimisticScenario(stats, trendAnalyse, produktRisiko),
        realistisk: calculateRealisticScenario(stats, trendAnalyse, produktRisiko, sesongEffekter),
        pessimistisk: calculatePessimisticScenario(stats, trendAnalyse, produktRisiko)
    };
    console.log('Advanced algorithm - scenarios:', scenarios);

    return {
        scenarios,
        grunnlagsdata: stats,
        trendAnalyse,
        produktRisiko,
        sesongEffekter,
        metodikk: getMethodologyExplanation()
    };
};

/**
 * Beregner grunnleggende statistikk
 */
const calculateBaselineStats = (årsdata, skadehistorikk, produkter) => {
    const currentYear = new Date().getFullYear();
    const validYears = årsdata.filter(år => år.år >= currentYear - 5);

    // Historisk gjennomsnitt - riktig datastruktur
    const avgAnnualClaims = validYears.reduce((sum, år) => sum + (år.volum?.antallSkader || 0), 0) / validYears.length;
    const avgAnnualCost = validYears.reduce((sum, år) => sum + (år.økonomi?.skadebeløp || 0), 0) / validYears.length;
    const avgAnnualPremium = validYears.reduce((sum, år) => sum + (år.økonomi?.premie || 0), 0) / validYears.length;

    // Volatilitet (standardavvik) - riktig datastruktur
    const costVariance = calculateVariance(validYears.map(år => år.økonomi?.skadebeløp || 0));
    const claimVariance = calculateVariance(validYears.map(år => år.volum?.antallSkader || 0));

    // Skadefrekvens-stabilitet
    const frequencyStability = calculateStabilityIndex(validYears.map(år => år.volum?.antallSkader || 0));

    // Kostnadsstabilitet  
    const costStability = calculateStabilityIndex(validYears.map(år => år.økonomi?.skadebeløp || 0));

    return {
        avgAnnualClaims,
        avgAnnualCost,
        avgAnnualPremium,
        costVariance,
        claimVariance,
        frequencyStability,
        costStability,
        dataPoints: validYears.length,
        analysisYears: validYears.map(år => år.år)
    };
};

/**
 * Analyserer trender over tid
 */
const analyzeTrends = (årsdata) => {
    if (årsdata.length < 3) return { insufficient_data: true };

    const recentYears = årsdata.slice(-3); // Siste 3 år
    const earlierYears = årsdata.slice(0, -3); // Tidligere år

    // Kostnadstrend - riktig datastruktur
    const recentAvgCost = recentYears.reduce((sum, år) => sum + (år.økonomi?.skadebeløp || 0), 0) / recentYears.length;
    const earlierAvgCost = earlierYears.length > 0 ?
        earlierYears.reduce((sum, år) => sum + (år.økonomi?.skadebeløp || 0), 0) / earlierYears.length : recentAvgCost;

    const costTrend = earlierAvgCost > 0 ? ((recentAvgCost - earlierAvgCost) / earlierAvgCost) * 100 : 0;

    // Frekvenstrend - riktig datastruktur
    const recentAvgFreq = recentYears.reduce((sum, år) => sum + (år.volum?.antallSkader || 0), 0) / recentYears.length;
    const earlierAvgFreq = earlierYears.length > 0 ?
        earlierYears.reduce((sum, år) => sum + (år.volum?.antallSkader || 0), 0) / earlierYears.length : recentAvgFreq;

    const frequencyTrend = earlierAvgFreq > 0 ? ((recentAvgFreq - earlierAvgFreq) / earlierAvgFreq) * 100 : 0;

    // Trendstyrke (hvor konsistent er trenden?)
    const trendStrength = calculateTrendStrength(årsdata);

    return {
        costTrend,
        frequencyTrend,
        trendStrength,
        recentAvgCost,
        earlierAvgCost,
        recentAvgFreq,
        earlierAvgFreq,
        confidence: trendStrength > 0.7 ? 'høy' : trendStrength > 0.4 ? 'moderat' : 'lav'
    };
};

/**
 * Analyserer produktspesifikke risikoer
 */
const analyzeProductRisks = (produkter, skadehistorikk) => {
    return produkter.map(produkt => {
        const produktSkader = skadehistorikk.filter(skade =>
            skade.produktNavn === produkt.produktNavn
        );

        // Risikoklassifisering
        const risikoKlasse = classifyProductRisk(produkt, produktSkader);

        // Predikert utvikling
        const predikertUtvikling = predictProductDevelopment(produkt, produktSkader);

        return {
            produktNavn: produkt.produktNavn,
            nåværendeRisiko: risikoKlasse,
            predikertUtvikling,
            anbefaltJustering: calculateRecommendedAdjustment(risikoKlasse, predikertUtvikling)
        };
    });
};

/**
 * Beregner realistisk scenario med detaljert metodikk
 */
const calculateRealisticScenario = (stats, trendAnalyse, produktRisiko, sesongEffekter) => {
    // Basis: Historisk gjennomsnitt
    let predikertKostnad = stats.avgAnnualCost;
    let predikertFrekvens = stats.avgAnnualClaims;

    const justeringer = [];
    let konfidensgrad = 0.8; // Start høyt

    // 1. Trendkorrigering (vektet etter trendstyrke)
    if (trendAnalyse.trendStrength > 0.3) {
        const trendVekt = Math.min(0.5, trendAnalyse.trendStrength);
        const kostnadJustering = (trendAnalyse.costTrend / 100) * trendVekt;
        const frekvensJustering = (trendAnalyse.frequencyTrend / 100) * trendVekt;

        predikertKostnad *= (1 + kostnadJustering);
        predikertFrekvens *= (1 + frekvensJustering);

        justeringer.push({
            type: 'Trendkorrigering',
            beskrivelse: `${trendAnalyse.costTrend > 0 ? '+' : ''}${trendAnalyse.costTrend.toFixed(1)}% kostnadstrend (vekt: ${(trendVekt * 100).toFixed(0)}%)`,
            påvirkning: kostnadJustering * 100
        });

        // Reduser konfidensgrad hvis trend er ustabil
        if (trendAnalyse.trendStrength < 0.6) konfidensgrad -= 0.15;
    }

    // 2. Produktrisiko-justering
    const høyrisikoAndel = produktRisiko.filter(p => p.nåværendeRisiko === 'høy').length / produktRisiko.length;
    if (høyrisikoAndel > 0.3) {
        const risikoJustering = høyrisikoAndel * 0.15; // Maks 15% økning
        predikertKostnad *= (1 + risikoJustering);

        justeringer.push({
            type: 'Produktrisiko',
            beskrivelse: `${(høyrisikoAndel * 100).toFixed(0)}% av produkter har høy risiko`,
            påvirkning: risikoJustering * 100
        });

        konfidensgrad -= høyrisikoAndel * 0.1;
    }

    // 3. Volatilitetsjustering
    if (stats.costStability < 0.7) {
        const volatilitetJustering = (0.7 - stats.costStability) * 0.1;
        predikertKostnad *= (1 + volatilitetJustering);

        justeringer.push({
            type: 'Volatilitet',
            beskrivelse: `Lav kostnadsstabilitet (${(stats.costStability * 100).toFixed(0)}%)`,
            påvirkning: volatilitetJustering * 100
        });

        konfidensgrad -= 0.1;
    }

    // 4. Datagrunnlag-justering
    if (stats.dataPoints < 5) {
        konfidensgrad -= (5 - stats.dataPoints) * 0.1;
        justeringer.push({
            type: 'Datagrunnlag',
            beskrivelse: `Begrenset historikk (${stats.dataPoints} år)`,
            påvirkning: 0
        });
    }

    // Beregn konfidensintervall
    const standardError = Math.sqrt(stats.costVariance) / Math.sqrt(stats.dataPoints);
    const konfidensIntervall = {
        nedre: predikertKostnad - (1.96 * standardError),
        øvre: predikertKostnad + (1.96 * standardError)
    };

    return {
        predikertKostnad: Math.round(predikertKostnad),
        predikertFrekvens: Math.round(predikertFrekvens * 10) / 10,
        konfidensgrad: Math.max(0.3, Math.min(0.95, konfidensgrad)),
        konfidensIntervall,
        justeringer,
        metodikk: {
            grunnlag: 'Historisk gjennomsnitt siste 5 år',
            faktorer: justeringer.length,
            dataKvalitet: stats.dataPoints >= 5 ? 'God' : 'Begrenset'
        }
    };
};

/**
 * Beregner optimistisk scenario
 */
const calculateOptimisticScenario = (stats, trendAnalyse, produktRisiko) => {
    let forbedringsPotensial = 0;
    const justeringer = [];

    // Potensial fra risikoreduksjon
    const høyrisikoAndel = produktRisiko.filter(p => p.nåværendeRisiko === 'høy').length / produktRisiko.length;
    if (høyrisikoAndel > 0) {
        forbedringsPotensial += høyrisikoAndel * 0.25; // Maks 25% forbedring
        justeringer.push(`Risikoreduksjon på ${(høyrisikoAndel * 100).toFixed(0)}% av produkter`);
    }

    // Potensial fra bedre risikostyring
    if (stats.costStability < 0.8) {
        forbedringsPotensial += 0.10; // 10% fra bedre kontroll
        justeringer.push('Forbedret risikostyring og forebygging');
    }

    // Potensial fra markedsforhold
    forbedringsPotensial += 0.05; // 5% fra generelle markedsforhold
    justeringer.push('Gunstige markedsforhold og eksterne faktorer');

    const optimistiskKostnad = stats.avgAnnualCost * (1 - Math.min(0.3, forbedringsPotensial));

    return {
        predikertKostnad: Math.round(optimistiskKostnad),
        forbedringsPotensial: forbedringsPotensial * 100,
        sannsynlighet: calculateScenarioProbability('optimistisk', trendAnalyse, stats),
        justeringer,
        forutsetninger: [
            'Proaktive risikoreduserende tiltak implementeres',
            'Ingen store uforutsette skader',
            'Stabile markedsforhold'
        ]
    };
};

/**
 * Beregner pessimistisk scenario
 */
const calculatePessimisticScenario = (stats, trendAnalyse, produktRisiko) => {
    let risikoØkning = 0;
    const justeringer = [];

    // Risiko fra ustabile produkter
    const ustabileProdukter = produktRisiko.filter(p =>
        p.nåværendeRisiko === 'høy' || p.predikertUtvikling === 'forverring'
    ).length;

    if (ustabileProdukter > 0) {
        const risikoAndel = ustabileProdukter / produktRisiko.length;
        risikoØkning += risikoAndel * 0.4; // Maks 40% økning
        justeringer.push(`${ustabileProdukter} produkter med høy/økende risiko`);
    }

    // Risiko fra negative trender
    if (trendAnalyse.costTrend > 5) {
        risikoØkning += Math.min(0.3, trendAnalyse.costTrend / 100 * 2); // Maks 30%
        justeringer.push(`Negativ kostnadstrend (${trendAnalyse.costTrend.toFixed(1)}%)`);
    }

    // Risiko fra lav stabilitet
    if (stats.costStability < 0.6) {
        risikoØkning += 0.15; // 15% for høy volatilitet
        justeringer.push('Høy historisk volatilitet i skadekostnader');
    }

    // Ekstern risiko (makroøkonomiske faktorer)
    risikoØkning += 0.10; // 10% buffer for eksterne faktorer
    justeringer.push('Eksterne risikofaktorer (inflasjon, markedsforhold)');

    const pessimistiskKostnad = stats.avgAnnualCost * (1 + Math.min(0.6, risikoØkning));

    return {
        predikertKostnad: Math.round(pessimistiskKostnad),
        risikoØkning: risikoØkning * 100,
        sannsynlighet: calculateScenarioProbability('pessimistisk', trendAnalyse, stats),
        justeringer,
        risikoFaktorer: [
            'Store skader på høyrisiko-produkter',
            'Makroøkonomisk usikkerhet',
            'Endringer i risikoeksponering'
        ]
    };
};

/**
 * Beregner scenario-sannsynligheter basert på data
 */
const calculateScenarioProbability = (scenarioType, trendAnalyse, stats) => {
    let baseSannsynlighet;

    switch (scenarioType) {
        case 'optimistisk':
            baseSannsynlighet = 20;
            // Øk sannsynlighet hvis positive trender
            if (trendAnalyse.costTrend < -5) baseSannsynlighet += 10;
            if (stats.costStability > 0.8) baseSannsynlighet += 5;
            break;

        case 'pessimistisk':
            baseSannsynlighet = 20;
            // Øk sannsynlighet hvis negative trender
            if (trendAnalyse.costTrend > 10) baseSannsynlighet += 15;
            if (stats.costStability < 0.6) baseSannsynlighet += 10;
            break;

        default: // realistisk
            baseSannsynlighet = 60;
            // Juster basert på trendstyrke
            if (trendAnalyse.trendStrength < 0.4) baseSannsynlighet += 10;
            break;
    }

    return Math.min(70, Math.max(15, baseSannsynlighet));
};

/**
 * Hjelpefunksjoner
 */
const calculateVariance = (values) => {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
};

const calculateStabilityIndex = (values) => {
    if (values.length < 2) return 0.5;
    const variance = calculateVariance(values);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 1;
    return Math.max(0, 1 - Math.min(1, coefficientOfVariation));
};

const calculateTrendStrength = (årsdata) => {
    if (årsdata.length < 3) return 0;

    // Enkel lineær regresjon for å måle trendstyrke - riktig datastruktur
    const years = årsdata.map((_, i) => i);
    const costs = årsdata.map(år => år.økonomi?.skadebeløp || 0);

    const n = years.length;
    const sumX = years.reduce((sum, x) => sum + x, 0);
    const sumY = costs.reduce((sum, y) => sum + y, 0);
    const sumXY = years.reduce((sum, x, i) => sum + x * costs[i], 0);
    const sumXX = years.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Beregn R-squared (forklaringsgrad)
    const meanY = sumY / n;
    const totalSumSquares = costs.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const residualSumSquares = costs.reduce((sum, y, i) => {
        const predicted = slope * years[i] + intercept;
        return sum + Math.pow(y - predicted, 2);
    }, 0);

    const rSquared = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;
    return Math.max(0, Math.min(1, rSquared));
};

const classifyProductRisk = (produkt, produktSkader) => {
    const skadeProsent = produkt.skadeProsent || 0;
    const antallSkader = produktSkader.length;
    const avgSkadekostnad = antallSkader > 0 ? produktSkader.reduce((sum, s) => sum + s.totalKostnad, 0) / antallSkader : 0;

    if (skadeProsent > 100 && antallSkader > 2) return 'høy';
    if (skadeProsent > 70 || (antallSkader > 5 && avgSkadekostnad > 50000)) return 'moderat-høy';
    if (skadeProsent > 40 || antallSkader > 3) return 'moderat';
    return 'lav';
};

const predictProductDevelopment = (produkt, produktSkader) => {
    if (produktSkader.length < 2) return 'stabil';

    // Analyser skadeutvikling over tid
    const sortedClaims = produktSkader.sort((a, b) => {
        const dateA = a.skadeDato instanceof Date ? a.skadeDato : new Date(a.skadeDato);
        const dateB = b.skadeDato instanceof Date ? b.skadeDato : new Date(b.skadeDato);
        return dateA - dateB;
    });
    const recentClaims = sortedClaims.slice(-Math.ceil(sortedClaims.length / 2));
    const earlierClaims = sortedClaims.slice(0, Math.floor(sortedClaims.length / 2));

    const recentAvgCost = recentClaims.reduce((sum, s) => sum + s.totalKostnad, 0) / recentClaims.length;
    const earlierAvgCost = earlierClaims.length > 0 ?
        earlierClaims.reduce((sum, s) => sum + s.totalKostnad, 0) / earlierClaims.length : recentAvgCost;

    const kostnadEndring = earlierAvgCost > 0 ? ((recentAvgCost - earlierAvgCost) / earlierAvgCost) * 100 : 0;

    if (kostnadEndring > 20) return 'forverring';
    if (kostnadEndring < -20) return 'forbedring';
    return 'stabil';
};

const calculateRecommendedAdjustment = (risikoKlasse, predikertUtvikling) => {
    let justering = 0;

    switch (risikoKlasse) {
        case 'høy': justering += 15; break;
        case 'moderat-høy': justering += 8; break;
        case 'moderat': justering += 3; break;
        default: justering += 0;
    }

    switch (predikertUtvikling) {
        case 'forverring': justering += 10; break;
        case 'forbedring': justering -= 5; break;
        default: break;
    }

    return Math.max(-10, Math.min(30, justering));
};

const analyzeSeasonalEffects = (skadehistorikk) => {
    const månedligData = Array.from({ length: 12 }, (_, i) => ({
        måned: i + 1,
        antall: 0,
        kostnad: 0
    }));

    skadehistorikk.forEach(skade => {
        try {
            const skadeDato = skade.skadeDato instanceof Date ? skade.skadeDato : new Date(skade.skadeDato);
            const måned = skadeDato.getMonth();
            if (måned >= 0 && måned < 12 && månedligData[måned]) {
                månedligData[måned].antall++;
                månedligData[måned].kostnad += skade.totalKostnad || 0;
            }
        } catch (error) {
            console.warn('Ugyldig skadedato:', skade.skadeDato);
        }
    });

    const avgMånedligAntall = månedligData.reduce((sum, m) => sum + m.antall, 0) / 12;
    const sesongVariasjon = Math.max(...månedligData.map(m => m.antall)) / avgMånedligAntall;

    return {
        månedligData,
        sesongVariasjon,
        påvirkning: sesongVariasjon > 2 ? 'høy' : sesongVariasjon > 1.5 ? 'moderat' : 'lav'
    };
};

/**
 * Hjelpefunksjoner for neste skade-prediksjon
 */
const calculateBaselineFrequency = (skadehistorikk) => {
    const sortedClaims = skadehistorikk.sort((a, b) => {
        const dateA = parseDate(a.skadeDato);
        const dateB = parseDate(b.skadeDato);
        if (!dateA || !dateB) return 0;
        return dateA - dateB;
    });
    const intervals = [];

    for (let i = 1; i < sortedClaims.length; i++) {
        const dateA = parseDate(sortedClaims[i].skadeDato);
        const dateB = parseDate(sortedClaims[i - 1].skadeDato);

        if (dateA && dateB) {
            const daysBetween = (dateA - dateB) / (1000 * 60 * 60 * 24);
            if (daysBetween > 0) {
                intervals.push(daysBetween);
            }
        }
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const medianInterval = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)];
    const standardDeviation = Math.sqrt(
        intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length
    );

    return {
        gjennomsnittligIntervall: avgInterval,
        medianIntervall: medianInterval,
        standardAvvik: standardDeviation,
        stabilitet: standardDeviation / avgInterval, // Lavere = mer stabilt
        antallIntervaller: intervals.length
    };
};

const calculateSeasonalAdjustment = (skadehistorikk, currentMonth) => {
    const månedligFordeling = Array.from({ length: 12 }, (_, i) => ({
        måned: i + 1,
        antall: 0
    }));

    skadehistorikk.forEach(skade => {
        const skadeDato = parseDate(skade.skadeDato);
        if (skadeDato) {
            const måned = skadeDato.getMonth() + 1;
            if (måned >= 1 && måned <= 12 && månedligFordeling[måned - 1]) {
                månedligFordeling[måned - 1].antall++;
            }
        }
    });

    const totalSkader = skadehistorikk.length;
    const avgPerMåned = totalSkader / 12;
    const currentMonthData = månedligFordeling[currentMonth - 1];

    const sesongFaktor = avgPerMåned > 0 ? currentMonthData.antall / avgPerMåned : 1;

    // Identifiser sesong
    let sesongNavn;
    if ([12, 1, 2].includes(currentMonth)) sesongNavn = 'vinter';
    else if ([3, 4, 5].includes(currentMonth)) sesongNavn = 'vår';
    else if ([6, 7, 8].includes(currentMonth)) sesongNavn = 'sommer';
    else sesongNavn = 'høst';

    return {
        sesongFaktor,
        sesongNavn,
        currentMonthClaims: currentMonthData.antall,
        avgMonthClaims: avgPerMåned,
        påvirkning: sesongFaktor > 1.2 ? 'økt risiko' : sesongFaktor < 0.8 ? 'redusert risiko' : 'normal',
        beskrivelse: `${currentMonth}. måned (${sesongNavn}) har ${sesongFaktor > 1 ? 'høyere' : 'lavere'} skadefrekvens enn gjennomsnittet`
    };
};

const calculateFrequencyTrend = (skadehistorikk, årsdata) => {
    if (årsdata.length < 3) return { insufficient_data: true };

    const recentYears = årsdata.slice(-2); // Siste 2 år
    const earlierYears = årsdata.slice(0, -2); // Tidligere år

    const recentAvgFreq = recentYears.reduce((sum, år) => sum + (år.volum?.antallSkader || 0), 0) / recentYears.length;
    const earlierAvgFreq = earlierYears.length > 0 ?
        earlierYears.reduce((sum, år) => sum + (år.volum?.antallSkader || 0), 0) / earlierYears.length : recentAvgFreq;

    const trendProsent = earlierAvgFreq > 0 ? ((recentAvgFreq - earlierAvgFreq) / earlierAvgFreq) * 100 : 0;

    // Beregn månedlig trend for mer granulær analyse
    const currentYear = new Date().getFullYear();
    const currentYearClaims = skadehistorikk.filter(skade => {
        const skadeDato = skade.skadeDato instanceof Date ? skade.skadeDato : new Date(skade.skadeDato);
        return skadeDato.getFullYear() === currentYear;
    });
    const lastYearClaims = skadehistorikk.filter(skade => {
        const skadeDato = skade.skadeDato instanceof Date ? skade.skadeDato : new Date(skade.skadeDato);
        return skadeDato.getFullYear() === currentYear - 1;
    });

    const currentYearRate = currentYearClaims.length / (new Date().getMonth() + 1); // Per måned hittil i år
    const lastYearRate = lastYearClaims.length / 12; // Per måned i fjor

    const shortTermTrend = lastYearRate > 0 ? ((currentYearRate - lastYearRate) / lastYearRate) * 100 : 0;

    return {
        langSiktigTrend: trendProsent,
        kortSiktigTrend: shortTermTrend,
        trendRetning: trendProsent > 5 ? 'økende' : trendProsent < -5 ? 'synkende' : 'stabil',
        trendStyrke: Math.abs(trendProsent),
        påvirkning: Math.abs(trendProsent) > 10 ? 'betydelig' : Math.abs(trendProsent) > 5 ? 'moderat' : 'liten',
        beskrivelse: `${trendProsent > 0 ? 'Økende' : 'Synkende'} trend: ${Math.abs(trendProsent).toFixed(1)}% endring i frekvens`
    };
};

const calculateProductActivityTrend = (skadehistorikk, kundeData) => {
    const produktAktivitet = {};
    const currentYear = new Date().getFullYear();

    // Analyser skader per produkt over tid
    skadehistorikk.forEach(skade => {
        try {
            const skadeDato = skade.skadeDato instanceof Date ? skade.skadeDato : new Date(skade.skadeDato);
            const år = skadeDato.getFullYear();
            const produkt = skade.produktNavn;

            if (!produktAktivitet[produkt]) {
                produktAktivitet[produkt] = { total: 0, recent: 0, earlier: 0 };
            }

            produktAktivitet[produkt].total++;

            if (år >= currentYear - 1) {
                produktAktivitet[produkt].recent++;
            } else {
                produktAktivitet[produkt].earlier++;
            }
        } catch (error) {
            console.warn('Ugyldig skadedato for produkt:', skade.skadeDato);
        }
    });

    // Finn produkter med økende aktivitet
    const økendeRisikoProdukter = [];
    const stabileRisikoProdukter = [];

    Object.entries(produktAktivitet).forEach(([produkt, data]) => {
        if (data.total >= 3) { // Kun produkter med nok data
            const recentRate = data.recent / 2; // Per år siste 2 år
            const earlierRate = data.earlier > 0 ? data.earlier / Math.max(1, (skadehistorikk.length > 0 ?
                (new Date().getFullYear() - Math.min(...skadehistorikk.map(s => {
                    const skadeDato = s.skadeDato instanceof Date ? s.skadeDato : new Date(s.skadeDato);
                    return skadeDato.getFullYear();
                })) - 2) : 1)) : 0;

            const endring = earlierRate > 0 ? ((recentRate - earlierRate) / earlierRate) * 100 : 0;

            if (endring > 20) {
                økendeRisikoProdukter.push({ produkt, endring, recentRate });
            } else {
                stabileRisikoProdukter.push({ produkt, endring, recentRate });
            }
        }
    });

    return {
        økendeRisikoProdukter,
        stabileRisikoProdukter,
        hovedRisikoProdukt: økendeRisikoProdukter.length > 0 ?
            økendeRisikoProdukter.sort((a, b) => b.recentRate - a.recentRate)[0] : null,
        påvirkning: økendeRisikoProdukter.length > 0 ? 'økt risiko' : 'stabil risiko'
    };
};

const calculateTimeSinceLastClaim = (skadehistorikk) => {
    const sortedClaims = skadehistorikk.sort((a, b) => {
        const dateA = parseDate(a.skadeDato);
        const dateB = parseDate(b.skadeDato);
        if (!dateA || !dateB) return 0;
        return dateB - dateA; // Nyeste først
    });
    const lastClaim = sortedClaims[0];

    if (!lastClaim) return { no_claims: true };

    try {
        const lastClaimDate = parseDate(lastClaim.skadeDato);

        if (!lastClaimDate) {
            return { error: true, reason: 'Ugyldig dato for siste skade' };
        }

        const daysSinceLast = Math.floor((new Date() - lastClaimDate) / (1000 * 60 * 60 * 24));

        // Beregn gjennomsnittlig intervall
        const intervals = [];
        for (let i = 1; i < sortedClaims.length; i++) {
            const dateA = parseDate(sortedClaims[i - 1].skadeDato);
            const dateB = parseDate(sortedClaims[i].skadeDato);

            if (dateA && dateB) {
                const daysBetween = (dateA - dateB) / (1000 * 60 * 60 * 24);
                if (daysBetween > 0) {
                    intervals.push(daysBetween);
                }
            }
        }

        const avgInterval = intervals.length > 0 ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length : 0;

        // Vurder om vi er "overdue"
        const overdueFactor = avgInterval > 0 ? daysSinceLast / avgInterval : 0;

        return {
            dagerSistSkade: daysSinceLast,
            gjennomsnittligIntervall: avgInterval,
            overdueFaktor: overdueFactor,
            status: overdueFactor > 1.5 ? 'overdue' : overdueFactor > 1.2 ? 'nærmer_seg' : 'normal',
            beskrivelse: `${daysSinceLast} dager siden siste skade (gj.snitt: ${Math.round(avgInterval)} dager)`
        };
    } catch (error) {
        console.warn('Feil ved beregning av tid siden siste skade:', error);
        return { error: true, reason: 'Kunne ikke beregne tid siden siste skade' };
    }
};

const combinePredictionFactors = (baseline, seasonal, trend, productRisk, timeSince, currentMonth) => {
    let forventetDager = baseline.gjennomsnittligIntervall;
    const justeringer = [];
    let konfidensgrad = 'moderat';

    // 1. Sesongkorrigering (moderat påvirkning)
    if (Math.abs(seasonal.sesongFaktor - 1) > 0.2) {
        // Begrenset sesongpåvirkning - maks 50% justering i hver retning
        const maxSesongJustering = seasonal.sesongFaktor < 1 ? 1.5 : 0.67; // Maks +50% eller -33%
        const sesongJustering = seasonal.sesongFaktor < 1 ?
            Math.min(maxSesongJustering, 1 / seasonal.sesongFaktor) :
            Math.max(0.67, 1 / seasonal.sesongFaktor);

        forventetDager *= sesongJustering;

        justeringer.push({
            type: 'Sesongpåvirkning',
            beskrivelse: seasonal.beskrivelse,
            påvirkning: ((sesongJustering - 1) * 100).toFixed(1) + '%'
        });
    }

    // 2. Trendkorrigering
    if (trend.trendStyrke > 5) {
        const trendJustering = trend.langSiktigTrend > 0 ? 0.85 : 1.15; // Økende trend = kortere intervall
        forventetDager *= trendJustering;
        justeringer.push({
            type: 'Frekvens-trend',
            beskrivelse: trend.beskrivelse,
            påvirkning: ((1 - trendJustering) * 100).toFixed(1) + '%'
        });

        // Juster konfidensgrad basert på trendtype og styrke
        if (trend.langSiktigTrend > 20) {
            // Sterk negativ trend (økning) reduserer konfidensgrad
            konfidensgrad = 'lav';
        } else if (trend.langSiktigTrend < -15) {
            // Sterk positiv trend (reduksjon) øker konfidensgrad
            konfidensgrad = 'høy';
        } else if (Math.abs(trend.langSiktigTrend) > 10) {
            // Moderat trend påvirker ikke konfidensgrad negativt
            // konfidensgrad forblir 'moderat'
        }
    }

    // 3. Produktrisiko-korrigering
    if (productRisk.økendeRisikoProdukter.length > 0) {
        const risikoJustering = 0.8; // 20% kortere intervall
        forventetDager *= risikoJustering;
        justeringer.push({
            type: 'Produktrisiko',
            beskrivelse: `${productRisk.økendeRisikoProdukter.length} produkter med økende aktivitet`,
            påvirkning: '-20%'
        });
    }

    // 4. "Overdue" korrigering
    if (timeSince.status === 'overdue') {
        forventetDager *= 0.7; // 30% kortere fordi vi er "forsinket"
        justeringer.push({
            type: 'Overdue-faktor',
            beskrivelse: `${timeSince.dagerSistSkade} dager siden siste (gj.snitt: ${Math.round(timeSince.gjennomsnittligIntervall)})`,
            påvirkning: '-30%'
        });
        konfidensgrad = 'høy'; // Høyere sikkerhet hvis overdue
    } else if (timeSince.status === 'nærmer_seg') {
        forventetDager *= 0.85;
        justeringer.push({
            type: 'Nærmer seg intervall',
            beskrivelse: timeSince.beskrivelse,
            påvirkning: '-15%'
        });
    }

    // 5. Volatilitets-vurdering (høy volatilitet reduserer konfidensgrad)
    if (baseline.stabilitet > 1.0) {
        if (baseline.stabilitet > 1.5) {
            konfidensgrad = 'lav';
            justeringer.push({
                type: 'Høy volatilitet',
                beskrivelse: `Meget uregelmessige skadeintervaller (volatilitet: ${baseline.stabilitet.toFixed(1)})`,
                påvirkning: 'Redusert konfidensgrad til lav'
            });
        } else if (baseline.stabilitet > 1.2 && konfidensgrad === 'høy') {
            konfidensgrad = 'moderat';
            justeringer.push({
                type: 'Moderat volatilitet',
                beskrivelse: `Noe uregelmessige skadeintervaller (volatilitet: ${baseline.stabilitet.toFixed(1)})`,
                påvirkning: 'Redusert konfidensgrad til moderat'
            });
        }
    }

    // 6. Datagrunnlag-vurdering
    if (baseline.antallIntervaller < 5) {
        konfidensgrad = 'lav';
        justeringer.push({
            type: 'Begrenset datagrunnlag',
            beskrivelse: `Kun ${baseline.antallIntervaller} historiske intervaller`,
            påvirkning: 'Redusert konfidensgrad'
        });
    } else if (baseline.antallIntervaller > 100) {
        // Bonus for mye data, men ikke hvis volatilitet er høy
        if (baseline.stabilitet < 0.8 && konfidensgrad === 'moderat') {
            konfidensgrad = 'høy';
            justeringer.push({
                type: 'Rikt datagrunnlag',
                beskrivelse: `${baseline.antallIntervaller} historiske intervaller med lav volatilitet`,
                påvirkning: 'Økt konfidensgrad til høy'
            });
        }
    }

    // Generer beskrivelse
    const beskrivelse = generatePredictionDescription(forventetDager, justeringer, konfidensgrad);

    return {
        forventetDager,
        konfidensgrad,
        justeringer,
        beskrivelse,
        metodikk: {
            grunnlag: `Basert på ${baseline.antallIntervaller} historiske intervaller`,
            faktorer: justeringer.length,
            hovedjustering: justeringer.length > 0 ? justeringer[0].type : 'Ingen'
        }
    };
};

const generatePredictionDescription = (dager, justeringer, konfidensgrad) => {
    const måneder = Math.floor(dager / 30);
    const restDager = Math.round(dager % 30);

    let tidsperiode;
    if (dager < 30) {
        tidsperiode = `innen ${Math.round(dager)} dager`;
    } else if (dager < 60) {
        tidsperiode = `om ca. ${måneder} måned${restDager > 15 ? ' og ' + restDager + ' dager' : ''}`;
    } else {
        tidsperiode = `om ca. ${måneder} måneder`;
    }

    const hovedjustering = justeringer.length > 0 ? justeringer[0].type.toLowerCase() : null;

    let beskrivelse = `Neste skade forventes ${tidsperiode}`;

    if (hovedjustering) {
        beskrivelse += `. Justert for ${hovedjustering}`;
    }

    if (konfidensgrad === 'lav') {
        beskrivelse += ' (usikker prediksjon)';
    } else if (konfidensgrad === 'høy') {
        beskrivelse += ' (høy sikkerhet)';
    }

    return beskrivelse;
};

const getMethodologyExplanation = () => ({
    hovedprinsipp: 'Statistisk analyse basert på historiske mønstre med trendkorrigering',
    faktorer: [
        'Historisk gjennomsnitt (5 år vektet)',
        'Trendanalyse med styrkeberegning',
        'Produktspesifikk risikoklassifisering',
        'Volatilitets- og stabilitetsmåling',
        'Konfidensintervall basert på standardfeil'
    ],
    begrensninger: [
        'Basert kun på historiske data',
        'Kan ikke forutsi eksterne sjokk',
        'Forutsetter stabile markedsforhold',
        'Kvalitet avhenger av datagrunnlag'
    ]
});
