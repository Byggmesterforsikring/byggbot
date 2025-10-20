/**
 * Simple prediction models for customer analysis
 */

/**
 * Predikerer neste skade basert på historisk frekvens
 */
export const predictNextClaim = (skadehistorikk, årsdata) => {
  if (!skadehistorikk || skadehistorikk.length === 0) {
    return { prediction: null, confidence: 'lav' };
  }
  
  // Beregn gjennomsnittlig tid mellom skader
  const sortedClaims = skadehistorikk
    .filter(skade => skade.skadeDato && skade.åpen === 0) // Kun avsluttede skader
    .sort((a, b) => a.skadeDato - b.skadeDato);
  
  if (sortedClaims.length < 2) {
    return { 
      prediction: 'Ikke nok data for prediksjon',
      confidence: 'lav',
      daysUntilNext: null 
    };
  }
  
  // Beregn gjennomsnittlig intervall
  let totalDays = 0;
  let intervals = 0;
  
  for (let i = 1; i < sortedClaims.length; i++) {
    const daysDiff = Math.abs(sortedClaims[i].skadeDato - sortedClaims[i - 1].skadeDato) / (1000 * 60 * 60 * 24);
    totalDays += daysDiff;
    intervals++;
  }
  
  const avgDaysBetweenClaims = totalDays / intervals;
  const lastClaimDate = sortedClaims[sortedClaims.length - 1].skadeDato;
  const daysSinceLastClaim = Math.abs(new Date() - lastClaimDate) / (1000 * 60 * 60 * 24);
  
  const expectedDaysUntilNext = Math.max(0, avgDaysBetweenClaims - daysSinceLastClaim);
  
  // Beregn konfidensgrad basert på datamengde og konsistens
  let confidence = 'lav';
  if (intervals >= 10) confidence = 'høy';
  else if (intervals >= 5) confidence = 'moderat';
  
  // Juster basert på trend
  const recentTrend = calculateRecentTrend(sortedClaims.slice(-5));
  let adjustedDays = expectedDaysUntilNext;
  
  if (recentTrend === 'økende') {
    adjustedDays = adjustedDays * 0.8; // Tidligere enn forventet
  } else if (recentTrend === 'synkende') {
    adjustedDays = adjustedDays * 1.2; // Senere enn forventet
  }
  
  return {
    prediction: expectedDaysUntilNext < 30 
      ? `Forventet ny skade innen ${Math.round(adjustedDays)} dager`
      : `Forventet ny skade innen ${Math.round(adjustedDays / 30)} måneder`,
    confidence,
    daysUntilNext: Math.round(adjustedDays),
    avgDaysBetweenClaims: Math.round(avgDaysBetweenClaims),
    daysSinceLastClaim: Math.round(daysSinceLastClaim)
  };
};

/**
 * Beregner trend for siste skader
 */
const calculateRecentTrend = (recentClaims) => {
  if (recentClaims.length < 3) return 'ukjent';
  
  const intervals = [];
  for (let i = 1; i < recentClaims.length; i++) {
    const daysDiff = Math.abs(recentClaims[i].skadeDato - recentClaims[i - 1].skadeDato) / (1000 * 60 * 60 * 24);
    intervals.push(daysDiff);
  }
  
  // Sammenlign første og siste halvdel av intervaller
  const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
  const secondHalf = intervals.slice(Math.floor(intervals.length / 2));
  
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  if (avgSecond < avgFirst * 0.8) return 'økende'; // Kortere intervaller = økt frekvens
  if (avgSecond > avgFirst * 1.2) return 'synkende'; // Lengre intervaller = redusert frekvens
  return 'stabil';
};

/**
 * Predikerer årlig skadekostnad
 */
export const predictAnnualClaimCost = (årsdata, produktData) => {
  if (!årsdata || årsdata.length === 0) return null;
  
  const sortedData = årsdata.sort((a, b) => a.år - b.år);
  const recentYears = sortedData.slice(-3); // Siste 3 år
  
  if (recentYears.length === 0) return null;
  
  // Beregn gjennomsnittlig årlig skadekostnad
  const avgAnnualCost = recentYears.reduce((sum, year) => 
    sum + (year.økonomi?.skadebeløp || 0), 0) / recentYears.length;
  
  // Beregn trend
  let trendAdjustment = 1;
  if (recentYears.length >= 2) {
    const oldest = recentYears[0].økonomi?.skadebeløp || 0;
    const newest = recentYears[recentYears.length - 1].økonomi?.skadebeløp || 0;
    
    if (oldest > 0) {
      const trendPercent = ((newest - oldest) / oldest);
      trendAdjustment = 1 + (trendPercent / recentYears.length); // Årlig trend
    }
  }
  
  const predictedCost = avgAnnualCost * trendAdjustment;
  
  return {
    predictedAnnualCost: predictedCost,
    avgHistoricalCost: avgAnnualCost,
    trendAdjustment: (trendAdjustment - 1) * 100, // Som prosent
    confidence: recentYears.length >= 3 ? 'høy' : 'moderat'
  };
};

/**
 * Identifiserer risikofaktorer som krever oppmerksomhet
 */
export const identifyRiskFactors = (kundeData, terskler = { skadeProsent: 70 }) => {
  const riskFactors = [];
  const produktData = kundeData.nøkkeltallSammendrag?.perProdukt || [];
  const årsdata = kundeData.årsdata || [];
  const skadehistorikk = kundeData.skadehistorikk || [];
  
  // Høy skadeprosent på produkter
  produktData.forEach(produkt => {
    if (produkt.økonomi?.skadeProsent > terskler.skadeProsent) {
      riskFactors.push({
        type: 'produkt_høy_skadeprosent',
        severity: 'høy',
        message: `${produkt.produktNavn} har ${produkt.økonomi.skadeProsent.toFixed(1)}% skadeprosent`,
        product: produkt.produktNavn,
        value: produkt.økonomi.skadeProsent
      });
    }
  });
  
  // Økende skadefrekvens
  const claimTrend = calculateClaimFrequencyTrend(årsdata);
  if (claimTrend.trend === 'økende') {
    riskFactors.push({
      type: 'økende_skadefrekvens',
      severity: claimTrend.severity,
      message: `Skadefrekvensen øker med ${claimTrend.endring.toFixed(1)} skader per år`,
      value: claimTrend.endring
    });
  }
  
  // Mange åpne skader
  const åpneSkader = skadehistorikk.filter(skade => skade.åpen === 1);
  if (åpneSkader.length > 2) {
    riskFactors.push({
      type: 'mange_åpne_skader',
      severity: 'moderat',
      message: `${åpneSkader.length} åpne skader krever oppfølging`,
      value: åpneSkader.length
    });
  }
  
  // Store enkeltstående skader
  const storeSkader = skadehistorikk.filter(skade => skade.totalKostnad > 100000);
  if (storeSkader.length > 0) {
    riskFactors.push({
      type: 'store_skader',
      severity: 'moderat',
      message: `${storeSkader.length} skader over 100.000 kr`,
      value: storeSkader.length
    });
  }
  
  return riskFactors.sort((a, b) => {
    const severityOrder = { høy: 3, moderat: 2, lav: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
};

/**
 * Hjelpefunksjon for å beregne skadefrekvens-trend
 */
const calculateClaimFrequencyTrend = (årsdata) => {
  if (!årsdata || årsdata.length < 2) return { trend: 'ukjent', endring: 0 };
  
  const sortedData = årsdata.sort((a, b) => a.år - b.år);
  const recent = sortedData.slice(-3); // Siste 3 år
  
  if (recent.length < 2) return { trend: 'ukjent', endring: 0 };
  
  const totalEndring = recent.reduce((sum, data, index) => {
    if (index === 0) return 0;
    const previous = recent[index - 1];
    const endring = (data.volum?.antallSkader || 0) - (previous.volum?.antallSkader || 0);
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
