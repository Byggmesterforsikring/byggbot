const https = require('https');
const log = require('electron-log');

function httpRequest(url, options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let responseBody = '';

            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error(`HTTP Error: ${res.statusCode} - ${res.statusMessage}, Body: ${responseBody}`));
                }

                log.info(`API Response received with length: ${responseBody.length} bytes`);

                // Sjekk for API-feil i respons
                if (responseBody.includes('ErrorCode') && responseBody.includes('ErrorMessage')) {
                    try {
                        const errorMatch = responseBody.match(/"ErrorMessage"\s*:\s*"([^"]+)"/);
                        if (errorMatch && errorMatch[1]) {
                            const errorMessage = errorMatch[1];
                            return reject(new Error(`API-feil: ${errorMessage}`));
                        }
                    } catch (parseError) {
                        log.warn('Kunne ikke parse error message from API response');
                    }
                    return reject(new Error('API returnerte en feil - sjekk parametere'));
                }

                try {
                    const jsonResponse = JSON.parse(responseBody);
                    resolve(jsonResponse);
                } catch (parseError) {
                    log.error('Feil ved parsing av JSON:', parseError);
                    reject(new Error('Ugyldig JSON-respons fra API'));
                }
            });
        });

        req.on('error', (err) => {
            log.error('HTTP request error:', err);
            reject(new Error(`Nettverksfeil: ${err.message}`));
        });

        if (data) {
            req.write(data);
        }
        req.end();
    });
}

// CHUNKED API: Porteføljeanalyse med daglig chunking for store perioder
async function hentGiverrapportViewDate(startDate, endDate) {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        log.info(`🔍 Porteføljeanalyse chunking analyse:`, {
            startDate, endDate, daysDiff,
            strategy: daysDiff <= 31 ? 'SINGLE_CALL' : 'DAILY_CHUNKS'
        });

        // For perioder <= 31 dager: ett enkelt kall
        if (daysDiff <= 31) {
            return await hentEnkeltPeriode(startDate, endDate);
        }

        // For store perioder: daglig chunking
        return await hentMedDagligChunking(startDate, endDate);

    } catch (error) {
        log.error(`❌ Feil ved henting av porteføljedata:`, {
            error: error.message,
            startDate, endDate
        });
        throw new Error(`Kunne ikke hente porteføljedata: ${error.message}`);
    }
}

// Enkelt API-kall for små perioder  
async function hentEnkeltPeriode(startDate, endDate) {
    const reportName = 'API_Byggbot_giverrapport_viewdate';
    const baseUrl = "portal.bmf.no";
    const path = `/CallActionset/Byggmesterforsikring/PortalApi_report_json`;
    const token = "c2g0NGJZWnd5SldyM0ljZEh1RHBROFQ1VmxNNmRoYmQ=";
    const queryParams = `?reportname=${reportName}`;

    const options = {
        hostname: baseUrl,
        path: path + queryParams,
        method: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        }
    };

    const params = [
        { "Name": "@StartDate", "Value": String(startDate) },
        { "Name": "@EndDate", "Value": String(endDate) }
    ];
    const data = { "Params": params };

    log.info(`📡 Enkelt API-kall for periode ${startDate} til ${endDate}`);
    const response = await httpRequest(`https://${baseUrl}${path}${queryParams}`, options, JSON.stringify(data));

    return Array.isArray(response) ? response : [];
}

// Daglig chunking for store perioder
async function hentMedDagligChunking(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let combinedData = [];
    let currentDate = new Date(start);
    let chunkCount = 0;

    log.info(`🔄 Starter daglig chunking fra ${startDate} til ${endDate}`);

    while (currentDate <= end) {
        const chunkStart = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const chunkEnd = chunkStart; // samme dag for start og slutt
        chunkCount++;

        try {
            log.info(`📅 Chunk ${chunkCount}: Henter data for ${chunkStart}`);
            const chunkData = await hentEnkeltPeriode(chunkStart, chunkEnd);

            if (Array.isArray(chunkData) && chunkData.length > 0) {
                combinedData.push(...chunkData);
                log.info(`✅ Chunk ${chunkCount}: ${chunkData.length} poster hentet (totalt: ${combinedData.length})`);
            } else {
                log.info(`📝 Chunk ${chunkCount}: Ingen data for ${chunkStart}`);
            }

            // Rate limiting: 500ms pause mellom kall
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            log.warn(`⚠️ Chunk ${chunkCount} feilet for ${chunkStart}: ${error.message}`);
            // Fortsett med neste dag selv om en dag feiler
        }

        // Neste dag
        currentDate.setDate(currentDate.getDate() + 1);
    }

    log.info(`🎯 Chunking komplett: ${chunkCount} chunks, ${combinedData.length} totale poster`);
    return combinedData;
}

// 2-STEGS PORTEFØLJEANALYSE: Kunde-liste + kunde-detaljer
async function hentKomplettPortefoljeData(startDate, endDate, progressCallback = null, abortSignal = null) {
    try {
        log.info(`🚀 Starter komplett porteføljeanalyse for periode ${startDate} til ${endDate}`);

        // Sjekk abort før vi starter
        if (abortSignal?.aborted) {
            throw new Error('ABORT');
        }

        // STEG 1: Hent kunde-liste
        if (progressCallback) progressCallback({ phase: 'kunde_liste', progress: 0, message: 'Henter kunde-liste...' });

        const kundeListe = await hentKundeListe(startDate, endDate);
        log.info(`✅ Funnet ${kundeListe.length} kunder for perioden ${startDate} til ${endDate}`);

        if (kundeListe.length === 0) {
            log.error(`🚨 INGEN KUNDER FUNNET for periode ${startDate} til ${endDate}!`);
            log.error(`   Dette kan indikere et problem med kunde-liste API-kallet`);
            return { customers: [], summary: { totalCustomers: 0, totalPolicies: 0, totalCovers: 0 } };
        }

        // LOG FØRSTE FÅ KUNDER FOR DEBUGGING
        log.info(`📋 Eksempel på kunde-liste data (første 3 kunder):`);
        kundeListe.slice(0, 3).forEach((kunde, index) => {
            log.info(`   ${index + 1}. ${kunde.Kundenummer} - ${kunde.Kundetekst}`);
        });

        // STEG 2: Hent detaljer for hver kunde
        if (progressCallback) progressCallback({
            phase: 'kunde_detaljer',
            progress: 0,
            message: `Henter detaljer for ${kundeListe.length} kunder...`,
            total: kundeListe.length
        });

        const komplettKundeData = [];
        const datatapLog = {
            failedCustomers: [],
            emptyCustomers: [],
            successfulCustomers: [],
            totalPremiumLost: 0
        };

        for (let i = 0; i < kundeListe.length; i++) {
            const kunde = kundeListe[i];
            const kundeProgress = Math.round(((i + 1) / kundeListe.length) * 100);

            // Sjekk abort for hver kunde
            if (abortSignal?.aborted) {
                log.info(`⚠️ Avbryter etter ${i} kunder (av ${kundeListe.length})`);
                throw new Error('ABORT');
            }

            try {
                if (progressCallback) progressCallback({
                    phase: 'kunde_detaljer',
                    progress: kundeProgress,
                    current: i + 1,
                    total: kundeListe.length,
                    message: `Henter kunde ${i + 1}/${kundeListe.length}: ${kunde.Kundetekst}`,
                    customerNumber: kunde.Kundenummer
                });

                const kundeDetaljer = await hentKundeDetaljer(kunde.Kundenummer, startDate, endDate);

                // FORBEDRET LOGGING: Detaljert analyse av respons
                if (!kundeDetaljer) {
                    log.error(`🚨 DATATAP: Null respons for kunde ${kunde.Kundenummer} (${kunde.Kundetekst})`);
                    datatapLog.failedCustomers.push({
                        kundenummer: kunde.Kundenummer,
                        kundetekst: kunde.Kundetekst,
                        error: 'Null respons fra API'
                    });
                } else if (!kundeDetaljer.Insured) {
                    log.error(`🚨 DATATAP: Mangler Insured-struktur for kunde ${kunde.Kundenummer} (${kunde.Kundetekst})`);
                    log.error(`📋 Raw response struktur:`, Object.keys(kundeDetaljer));
                    datatapLog.emptyCustomers.push({
                        kundenummer: kunde.Kundenummer,
                        kundetekst: kunde.Kundetekst,
                        error: 'Mangler Insured-struktur',
                        responseKeys: Object.keys(kundeDetaljer)
                    });
                } else if (kundeDetaljer.Insured.length === 0) {
                    log.error(`🚨 DATATAP: Tom Insured array for kunde ${kunde.Kundenummer} (${kunde.Kundetekst})`);
                    datatapLog.emptyCustomers.push({
                        kundenummer: kunde.Kundenummer,
                        kundetekst: kunde.Kundetekst,
                        error: 'Tom Insured array'
                    });
                } else {
                    // SUCCESS: Legg til metadata fra kunde-liste
                    const enrichedKunde = {
                        ...kundeDetaljer.Insured[0],
                        _metadata: {
                            kundetekst: kunde.Kundetekst,
                            hentetTidspunkt: new Date().toISOString(),
                            periode: { startDate, endDate }
                        }
                    };

                    const policyCount = tellPoliciesForKunde(enrichedKunde);
                    const premiumSum = beregnKundePremieSum(enrichedKunde, startDate, endDate);

                    komplettKundeData.push(enrichedKunde);
                    datatapLog.successfulCustomers.push({
                        kundenummer: kunde.Kundenummer,
                        policies: policyCount,
                        premiumSum: premiumSum
                    });

                    log.info(`✅ Kunde ${kunde.Kundenummer}: ${policyCount} policies, premie: ${premiumSum.toLocaleString('no-NO')} NOK`);
                }

                // Rate limiting - vær snill mot API
                if (i < kundeListe.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

            } catch (error) {
                log.error(`🚨 DATATAP: API-feil for kunde ${kunde.Kundenummer} (${kunde.Kundetekst}): ${error.message}`);
                datatapLog.failedCustomers.push({
                    kundenummer: kunde.Kundenummer,
                    kundetekst: kunde.Kundetekst,
                    error: error.message
                });
                // Fortsett med neste kunde selv om en feiler
            }
        }

        // DATATAP-RAPPORT
        const totalCustomersFromList = kundeListe.length;
        const successfulCustomers = komplettKundeData.length;
        const datatapCount = totalCustomersFromList - successfulCustomers;
        const datatapPercentage = ((datatapCount / totalCustomersFromList) * 100).toFixed(1);

        log.error(`📊 DATATAP-RAPPORT:`);
        log.error(`   Totalt kunder fra liste: ${totalCustomersFromList}`);
        log.error(`   Vellykkede kunder: ${successfulCustomers}`);
        log.error(`   DATATAP: ${datatapCount} kunder (${datatapPercentage}%)`);

        if (datatapLog.failedCustomers.length > 0) {
            log.error(`🚨 ${datatapLog.failedCustomers.length} kunder feilet (API-feil):`);
            datatapLog.failedCustomers.forEach(kunde => {
                log.error(`   - ${kunde.kundenummer}: ${kunde.error}`);
            });
        }

        if (datatapLog.emptyCustomers.length > 0) {
            log.error(`⚠️ ${datatapLog.emptyCustomers.length} kunder med tom/ugyldig respons:`);
            datatapLog.emptyCustomers.forEach(kunde => {
                log.error(`   - ${kunde.kundenummer}: ${kunde.error}`);
            });
        }

        const totalPremiumSuccessful = datatapLog.successfulCustomers.reduce((sum, k) => sum + k.premiumSum, 0);

        // Beregn også UFILTERT premiesum for sammenligning
        let totalPremiumUfiltert = 0;
        komplettKundeData.forEach(kunde => {
            if (kunde.PolicyList) {
                kunde.PolicyList.forEach(policy => {
                    if (policy.PolicyProduct) {
                        policy.PolicyProduct.forEach(product => {
                            totalPremiumUfiltert += product.Premium || 0;
                        });
                    }
                });
            }
        });

        const filtreringseffekt = totalPremiumUfiltert - totalPremiumSuccessful;
        const filtreringsProsent = totalPremiumUfiltert > 0 ? ((filtreringseffekt / totalPremiumUfiltert) * 100).toFixed(1) : 0;

        log.error(`💰 PREMIE-SAMMENLIGNING:`);
        log.error(`   Filtrert premie (UI-logikk): ${totalPremiumSuccessful.toLocaleString('no-NO')} NOK`);
        log.error(`   Ufiltert premie (alle policies): ${totalPremiumUfiltert.toLocaleString('no-NO')} NOK`);
        log.error(`   Filtreringseffekt: ${filtreringseffekt.toLocaleString('no-NO')} NOK (${filtreringsProsent}%)`);

        if (datatapCount > 0) {
            log.error(`⚠️ POTENSIELT PREMIETAP: Ukjent beløp fra ${datatapCount} manglende kunder`);
        }

        // STEG 3: Generer sammendrag
        const summary = {
            totalCustomers: komplettKundeData.length,
            totalPolicies: komplettKundeData.reduce((sum, kunde) => sum + tellPoliciesForKunde(kunde), 0),
            totalCovers: komplettKundeData.reduce((sum, kunde) => sum + tellCoversForKunde(kunde), 0),
            periode: { startDate, endDate },
            hentetTidspunkt: new Date().toISOString()
        };

        if (progressCallback) progressCallback({
            phase: 'ferdig',
            progress: 100,
            message: `✅ Komplett! ${summary.totalCustomers} kunder, ${summary.totalPolicies} policies, ${summary.totalCovers} covers`,
            summary
        });

        log.info(`🎯 Porteføljeanalyse komplett:`, summary);

        return {
            customers: komplettKundeData,
            summary: summary
        };

    } catch (error) {
        log.error(`❌ Feil i komplett porteføljeanalyse:`, error);
        throw new Error(`Kunne ikke fullføre porteføljeanalyse: ${error.message}`);
    }
}

// Hjelpefunksjoner for telling
function tellPoliciesForKunde(kunde) {
    return kunde.PolicyList ? kunde.PolicyList.length : 0;
}

function beregnKundePremieSum(kunde, startDate, endDate) {
    if (!kunde.PolicyList) return 0;

    // Beregn periode-lengde for å velge riktig policy-status regel
    const viewDate = new Date(endDate);
    const periodeStartDate = new Date(startDate);
    const diffTime = viewDate.getTime() - periodeStartDate.getTime();
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44);

    // Samme logikk som UI-et: ≤12 mnd = kun Aktiv + Utgått
    const valideStatuser = diffMonths <= 12
        ? ['Aktiv', 'Utgått']           // Siste 12 mnd
        : ['Aktiv', 'Utgått', 'Fornyet']; // Historisk

    let totalPremium = 0;
    let filteredPolicies = 0;
    let totalPolicies = 0;

    kunde.PolicyList.forEach(policy => {
        totalPolicies++;

        // SAMME FILTRERING SOM UI-ET
        if (valideStatuser.includes(policy.PolicyStatusName)) {
            filteredPolicies++;
            if (policy.PolicyProduct) {
                policy.PolicyProduct.forEach(product => {
                    totalPremium += product.Premium || 0;
                });
            }
        }
    });

    // Debug første gang for å verifisere filtrering
    if (totalPolicies > 0 && Math.random() < 0.01) { // 1% sjanse for debug
        log.info(`🔍 Policy-filtrering debug for kunde ${kunde.InsuredNumber}:`, {
            totalPolicies,
            filteredPolicies,
            periodeMåneder: diffMonths.toFixed(1),
            valideStatuser,
            premieSum: totalPremium
        });
    }

    return totalPremium;
}

function tellCoversForKunde(kunde) {
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
}

// Hent kunde-liste for periode
async function hentKundeListe(startDate, endDate) {
    const reportName = 'API_Byggbot_giverrapport_customers';
    const baseUrl = "portal.bmf.no";
    const path = `/CallActionset/Byggmesterforsikring/PortalApi_report_json`;
    const token = "c2g0NGJZWnd5SldyM0ljZEh1RHBROFQ1VmxNNmRoYmQ=";
    const queryParams = `?reportname=${reportName}`;

    const options = {
        hostname: baseUrl,
        path: path + queryParams,
        method: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        }
    };

    // API_Byggbot_giverrapport_customers trenger StartDate og EndDate
    const params = [
        { "Name": "@StartDate", "Value": String(startDate) },
        { "Name": "@EndDate", "Value": String(endDate) }
    ];
    const data = { "Params": params };

    log.info(`📋 Henter kunde-liste for periode ${startDate} til ${endDate}`);
    const response = await httpRequest(`https://${baseUrl}${path}${queryParams}`, options, JSON.stringify(data));

    if (!response) {
        log.error(`🚨 NULL RESPONS fra kunde-liste API!`);
        return [];
    }

    if (!Array.isArray(response)) {
        log.error(`🚨 UGYLDIG RESPONS fra kunde-liste API:`, typeof response, Object.keys(response || {}));
        return [];
    }

    log.info(`✅ Kunde-liste API respons OK: ${response.length} kunder`);
    return response;
}

// Hent kunde-detaljer for spesifikk kunde MED periode-filter
async function hentKundeDetaljer(kundenummer, startDate = null, endDate = null) {
    const reportName = 'API_Byggbot_giverrapport_details';  // Samme endepunkt, men med periode-parametere
    const baseUrl = "portal.bmf.no";
    const path = `/CallActionset/Byggmesterforsikring/PortalApi_report_json`;
    const token = "c2g0NGJZWnd5SldyM0ljZEh1RHBROFQ1VmxNNmRoYmQ=";
    const queryParams = `?reportname=${reportName}`;

    const options = {
        hostname: baseUrl,
        path: path + queryParams,
        method: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        }
    };

    // NY: Inkluder periode-parametere hvis tilgjengelig
    const params = [
        { "Name": "@CustomerNumber", "Value": kundenummer }
    ];

    if (startDate && endDate) {
        params.push(
            { "Name": "@StartDate", "Value": String(startDate) },
            { "Name": "@EndDate", "Value": String(endDate) }
        );
        log.info(`👤 Henter detaljer for kunde ${kundenummer} (periode: ${startDate} til ${endDate})`);
    } else {
        log.info(`👤 Henter detaljer for kunde ${kundenummer} (ingen periode-filter)`);
    }

    const data = { "Params": params };
    const response = await httpRequest(`https://${baseUrl}${path}${queryParams}`, options, JSON.stringify(data));

    return response;
}

// Hent skade-oversikt for spesifikk kunde
async function hentSkadeOversiktForKunde(insuredNumber) {
    const reportName = 'Portal_Skadeoversikt_Kunde';
    const baseUrl = "portal.bmf.no";
    const path = `/CallActionset/Byggmesterforsikring/PortalApi_report_json`;
    const token = "c2g0NGJZWnd5SldyM0ljZEh1RHBROFQ1VmxNNmRoYmQ=";
    const queryParams = `?reportname=${reportName}`;

    const options = {
        hostname: baseUrl,
        path: path + queryParams,
        method: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        }
    };

    const params = [
        { "Name": "@intInsuredNumber", "Value": insuredNumber }
    ];
    const data = { "Params": params };

    log.info(`🔍 Henter skade-oversikt for kunde ${insuredNumber}`);
    const response = await httpRequest(`https://${baseUrl}${path}${queryParams}`, options, JSON.stringify(data));

    // Debug: Log RAW response-struktur
    log.info(`📋 RAW skade-data response for kunde ${insuredNumber}:`, {
        isArray: Array.isArray(response),
        type: typeof response,
        length: Array.isArray(response) ? response.length : 'ikke array',
        keys: response && typeof response === 'object' ? Object.keys(response) : 'ikke objekt',
        rawResponse: response // HELE responsen for debugging
    });

    // Sjekk for nested struktur
    if (response && typeof response === 'object' && !Array.isArray(response)) {
        log.info(`🔍 Mulig nested struktur - sjekker for skade-data i objektet...`);

        // Sjekk vanlige nested patterns
        const possibleArrays = [];
        Object.keys(response).forEach(key => {
            if (Array.isArray(response[key])) {
                possibleArrays.push({ key, length: response[key].length });
            }
        });

        log.info(`📋 Arrays funnet i response:`, possibleArrays);

        // Hvis vi finner arrays, returner det største
        if (possibleArrays.length > 0) {
            const largestArray = possibleArrays.reduce((max, curr) =>
                curr.length > max.length ? curr : max
            );
            log.info(`✅ Bruker array '${largestArray.key}' med ${largestArray.length} elementer`);
            return response[largestArray.key];
        }
    }

    return Array.isArray(response) ? response : [];
}

// Test skade-data for en enkelt kunde (debug)
async function testSkadeDataForKunde(insuredNumber) {
    try {
        log.info(`🧪 TEST: Henter skade-data for kunde ${insuredNumber}`);
        const skadeData = await hentSkadeOversiktForKunde(insuredNumber);

        log.info(`✅ Skade-data hentet for kunde ${insuredNumber}:`, {
            antallSkader: skadeData.length,
            eksempelSkade: skadeData[0] || 'Ingen skader'
        });

        return {
            success: true,
            insuredNumber,
            skadeData,
            antallSkader: skadeData.length
        };

    } catch (error) {
        log.error(`❌ Feil ved henting av skade-data for kunde ${insuredNumber}:`, error);
        return {
            success: false,
            insuredNumber,
            error: error.message
        };
    }
}

// Hent skade-data for alle kunder i porteføljedata
async function hentSkadeDataForAlleKunder(portefoljeData, progressCallback = null) {
    try {
        log.info(`🔍 Starter skade-data henting for ${portefoljeData.summary.totalCustomers} kunder`);

        const kundeSkadeData = new Map();
        let processedCount = 0;

        for (const kunde of portefoljeData.customers) {
            const insuredNumber = kunde.InsuredNumber;

            try {
                if (progressCallback) {
                    progressCallback({
                        phase: 'skade_data',
                        current: processedCount + 1,
                        total: portefoljeData.customers.length,
                        progress: Math.round(((processedCount + 1) / portefoljeData.customers.length) * 100),
                        message: `Henter skader for kunde ${processedCount + 1}/${portefoljeData.customers.length} (${insuredNumber})`
                    });
                }

                const skadeData = await hentSkadeOversiktForKunde(insuredNumber);
                kundeSkadeData.set(insuredNumber, skadeData);

                if (skadeData.length > 0) {
                    log.info(`✅ Kunde ${insuredNumber}: ${skadeData.length} skader`);
                }

                processedCount++;

                // Rate limiting
                if (processedCount < portefoljeData.customers.length) {
                    await new Promise(resolve => setTimeout(resolve, 150));
                }

            } catch (error) {
                log.error(`❌ Feil ved skade-data for kunde ${insuredNumber}: ${error.message}`);
                kundeSkadeData.set(insuredNumber, []);
                processedCount++;
            }
        }

        log.info(`🎯 Skade-data henting komplett: ${kundeSkadeData.size} kunder prosessert`);

        return {
            success: true,
            skadeDataMap: kundeSkadeData,
            totalProcessed: processedCount
        };

    } catch (error) {
        log.error('❌ Feil i skade-data henting:', error);
        throw error;
    }
}

// Hent komplett skade-data med client-side filtrering og business-regler
async function hentKomplettSkadeData(ønsketStartDate, ønsketEndDate, portefoljeData = null, progressCallback = null, abortSignal = null) {
    // Sjekk abort før vi starter
    if (abortSignal?.aborted) {
        throw new Error('ABORT');
    }

    const reportName = 'API_Byggbot_skaderapport';
    const baseUrl = "portal.bmf.no";
    const path = `/CallActionset/Byggmesterforsikring/PortalApi_report_json`;
    const token = "c2g0NGJZWnd5SldyM0ljZEh1RHBROFQ1VmxNNmRoYmQ=";
    const queryParams = `?reportname=${reportName}`;

    const options = {
        hostname: baseUrl,
        path: path + queryParams,
        method: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        }
    };

    // SMART STRATEGI: Hent bred periode (ReportDate) så filtrer lokalt på DamageDate
    const iDag = new Date().toISOString().split('T')[0];
    const params = [
        { "Name": "@StartDate", "Value": ønsketStartDate },  // Samme start som porteføljedata
        { "Name": "@EndDate", "Value": iDag }                // Til i dag (bred periode)
    ];
    const data = { "Params": params };

    log.info(`🔍 Henter skade-data for BRED periode ${ønsketStartDate} til ${iDag} (ReportDate)`);
    log.info(`📋 Vil filtrere lokalt på DamageDate: ${ønsketStartDate} til ${ønsketEndDate}`);

    // CHUNK SKADE-DATA: 12 måneder er for mye på en gang
    const månederChunks = [];
    const start = new Date(ønsketStartDate);
    const slutt = new Date(iDag);

    // Del opp i 3-måneders chunks
    let chunkStart = new Date(start);
    while (chunkStart < slutt) {
        let chunkEnd = new Date(chunkStart);
        chunkEnd.setMonth(chunkEnd.getMonth() + 3);
        if (chunkEnd > slutt) chunkEnd = new Date(slutt);

        månederChunks.push({
            start: chunkStart.toISOString().split('T')[0],
            end: chunkEnd.toISOString().split('T')[0]
        });

        chunkStart = new Date(chunkEnd);
        chunkStart.setDate(chunkStart.getDate() + 1);
    }

    log.info(`📦 Deler skade-henting i ${månederChunks.length} chunks à 3 måneder`);

    if (progressCallback) {
        progressCallback({
            phase: 'skade_chunks',
            progress: 0,
            current: 0,
            total: månederChunks.length,
            message: `Henter skadedata i ${månederChunks.length} deler (3-måneders perioder)...`
        });
    }

    let alleSkader = [];
    let totalUtbetalt = 0;
    let totalReservert = 0;
    let totalRegress = 0;

    for (let i = 0; i < månederChunks.length; i++) {
        const chunk = månederChunks[i];
        log.info(`📦 Chunk ${i + 1}/${månederChunks.length}: ${chunk.start} til ${chunk.end}`);

        // Sjekk abort for hver chunk
        if (abortSignal?.aborted) {
            log.info(`⚠️ Avbryter etter ${i} skade-chunks (av ${månederChunks.length})`);
            throw new Error('ABORT');
        }

        if (progressCallback) {
            const chunkProgress = Math.round(((i) / månederChunks.length) * 100);
            progressCallback({
                phase: 'skade_chunks',
                progress: chunkProgress,
                current: i + 1,
                total: månederChunks.length,
                message: `Henter skadedata-chunk ${i + 1}/${månederChunks.length} (${chunk.start} til ${chunk.end})...`
            });
        }

        const chunkData = {
            "Params": [
                { "Name": "@StartDate", "Value": chunk.start },
                { "Name": "@EndDate", "Value": chunk.end }
            ]
        };

        try {
            const chunkResponse = await httpRequest(`https://${baseUrl}${path}${queryParams}`, options, JSON.stringify(chunkData));

            if (chunkResponse && chunkResponse.SkadeDetaljer) {
                alleSkader.push(...chunkResponse.SkadeDetaljer);
                totalUtbetalt += chunkResponse.TotalUtbetalt || 0;
                totalReservert += chunkResponse.TotalReservert || 0;
                totalRegress += chunkResponse.TotalRegress || 0;

                log.info(`✅ Chunk ${i + 1}: ${chunkResponse.SkadeDetaljer.length} skader`);
            }
        } catch (chunkError) {
            log.error(`❌ Chunk ${i + 1} feilet:`, chunkError.message);
            // Fortsett med neste chunk
        }

        // Kort pause mellom chunks
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Bygg samlet response
    const response = {
        SkadeDetaljer: alleSkader,
        TotaltAntallSkader: alleSkader.length,
        TotalUtbetalt: totalUtbetalt,
        TotalReservert: totalReservert,
        TotalRegress: totalRegress
    };

    log.info(`🎯 Samlet skade-data fra chunks: ${alleSkader.length} skader totalt`);

    if (progressCallback) {
        progressCallback({
            phase: 'skade_filtering',
            progress: 90,
            message: `Filtrerer og prosesserer ${alleSkader.length} skader...`
        });
    }

    // AVANSERT CLIENT-SIDE FILTRERING: Periode + business-regler
    if (response && response.SkadeDetaljer && Array.isArray(response.SkadeDetaljer)) {
        const ønsketStart = new Date(ønsketStartDate);
        const ønsketEnd = new Date(ønsketEndDate);
        const originalCount = response.SkadeDetaljer.length;

        // Bygg policy-nummer sett fra porteføljedata (hvis tilgjengelig)
        let validePolicyNumbers = new Set();
        if (portefoljeData && portefoljeData.customers) {
            portefoljeData.customers.forEach(kunde => {
                if (kunde.PolicyList) {
                    kunde.PolicyList.forEach(policy => {
                        validePolicyNumbers.add(policy.PolicyNumber);
                    });
                }
            });
            log.info(`📋 Bygget policy-nummer validering: ${validePolicyNumbers.size} valide policies`);
        }

        // Debug counter for mismatches
        let debugMismatchCount = 0;

        // Filtrer skader med multiple kriterier
        const filtrertSkader = response.SkadeDetaljer.filter(skade => {
            // 1. Sjekk hendelsesdato
            if (!skade.Hendelsesdato) return false;
            const hendelsesdato = new Date(skade.Hendelsesdato);
            if (hendelsesdato < ønsketStart || hendelsesdato > ønsketEnd) return false;

            // 2. Fjern feilregistrerte skader
            if (skade.Skadestatus === 'Feilregistrert') {
                log.info(`❌ Filtrerer bort feilregistrert skade: ${skade.Skadenummer}`);
                return false;
            }

            // 3. Sjekk at policy-nummer finnes i porteføljedata (hvis tilgjengelig)
            if (validePolicyNumbers.size > 0 && skade.Polisenummer) {
                // Test både som string og number
                const policyAsString = String(skade.Polisenummer);
                const policyAsNumber = parseInt(skade.Polisenummer);

                if (!validePolicyNumbers.has(policyAsString) && !validePolicyNumbers.has(policyAsNumber)) {
                    // Debug første 5 mismatches
                    if (debugMismatchCount < 5) {
                        log.info(`❌ DEBUG MISMATCH: Skade ${skade.Skadenummer} - policy "${skade.Polisenummer}" (${typeof skade.Polisenummer}) ikke funnet`);
                        debugMismatchCount++;
                    }
                    return false;
                }
            }

            return true;
        });

        const feilregistrertCount = response.SkadeDetaljer.filter(s => s.Skadestatus === 'Feilregistrert').length;
        const utenforPeriodeCount = originalCount - response.SkadeDetaljer.filter(s => {
            if (!s.Hendelsesdato) return false;
            const hendelsesdato = new Date(s.Hendelsesdato);
            return hendelsesdato >= ønsketStart && hendelsesdato <= ønsketEnd;
        }).length;

        log.info(`🎯 Avansert skade-filtrering:`, {
            original: originalCount,
            etterPeriodeFilter: originalCount - utenforPeriodeCount,
            feilregistrerte: feilregistrertCount,
            finalCount: filtrertSkader.length,
            validePolicies: validePolicyNumbers.size
        });

        // Oppdater response med filtrerte data
        response.SkadeDetaljer = filtrertSkader;
        response.TotaltAntallSkader = filtrertSkader.length;

        // Beregn nye totaler basert på filtrerte skader
        response.TotalUtbetalt = filtrertSkader.reduce((sum, skade) => sum + (skade.Utbetalt || 0), 0);
        response.TotalReservert = filtrertSkader.reduce((sum, skade) => sum + (skade.Skadereserve || 0), 0);
        response.TotalRegress = filtrertSkader.reduce((sum, skade) => sum + (skade.Regress || 0), 0);

        log.info(`💰 Oppdaterte totaler etter business-filtrering:`, {
            antallSkader: response.TotaltAntallSkader,
            totalUtbetalt: response.TotalUtbetalt,
            totalReservert: response.TotalReservert
        });
    }

    return response;
}

// Test komplett skade-data for kort periode (debug)
async function testKomplettSkadeData(startDate = '2025-01-03', endDate = '2025-01-04') {
    try {
        log.info(`🧪 TEST: Henter komplett skade-data for periode ${startDate} til ${endDate}`);
        const skadeData = await hentKomplettSkadeData(startDate, endDate);

        const summary = {
            totaltAntallSkader: skadeData.TotaltAntallSkader || 0,
            totalUtbetalt: skadeData.TotalUtbetalt || 0,
            totalReservert: skadeData.TotalReservert || 0,
            antallSkadeDetaljer: skadeData.SkadeDetaljer ? skadeData.SkadeDetaljer.length : 0,
            eksempelSkade: skadeData.SkadeDetaljer && skadeData.SkadeDetaljer.length > 0
                ? skadeData.SkadeDetaljer[0]
                : 'Ingen skader'
        };

        log.info(`✅ Komplett skade-data test resultat:`, summary);

        return {
            success: true,
            periode: { startDate, endDate },
            rawData: skadeData,
            summary
        };

    } catch (error) {
        log.error(`❌ Feil ved test av komplett skade-data:`, error);
        return {
            success: false,
            periode: { startDate, endDate },
            error: error.message
        };
    }
}

module.exports = {
    hentGiverrapportViewDate,
    hentEnkeltPeriode,
    hentMedDagligChunking,
    hentKomplettPortefoljeData,
    hentKundeListe,
    hentKundeDetaljer,
    tellPoliciesForKunde,
    tellCoversForKunde,
    hentSkadeOversiktForKunde,
    testSkadeDataForKunde,
    hentSkadeDataForAlleKunder,
    hentKomplettSkadeData,
    testKomplettSkadeData
};
