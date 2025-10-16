/**
 * Utility functions for processing customer data from KUNDEINFO.json
 * SENTRALISERT DATABEHANDLING - alle komponenter skal bruke disse funksjonene
 */

/**
 * Hovedfunksjon for å prosessere all kundedata konsistent
 * Brukes av alle komponenter for å sikre konsistente beregninger
 */
export const processCustomerDataUnified = (kundeData) => {
    if (!kundeData) return null;

    const currentYear = new Date().getFullYear();

    // 1. Prosesser skadehistorikk (rens og dedupliser)
    const prosesserteSkader = processClaimData(kundeData.skadehistorikk || []);

    // 2. Prosesser årsdata med inneværende år (IKKE for tidsserier - de bruker egen isolert modul)
    const prosesserteÅrsdata = (kundeData.årsdata || [])
        .sort((a, b) => a.år - b.år)
        .map(årData => ({
            år: årData.år,
            periode: årData.periode || årData.år.toString(),
            premie: årData.økonomi?.premie || 0,
            skadebeløp: årData.økonomi?.skadebeløp || 0,
            skadeProsent: årData.økonomi?.skadeProsent || 0,
            antallSkader: årData.volum?.antallSkader || 0,
            åpneSkader: årData.volum?.åpneSkader || 0,
            aktiveProdukter: årData.volum?.aktiveProdukter || 0,
            erEstimert: false
        }));

    // 3. Konverter til nestet struktur for avanserte algoritmer
    const nesteteÅrsdata = prosesserteÅrsdata.map(årData => ({
        år: årData.år,
        måned: årData.måned || 1,
        periode: årData.periode,
        økonomi: {
            premie: årData.premie,
            skadebeløp: årData.skadebeløp,
            skadeProsent: årData.skadeProsent
        },
        volum: {
            antallSkader: årData.antallSkader,
            åpneSkader: årData.åpneSkader,
            aktiveProdukter: årData.aktiveProdukter
        },
        erEstimert: årData.erEstimert
    }));

    // 4. Beregn konsistente nøkkeltall
    const konsistenteNøkkeltall = calculateConsistentMetrics(
        prosesserteSkader,
        nesteteÅrsdata,
        kundeData.aktivePolicies || []
    );

    return {
        ...kundeData,
        prosesserteSkader,
        prosesserteÅrsdata,
        nesteteÅrsdata,
        konsistenteNøkkeltall
    };
};

/**
 * Beregner konsistente nøkkeltall basert på prosesserte data
 */
const calculateConsistentMetrics = (skader, årsdata, aktivePolicies) => {
    const currentYear = new Date().getFullYear();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    // Skader siste 12 måneder
    const skaderSiste12Mnd = skader.filter(skade =>
        skade.skadeDato && skade.skadeDato > twelveMonthsAgo
    );

    // Alle historiske skader (for produktanalyse)
    const alleSkader = skader;

    // Aktiv premie (årsbasis)
    const totalAktivPremie = aktivePolicies.reduce((sum, policy) =>
        sum + (policy.økonomi?.årsPremie || 0), 0
    );

    // Kostnad siste 12 måneder
    const kostnadSiste12Mnd = skaderSiste12Mnd.reduce((sum, skade) =>
        sum + (skade.totalKostnad || 0), 0
    );

    // Skadeprosent siste 12 måneder
    const skadeprosentSiste12Mnd = totalAktivPremie > 0 ?
        (kostnadSiste12Mnd / totalAktivPremie) * 100 : 0;

    return {
        // Periode-spesifikke tall
        siste12Mnd: {
            antallSkader: skaderSiste12Mnd.length,
            totalKostnad: kostnadSiste12Mnd,
            skadeprosent: skadeprosentSiste12Mnd,
            åpneSkader: skaderSiste12Mnd.filter(s => s.åpen === 1).length
        },

        // Historiske totaler
        historisk: {
            antallSkader: alleSkader.length,
            totalKostnad: alleSkader.reduce((sum, s) => sum + (s.totalKostnad || 0), 0),
            åpneSkader: alleSkader.filter(s => s.åpen === 1).length,
            periodeSpenn: {
                fra: Math.min(...årsdata.map(å => å.år)),
                til: currentYear
            }
        },

        // Aktive avtaler
        aktive: {
            antallAvtaler: new Set(aktivePolicies.map(p => p.policyNummer)).size,
            antallForsikringer: aktivePolicies.length,
            totalPremie: totalAktivPremie
        }
    };
};

/**
 * Prosesserer årsdata for tidsserier - inkluderer inneværende år fra skadehistorikk
 */
export const processTimeSeriesData = (årsdata, skadehistorikk = [], aktivePolicies = []) => {
    if (!årsdata || !Array.isArray(årsdata)) return [];

    const currentYear = new Date().getFullYear();

    // Debug: Se alle år som kommer fra API
    console.log('Alle år fra API:', årsdata.map(d => ({
        år: d.år,
        premie: d.økonomi?.premie,
        skadebeløp: d.økonomi?.skadebeløp,
        antallSkader: d.volum?.antallSkader
    })));

    let processedData = årsdata
        .sort((a, b) => a.år - b.år)
        .map(årData => ({
            år: årData.år,
            periode: årData.periode,
            premie: årData.økonomi?.premie || 0,
            skadebeløp: årData.økonomi?.skadebeløp || 0,
            skadeProsent: årData.økonomi?.skadeProsent || 0,
            antallSkader: årData.volum?.antallSkader || 0,
            åpneSkader: årData.volum?.åpneSkader || 0,
            aktiveProdukter: årData.volum?.aktiveProdukter || 0
        }))
        .filter(årData => {
            // Alltid inkluder inneværende år (selv med 0-verdier for å vise trend)
            if (årData.år === currentYear) {
                return true;
            }

            // For andre år, filtrer ut kun hvis alle verdier er 0
            return årData.premie > 0 ||
                årData.skadebeløp > 0 ||
                årData.antallSkader > 0 ||
                årData.aktiveProdukter > 0;
        });

    // Sjekk om inneværende år mangler og bygg det fra skadehistorikk
    const hasCurrentYear = processedData.some(d => d.år === currentYear);

    if (!hasCurrentYear && skadehistorikk && skadehistorikk.length > 0) {
        console.log('Inneværende år mangler i årsdata, bygger fra skadehistorikk');

        // Filtrer skader fra inneværende år
        const currentYearClaims = skadehistorikk.filter(skade => {
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

        if (currentYearClaims.length > 0) {
            // Estimer inneværende års premie fra aktive poliser (pro-rata)
            const monthsPassedInYear = new Date().getMonth() + 1; // 1-12
            const estimatedAnnualPremie = aktivePolicies.reduce((sum, policy) =>
                sum + (policy.økonomi?.årsPremie || 0), 0);
            const proRataPremie = (estimatedAnnualPremie * monthsPassedInYear) / 12;

            const totalSkadebeløp = currentYearClaims.reduce((sum, skade) =>
                sum + (skade.økonomi?.totalKostnad || 0), 0);

            const currentYearData = {
                år: currentYear,
                periode: currentYear.toString(),
                premie: proRataPremie, // Pro-rata estimat basert på aktive poliser
                skadebeløp: totalSkadebeløp,
                skadeProsent: proRataPremie > 0 ? (totalSkadebeløp / proRataPremie) * 100 : 0,
                antallSkader: currentYearClaims.length,
                åpneSkader: currentYearClaims.filter(skade => skade.åpen === 1).length,
                aktiveProdukter: aktivePolicies.length,
                erEstimert: true // Flagg for å vise at dette er estimerte tall
            };

            processedData.push(currentYearData);
            processedData.sort((a, b) => a.år - b.år);

            console.log(`Lagt til ${currentYear}-data fra skadehistorikk:`, currentYearData);
        }
    }

    return processedData;
};

/**
 * Prosesserer produktdata for analyse - tilpasset ny datastruktur
 */
export const processProductData = (nøkkeltallSammendrag, kundeData) => {
    // Hvis gamle struktur med perProdukt finnes, bruk den
    if (nøkkeltallSammendrag?.perProdukt) {
        return nøkkeltallSammendrag.perProdukt.map(produkt => ({
            produktKode: produkt.produktKode,
            produktNavn: produkt.produktNavn,
            opptjentPremie: produkt.økonomi?.opptjentPremie || 0,
            skadebeløp: produkt.økonomi?.skadebeløp || 0,
            skadeProsent: produkt.økonomi?.skadeProsent || 0,
            antallSkader: produkt.skadefrekvens?.antallSkader || 0,
            åpneSkader: produkt.skadefrekvens?.åpneSkader || 0,
            skaderPerÅr: produkt.skadefrekvens?.skaderPerÅr || 0,
            skaderPer100kPremie: produkt.skadefrekvens?.skaderPer100kPremie || 0
        }));
    }

    // Ny struktur: Beregn produktdata fra aktivePolicies og skadehistorikk
    if (!kundeData?.aktivePolicies) return [];

    const aktivePolicies = kundeData.aktivePolicies || [];
    const skadehistorikk = kundeData.skadehistorikk || [];
    const årsdata = kundeData.årsdata || [];
    const antallÅr = årsdata.length || 1; // For å beregne per-år statistikk

    // Grupper forsikringer etter produkttype og beregn historisk premie
    const produktMap = new Map();

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

        const produkt = produktMap.get(key);
        produkt.antallForsikringer += 1;
    });

    // Beregn historisk premie per produkt basert på årsdata og produktfordeling
    const totalÅrligPremie = aktivePolicies.reduce((sum, policy) => sum + (policy.økonomi?.årsPremie || 0), 0);

    produktMap.forEach((produkt, key) => {
        const produktNummer = parseInt(produkt.produktKode);
        const produktPolicies = aktivePolicies.filter(p => p.produktNummer === produktNummer);
        const produktÅrligPremie = produktPolicies.reduce((sum, p) => sum + (p.økonomi?.årsPremie || 0), 0);

        // Beregn andel av total premie for dette produktet
        const produktAndel = totalÅrligPremie > 0 ? produktÅrligPremie / totalÅrligPremie : 0;

        // Multipliser med historisk total premie for å få produktets historiske andel
        const historiskTotalPremie = årsdata.reduce((sum, år) => sum + (år.økonomi?.premie || 0), 0);
        produkt.opptjentPremie = historiskTotalPremie * produktAndel;
    });

    // FIKSET: Bruk prosesserte skader for konsistente beregninger (samme som andre komponenter)
    const prosesserteSkader = processClaimData(skadehistorikk);

    // Legg til skadedata per produkt
    prosesserteSkader.forEach(skade => {
        const produktKey = Array.from(produktMap.keys()).find(key =>
            key.startsWith(`${skade.produktKode}-`)
        );

        if (produktKey) {
            const produkt = produktMap.get(produktKey);
            // Bruk netto kostnad (etter regress) fra prosesserte skader
            const nettoKostnad = skade.totalKostnad || 0; // totalKostnad er allerede netto etter prosessering
            produkt.skadebeløp += nettoKostnad;
            produkt.antallSkader += 1;
            if (skade.åpen === 1) {
                produkt.åpneSkader += 1;
            }
        }
    });

    // Konverter til array og beregn avledede verdier
    return Array.from(produktMap.values()).map(produkt => ({
        ...produkt,
        skadeProsent: produkt.opptjentPremie > 0 ? (produkt.skadebeløp / produkt.opptjentPremie) * 100 : 0,
        skaderPerÅr: antallÅr > 0 ? produkt.antallSkader / antallÅr : 0,
        skaderPer100kPremie: produkt.opptjentPremie > 0 ? (produkt.antallSkader / (produkt.opptjentPremie / 100000)) : 0
    }));
};

/**
 * Prosesserer skadehistorikk for analyse
 */
export const processClaimData = (skadehistorikk) => {
    if (!skadehistorikk || !Array.isArray(skadehistorikk)) return [];

    return skadehistorikk.map(skade => {
        // Hjelpefunksjon for å parse DD-MM-YYYY format til Date objekt
        const parseNorwegianDate = (dateStr) => {
            if (!dateStr) return null;
            try {
                const [day, month, year] = dateStr.split('-');
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } catch (e) {
                console.warn('Kunne ikke parse dato:', dateStr, e);
                return null;
            }
        };

        // Beregn korrekt total kostnad og netto kostnad etter regress
        const utbetalt = skade.økonomi?.utbetalt || 0;
        const reservert = skade.økonomi?.reservert || 0;
        const regress = skade.økonomi?.regress || 0;
        const originalTotalKostnad = skade.økonomi?.totalKostnad || 0;

        // Beregn korrekt brutto total kostnad (utbetalt + reservert)
        const beregnetBruttoTotalKostnad = utbetalt + reservert;

        // Bruk beregnet verdi, men sjekk mot original hvis tilgjengelig
        const bruttoTotalKostnad = originalTotalKostnad > 0 ? originalTotalKostnad : beregnetBruttoTotalKostnad;

        // Varsle hvis det er avvik mellom original og beregnet
        if (originalTotalKostnad > 0 && Math.abs(originalTotalKostnad - beregnetBruttoTotalKostnad) > 1) {
            console.warn(`⚠️ Skade ${skade.skadeNummer}: Avvik i totalKostnad. Original: ${originalTotalKostnad}, Beregnet (utbetalt+reservert): ${beregnetBruttoTotalKostnad}`);
        }

        // Netto kostnad = brutto kostnad + regress (regress er negativt når vi får penger tilbake)
        const nettoTotalKostnad = bruttoTotalKostnad + regress;



        return {
            skadeNummer: skade.skadeNummer,
            skadeDato: parseNorwegianDate(skade.skadeDato),
            meldtDato: parseNorwegianDate(skade.meldtDato),
            avsluttetDato: parseNorwegianDate(skade.avsluttetDato),
            status: skade.status,
            skadeType: skade.skadeType,
            åpen: skade.åpen,
            produktKode: skade.produktKode,
            produktNavn: skade.produktNavn,
            objektType: skade.objektType,
            registreringsNummer: skade.registreringsNummer,
            utbetalt: utbetalt,
            reservert: reservert,
            regress: regress,
            originalTotalKostnad: originalTotalKostnad, // Original verdi fra data
            beregnetBruttoTotalKostnad: beregnetBruttoTotalKostnad, // Utbetalt + reservert
            bruttoTotalKostnad: bruttoTotalKostnad, // Brukt brutto kostnad (prioriterer original)
            totalKostnad: nettoTotalKostnad, // Netto kostnad etter regress
            saksbehandler: skade.saksbehandler,
            skadekoder: {
                nivå1: skade.skadekoder?.nivå1,
                nivå2: skade.skadekoder?.nivå2,
                nivå3: skade.skadekoder?.nivå3
            },
            uwÅr: skade.uwÅr
        };
    }).sort((a, b) => (b.skadeDato || new Date(0)) - (a.skadeDato || new Date(0)));
};

/**
 * Grupperer skader etter type for pie chart
 */
export const groupClaimsByType = (skadehistorikk) => {
    const grouped = {};

    skadehistorikk.forEach(skade => {
        const type = skade.skadekoder?.nivå1 || 'Ukjent';
        if (!grouped[type]) {
            grouped[type] = {
                name: type,
                antall: 0,
                totalKostnad: 0,
                skader: []
            };
        }
        grouped[type].antall++;
        grouped[type].totalKostnad += skade.totalKostnad;
        grouped[type].skader.push(skade);
    });

    const sortedGroups = Object.values(grouped).sort((a, b) => b.totalKostnad - a.totalKostnad);

    // For pie chart: Grupper små segmenter (under 3% av total) som "Andre"
    const totalCost = sortedGroups.reduce((sum, group) => sum + group.totalKostnad, 0);
    const threshold = totalCost * 0.03; // 3% terskel

    const mainGroups = sortedGroups.filter(group => group.totalKostnad >= threshold);
    const smallGroups = sortedGroups.filter(group => group.totalKostnad < threshold);

    let result = [...mainGroups];

    // Legg til "Andre" kategori hvis det er små grupper
    if (smallGroups.length > 0) {
        const andreGroup = {
            name: 'Andre',
            antall: smallGroups.reduce((sum, group) => sum + group.antall, 0),
            totalKostnad: smallGroups.reduce((sum, group) => sum + group.totalKostnad, 0),
            skader: smallGroups.reduce((acc, group) => acc.concat(group.skader), []),
            isGrouped: true,
            originalGroups: smallGroups
        };
        result.push(andreGroup);
    }

    return {
        all: sortedGroups, // Alle grupper for detaljert visning
        forPieChart: result // Grupperte data for pie chart
    };
};

/**
 * Beregner månedlige skademønstre
 */
export const getMonthlyClaimPattern = (skadehistorikk) => {
    const currentYear = new Date().getFullYear();
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        måned: i + 1,
        månedNavn: new Date(currentYear, i, 1).toLocaleDateString('nb-NO', { month: 'long' }),
        antallSkader: 0,
        totalKostnad: 0
    }));

    skadehistorikk.forEach(skade => {
        const måned = skade.skadeDato.getMonth();
        monthlyData[måned].antallSkader++;
        monthlyData[måned].totalKostnad += skade.totalKostnad;
    });

    return monthlyData;
};

/**
 * Beregner skadefrekvens per kjøretøy/objekt
 */
export const calculateVehicleRiskProfile = (skadehistorikk) => {
    const vehicleData = {};

    skadehistorikk.forEach(skade => {
        const regNr = skade.registreringsNummer;
        if (!regNr) return;

        if (!vehicleData[regNr]) {
            vehicleData[regNr] = {
                registreringsNummer: regNr,
                antallSkader: 0,
                totalKostnad: 0,
                skader: []
            };
        }

        vehicleData[regNr].antallSkader++;
        vehicleData[regNr].totalKostnad += skade.totalKostnad;
        vehicleData[regNr].skader.push(skade);
    });

    return Object.values(vehicleData)
        .sort((a, b) => b.antallSkader - a.antallSkader)
        .slice(0, 10); // Top 10 mest skadeutsatte kjøretøy
};

/**
 * Formaterer valuta for norsk visning
 */
export const formatCurrency = (amount, short = false) => {
    if (short && amount >= 1000000) {
        return new Intl.NumberFormat('nb-NO', {
            style: 'currency',
            currency: 'NOK',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
            notation: 'compact'
        }).format(amount);
    }

    return new Intl.NumberFormat('nb-NO', {
        style: 'currency',
        currency: 'NOK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

/**
 * Formaterer prosent for visning
 */
export const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '0,0%';
    }
    return `${value.toFixed(1).replace('.', ',')}%`;
};

/**
 * Formaterer tall med norsk formatering
 */
export const formatNumber = (value, decimals = 0) => {
    return new Intl.NumberFormat('nb-NO', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
};

/**
 * Formaterer dato til norsk standard
 */
export const formatDate = (dateString) => {
    if (!dateString) return 'Ikke angitt';

    try {
        // Håndter DD-MM-YYYY format
        if (dateString.includes('-') && dateString.length === 10) {
            const [day, month, year] = dateString.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('nb-NO', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
        }

        // Håndter andre formater
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('nb-NO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }

        // Hvis ikke parsbar, returner som er
        return dateString;
    } catch (error) {
        return dateString;
    }
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
 * Beregner nåværende/aktuelle nøkkeltall (siste 12 måneder + aktive poliser)
 */
export const calculateCurrentMetrics = (kundeData) => {
    if (!kundeData) return null;

    const aktivePolicies = kundeData.aktivePolicies || [];
    // VIKTIG: Bruk prosesserte (dedupliserte) skader for korrekt telling
    const skadehistorikk = processClaimData(kundeData.skadehistorikk || []);

    // Beregn dato for 12 måneder siden
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    // Filtrér skader fra siste 12 måneder
    const recentClaims = skadehistorikk.filter(skade =>
        skade.skadeDato && skade.skadeDato > twelveMonthsAgo
    );

    // Beregn aktive avtaler (unike policy-nummer)
    const uniquePolicyNumbers = new Set(aktivePolicies.map(policy => policy.policyNummer));
    const antallAktiveAvtaler = uniquePolicyNumbers.size;

    // Beregn total premie for aktive forsikringer
    const totalAktivPremie = aktivePolicies.reduce((sum, policy) =>
        sum + (policy.økonomi?.årsPremie || 0), 0
    );

    // Beregn skadekostnad siste 12 måneder
    const skadekostnadSiste12Mnd = recentClaims.reduce((sum, skade) =>
        sum + (skade.totalKostnad || 0), 0
    );

    // Beregn skadeprosent siste 12 måneder
    const skadeprosentSiste12Mnd = totalAktivPremie > 0
        ? (skadekostnadSiste12Mnd / totalAktivPremie) * 100
        : 0;



    return {
        antallAktiveAvtaler,
        antallAktiveForsikringer: aktivePolicies.length,
        totalAktivPremie,
        skaderSiste12Mnd: recentClaims.length,
        skadekostnadSiste12Mnd,
        skadeprosentSiste12Mnd,
        åpneSkader: skadehistorikk.filter(skade => skade.åpen === 1).length,
        periode: {
            fra: twelveMonthsAgo.toLocaleDateString('nb-NO'),
            til: new Date().toLocaleDateString('nb-NO')
        }
    };
};