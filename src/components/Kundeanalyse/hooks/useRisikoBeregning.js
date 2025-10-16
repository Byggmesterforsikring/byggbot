import { useMemo } from 'react';
import {
    calculateRiskScore,
    identifyHighRiskProducts,
    calculateCostTrend,
    calculateRiskIndicators
} from '../utils/riskCalculations';
import { calculateAdvancedScenarios } from '../utils/advancedPredictionModels';
import { processDataForAdvancedPredictions } from '../utils/predictionDataProcessor';
import { processProductData } from '../utils/dataProcessing';

/**
 * Hook for risiko-beregninger og analyse
 */
export const useRisikoBeregning = (kundeData, terskler = { skadeProsent: 70 }) => {
    const risikoAnalyse = useMemo(() => {
        if (!kundeData) return null;

        const nøkkeltall = kundeData.nøkkeltallSammendrag;
        // Beregn produktdata fra aktivePolicies siden perProdukt ikke lenger eksisterer
        const produktData = processProductData(nøkkeltall, kundeData);

        // Bruk isolert prediksjons-databehandling for å få riktig struktur
        const prediksjonsData = processDataForAdvancedPredictions(kundeData);
        const årsdata = prediksjonsData.processedYearData;

        // Hovedrisiko-score
        const overallRiskScore = nøkkeltall ? calculateRiskScore(
            nøkkeltall.samletSkadeProsent || 0,
            nøkkeltall.skaderPerÅr || 0,
            terskler
        ) : { score: 'ukjent', color: 'gray', label: 'Ukjent risiko' };

        // Høyrisiko produkter
        const høyrisikoProdukter = identifyHighRiskProducts(produktData, terskler.skadeProsent);

        // Bruk avansert trendanalyse for konsistens
        const avansertAnalyse = calculateAdvancedScenarios(kundeData, årsdata);
        const skadefrekvenseTrend = {
            trend: avansertAnalyse.trendAnalyse?.frequencyTrend > 5 ? 'økende' :
                avansertAnalyse.trendAnalyse?.frequencyTrend < -5 ? 'synkende' : 'stabil',
            endring: avansertAnalyse.trendAnalyse?.frequencyTrend || 0,
            severity: Math.abs(avansertAnalyse.trendAnalyse?.frequencyTrend || 0) > 15 ? 'høy' :
                Math.abs(avansertAnalyse.trendAnalyse?.frequencyTrend || 0) > 5 ? 'moderat' : 'lav'
        };
        const kostnadsTrend = {
            trend: avansertAnalyse.trendAnalyse?.costTrend > 5 ? 'økende' :
                avansertAnalyse.trendAnalyse?.costTrend < -5 ? 'synkende' : 'stabil',
            endring: avansertAnalyse.trendAnalyse?.costTrend || 0,
            severity: Math.abs(avansertAnalyse.trendAnalyse?.costTrend || 0) > 15 ? 'høy' :
                Math.abs(avansertAnalyse.trendAnalyse?.costTrend || 0) > 5 ? 'moderat' : 'lav'
        };

        // Risiko-indikatorer
        const risikoIndikatorer = calculateRiskIndicators(kundeData, terskler);

        return {
            overallRiskScore,
            høyrisikoProdukter,
            skadefrekvenseTrend,
            kostnadsTrend,
            risikoIndikatorer
        };
    }, [kundeData, terskler]);

    return risikoAnalyse;
};
