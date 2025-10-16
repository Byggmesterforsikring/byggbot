import { useMemo } from 'react';
import {
    predictNextClaim,
    predictAnnualClaimCost,
    identifyRiskFactors
} from '../utils/predictionModels';
import {
    calculateAverageTimeBetweenClaims,
    calculateSeasonalPatterns
} from '../utils/dataProcessing';
import { processDataForAdvancedPredictions, convertToLegacyFormat } from '../utils/predictionDataProcessor';

/**
 * Hook for prediksjoner og fremtidsanalyse
 */
export const usePrediksjoner = (kundeData, terskler = { skadeProsent: 70 }) => {
    const prediksjoner = useMemo(() => {
        if (!kundeData) return null;

        // Bruk isolert prediksjons-databehandling
        const prediksjonsData = processDataForAdvancedPredictions(kundeData);
        const legacyData = convertToLegacyFormat(prediksjonsData);
        const skadehistorikk = prediksjonsData.processedClaims;
        const årsdata = prediksjonsData.processedYearData;

        // Neste skade-prediksjon
        const nesteSkade = predictNextClaim(skadehistorikk, årsdata);

        // Årlig kostnadsprediksjon
        const årligKostnad = predictAnnualClaimCost(årsdata, kundeData.nøkkeltallSammendrag?.perProdukt);

        // Gjennomsnittlig tid mellom skader
        const avgTidMellomSkader = calculateAverageTimeBetweenClaims(skadehistorikk);

        // Sesongmønstre
        const sesongmønstre = calculateSeasonalPatterns(skadehistorikk);

        // Risikofaktorer
        const risikofaktorer = identifyRiskFactors(kundeData, terskler);

        return {
            nesteSkade,
            årligKostnad,
            avgTidMellomSkader,
            sesongmønstre,
            risikofaktorer
        };
    }, [kundeData, terskler]);

    return prediksjoner;
};
