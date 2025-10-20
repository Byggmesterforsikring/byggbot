/**
 * MODULÆR PREDIKSJONS-DATABEHANDLING
 * Isolert modul for å behandle data spesifikt for prediksjonsalgoritmer
 * Sikrer at avanserte algoritmer får riktig datastruktur med 2025-data
 */

import { processClaimData } from './dataProcessing';

/**
 * Prosesserer data spesifikt for avanserte prediksjonsalgoritmer
 * Sikrer riktig nestet struktur med inneværende års data
 */
export const processDataForAdvancedPredictions = (kundeData) => {
    console.log('🔍 PredictionDataProcessor: Processing data for advanced predictions');

    if (!kundeData) return { processedClaims: [], processedYearData: [] };

    const currentYear = new Date().getFullYear();

    // 1. Prosesser skadehistorikk
    const processedClaims = processClaimData(kundeData.skadehistorikk || []);

    // 2. Start med eksisterende årsdata
    let yearDataWithCurrent = (kundeData.årsdata || [])
        .sort((a, b) => a.år - b.år)
        .map(årData => ({
            år: årData.år,
            måned: årData.måned || 1,
            periode: årData.periode || årData.år.toString(),
            økonomi: {
                premie: årData.økonomi?.premie || 0,
                skadebeløp: årData.økonomi?.skadebeløp || 0,
                skadeProsent: årData.økonomi?.skadeProsent || 0
            },
            volum: {
                antallSkader: årData.volum?.antallSkader || 0,
                åpneSkader: årData.volum?.åpneSkader || 0,
                aktiveProdukter: årData.volum?.aktiveProdukter || 0
            },
            erEstimert: årData.erEstimert || false
        }));

    // 3. Sjekk om inneværende år mangler og bygg det fra skadehistorikk
    const hasCurrentYear = yearDataWithCurrent.some(d => d.år === currentYear);

    if (!hasCurrentYear && processedClaims.length > 0) {
        console.log('🔧 PredictionDataProcessor: Building current year data from claims');

        // Filtrer skader fra inneværende år
        const currentYearClaims = processedClaims.filter(skade => {
            if (!skade.skadeDato) return false;
            return skade.skadeDato.getFullYear() === currentYear;
        });

        if (currentYearClaims.length > 0) {
            // Estimer premie fra aktive poliser
            const aktivePolicies = kundeData.aktivePolicies || [];
            const monthsPassedInYear = new Date().getMonth() + 1;
            const estimatedAnnualPremie = aktivePolicies.reduce((sum, policy) =>
                sum + (policy.økonomi?.årsPremie || 0), 0);
            const proRataPremie = (estimatedAnnualPremie * monthsPassedInYear) / 12;

            const totalSkadebeløp = currentYearClaims.reduce((sum, skade) =>
                sum + (skade.totalKostnad || 0), 0);

            const currentYearData = {
                år: currentYear,
                måned: new Date().getMonth() + 1,
                periode: currentYear.toString(),
                økonomi: {
                    premie: proRataPremie,
                    skadebeløp: totalSkadebeløp,
                    skadeProsent: proRataPremie > 0 ? (totalSkadebeløp / proRataPremie) * 100 : 0
                },
                volum: {
                    antallSkader: currentYearClaims.length,
                    åpneSkader: currentYearClaims.filter(skade => skade.åpen === 1).length,
                    aktiveProdukter: aktivePolicies.length
                },
                erEstimert: true
            };

            yearDataWithCurrent.push(currentYearData);
            yearDataWithCurrent.sort((a, b) => a.år - b.år);

            console.log(`✅ PredictionDataProcessor: Added ${currentYear} data:`, currentYearData);
        }
    }

    console.log('🔍 PredictionDataProcessor: Final processed data:', {
        claims: processedClaims.length,
        yearData: yearDataWithCurrent.length,
        hasCurrentYear: yearDataWithCurrent.some(d => d.år === currentYear)
    });

    return {
        processedClaims,
        processedYearData: yearDataWithCurrent
    };
};

/**
 * Konverterer data til format som forventes av legacy prediksjonsalgoritmer
 */
export const convertToLegacyFormat = (processedData) => {
    return {
        skadehistorikk: processedData.processedClaims,
        årsdata: processedData.processedYearData
    };
};




