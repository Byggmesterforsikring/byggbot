import { AnalysisPlugin } from '../AnalysisPlugin';

class SkadeprosentPlugin extends AnalysisPlugin {
    constructor() {
        super({
            id: 'skadeprosent',
            name: 'Skadeprosent',
            description: 'Beregn skadeprosent (utbetalte skader som andel av premie/forsikringssum)',
            category: 'ratio',
            complexity: 'medium',
            icon: '📊',
            requiresComparison: false,
            minDataPoints: 5,
            userExplanation: 'Skadeprosent viser hvor stor andel av premien eller forsikringssummen som utbetales i skader. Dette er et kritisk lønnsomhetsmål for forsikring.',
            useCase: 'Identifiser ulønnsomme produkter/segmenter og optimaliser prising. Brukes til risikoevaluering og porteføljestyring.'
        });
    }

    isAvailable(data, dataB, hasCompare, reportType, chartLabels) {
        // Only available for skade reports
        if (!this.isSkadeReport(reportType, chartLabels)) return false;

        // Need enough data points
        if (data.length < this.minDataPoints) return false;

        // Check for claim amount fields (required for loss ratio calculation)
        const claimFields = this.findClaimAmountFields(data);
        if (claimFields.length === 0) return false;

        // Check for premium/exposure fields
        const premiumFields = this.findPremiumFields(data);
        if (premiumFields.length === 0) return false;

        // Check for categorical fields for grouping
        const categoricalFields = this.getCategoricalFields(data);

        return categoricalFields.length > 0;
    }

    execute(params) {
        const { data, claimField, premiumField, categoryField } = params;

        if (!data || data.length === 0) {
            throw new Error('Ingen data tilgjengelig for skadeprosent analyse');
        }

        // Use user-provided configuration or fallback to smart defaults
        const finalClaimField = claimField || this.selectBestClaimField(this.findClaimAmountFields(data));
        const finalPremiumField = premiumField || this.selectBestPremiumField(this.findPremiumFields(data));
        const finalCategoryField = categoryField || this.selectBestCategoryField(data);

        if (!finalClaimField) {
            throw new Error('Ingen skadebeløp funnet (f.eks. SumUtbetalt, Bruttoskade)');
        }

        if (!finalPremiumField) {
            throw new Error('Ingen premie-/eksponeringsdata funnet (f.eks. SumNettoPremie, SumForsikringssum)');
        }

        if (!finalCategoryField) {
            throw new Error('Ingen kategorifelt funnet for gruppering');
        }

        // Calculate loss ratios
        const analysisData = this.calculateLossRatios(data, finalClaimField, finalPremiumField, finalCategoryField);

        // Generate smart insights
        const insights = this.generateLossRatioInsights(analysisData, finalClaimField, finalPremiumField, finalCategoryField);

        const title = 'Skadeprosent Analyse';
        const subtitle = `${finalClaimField} som andel av ${finalPremiumField}`;

        return {
            type: 'skadeprosent',
            title,
            subtitle,
            data: analysisData,
            claimField: finalClaimField,
            premiumField: finalPremiumField,
            categoryField: finalCategoryField,
            visualization: {
                type: 'bar',
                data: analysisData,
                config: {
                    xField: finalCategoryField || 'category',
                    yField: 'lossRatio',
                    title: 'Skadeprosent per kategori',
                    subtitle: `Basert på ${finalClaimField} og ${finalPremiumField}`
                }
            },
            summary: this.generateLossRatioSummary(analysisData),
            insights: insights,
            explanation: this.generateLossRatioExplanation(finalClaimField, finalPremiumField, finalCategoryField)
        };
    }

    findClaimAmountFields(data) {
        if (!data || data.length === 0) return [];

        const sampleRow = data[0];
        const fieldNames = Object.keys(sampleRow);

        return fieldNames.filter(field => {
            const fieldLower = field.toLowerCase();
            return fieldLower.includes('utbetalt') ||
                fieldLower.includes('bruttoskade') ||
                fieldLower.includes('nettoskade') ||
                fieldLower.includes('skadebeløp') ||
                fieldLower.includes('claim') ||
                fieldLower.includes('loss') ||
                field === 'SumUtbetalt' ||
                field === 'SumBruttoskade' ||
                field === 'SumNettoskade';
        });
    }

    findPremiumFields(data) {
        if (!data || data.length === 0) return [];

        const sampleRow = data[0];
        const fieldNames = Object.keys(sampleRow);

        return fieldNames.filter(field => {
            const fieldLower = field.toLowerCase();
            return fieldLower.includes('nettopremie') ||
                fieldLower.includes('premie') ||
                fieldLower.includes('forsikringssum') ||
                fieldLower.includes('premium') ||
                fieldLower.includes('exposure') ||
                field === 'SumNettoPremie' ||
                field === 'SumForsikringssum' ||
                field === 'SumBruttoPremie';
        });
    }

    selectBestClaimField(claimFields) {
        // Prioritize claim fields in order of preference for loss ratio calculation
        const priorityOrder = [
            'SumUtbetalt',          // Best: actual paid claims
            'SumNettoskade',        // Good: net claim amount
            'SumBruttoskade'        // Fallback: gross claim amount
        ];

        for (const priority of priorityOrder) {
            if (claimFields.includes(priority)) {
                return priority;
            }
        }

        // Look for fields containing key words
        const utbetaltFields = claimFields.filter(f =>
            f.toLowerCase().includes('utbetalt')
        );
        if (utbetaltFields.length > 0) return utbetaltFields[0];

        const skadeFields = claimFields.filter(f =>
            f.toLowerCase().includes('skade') || f.toLowerCase().includes('claim')
        );
        if (skadeFields.length > 0) return skadeFields[0];

        return claimFields[0];
    }

    selectBestPremiumField(premiumFields) {
        // Prioritize premium fields in order of preference for loss ratio calculation
        const priorityOrder = [
            'SumNettoPremie',       // Best: net premium earned
            'SumBruttoPremie',      // Good: gross premium
            'SumForsikringssum'     // Fallback: insured sum as proxy
        ];

        for (const priority of priorityOrder) {
            if (premiumFields.includes(priority)) {
                return priority;
            }
        }

        // Look for fields containing key words
        const premieFields = premiumFields.filter(f =>
            f.toLowerCase().includes('premie') || f.toLowerCase().includes('premium')
        );
        if (premieFields.length > 0) return premieFields[0];

        const forsikringssumFields = premiumFields.filter(f =>
            f.toLowerCase().includes('forsikringssum')
        );
        if (forsikringssumFields.length > 0) return forsikringssumFields[0];

        return premiumFields[0];
    }

    selectBestCategoryField(data) {
        const categoricalFields = this.getCategoricalFields(data);

        // Prioritize business-relevant categories for loss ratio analysis
        const priorityFields = [
            'Produktnavn',            // Which products are most/least profitable?
            'Poststed',               // Geographic loss patterns
            'Skadetype',              // Loss ratio by damage type
            'Bedriftsnavn',           // Customer profitability
            'SkadekodeNivå1',         // Detailed loss causes
            'Organisasjonsmedlemskap', // Industry loss patterns
            'Produksjonsansvarlig',   // Responsibility profitability
            'SkadekodeNivå2',
            'SkadekodeNivå3',
            'Objekttype',
            'Forsikringsselskap'
        ];

        for (const priority of priorityFields) {
            if (categoricalFields.includes(priority)) {
                return priority;
            }
        }

        return categoricalFields[0];
    }

    calculateLossRatios(data, claimField, premiumField, categoryField) {
        const categoryData = {};

        data.forEach(row => {
            const claimAmount = parseFloat(row[claimField]) || 0;
            const premiumAmount = parseFloat(row[premiumField]) || 0;
            const category = categoryField ? (row[categoryField] || 'Ukjent') : 'Total';

            if (!categoryData[category]) {
                categoryData[category] = {
                    category,
                    totalClaims: 0,
                    totalPremiums: 0,
                    claimCount: 0
                };
            }

            categoryData[category].totalClaims += claimAmount;
            categoryData[category].totalPremiums += premiumAmount;
            categoryData[category].claimCount += 1;
        });

        return Object.values(categoryData).map(cat => {
            // Loss ratio = Total Claims / Total Premiums * 100%
            const lossRatio = cat.totalPremiums > 0
                ? (cat.totalClaims / cat.totalPremiums) * 100
                : 0;

            return {
                ...cat,
                lossRatio: parseFloat(lossRatio.toFixed(1)),
                avgClaimSize: cat.claimCount > 0 ? cat.totalClaims / cat.claimCount : 0,
                avgPremium: cat.claimCount > 0 ? cat.totalPremiums / cat.claimCount : 0
            };
        }).sort((a, b) => b.lossRatio - a.lossRatio);
    }

    generateLossRatioInsights(analysisData, claimField, premiumField, categoryField) {
        const insights = [];

        if (analysisData.length === 0) return insights;

        const totalClaims = analysisData.reduce((sum, d) => sum + d.totalClaims, 0);
        const totalPremiums = analysisData.reduce((sum, d) => sum + d.totalPremiums, 0);
        const overallLossRatio = totalPremiums > 0
            ? (totalClaims / totalPremiums) * 100
            : 0;

        insights.push(`Gjennomsnittlig skadeprosent er ${overallLossRatio.toFixed(1)}%.`);

        // Industry-specific loss ratio benchmarks
        if (overallLossRatio > 100) {
            insights.push('🔴 Meget høy skadeprosent (>100%) - betydelig tap! Krever umiddelbare tiltak.');
        } else if (overallLossRatio > 80) {
            insights.push('🟡 Høy skadeprosent (80-100%) - lav lønnsomhet. Vurder prisøkning eller risikoreduksjon.');
        } else if (overallLossRatio > 60) {
            insights.push('🟢 Moderat skadeprosent (60-80%) - akseptabel lønnsomhet for mange forsikringsprodukter.');
        } else if (overallLossRatio > 40) {
            insights.push('✅ God skadeprosent (40-60%) - sunn lønnsomhet.');
        } else {
            insights.push('💰 Meget god skadeprosent (<40%) - høy lønnsomhet.');
        }

        const highest = analysisData[0];
        const lowest = analysisData[analysisData.length - 1];

        insights.push(`${highest.category} har høyest skadeprosent (${highest.lossRatio}%) og ${lowest.category} har lavest (${lowest.lossRatio}%).`);

        // Loss ratio variation analysis
        const lossRatios = analysisData.map(d => d.lossRatio);
        const maxRatio = Math.max(...lossRatios);
        const minRatio = Math.min(...lossRatios);
        const variation = maxRatio > 0 ? (maxRatio - minRatio) / maxRatio : 0;

        if (variation > 0.8) {
            insights.push('⚠️ Stor variasjon i skadeprosent mellom kategorier - indikerer tydelige lønnsomhetsforskjeller.');
        } else if (variation < 0.2) {
            insights.push('📊 Liten variasjon i skadeprosent - relativt jevn lønnsomhet.');
        }

        // Category-specific insights
        if (categoryField === 'Produktnavn') {
            insights.push('💡 Produktanalyse: Identifiser ulønnsomme produkter og juster priser eller dekninger.');
        } else if (categoryField === 'Poststed') {
            insights.push('🗺️ Geografisk analyse: Identifiser høyrisiko områder for justering av premier.');
        } else if (categoryField === 'Skadetype') {
            insights.push('🔍 Skadetypeanalyse: Fokuser på kostnadsdrivende skadetyper for bedre lønnsomhet.');
        }

        return insights;
    }

    generateLossRatioSummary(analysisData) {
        const totalClaims = analysisData.reduce((sum, d) => sum + d.totalClaims, 0);
        const totalPremiums = analysisData.reduce((sum, d) => sum + d.totalPremiums, 0);
        const overallLossRatio = totalPremiums > 0
            ? (totalClaims / totalPremiums) * 100
            : 0;

        const totalClaimCount = analysisData.reduce((sum, d) => sum + d.claimCount, 0);
        const avgClaimSize = totalClaimCount > 0 ? totalClaims / totalClaimCount : 0;

        return {
            'Totalt skadebeløp': `${this.formatNumber(totalClaims)} kr`,
            'Total premie/eksponering': `${this.formatNumber(totalPremiums)} kr`,
            'Gjennomsnittlig skadeprosent': `${overallLossRatio.toFixed(1)}%`,
            'Kategorier analysert': analysisData.length,
            'Høyeste skadeprosent': `${analysisData[0]?.lossRatio || 0}% (${analysisData[0]?.category || 'N/A'})`,
            'Laveste skadeprosent': `${analysisData[analysisData.length - 1]?.lossRatio || 0}% (${analysisData[analysisData.length - 1]?.category || 'N/A'})`,
            'Gjennomsnittlig skadestørrelse': `${this.formatNumber(avgClaimSize)} kr`
        };
    }

    generateLossRatioExplanation(claimField, premiumField, categoryField) {
        return {
            title: 'Hvordan lese skadeprosent?',
            content: `Skadeprosent viser hvor stor andel av premien/eksponeringen som utbetales i skader. Dette er et kritisk lønnsomhetsmål for forsikring.`,
            tips: [
                'Høyere skadeprosent = lavere lønnsomhet',
                'Under 100% = overskudd, over 100% = tap på forsikringsteknisk resultat',
                'Sammenlign kategorier for å identifisere lønnsomme/ulønnsomme segmenter',
                'Bruk funnene til prising og risikostyring',
                'Kombiner med andre analyser for fullstendig risikobilde',
                'Følg utviklingen over tid for å måle effekt av tiltak'
            ]
        };
    }
}

export const skadeprosentPlugin = new SkadeprosentPlugin();