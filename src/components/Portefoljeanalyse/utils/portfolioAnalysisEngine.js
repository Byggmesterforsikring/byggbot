/**
 * PORTEFØLJEANALYSE-MOTOR
 * Sentralisert analyse-motor som bruker business rules
 */

import {
    POLICY_STATUS_RULES,
    CLAIM_STATUS_RULES,
    PORTFOLIO_FILTERS,
    PORTFOLIO_CALCULATIONS,
    PORTFOLIO_HELPERS
} from './portfolioBusinessRules';

export class PortfolioAnalysisEngine {
    constructor(portefoljeData) {
        this.data = portefoljeData;
        this.customers = portefoljeData.customers || [];
        this.claimData = portefoljeData.claimData || {};
        this.claims = this.claimData.SkadeDetaljer || [];

        // Cache for performance
        this.cache = new Map();

        console.log('📊 PortfolioAnalysisEngine initialisert:', {
            kunder: this.customers.length,
            skader: this.claims.length,
            periode: portefoljeData.summary?.periode
        });
    }

    // =============================================================================
    // GRUNNLEGGENDE ANALYSE-FUNKSJONER
    // =============================================================================

    /**
     * Få alle aktive avtaler
     */
    getAktiveAvtaler() {
        const cacheKey = 'aktive_avtaler';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const aktiveAvtaler = [];
        this.customers.forEach(kunde => {
            if (kunde.PolicyList) {
                const aktivePolicies = PORTFOLIO_FILTERS.filtrerPolicies(
                    kunde.PolicyList,
                    POLICY_STATUS_RULES.AKTIVE_OG_PRODUSERT
                );

                aktivePolicies.forEach(policy => {
                    aktiveAvtaler.push({
                        ...policy,
                        _kunde: kunde,
                        kundeNavn: kunde.Name,
                        kundeNummer: kunde.InsuredNumber
                    });
                });
            }
        });

        this.cache.set(cacheKey, aktiveAvtaler);
        console.log(`✅ Aktive avtaler: ${aktiveAvtaler.length}`);
        return aktiveAvtaler;
    }

    /**
     * Få alle valide skader (ekskluderer feilregistrerte)
     */
    getValideSkader() {
        const cacheKey = 'valide_skader';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const valideSkader = PORTFOLIO_FILTERS.filtrerSkader(
            this.claims,
            CLAIM_STATUS_RULES.ALLE_VALIDE
        );

        this.cache.set(cacheKey, valideSkader);
        console.log(`✅ Valide skader: ${valideSkader.length} (ekskludert feilregistrerte)`);
        return valideSkader;
    }

    /**
     * Koble skader til avtaler basert på PolicyNumber
     */
    getSkaderMedAvtaler() {
        const cacheKey = 'skader_med_avtaler';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const valideSkader = this.getValideSkader();
        const allePolicies = this.getAllPolicies();

        const kobletData = PORTFOLIO_HELPERS.kobleSkaderTilPolicies(allePolicies, valideSkader);

        this.cache.set(cacheKey, kobletData);
        console.log(`✅ Skader koblet til avtaler: ${kobletData.length} koblinger`);
        return kobletData;
    }

    /**
     * Få alle policies fra alle kunder
     */
    getAllPolicies() {
        const cacheKey = 'alle_policies';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const allePolicies = [];
        this.customers.forEach(kunde => {
            if (kunde.PolicyList) {
                kunde.PolicyList.forEach(policy => {
                    allePolicies.push({
                        ...policy,
                        _kunde: kunde
                    });
                });
            }
        });

        this.cache.set(cacheKey, allePolicies);
        return allePolicies;
    }

    // =============================================================================
    // ANALYSE-RAPPORTER
    // =============================================================================

    /**
     * Grunnleggende portefølje-oversikt
     */
    getPortefoljeOversikt() {
        const aktiveAvtaler = this.getAktiveAvtaler();
        const valideSkader = this.getValideSkader();
        const kobletData = this.getSkaderMedAvtaler();

        // Beregn totaler
        const totalPremie = PORTFOLIO_CALCULATIONS.beregnTotalPremie(aktiveAvtaler);
        const totalSkadekostnad = PORTFOLIO_CALCULATIONS.beregnTotalSkadekostnad(valideSkader);
        const skadeRatio = PORTFOLIO_CALCULATIONS.beregnSkadeRatio(totalSkadekostnad, totalPremie);

        return {
            oversikt: {
                antallKunder: this.customers.length,
                antallAktiveAvtaler: aktiveAvtaler.length,
                antallValideSkader: valideSkader.length,
                antallKoblinger: kobletData.length
            },
            økonomi: {
                totalPremie: totalPremie,
                totalSkadekostnad: totalSkadekostnad,
                skadeRatio: skadeRatio,
                nettoResultat: totalPremie - totalSkadekostnad
            },
            periode: this.data.summary?.periode
        };
    }

    /**
     * Kvartalsvis sammenligning
     */
    sammenlignKvartaler(år1, år2, kvartal = 1) {
        const q1_år1 = PERIODE_UTILS.beregnKvartal(år1)[`Q${kvartal}`];
        const q1_år2 = PERIODE_UTILS.beregnKvartal(år2)[`Q${kvartal}`];

        // Filtrer covers for kvartalet i begge år
        const covers_år1 = this.getCoversForPeriode(q1_år1.start, q1_år1.end);
        const covers_år2 = this.getCoversForPeriode(q1_år2.start, q1_år2.end);

        // Filtrer skader for kvartalet i begge år
        const skader_år1 = PORTFOLIO_FILTERS.filtrerSkaderPåDato(this.getValideSkader(), q1_år1.start, q1_år1.end);
        const skader_år2 = PORTFOLIO_FILTERS.filtrerSkaderPåDato(this.getValideSkader(), q1_år2.start, q1_år2.end);

        const premie_år1 = covers_år1.reduce((sum, c) => sum + (c.Premium || 0), 0);
        const premie_år2 = covers_år2.reduce((sum, c) => sum + (c.Premium || 0), 0);

        const skadekostnad_år1 = PORTFOLIO_CALCULATIONS.beregnTotalSkadekostnad(skader_år1);
        const skadekostnad_år2 = PORTFOLIO_CALCULATIONS.beregnTotalSkadekostnad(skader_år2);

        return {
            [år1]: {
                periode: `Q${kvartal} ${år1}`,
                covers: covers_år1.length,
                skader: skader_år1.length,
                premie: premie_år1,
                skadekostnad: skadekostnad_år1,
                skadeRatio: PORTFOLIO_CALCULATIONS.beregnSkadeRatio(skadekostnad_år1, premie_år1)
            },
            [år2]: {
                periode: `Q${kvartal} ${år2}`,
                covers: covers_år2.length,
                skader: skader_år2.length,
                premie: premie_år2,
                skadekostnad: skadekostnad_år2,
                skadeRatio: PORTFOLIO_CALCULATIONS.beregnSkadeRatio(skadekostnad_år2, premie_år2)
            },
            sammenligning: {
                premieEndring: PORTFOLIO_HELPERS.beregnEndring(premie_år2, premie_år1),
                skadeEndring: PORTFOLIO_HELPERS.beregnEndring(skadekostnad_år2, skadekostnad_år1),
                skadeRatioEndring: PORTFOLIO_HELPERS.beregnEndring(
                    PORTFOLIO_CALCULATIONS.beregnSkadeRatio(skadekostnad_år2, premie_år2),
                    PORTFOLIO_CALCULATIONS.beregnSkadeRatio(skadekostnad_år1, premie_år1)
                )
            }
        };
    }

    /**
     * Få covers for en spesifikk periode
     */
    getCoversForPeriode(startDate, endDate) {
        const allCovers = this.getAllCovers();
        return PORTFOLIO_FILTERS.filtrerCovers(allCovers, startDate, endDate);
    }

    /**
     * Få alle covers fra alle kunder
     */
    getAllCovers() {
        const cacheKey = 'alle_covers';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const covers = [];
        this.customers.forEach(kunde => {
            if (kunde.PolicyList) {
                kunde.PolicyList.forEach(policy => {
                    if (policy.PolicyProduct) {
                        policy.PolicyProduct.forEach(product => {
                            if (product.PolicyCover) {
                                product.PolicyCover.forEach(cover => {
                                    covers.push({
                                        ...cover,
                                        _kunde: kunde,
                                        _policy: policy,
                                        _product: product,
                                        CoverStartDate: cover.InceptionDate,
                                        CoverEndDate: cover.EndDate
                                    });
                                });
                            }
                        });
                    }
                });
            }
        });

        this.cache.set(cacheKey, covers);
        return covers;
    }

    /**
     * Rens cache (for store datasett)
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Analyse-cache renset');
    }
}

export default PortfolioAnalysisEngine;
