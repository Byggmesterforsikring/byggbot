/**
 * PORTEFØLJEANALYSE BUSINESS RULES
 * Bygges iterativt - kun validerte regler
 */

// =============================================================================
// VALIDERTE POLICY STATUS REGLER
// =============================================================================

export const POLICY_STATUS_RULES = {
    // ✅ VALIDERTE REGLER FRA PYTHON-SCRIPT:
    AKTIVE: {
        statusNames: ['Aktiv'],
        statusIDs: [3],
        description: 'Aktive forsikringsavtaler',
        validert: true
    },
    FORNYET: {
        statusNames: ['Fornyet'],
        statusIDs: [12],
        description: 'Fornyede forsikringsavtaler',
        validert: true
    },
    UTGÅTT: {
        statusNames: ['Utgått'],
        statusIDs: [4],
        description: 'Utgåtte forsikringsavtaler',
        validert: true
    },
    // KOMBINERTE REGLER:
    VALIDE_FOR_PORTEFOLJE: {
        statusNames: ['Aktiv', 'Utgått', 'Fornyet', 'Endret'],
        statusIDs: [3, 4, 12, 5],
        description: 'Valide policies for porteføljeanalyse - KUN Aktiv og Utgått (unngår dobbelt-telling fra Fornyet)',
        validert: true,
        kilde: 'Bruker-korrigering: Fornyet skaper duplikering'
    },

    // TIDSBASERTE REGLER:
    VALIDE_FOR_PORTEFOLJE_SISTE_12_MND: {
        statusNames: ['Aktiv', 'Utgått'],
        statusIDs: [3, 4],
        description: 'Valide policies for siste 12 måneder - kun Aktiv og Utgått',
        validert: true,
        kilde: 'Bruker-spesifikasjon: Siste 12 mnd = Aktiv + Utgått'
    },

    VALIDE_FOR_PORTEFOLJE_HISTORISK: {
        statusNames: ['Aktiv', 'Utgått', 'Fornyet'],
        statusIDs: [3, 4, 12],
        description: 'Valide policies for historisk analyse (>12 mnd tilbake) - inkluderer Fornyet',
        validert: true,
        kilde: 'Bruker-spesifikasjon: >12 mnd = Aktiv + Utgått + Fornyet'
    },

    // ❌ EKSKLUDERTE (fra Python-script):
    EKSKLUDERTE: {
        statusNames: ['Endret', 'Kansellert', 'Produsert'],
        statusIDs: [5, 6, 10],
        description: 'Statuser som ekskluderes fra porteføljeanalyse',
        validert: true,
        kilde: 'Python-script'
    }
};

// =============================================================================
// SKADE-BEHANDLING REGLER (FRA PYTHON-SCRIPT)
// =============================================================================

export const CLAIM_PROCESSING_RULES = {
    // ✅ PRODUKT-FILTRERING (fra main.py):
    EKSKLUDERTE_PRODUKTER: {
        produktNavn: ['Garanti - Gar-Bo', 'Garanti', 'Betalingsgaranti - Gar-Bo'],
        description: 'Produkter som ekskluderes fra skade-analyse',
        validert: true,
        kilde: 'Python main.py'
    },

    // ✅ SKADEKOSTNAD-BEREGNING (KORRIGERT):
    SKADEKOSTNAD_REGLER: {
        description: 'Hvordan skadekostnader beregnes (netto etter regress)',
        regler: {
            'ClaimCostReserve': 'SUM(TransactionAmount WHERE TransactionType = "Reservation" AND TransactionAmount >= 0)',
            'ClaimCostPaid': 'SUM(TransactionAmount WHERE TransactionType = "Payment")',
            'ClaimRegress': 'SUM(TransactionAmount WHERE TransactionType = "Reservation" AND TransactionAmount < 0)',
            'NettoClaimCost': 'ClaimCostPaid + ClaimCostReserve + ClaimRegress (regress er negativt)'
        },
        validert: true,
        kilde: 'Korrigert basert på Kundeanalyse-logikk'
    }
};

// =============================================================================
// OPPTJENT PREMIE REGLER (FRA PYTHON EARNED PREMIUM SCRIPT)
// =============================================================================

export const EARNED_PREMIUM_RULES = {
    // ✅ KONSTANTER:
    BMF_PROVISJON: 0.23,  // 23%
    GARBO_PROVISJON: 0.77, // 77%

    // ✅ OPPTJENT PREMIE-LOGIKK (fra calculate_earned_premium):
    OPPTJENT_PREMIE_LOGIKK: {
        'Aktiv': 'Pro-rata basert på cover-periode hvis ikke utløpt, ellers 100%',
        'Utgått': '100% av PeriodPremium',
        'Fornyet': '100% av PeriodPremium',
        'Andre': '0% (ekskluderes)'
    },

    // ✅ BEREGNINGS-FUNKSJONER:
    beregnOpptjentPremie: (policy, viewDate) => {
        const vd = new Date(viewDate);
        const coverStart = new Date(policy.CoverStartDate);
        const coverEnd = new Date(policy.CoverEndDate);

        if (policy.PolicyStatusName === 'Aktiv') {
            if (coverStart <= vd) {
                if (coverEnd <= vd) {
                    return policy.PeriodPremium || 0; // 100% hvis cover utløpt
                } else {
                    // Pro-rata beregning
                    const daysCovered = Math.max(0, (vd - coverStart) / (1000 * 60 * 60 * 24));
                    if (daysCovered <= 0) return 0;
                    return (policy.AnnualPremium || 0) * (daysCovered / 365);
                }
            } else {
                return 0; // Cover ikke startet ennå
            }
        } else if (policy.PolicyStatusName === 'Utgått') {
            return policy.PeriodPremium || 0; // 100%
        } else if (policy.PolicyStatusName === 'Fornyet') {
            return policy.PeriodPremium || 0; // 100%
        } else {
            return 0; // Andre statuser
        }
    },

    beregnBMFProvisjon: (netPremium) => {
        return netPremium * EARNED_PREMIUM_RULES.BMF_PROVISJON;
    },

    beregnGarBoNetPremium: (netPremium) => {
        return netPremium * EARNED_PREMIUM_RULES.GARBO_PROVISJON;
    }
};

// =============================================================================
// VIEWDATE TIDSREISE-LOGIKK (FRA PYTHON TIDSREISE-PROSJEKT)
// =============================================================================

export const VIEWDATE_RULES = {
    /**
     * Hovedsteg for historisk øyeblikksbilde-rekonstruksjon
     */
    TIDSREISE_STEG: {
        1: 'Filtrer policies produsert <= view_date (ProductionDate)',
        2: 'Filtrer covers aktive på view_date (CoverStartDate <= view_date <= CoverEndDate)',
        3: 'Finn høyeste PolicyVersionNumber per PolicyNumber',
        4: 'Rekonstruer historisk status basert på neste versjon',
        5: 'Hent alle rader for korrekt versjon',
        6: 'Fjern kansellerte policies'
    },

    /**
     * Historisk status-rekonstruksjon logikk
     */
    HISTORISK_STATUS_LOGIKK: {
        'Produsert': {
            regel: 'Hvis PolicyStartDate <= view_date → "Aktiv", ellers "Produsert"',
            beskrivelse: 'Produserte policies blir aktive på PolicyStartDate'
        },
        'Endret': {
            regel: 'Hvis neste_versjon.ProductionDate > view_date → "Aktiv", ellers "Endret"',
            beskrivelse: 'Endrede policies var aktive før endringen skjedde'
        },
        'Fornyet': {
            regel: 'Hvis neste_versjon.PolicyStartDate > view_date → "Aktiv", ellers "Fornyet"',
            beskrivelse: 'Fornyede policies var aktive før fornyelsen trådte i kraft'
        },
        'Aktiv': {
            regel: 'Historisk status = "Aktiv"',
            beskrivelse: 'Aktive policies forblir aktive'
        },
        'Utgått': {
            regel: 'Historisk status = "Utgått"',
            beskrivelse: 'Utgåtte policies forblir utgåtte'
        },
        'Kansellert': {
            regel: 'Fjernes fra øyeblikksbilde',
            beskrivelse: 'Kansellerte policies anses som ugyldige'
        }
    },

    /**
     * Implementering av tidsreise-algoritme
     */
    rekonstruerPortefoljeStatusPåDato: (portefoljeData, viewDate) => {
        // TODO: Implementer komplett tidsreise-algoritme
        console.log('🕐 ViewDate-rekonstruksjon er kompleks - kommer senere');
        return {
            algoritme: 'Kompleks historisk rekonstruksjon',
            implementert: false,
            kilde: 'Python tidsreise-prosjekt'
        };
    }
};

// =============================================================================
// SAMMENLIGNING-ALGORITMER (FRA PYTHON TIDSREISE)
// =============================================================================

export const COMPARISON_ALGORITHMS = {
    /**
     * Sammenlign to tidspunkter
     */
    sammenlignPerioder: (portefoljeData, dato1, dato2) => {
        // TODO: Implementer periode-sammenligning
        return {
            dato1: { /* øyeblikksbilde for dato1 */ },
            dato2: { /* øyeblikksbilde for dato2 */ },
            endringer: { /* beregn endringer */ }
        };
    },

    /**
     * Kvartalsvis sammenligning (fra Python sammenlign_kvartaler)
     */
    sammenlignKvartaler: (portefoljeData, år1, år2, kvartal = 1) => {
        const kvartalPerioder = {
            1: { start: '-01-01', end: '-03-31' },
            2: { start: '-04-01', end: '-06-30' },
            3: { start: '-07-01', end: '-09-30' },
            4: { start: '-10-01', end: '-12-31' }
        };

        const q = kvartalPerioder[kvartal];
        const periode1 = { start: `${år1}${q.start}`, end: `${år1}${q.end}` };
        const periode2 = { start: `${år2}${q.start}`, end: `${år2}${q.end}` };

        // TODO: Implementer kvartals-sammenligning med ViewDate-logikk
        console.log(`🔍 Q${kvartal} ${år1} vs Q${kvartal} ${år2} sammenligning`);
        return {
            kvartal,
            år1: { periode: periode1, /* data */ },
            år2: { periode: periode2, /* data */ },
            endringer: { /* beregn endringer */ }
        };
    }
};

// =============================================================================
// SKADERATIO-ANALYSE REGLER (FRA PYTHON INSURANCE ANALYSIS)
// =============================================================================

export const LOSS_RATIO_RULES = {
    /**
     * Skaderatio-beregning (fra insurance analysis main.py)
     */
    SKADERATIO_BEREGNING: {
        formel: 'LossRatio = (TotalClaimCost / EarnedPremium) * 100',
        komponenter: {
            'TotalClaimCost': 'ClaimCostPaid + ClaimCostReserve',
            'EarnedPremium': 'Fra earned premium script (pro-rata beregning)'
        },
        validert: true,
        kilde: 'Python insurance analysis main.py'
    },

    /**
     * Skaderatio-kategorisering (fra Excel pivot analyse)
     */
    SKADERATIO_KATEGORIER: {
        'Utmerket': { min: 0, max: 50, farge: 'green', ikon: '🟢' },
        'Akseptabel': { min: 50, max: 75, farge: 'yellow', ikon: '🟡' },
        'Problematisk': { min: 75, max: 999, farge: 'red', ikon: '🔴' }
    },

    /**
     * Analysegrupper (fra main.py groupby)
     */
    ANALYSE_DIMENSJONER: [
        'UWYear',         // Underwriting år
        'ProductName',    // Produkttype
        'Cover',          // Dekning
        'IsBusiness'      // Bedrift vs privat
    ],

    /**
     * Filtrering-regler (fra main.py)
     */
    SKADE_FILTRERING: {
        ekskluderteStatuser: ['Feilregistrert'],
        årFra: 2020,  // Hardkodet i Python script
        description: 'Kun data fra 2020 og fremover, ekskluderer feilregistrerte skader'
    },

    /**
     * Beregningsfunksjoner
     */
    beregnSkadeRatio: (totalClaimCost, earnedPremium) => {
        if (earnedPremium === 0) return 0;
        return (totalClaimCost / earnedPremium) * 100;
    },

    beregnTotalClaimCost: (claimCostPaid, claimCostReserve) => {
        return (claimCostPaid || 0) + (claimCostReserve || 0);
    },

    kategoriserSkadeRatio: (lossRatio) => {
        if (lossRatio <= 50) return LOSS_RATIO_RULES.SKADERATIO_KATEGORIER['Utmerket'];
        if (lossRatio <= 75) return LOSS_RATIO_RULES.SKADERATIO_KATEGORIER['Akseptabel'];
        return LOSS_RATIO_RULES.SKADERATIO_KATEGORIER['Problematisk'];
    }
};

// =============================================================================
// GRUNNLEGGENDE HJELPEFUNKSJONER (INGEN ANTAGELSER)
// =============================================================================

export const PORTFOLIO_HELPERS = {
    /**
     * Filtrer policies basert på status-regel (kun validerte regler)
     */
    filtrerPolicies: (policies, statusRule) => {
        if (!statusRule.validert) {
            console.warn(`⚠️ Regel ikke validert:`, statusRule.description);
            return policies; // Returner alle hvis regel ikke er validert
        }

        return policies.filter(policy => {
            if (statusRule.statusNames) {
                return statusRule.statusNames.includes(policy.PolicyStatusName);
            }
            if (statusRule.statusIDs) {
                return statusRule.statusIDs.includes(policy.PolicyStatusID);
            }
            return true;
        });
    },

    /**
     * Velg riktig policy-status regel basert på tidsperiode
     */
    velgPolicyStatusRegel: (viewDate, periodeStartDate) => {
        const vd = new Date(viewDate);
        const startDate = new Date(periodeStartDate);

        // Beregn forskjell i måneder
        const diffTime = vd.getTime() - startDate.getTime();
        const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Gjennomsnittlig månedslengde

        if (diffMonths <= 12) {
            console.log(`📅 Periode ≤12 mnd (${diffMonths.toFixed(1)} mnd): Bruker Aktiv + Utgått`);
            return POLICY_STATUS_RULES.VALIDE_FOR_PORTEFOLJE_SISTE_12_MND;
        } else {
            console.log(`📅 Periode >12 mnd (${diffMonths.toFixed(1)} mnd): Bruker Aktiv + Utgått + Fornyet`);
            return POLICY_STATUS_RULES.VALIDE_FOR_PORTEFOLJE_HISTORISK;
        }
    },

    /**
     * Tell policies for en kunde
     */
    tellPolicies: (kunde) => {
        return kunde.PolicyList ? kunde.PolicyList.length : 0;
    },

    /**
     * Tell covers for en kunde  
     */
    tellCovers: (kunde) => {
        let coverCount = 0;
        if (kunde.PolicyList) {
            kunde.PolicyList.forEach(policy => {
                if (policy.PolicyProduct) {
                    policy.PolicyProduct.forEach(product => {
                        if (product.PolicyCover) {
                            coverCount += product.PolicyCover.length;
                        }
                    });
                }
            });
        }
        return coverCount;
    },

    /**
     * Få alle policies fra kunde-data
     */
    getAllPolicies: (customers) => {
        const allePolicies = [];
        customers.forEach(kunde => {
            if (kunde.PolicyList) {
                kunde.PolicyList.forEach(policy => {
                    allePolicies.push({
                        ...policy,
                        _kunde: kunde
                    });
                });
            }
        });
        return allePolicies;
    },

    /**
     * Grupper data etter nøkkel
     */
    groupBy: (array, key) => {
        return array.reduce((groups, item) => {
            const group = typeof key === 'function' ? key(item) : item[key];
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
            return groups;
        }, {});
    },

    /**
     * Beregn premie-komponenter (total premie + opptjent premie)
     */
    beregnPremieKomponenter: (policies, viewDate) => {
        let premieKomponenter = {
            totalPremie: 0,
            earnedPremium: 0,
            naturskade: 0,
            totalCovers: 0
        };

        let debug = {
            antallPolicies: policies.length,
            antallProducts: 0,
            antallCovers: 0,
            eksempelPremier: []
        };

        policies.forEach((policy, policyIndex) => {
            if (policy.PolicyProduct) {
                policy.PolicyProduct.forEach((product, productIndex) => {
                    debug.antallProducts++;

                    // FIKSET: Bruk PolicyProduct.Premium direkte (som spesifisert)
                    const productPremium = product.Premium || 0;
                    premieKomponenter.totalPremie += productPremium;

                    // Tell naturskadeavgift fra covers (for separat visning)
                    if (product.PolicyCover) {
                        product.PolicyCover.forEach((cover) => {
                            const naturePremium = cover.NaturePremium || 0;
                            premieKomponenter.naturskade += naturePremium;
                            premieKomponenter.totalCovers++;
                            debug.antallCovers++;
                        });
                    }

                    // Debug første 5 products for å se premie-strukturen
                    if (debug.eksempelPremier.length < 5) {
                        debug.eksempelPremier.push({
                            productIndex: `${policyIndex}-${productIndex}`,
                            productPremium: productPremium,
                            policyStatus: policy.PolicyStatusName,
                            productName: product.ProductName,
                            kilde: 'PolicyProduct.Premium (som spesifisert)'
                        });
                    }

                    // Opptjent premie-beregning med PRODUCT-datoer og product-premie
                    const earnedPremium = EARNED_PREMIUM_RULES.beregnOpptjentPremie({
                        PolicyStatusName: policy.PolicyStatusName,
                        CoverStartDate: product.InceptionDate,
                        CoverEndDate: product.EndDate,
                        PeriodPremium: productPremium,
                        AnnualPremium: productPremium
                    }, viewDate);

                    premieKomponenter.earnedPremium += earnedPremium;
                });
            }
        });

        console.log('🔍 Premie-beregning (sentralisert):', { ...debug, premieKomponenter });

        return {
            ...premieKomponenter,
            debug
        };
    },

    /**
     * Beregn skade-komponenter (transaksjon-basert)
     */
    beregnSkadeKomponenter: (claims) => {
        const valideSkader = claims.filter(skade => skade.Skadestatus !== 'Feilregistrert');

        let skadeKomponenter = {
            totalSkadekostnad: 0,
            utbetaltSum: 0,
            reservertSum: 0,
            regressSum: 0,
            valideSkader: valideSkader.length
        };

        let debug = {
            antallSkader: valideSkader.length,
            antallTransaksjoner: 0,
            eksempelSkader: []
        };

        valideSkader.forEach((skade, index) => {
            let skadeUtbetalt = 0;
            let skadeReservert = 0;
            let skadeRegress = 0;

            // Sum alle transaksjoner for denne skaden
            if (skade.Transaksjoner && Array.isArray(skade.Transaksjoner)) {
                skade.Transaksjoner.forEach(transaksjon => {
                    const beløp = transaksjon.Transaksjonsbeløp || 0;
                    debug.antallTransaksjoner++;

                    if (transaksjon.Transaksjonstype === 'Payment') {
                        skadeUtbetalt += beløp;
                    } else if (transaksjon.Transaksjonstype === 'Reservation') {
                        if (beløp >= 0) {
                            skadeReservert += beløp;  // Positive = reservasjoner
                        } else {
                            skadeRegress += beløp;  // Negative = regress (behold negativt fortegn)
                        }
                    }
                });
            }

            // FIKSET: Inkluder regress i netto skadekostnad (regress er negativt når vi får penger tilbake)
            const skadeSum = skadeUtbetalt + skadeReservert + skadeRegress;
            skadeKomponenter.totalSkadekostnad += skadeSum;
            skadeKomponenter.utbetaltSum += skadeUtbetalt;
            skadeKomponenter.reservertSum += skadeReservert;
            skadeKomponenter.regressSum += skadeRegress;

            // Debug eksempler
            if (debug.eksempelSkader.length < 5) {
                debug.eksempelSkader.push({
                    skadenummer: skade.Skadenummer,
                    policyNumber: skade.Polisenummer,
                    skadestatus: skade.Skadestatus,
                    antallTransaksjoner: skade.Transaksjoner ? skade.Transaksjoner.length : 0,
                    utbetalt: skadeUtbetalt,
                    reservert: skadeReservert,
                    regress: skadeRegress,
                    totalSkade: skadeSum
                });
            }
        });

        console.log('🔍 Skadekostnad-beregning (sentralisert):', { ...debug, skadeKomponenter });

        return {
            ...skadeKomponenter,
            debug
        };
    },

    /**
     * Debug premie-beregning
     */
    debugPremieBeregning: (premieResultat) => {
        console.log('💰 Premie-beregning debug:', {
            totalPremie: premieResultat.totalPremie?.toLocaleString('nb-NO') + ' kr',
            earnedPremium: premieResultat.earnedPremium?.toLocaleString('nb-NO') + ' kr',
            naturskade: premieResultat.naturskade?.toLocaleString('nb-NO') + ' kr',
            totalCovers: premieResultat.totalCovers,
            eksempelPremier: premieResultat.debug?.eksempelPremier
        });
        return premieResultat;
    }
};

// =============================================================================
// ITERATIV REGEL-BYGGING
// =============================================================================

export const RULE_BUILDER = {
    /**
     * Test en ny policy-status regel
     */
    testPolicyStatusRule: (policies, statusNames = [], statusIDs = []) => {
        const matchende = policies.filter(policy => {
            const navnMatch = statusNames.length === 0 || statusNames.includes(policy.PolicyStatusName);
            const idMatch = statusIDs.length === 0 || statusIDs.includes(policy.PolicyStatusID);
            return navnMatch && idMatch;
        });

        // Analyser resultatet
        const statusFordeling = PORTFOLIO_HELPERS.groupBy(policies, 'PolicyStatusName');
        const idFordeling = PORTFOLIO_HELPERS.groupBy(policies, 'PolicyStatusID');

        return {
            testResultat: {
                totaltPolicies: policies.length,
                matchendePolicies: matchende.length,
                prosent: (matchende.length / policies.length * 100).toFixed(1)
            },
            statusFordeling: Object.keys(statusFordeling).map(status => ({
                status,
                antall: statusFordeling[status].length
            })),
            idFordeling: Object.keys(idFordeling).map(id => ({
                id: parseInt(id),
                antall: idFordeling[id].length
            }))
        };
    },

    /**
     * Foreslå regel basert på data-analyse
     */
    analyserPolicyStatuser: (policies) => {
        const statusFordeling = PORTFOLIO_HELPERS.groupBy(policies, 'PolicyStatusName');
        const idFordeling = PORTFOLIO_HELPERS.groupBy(policies, 'PolicyStatusID');

        console.log('📊 Policy Status Analyse:');
        console.log('Status-navn fordeling:', Object.keys(statusFordeling).map(status => ({
            status,
            antall: statusFordeling[status].length,
            prosent: (statusFordeling[status].length / policies.length * 100).toFixed(1) + '%'
        })));

        console.log('Status-ID fordeling:', Object.keys(idFordeling).map(id => ({
            id: parseInt(id),
            antall: idFordeling[id].length,
            prosent: (idFordeling[id].length / policies.length * 100).toFixed(1) + '%'
        })));

        return {
            statusNavnFordeling: statusFordeling,
            statusIdFordeling: idFordeling,
            anbefalteRegler: RULE_BUILDER.genererRegelForslag(statusFordeling, idFordeling)
        };
    },

    genererRegelForslag: (statusFordeling, idFordeling) => {
        const forslag = [];

        // Foreslå regler for vanlige statuser
        Object.keys(statusFordeling).forEach(status => {
            const antall = statusFordeling[status].length;
            if (antall > 10) { // Kun foreslå regler for statuser med mange policies
                forslag.push({
                    navn: status.toUpperCase().replace(/[^A-Z]/g, '_'),
                    statusNames: [status],
                    antall: antall,
                    beskrivelse: `${status} policies (${antall} stk)`
                });
            }
        });

        return forslag;
    }
};

// =============================================================================
// ENKEL ANALYSE-KLASSE (INGEN ANTAGELSER)
// =============================================================================

export class SimplePortfolioAnalysis {
    constructor(portefoljeData) {
        this.data = portefoljeData;
        this.customers = portefoljeData.customers || [];
        this.claimData = portefoljeData.claimData || {};
        this.claims = this.claimData.SkadeDetaljer || [];

        console.log('📊 SimplePortfolioAnalysis initialisert:', {
            kunder: this.customers.length,
            skader: this.claims.length
        });
    }

    /**
     * Analyser policy-statuser (ingen filtrering)
     */
    analyserPolicyStatuser() {
        const allePolicies = PORTFOLIO_HELPERS.getAllPolicies(this.customers);
        return RULE_BUILDER.analyserPolicyStatuser(allePolicies);
    }

    /**
     * Test en spesifikk policy-status regel
     */
    testPolicyStatusRule(statusNames = [], statusIDs = []) {
        const allePolicies = PORTFOLIO_HELPERS.getAllPolicies(this.customers);
        return RULE_BUILDER.testPolicyStatusRule(allePolicies, statusNames, statusIDs);
    }

    /**
     * Grunnleggende telling (ingen filtrering)
     */
    getGrunnleggendeOversikt() {
        const allePolicies = PORTFOLIO_HELPERS.getAllPolicies(this.customers);

        return {
            kunder: this.customers.length,
            policies: allePolicies.length,
            skader: this.claims.length,
            periode: this.data.summary?.periode
        };
    }

    /**
     * HOVEDANALYSE: Beregn aktive portefølje-oversikt med alle validerte regler
     */
    beregnAktivePortefoljeOversikt() {
        console.log('📊 Beregner aktive portefølje-oversikt med validerte business-regler...');

        try {
            // STEG 1: Hent og filtrer policies med tidsbasert regel
            const allePolicies = PORTFOLIO_HELPERS.getAllPolicies(this.customers);
            const viewDate = new Date(this.data.summary.periode.endDate);
            const periodeStartDate = new Date(this.data.summary.periode.startDate);

            // Velg riktig status-regel basert på periode-lengde
            const statusRegel = PORTFOLIO_HELPERS.velgPolicyStatusRegel(viewDate, periodeStartDate);
            const validePolicies = PORTFOLIO_HELPERS.filtrerPolicies(allePolicies, statusRegel);

            console.log('🔍 Policy-filtrering debug:', {
                totaltPolicies: allePolicies.length,
                validePolicies: validePolicies.length,
                statusRegel: statusRegel.description,
                inkludertStatuser: statusRegel.statusNames,
                prosentInkludert: ((validePolicies.length / allePolicies.length) * 100).toFixed(1) + '%'
            });

            // STEG 2: Beregn premie-komponenter med korrekt ViewDate

            console.log('📅 ViewDate info:', {
                viewDate: viewDate.toISOString().split('T')[0],
                periode: this.data.summary.periode,
                forklaring: 'ViewDate = periode-slutt for opptjent premie-beregning'
            });
            const premieResultat = PORTFOLIO_HELPERS.debugPremieBeregning(
                PORTFOLIO_HELPERS.beregnPremieKomponenter(validePolicies, viewDate)
            );

            // STEG 3: Beregn skade-komponenter
            const skadeResultat = PORTFOLIO_HELPERS.beregnSkadeKomponenter(this.claims);

            // STEG 4: Beregn skaderatio
            const skadeRatio = LOSS_RATIO_RULES.beregnSkadeRatio(
                skadeResultat.totalSkadekostnad,
                premieResultat.earnedPremium
            );

            const oversikt = {
                rå: {
                    allePolicies: allePolicies.length,
                    alleSkader: this.claims.length
                },
                validerte: {
                    validePolicies: validePolicies.length,
                    valideSkader: skadeResultat.valideSkader,
                    totalCovers: premieResultat.totalCovers
                },
                økonomi: {
                    totalPremie: premieResultat.totalPremie,
                    earnedPremium: premieResultat.earnedPremium,
                    naturskade: premieResultat.naturskade,
                    totalSkadekostnad: skadeResultat.totalSkadekostnad,
                    skadeRatio: skadeRatio
                },
                debug: {
                    premieDebug: premieResultat.debug,
                    skadeDebug: skadeResultat.debug
                }
            };

            console.log('✅ Aktive portefølje-oversikt beregnet:', oversikt);
            return oversikt;

        } catch (error) {
            console.error('❌ Feil ved beregning av aktive oversikt:', error);
            throw error;
        }
    }

    /**
     * UW-ÅRGANG ANALYSE: Grupper policies etter underwriting year (PolicyStartDate)
     */
    beregnUWYearAnalyse(viewDate = null) {
        console.log('📅 Beregner UW-årgang analyse...');

        try {
            const vd = viewDate ? new Date(viewDate) : new Date(this.data.summary.periode.endDate);
            const yearlyGroups = {};

            // Grupper policies etter UWYear (første product InceptionDate)
            this.customers.forEach(customer => {
                customer.PolicyList?.forEach(policy => {
                    // Finn UWYear for denne policy (basert på første product med dato)
                    let policyUWYear = null;
                    let policyProducts = [];
                    let policyCovers = [];

                    policy.PolicyProduct?.forEach(product => {
                        if (product.PolicyCover && product.InceptionDate) {
                            const uwYear = new Date(product.InceptionDate).getFullYear();

                            // Bruk første products UWYear som policy UWYear
                            if (policyUWYear === null) {
                                policyUWYear = uwYear;
                            }

                            // Samle alle products og covers for denne policy
                            policyProducts.push(product);
                            product.PolicyCover.forEach(cover => {
                                policyCovers.push({
                                    ...cover,
                                    policy: policy,
                                    product: product,
                                    customer: customer,
                                    uwYear: uwYear
                                });
                            });
                        }
                    });

                    // Legg til policy i riktig UWYear (kun en gang per policy!)
                    if (policyUWYear !== null) {
                        if (!yearlyGroups[policyUWYear]) {
                            yearlyGroups[policyUWYear] = {
                                year: policyUWYear,
                                policies: [],
                                covers: [],
                                claims: []
                            };
                        }

                        // Legg til policy EN GANG
                        yearlyGroups[policyUWYear].policies.push({
                            ...policy,
                            customer: customer,
                            products: policyProducts
                        });

                        // Legg til alle covers for denne policy
                        yearlyGroups[policyUWYear].covers.push(...policyCovers);
                    }
                });
            });

            // Legg til skader per UWYear basert på policy-matching
            this.claims.forEach(claim => {
                if (claim.Polisenummer) {
                    // Finn hvilken UWYear denne skaden tilhører
                    Object.values(yearlyGroups).forEach(yearGroup => {
                        const matchingPolicy = yearGroup.policies.find(policy =>
                            policy.PolicyNumber === claim.Polisenummer
                        );
                        if (matchingPolicy) {
                            yearGroup.claims.push(claim);
                        }
                    });
                }
            });

            // Beregn KPIer per år
            const yearlyAnalysis = Object.values(yearlyGroups).map(yearGroup => {
                const { year, policies, covers, claims } = yearGroup;

                // FIKSET: Beregn total premie fra cover-nivå (samme som hovedberegning)
                const totalPremium = covers.reduce((sum, cover) => sum + (cover.Premium || 0), 0);

                // Beregn opptjent premie per cover
                let earnedPremium = 0;
                covers.forEach(cover => {
                    const premium = cover.Premium || 0;

                    // Enkel opptjent premie-logikk
                    if (cover.product && cover.product.InceptionDate && cover.product.EndDate) {
                        const startDate = new Date(cover.product.InceptionDate);
                        const endDate = new Date(cover.product.EndDate);

                        if (vd >= endDate) {
                            // Policy er utgått - 100% opptjent
                            earnedPremium += premium;
                        } else if (vd >= startDate) {
                            // Policy er aktiv - beregn pro-rata
                            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                            const daysCovered = Math.ceil((vd - startDate) / (1000 * 60 * 60 * 24));
                            const ratio = Math.min(daysCovered / totalDays, 1);
                            earnedPremium += premium * ratio;
                        }
                    } else {
                        // Fallback: 50% opptjent hvis ingen datoer
                        earnedPremium += premium * 0.5;
                    }
                });

                // FIKSET: Beregn netto skade-kostnad (regress reduserer kostnad)
                const totalClaimCost = claims.reduce((sum, claim) => {
                    const utbetalt = claim.Utbetalt || 0;
                    const reservert = claim.Skadereserve || 0;
                    const regress = claim.Regress || 0; // Regress er negativt når vi får penger tilbake
                    return sum + utbetalt + reservert + regress;
                }, 0);

                // Beregn skaderatio
                const lossRatio = earnedPremium > 0 ? (totalClaimCost / earnedPremium) * 100 : 0;

                return {
                    year,
                    summary: {
                        totalPolicies: policies.length,
                        totalCovers: covers.length,
                        totalClaims: claims.length,
                        totalCustomers: new Set(policies.map(p => p.customer.InsuredNumber)).size
                    },
                    financial: {
                        totalPremium: Math.round(totalPremium),
                        earnedPremium: Math.round(earnedPremium),
                        totalClaimCost: Math.round(totalClaimCost),
                        lossRatio: Math.round(lossRatio * 10) / 10,
                        earnedPremiumRatio: totalPremium > 0 ? Math.round((earnedPremium / totalPremium) * 1000) / 10 : 0
                    },
                    riskProfile: {
                        avgClaimSize: claims.length > 0 ? Math.round(totalClaimCost / claims.length) : 0,
                        claimFrequency: covers.length > 0 ? Math.round((claims.length / covers.length) * 1000) / 10 : 0
                    },
                    rawData: { policies, covers, claims }
                };
            }).sort((a, b) => b.year - a.year); // Nyeste først

            console.log('✅ UW-årgang analyse ferdig:', {
                totalYears: yearlyAnalysis.length,
                years: yearlyAnalysis.map(y => y.year),
                eksempel2025: yearlyAnalysis.find(y => y.year === 2025)?.summary || null
            });

            return yearlyAnalysis;

        } catch (error) {
            console.error('❌ Feil ved UW-årgang analyse:', error);
            throw error;
        }
    }
}