/**
 * Risk calculation utilities for customer analysis
 */

/**
 * Beregner risiko-score basert på skadeprosent, frekvens og trend
 */
export const calculateRiskScore = (skadeProsent, skadefrekvens, terskler = { høy: 70, moderat: 30 }, trendData = null) => {
  // Basis risiko-score
  let baseRiskScore = 'lav';
  if (skadeProsent >= terskler.høy || skadefrekvens >= 10) {
    baseRiskScore = 'høy';
  } else if (skadeProsent >= terskler.moderat || skadefrekvens >= 5) {
    baseRiskScore = 'moderat';
  }

  // Juster risiko basert på trend hvis tilgjengelig
  if (trendData) {
    const { skadeprosentSiste12Mnd, skadeprosentHistorisk } = trendData;

    if (skadeprosentSiste12Mnd && skadeprosentHistorisk) {
      const trendFaktor = skadeprosentSiste12Mnd / skadeprosentHistorisk;

      // Betydelig økning i siste periode (>150% økning)
      if (trendFaktor > 2.5) {
        // Oppjuster risiko betydelig
        if (baseRiskScore === 'lav') baseRiskScore = 'høy';
        else if (baseRiskScore === 'moderat') baseRiskScore = 'høy';
      } else if (trendFaktor > 1.5) {
        // Moderat økning (50%+ økning)
        if (baseRiskScore === 'lav') baseRiskScore = 'moderat';
        else if (baseRiskScore === 'moderat') baseRiskScore = 'høy';
      } else if (trendFaktor < 0.5) {
        // Betydelig nedgang (50%+ reduksjon)
        if (baseRiskScore === 'høy') baseRiskScore = 'moderat';
        else if (baseRiskScore === 'moderat') baseRiskScore = 'lav';
      } else if (trendFaktor < 0.7) {
        // Moderat nedgang (30%+ reduksjon)
        if (baseRiskScore === 'høy') baseRiskScore = 'moderat';
      }
    }
  }

  // Returner justert risiko-score
  const scoreMap = {
    'høy': { score: 'høy', color: 'red', label: 'Høy risiko' },
    'moderat': { score: 'moderat', color: 'yellow', label: 'Moderat risiko' },
    'lav': { score: 'lav', color: 'green', label: 'Lav risiko' }
  };

  return scoreMap[baseRiskScore];
};

/**
 * Identifiserer produkter med høy risiko
 */
export const identifyHighRiskProducts = (produktData, terskel = 70) => {
  return produktData
    .filter(produkt => produkt.skadeProsent > terskel)
    .sort((a, b) => b.skadeProsent - a.skadeProsent);
};

/**
 * Beregner trendretning for skadefrekvens
 */
export const calculateClaimFrequencyTrend = (årsdata) => {
  if (!årsdata || årsdata.length < 2) return { trend: 'ukjent', endring: 0 };

  const sortedData = årsdata.sort((a, b) => a.år - b.år);
  const recent = sortedData.slice(-3); // Siste 3 år

  if (recent.length < 2) return { trend: 'ukjent', endring: 0 };

  const totalEndring = recent.reduce((sum, data, index) => {
    if (index === 0) return 0;
    const previous = recent[index - 1];
    const endring = data.volum?.antallSkader - previous.volum?.antallSkader;
    return sum + endring;
  }, 0);

  const gjennomsnittligEndring = totalEndring / (recent.length - 1);

  if (gjennomsnittligEndring > 2) {
    return { trend: 'økende', endring: gjennomsnittligEndring, severity: 'høy' };
  } else if (gjennomsnittligEndring > 0) {
    return { trend: 'økende', endring: gjennomsnittligEndring, severity: 'moderat' };
  } else if (gjennomsnittligEndring < -2) {
    return { trend: 'synkende', endring: gjennomsnittligEndring, severity: 'positiv' };
  } else if (gjennomsnittligEndring < 0) {
    return { trend: 'synkende', endring: gjennomsnittligEndring, severity: 'litt_positiv' };
  }

  return { trend: 'stabil', endring: gjennomsnittligEndring };
};

/**
 * Beregner kostnadstrend
 */
export const calculateCostTrend = (årsdata) => {
  if (!årsdata || årsdata.length < 2) return { trend: 'ukjent', endring: 0 };

  const sortedData = årsdata.sort((a, b) => a.år - b.år);
  const recent = sortedData.slice(-3);

  if (recent.length < 2) return { trend: 'ukjent', endring: 0 };

  let totalProsentEndring = 0;
  let valideSammenligninger = 0;

  for (let i = 1; i < recent.length; i++) {
    const current = recent[i].økonomi?.skadebeløp || 0;
    const previous = recent[i - 1].økonomi?.skadebeløp || 0;

    if (previous > 0) {
      const prosentEndring = ((current - previous) / previous) * 100;
      totalProsentEndring += prosentEndring;
      valideSammenligninger++;
    }
  }

  if (valideSammenligninger === 0) return { trend: 'ukjent', endring: 0 };

  const gjennomsnittligProsentEndring = totalProsentEndring / valideSammenligninger;

  if (gjennomsnittligProsentEndring > 20) {
    return { trend: 'økende', endring: gjennomsnittligProsentEndring, severity: 'høy' };
  } else if (gjennomsnittligProsentEndring > 5) {
    return { trend: 'økende', endring: gjennomsnittligProsentEndring, severity: 'moderat' };
  } else if (gjennomsnittligProsentEndring < -20) {
    return { trend: 'synkende', endring: gjennomsnittligProsentEndring, severity: 'positiv' };
  } else if (gjennomsnittligProsentEndring < -5) {
    return { trend: 'synkende', endring: gjennomsnittligProsentEndring, severity: 'litt_positiv' };
  }

  return { trend: 'stabil', endring: gjennomsnittligProsentEndring };
};

/**
 * Identifiserer problematiske skademønstre
 */
export const identifyClaimPatterns = (skadehistorikk) => {
  const patterns = {
    hyppigeSteinspreut: 0,
    storeKaskoskader: 0,
    ansvarsskader: 0,
    åpneSkader: 0,
    regressSaker: 0
  };

  skadehistorikk.forEach(skade => {
    // Steinsprut-mønster
    if (skade.skadekoder?.nivå3?.toLowerCase().includes('steinsprut')) {
      patterns.hyppigeSteinspreut++;
    }

    // Store kaskoskader (over 50k)
    if (skade.skadekoder?.nivå1?.toLowerCase().includes('kasko') && skade.totalKostnad > 50000) {
      patterns.storeKaskoskader++;
    }

    // Ansvarsskader
    if (skade.skadekoder?.nivå1?.toLowerCase().includes('ansvar') ||
      skade.skadekoder?.nivå1?.toLowerCase().includes('tingskade')) {
      patterns.ansvarsskader++;
    }

    // Åpne skader
    if (skade.åpen === 1) {
      patterns.åpneSkader++;
    }

    // Regress-saker
    if (skade.regress && skade.regress !== 0) {
      patterns.regressSaker++;
    }
  });

  return patterns;
};

/**
 * Beregner gjennomsnittlig tid mellom skader
 */
export const calculateAverageTimeBetweenClaims = (skadehistorikk) => {
  if (!skadehistorikk || skadehistorikk.length < 2) return null;

  const sortedClaims = skadehistorikk
    .filter(skade => skade.skadeDato)
    .sort((a, b) => a.skadeDato - b.skadeDato);

  if (sortedClaims.length < 2) return null;

  let totalDays = 0;
  let intervals = 0;

  for (let i = 1; i < sortedClaims.length; i++) {
    const daysDiff = Math.abs(sortedClaims[i].skadeDato - sortedClaims[i - 1].skadeDato) / (1000 * 60 * 60 * 24);
    totalDays += daysDiff;
    intervals++;
  }

  return intervals > 0 ? Math.round(totalDays / intervals) : null;
};

/**
 * Beregner sesongmønstre for skader
 */
export const calculateSeasonalPatterns = (skadehistorikk) => {
  const seasonalData = {
    vinter: { antall: 0, kostnad: 0 }, // Des, Jan, Feb
    vår: { antall: 0, kostnad: 0 },    // Mar, Apr, Mai
    sommer: { antall: 0, kostnad: 0 }, // Jun, Jul, Aug
    høst: { antall: 0, kostnad: 0 }    // Sep, Okt, Nov
  };

  skadehistorikk.forEach(skade => {
    const måned = skade.skadeDato.getMonth();
    let sesong;

    if (måned === 11 || måned === 0 || måned === 1) sesong = 'vinter';
    else if (måned >= 2 && måned <= 4) sesong = 'vår';
    else if (måned >= 5 && måned <= 7) sesong = 'sommer';
    else sesong = 'høst';

    seasonalData[sesong].antall++;
    seasonalData[sesong].kostnad += skade.totalKostnad;
  });

  return seasonalData;
};

/**
 * Beregner risiko-indikatorer for dashboard
 */
export const calculateRiskIndicators = (kundeData, terskler = { skadeProsent: 70 }) => {
  const årsdata = kundeData.årsdata || [];

  if (årsdata.length === 0) return { overallRisk: 'ukjent', indicators: [] };

  // Beregn riktige verdier fra årsdata
  const totalPremie = årsdata.reduce((sum, år) => sum + (år.økonomi?.premie || 0), 0);
  const totalSkadebeløp = årsdata.reduce((sum, år) => sum + (år.økonomi?.skadebeløp || 0), 0);
  const totalSkader = årsdata.reduce((sum, år) => sum + (år.volum?.antallSkader || 0), 0);

  // FIKSET: Bruk samme metode for å telle åpne skader som i hovedteksten
  const totalÅpneSkader = kundeData.skadehistorikk?.filter(s => s.åpen === 1)?.length || 0;

  const samletSkadeProsent = totalPremie > 0 ? (totalSkadebeløp / totalPremie) * 100 : 0;
  const gjennomsnittligSkaderPerÅr = totalSkader / årsdata.length;

  const indicators = [];
  let overallRisk = 'lav';

  // Skadeprosent-analyse
  if (samletSkadeProsent > terskler.skadeProsent) {
    indicators.push({
      type: 'skadeprosent',
      severity: 'høy',
      message: `Samlet skadeprosent på ${samletSkadeProsent.toFixed(1)}% er over terskel på ${terskler.skadeProsent}%`,
      value: samletSkadeProsent
    });
    overallRisk = 'høy';
  }

  // Trend-analyse
  const claimTrend = calculateClaimFrequencyTrend(årsdata);
  if (claimTrend.trend === 'økende' && claimTrend.severity === 'høy') {
    indicators.push({
      type: 'trend',
      severity: 'høy',
      message: `Skadefrekvensen øker med gjennomsnittlig ${claimTrend.endring.toFixed(1)} skader per år`,
      value: claimTrend.endring
    });
    if (overallRisk !== 'høy') overallRisk = 'moderat';
  }

  // Åpne skader
  if (totalÅpneSkader > 0) {
    indicators.push({
      type: 'åpne_skader',
      severity: 'moderat',
      message: `${totalÅpneSkader} åpne skader krever oppfølging`,
      value: totalÅpneSkader
    });
  }

  // Høy skadefrekvens
  if (gjennomsnittligSkaderPerÅr >= 10) {
    indicators.push({
      type: 'høy_frekvens',
      severity: 'høy',
      message: `Høy skadefrekvens på ${gjennomsnittligSkaderPerÅr.toFixed(1)} skader per år`,
      value: gjennomsnittligSkaderPerÅr
    });
    overallRisk = 'høy';
  } else if (gjennomsnittligSkaderPerÅr >= 5) {
    indicators.push({
      type: 'moderat_frekvens',
      severity: 'moderat',
      message: `Moderat skadefrekvens på ${gjennomsnittligSkaderPerÅr.toFixed(1)} skader per år`,
      value: gjennomsnittligSkaderPerÅr
    });
    if (overallRisk !== 'høy') overallRisk = 'moderat';
  }

  return { overallRisk, indicators };
};
