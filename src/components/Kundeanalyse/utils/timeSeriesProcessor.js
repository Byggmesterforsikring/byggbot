/**
 * MODULÆR TIDSSERIE-PROSESSERING
 * Isolert modul kun for å håndtere tidsserier og inneværende år
 * Unngår konflikter med andre databehandlingsmodeler
 */

/**
 * Prosesserer SPESIFIKT årsdata for tidsserier
 * Håndterer inneværende år fra skadehistorikk
 * ISOLERT fra andre databehandlinger
 */
export const processTimeSeriesDataIsolated = (rawÅrsdata, rawSkadehistorikk = [], rawAktivePolicies = []) => {
    console.log('🔍 TimeSeriesProcessor: Starting processing with:', {
        årsdata: rawÅrsdata?.length || 0,
        skadehistorikk: rawSkadehistorikk?.length || 0,
        aktivePolicies: rawAktivePolicies?.length || 0
    });

    if (!rawÅrsdata || !Array.isArray(rawÅrsdata)) {
        console.log('❌ TimeSeriesProcessor: Invalid årsdata');
        return [];
    }

    const currentYear = new Date().getFullYear();

    // Debug: Se struktur på rådata
    console.log('🔍 TimeSeriesProcessor: Struktur på rådata årsdata[0]:', rawÅrsdata[0]);

    // Konverter rådata til standardformat
    let processedData = rawÅrsdata
        .sort((a, b) => a.år - b.år)
        .map(årData => {
            // Håndter både rådata (nestet) og allerede prosessert data (flat)
            const premie = årData.økonomi?.premie || årData.premie || 0;
            const skadebeløp = årData.økonomi?.skadebeløp || årData.skadebeløp || 0;
            const antallSkader = årData.volum?.antallSkader || årData.antallSkader || 0;

            return {
                år: årData.år,
                periode: årData.periode || årData.år.toString(),
                premie: premie,
                skadebeløp: skadebeløp,
                skadeProsent: premie > 0 ? (skadebeløp / premie) * 100 : 0,
                antallSkader: antallSkader,
                åpneSkader: årData.volum?.åpneSkader || årData.åpneSkader || 0,
                aktiveProdukter: årData.volum?.aktiveProdukter || årData.aktiveProdukter || 0,
                erEstimert: årData.erEstimert || false
            };
        })
        .filter(årData => {
            // ALDRI inkluder inneværende år fra aggregerte data - vi bygger det selv!
            if (årData.år === currentYear) {
                console.log(`⚠️ TimeSeriesProcessor: Filtrerer bort ${currentYear} fra aggregerte data (bygger selv fra skadehistorikk)`);
                return false;
            }

            // For andre år, filtrer ut kun hvis alle verdier er 0
            return årData.premie > 0 ||
                årData.skadebeløp > 0 ||
                årData.antallSkader > 0 ||
                årData.aktiveProdukter > 0;
        });

    console.log('🔍 TimeSeriesProcessor: Prosesserte årsdata før 2025-sjekk:', processedData);

    // Alltid bygg inneværende år fra skadehistorikk og aktivePolicies 
    // (aggregerte data inneholder ikke inneværende år)
    if (rawSkadehistorikk && rawAktivePolicies) {
        console.log('🔧 TimeSeriesProcessor: Bygger 2025-data fra skadehistorikk');

        // Filtrer skader fra inneværende år
        const currentYearClaims = rawSkadehistorikk.filter(skade => {
            if (!skade.skadeDato) return false;

            // Håndter DD-MM-YYYY format
            let skadeÅr;
            if (typeof skade.skadeDato === 'string' && skade.skadeDato.includes('-')) {
                const parts = skade.skadeDato.split('-');
                skadeÅr = parseInt(parts[2]); // År er siste del i DD-MM-YYYY
            } else {
                const date = new Date(skade.skadeDato);
                skadeÅr = date.getFullYear();
            }

            return skadeÅr === currentYear;
        });

        console.log(`🔍 TimeSeriesProcessor: Fant ${currentYearClaims.length} skader for ${currentYear}`);

        // Bygg alltid 2025-data selv om det ikke er skader (vi trenger premie-info fra aktivePolicies)
        if (true) { // Bygg alltid
            // Estimer inneværende års premie fra aktive poliser (pro-rata)
            const monthsPassedInYear = new Date().getMonth() + 1; // 1-12
            const estimatedAnnualPremie = rawAktivePolicies.reduce((sum, policy) => {
                const årsPremie = policy.økonomi?.årsPremie || 0;
                console.log(`💰 Policy ${policy.policyNummer}: kr ${årsPremie}/år`);
                return sum + årsPremie;
            }, 0);
            const proRataPremie = (estimatedAnnualPremie * monthsPassedInYear) / 12;

            console.log(`📊 Premieberegning: kr ${estimatedAnnualPremie}/år * ${monthsPassedInYear}/12 = kr ${proRataPremie} (pro-rata)`);
            console.log(`📊 Aktive poliser: ${rawAktivePolicies.length} stk`);

            const totalSkadebeløp = currentYearClaims.reduce((sum, skade) => {
                // Beregn korrekt brutto og netto kostnad
                const utbetalt = skade.økonomi?.utbetalt || skade.utbetalt || 0;
                const reservert = skade.økonomi?.reservert || skade.reservert || 0;
                const regress = skade.økonomi?.regress || skade.regress || 0;
                const originalTotalKostnad = skade.økonomi?.totalKostnad || skade.totalKostnad || 0;

                // Beregn brutto kostnad (utbetalt + reservert)
                const beregnetBruttoKostnad = utbetalt + reservert;
                const bruttoKostnad = originalTotalKostnad > 0 ? originalTotalKostnad : beregnetBruttoKostnad;

                // Netto kostnad = brutto + regress (regress er negativt)
                const nettoKostnad = bruttoKostnad + regress;


                return sum + nettoKostnad;
            }, 0);

            const currentYearData = {
                år: currentYear,
                periode: currentYear.toString(),
                premie: proRataPremie, // Pro-rata estimat basert på aktive poliser
                skadebeløp: totalSkadebeløp,
                skadeProsent: proRataPremie > 0 ? (totalSkadebeløp / proRataPremie) * 100 : 0,
                antallSkader: currentYearClaims.length,
                åpneSkader: currentYearClaims.filter(skade => skade.åpen === 1).length,
                aktiveProdukter: rawAktivePolicies.length,
                erEstimert: true // Flagg for å vise at dette er estimerte tall
            };

            processedData.push(currentYearData);
            processedData.sort((a, b) => a.år - b.år);

            console.log(`✅ TimeSeriesProcessor: Lagt til ${currentYear}-data:`, currentYearData);
            console.log(`📊 Detaljer: ${currentYearClaims.length} skader, kr ${proRataPremie.toLocaleString()} premie, kr ${totalSkadebeløp.toLocaleString()} skadekostnad`);
        }
    }

    console.log('🔍 TimeSeriesProcessor: Final result:', processedData);
    return processedData;
};

/**
 * Formaterer data for Recharts tidsserier
 */
export const formatTimeSeriesForChart = (timeSeriesData) => {
    return timeSeriesData.map(d => ({
        år: d.år.toString(),
        periode: d.periode,
        premie: d.premie,
        skadebeløp: d.skadebeløp,
        skadeprosent: d.skadeProsent,
        antallSkader: d.antallSkader,
        erEstimert: d.erEstimert
    }));
};

/**
 * Lager tabell-data for visning
 */
export const formatTimeSeriesForTable = (timeSeriesData) => {
    return timeSeriesData.map(d => ({
        år: d.år,
        premie: `kr ${d.premie.toLocaleString('no-NO')}${d.erEstimert ? ' (est.)' : ''}`,
        skadebeløp: `kr ${d.skadebeløp.toLocaleString('no-NO')}`,
        skadeprosent: `${d.skadeProsent.toFixed(1)}%`,
        antallSkader: d.antallSkader,
        status: d.erEstimert ? 'Estimert' : 'Faktisk'
    }));
};
