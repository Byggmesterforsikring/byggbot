const https = require('https');
const log = require('electron-log');
// const { pool } = require('../config/dbConfig'); // Fjernet pg pool
const getPrismaInstance = require('../../../prisma/client.js'); // Importer funksjonen
const prisma = getPrismaInstance(); // Kall funksjonen for å få instansen

/**
 * Enkel funksjon for å gjøre HTTPS-forespørseler med Node.js innebygde bibliotek
 * @param {string} url - URL å kalle
 * @param {Object} options - HTTP-alternativer
 * @param {Object|string} data - Data å sende
 * @returns {Promise<any>} - Parsed JSON-svar
 */
function httpRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        // Check for successful HTTP status
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP Error: ${res.statusCode} - ${res.statusMessage}, Body: ${responseBody}`));
        }

        // Log the full response for debugging in test environments
        log.info(`API Response received with length: ${responseBody.length} bytes`);
        log.info(`API Response start: ${responseBody.substring(0, 200)}...`);

        // Check for error response format
        if (responseBody.includes('ErrorCode') && responseBody.includes('ErrorMessage')) {
          try {
            // Try to extract error message directly from the response text
            const errorMatch = responseBody.match(/"ErrorMessage"\s*:\s*"([^"]+)"/);
            if (errorMatch && errorMatch[1]) {
              const errorMessage = errorMatch[1];

              // Check for specific parameter errors
              if (errorMessage.includes('not found in query definition') ||
                errorMessage.includes('Value is not defined')) {
                return reject(new Error('API-parameterfeil: Parameterne ble ikke funnet i spørringen. Kontakt systemadministrator.'));
              }

              // Generic error message
              return reject(new Error(`API-feil: ${errorMessage.split('.')[0]}`));
            }
          } catch (e) {
            log.error('Feil ved parsing av API-feilmelding:', e);
          }
        }

        try {
          // For regular responses, try parsing as JSON
          // Handle normal case first - direct JSON parsing
          try {
            const parsedData = JSON.parse(responseBody);
            log.info('JSON parsed successfully');
            resolve(parsedData);
            return;
          } catch (directError) {
            log.info('Direct JSON parsing failed, attempting cleanup');
          }

          // If direct parsing fails, try cleaning and fixing the JSON
          let cleanedResponse = responseBody
            .replace(/^\uFEFF/, '') // Remove BOM
            .replace(/\r\n/g, '\n') // Normalize line endings
            .replace(/\n/g, ' ') // Replace newlines with spaces
            .replace(/\\"/g, '"') // Fix double escaped quotes
            .replace(/'/g, '"') // Replace single quotes with double quotes for JSON
            .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // Ensure property names are quoted

          // Try to parse the cleaned response
          try {
            const parsedData = JSON.parse(cleanedResponse);
            log.info('JSON parsed after initial cleaning');
            resolve(parsedData);
            return;
          } catch (cleanError) {
            log.info('Initial cleaning failed, attempting advanced fixes');
          }

          // Extract JSON if wrapped in another structure
          const jsonMatch = responseBody.match(/{[\s\S]*}/);
          if (jsonMatch) {
            try {
              const extractedJson = jsonMatch[0];
              const parsedData = JSON.parse(extractedJson);
              log.info('JSON parsed from extracted content');
              resolve(parsedData);
              return;
            } catch (extractError) {
              log.error('Failed to parse extracted JSON:', extractError);
            }
          }

          // None of our parsing attempts worked - extract a better error message
          if (responseBody.includes("API_Byggbot_nysalgsrapport")) {
            // This appears to be a specific API error related to our report
            if (responseBody.includes("parameter") && responseBody.includes("not found")) {
              return reject(new Error("API-feil: Parameter mangler eller er ugyldig. Sjekk datoformatet (YYYY-MM-DD) og prøv igjen."));
            }
          }

          // Last resort - general error
          reject(new Error("Kunne ikke tolke API-responsen. Kontakt systemadministrator."));
        } catch (e) {
          log.error(`General error processing response: ${e.message}`);
          reject(new Error(`Feil ved behandling av API-respons: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      log.error(`HTTP Request Error: ${error.message}`);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('API-forespørsel tidsavbrutt. Prøv igjen senere.'));
    });

    if (data) {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      log.debug(`Sending data: ${dataString}`);
      req.write(dataString);
    }

    req.end();
  });
}

/**
 * Hjelpefunksjon for å hente ut posisjonen fra en JSON parse error
 * @param {string} errorMessage - Feilmeldingen fra JSON.parse
 * @returns {number|null} - Posisjonen i JSON-strengen eller null
 */
function extractPositionFromError(errorMessage) {
  const match = errorMessage.match(/position (\d+)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Henter dashboard-data fra BMF-API
 * @param {string} reportName - Navnet på rapporten som skal hentes
 * @param {Array} params - Eventuelle parametere til rapporten
 * @returns {Promise<Object>} - Dashboard-data som JSON
 */
async function fetchDashboardData(reportName = 'API_Byggbot_dashboard', params = []) {
  try {
    // API endpoint
    const baseUrl = "portal.bmf.no";
    const path = `/CallActionset/Byggmesterforsikring/PortalApi_report_json?reportname=${reportName}`;

    // Token
    const token = "c2g0NGJZWnd5SldyM0ljZEh1RHBROFQ1VmxNNmRoYmQ=";

    // Gjør API-kall med Node.js innebygde https-bibliotek
    const options = {
      hostname: baseUrl,
      path: path,
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    };

    const data = { Params: params };
    const response = await httpRequest(`https://${baseUrl}${path}`, options, data);

    // Lagre data i database for historikk
    await storeDashboardStats(response);

    // Berik data med trendinfo for 1, 7, og 30 dager
    const dataWithTrends = await addTrendData(response, [1, 7, 30]);

    return dataWithTrends;
  } catch (error) {
    log.error('Feil ved henting av dashboard-data:', error);
    throw new Error(`Kunne ikke hente dashboard-data: ${error.message}`);
  }
}

/**
 * Lagrer dashboard statistikk i databasen
 * @param {Object} data - Dashboard-data fra API
 */
async function storeDashboardStats(data) {
  // Sørg for at data fra API-et mappes korrekt til modellfeltene
  // og at tallverdier blir parset/avrundet til Int
  const statsData = {
    total_customers: data.TotalCustomers ? parseInt(data.TotalCustomers, 10) : null,
    private_customers: data.PrivateCustomers ? parseInt(data.PrivateCustomers, 10) : null,
    business_customers: data.BusinessCustomers ? parseInt(data.BusinessCustomers, 10) : null,
    total_premium: data.TotalPremium ? Math.round(parseFloat(data.TotalPremium)) : null,
    private_premium: data.PrivatePremium ? Math.round(parseFloat(data.PrivatePremium)) : null,
    business_premium: data.BusinessPremium ? Math.round(parseFloat(data.BusinessPremium)) : null,
    claims_reported_ytd: data.ClaimsReportedYTD ? parseInt(data.ClaimsReportedYTD, 10) : null,
  };

  // Dagens dato, kun år-måned-dag, uten tidssoneproblemer for 'date'-feltet
  const today = new Date();
  const todayDateOnly = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  try {
    const result = await prisma.$transaction(async (tx) => {
      const dashboardStat = await tx.dashboardStats.upsert({
        where: { date: todayDateOnly },
        update: {
          ...statsData,
        },
        create: {
          date: todayDateOnly,
          ...statsData,
        },
      });

      const dashboardStatsId = dashboardStat.id;

      await tx.claimCategory.deleteMany({
        where: { dashboard_stats_id: dashboardStatsId },
      });

      if (data.TopClaimCategories && data.TopClaimCategories.length > 0) {
        const categoriesToCreate = data.TopClaimCategories.map(category => ({
          dashboard_stats_id: dashboardStatsId,
          claim_category: category.ClaimCategory,
          claim_count: category.ClaimCount ? parseInt(category.ClaimCount, 10) : null,
          total_amount: category.TotalAmount ? Math.round(parseFloat(category.TotalAmount)) : null,
        }));

        await tx.claimCategory.createMany({
          data: categoriesToCreate,
        });
      }
      return dashboardStat;
    });

    log.info('Dashboard-statistikk lagret i database med Prisma', { id: result.id, date: result.date });
  } catch (error) {
    log.error('Feil ved lagring av dashboard-statistikk med Prisma:', error);
  }
}

/**
 * Beregner trenddata for dashboard basert på historiske data
 * @param {Object} currentData - Dashboard-data fra dagens API-kall
 * @param {Array<number>} periods - Array med antall dager å beregne trender for [1, 7, 30]
 * @returns {Object} - Dashboard-data beriket med trendinfo
 */
async function addTrendData(currentData, periods = [30]) {
  // const client = await pool.connect(); // Fjernet

  try {
    const trendsForPeriods = {};

    for (const period of periods) {
      const targetDate = new Date();
      targetDate.setUTCDate(targetDate.getUTCDate() - period);
      const targetDateOnly = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));

      const historicalData = await prisma.dashboardStats.findFirst({
        where: {
          date: {
            lte: targetDateOnly,
          },
        },
        orderBy: {
          date: 'desc',
        },
      });

      if (!historicalData) {
        log.info(`Ingen historiske data funnet for ${period} dager siden (måldato: ${targetDateOnly.toISOString().split('T')[0]})`);
        trendsForPeriods[`days${period}`] = {
          totalCustomers: null,
          privateCustomers: null,
          businessCustomers: null,
          totalPremium: null,
          privatePremium: null,
          businessPremium: null,
          claimsReportedYTD: null,
          totalCustomersValue: null,
          privateCustomersValue: null,
          businessCustomersValue: null,
          totalPremiumValue: null,
          privatePremiumValue: null,
          businessPremiumValue: null,
          claimsReportedYTDValue: null
        };
        continue;
      }

      const actualDaysBack = Math.round((new Date() - new Date(historicalData.date)) / (1000 * 60 * 60 * 24));
      log.info(`Bruker historiske data fra ${historicalData.date.toISOString().split('T')[0]} (oppdatert ${historicalData.updatedAt.toLocaleString('nb-NO')}), ${actualDaysBack} dager siden (ønsket ${period} dager)`);

      const calculateTrends = (current, previous) => {
        if (previous === null || previous === undefined || previous === 0) return { percent: null, value: null };
        const currentVal = current === null || current === undefined ? 0 : parseFloat(current);
        const previousVal = parseFloat(previous);
        const diff = currentVal - previousVal;
        return {
          percent: parseFloat(((diff) / previousVal * 100).toFixed(1)),
          value: diff,
        };
      };

      const currentStats = {
        total_customers: currentData.TotalCustomers ? parseInt(currentData.TotalCustomers, 10) : 0,
        private_customers: currentData.PrivateCustomers ? parseInt(currentData.PrivateCustomers, 10) : 0,
        business_customers: currentData.BusinessCustomers ? parseInt(currentData.BusinessCustomers, 10) : 0,
        total_premium: currentData.TotalPremium ? Math.round(parseFloat(currentData.TotalPremium)) : 0,
        private_premium: currentData.PrivatePremium ? Math.round(parseFloat(currentData.PrivatePremium)) : 0,
        business_premium: currentData.BusinessPremium ? Math.round(parseFloat(currentData.BusinessPremium)) : 0,
        claims_reported_ytd: currentData.ClaimsReportedYTD ? parseInt(currentData.ClaimsReportedYTD, 10) : 0,
      };

      const totalCustomersTrend = calculateTrends(currentStats.total_customers, historicalData.total_customers);
      const privateCustomersTrend = calculateTrends(currentStats.private_customers, historicalData.private_customers);
      const businessCustomersTrend = calculateTrends(currentStats.business_customers, historicalData.business_customers);
      const totalPremiumTrend = calculateTrends(currentStats.total_premium, historicalData.total_premium);
      const privatePremiumTrend = calculateTrends(currentStats.private_premium, historicalData.private_premium);
      const businessPremiumTrend = calculateTrends(currentStats.business_premium, historicalData.business_premium);
      const claimsReportedYTDTrend = calculateTrends(currentStats.claims_reported_ytd, historicalData.claims_reported_ytd);

      trendsForPeriods[`days${period}`] = {
        totalCustomers: totalCustomersTrend.percent,
        privateCustomers: privateCustomersTrend.percent,
        businessCustomers: businessCustomersTrend.percent,
        totalPremium: totalPremiumTrend.percent,
        privatePremium: privatePremiumTrend.percent,
        businessPremium: businessPremiumTrend.percent,
        claimsReportedYTD: claimsReportedYTDTrend.percent,
        totalCustomersValue: totalCustomersTrend.value,
        privateCustomersValue: privateCustomersTrend.value,
        businessCustomersValue: businessCustomersTrend.value,
        totalPremiumValue: totalPremiumTrend.value,
        privatePremiumValue: privatePremiumTrend.value,
        businessPremiumValue: businessPremiumTrend.value,
        claimsReportedYTDValue: claimsReportedYTDTrend.value
      };
    }

    const primaryPeriod = periods.includes(30) ? 30 : periods[periods.length - 1];
    const defaultTrends = {
      totalCustomers: null,
      privateCustomers: null,
      businessCustomers: null,
      totalPremium: null,
      privatePremium: null,
      businessPremium: null,
      claimsReportedYTD: null,
      totalCustomersValue: null,
      privateCustomersValue: null,
      businessCustomersValue: null,
      totalPremiumValue: null,
      privatePremiumValue: null,
      businessPremiumValue: null,
      claimsReportedYTDValue: null
    };

    return {
      ...currentData,
      trends: trendsForPeriods[`days${primaryPeriod}`] || defaultTrends,
      trendsForPeriods,
    };

  } catch (error) {
    log.error('Feil ved beregning av trenddata med Prisma:', error);
    return currentData;
  }
  // finally { client.release(); } // Fjernet
}

/**
 * Henter historiske dashboard-data fra databasen
 * @param {number} days - Antall dager å hente historikk for (default: 30)
 * @returns {Promise<Object>} - Historiske dashboard-data
 */
async function getHistoricalData(days = 30) {
  // const client = await pool.connect(); // Fjernes

  try {
    const targetStartDate = new Date();
    targetStartDate.setUTCDate(targetStartDate.getUTCDate() - days);
    const startDateOnly = new Date(Date.UTC(targetStartDate.getUTCFullYear(), targetStartDate.getUTCMonth(), targetStartDate.getUTCDate()));

    const historicalStats = await prisma.dashboardStats.findMany({
      where: {
        date: {
          gte: startDateOnly,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return {
      success: true,
      data: historicalStats,
    };
  } catch (error) {
    log.error('Feil ved henting av historiske dashboard-data med Prisma:', error);
    return {
      success: false,
      error: `Kunne ikke hente historiske data: ${error.message}`,
    };
  } // finally { client.release(); } // Fjernes
}

/**
 * Hjelperutine for å splitte en datoperiode i mindre chunks
 * @param {string} startDate - Startdato på format YYYY-MM-DD
 * @param {string} endDate - Sluttdato på format YYYY-MM-DD
 * @param {number} chunkSizeMonths - Størrelse på hver chunk i måneder
 * @returns {Array<Object>} - Array med objekter som inneholder startDate og endDate for hver chunk
 */
function splitDateRangeIntoChunks(startDate, endDate, chunkSizeMonths = 6) {
  const chunks = [];

  // Konverter datoer til Date-objekter
  let currentDate = new Date(startDate);
  const targetEndDate = new Date(endDate);

  // Fortsett så lenge currentDate er før eller lik targetEndDate
  while (currentDate <= targetEndDate) {
    // Startdato for denne chunken
    const chunkStart = new Date(currentDate);

    // Beregn sluttdato for denne chunken (chunkSizeMonths måneder frem)
    currentDate.setMonth(currentDate.getMonth() + chunkSizeMonths);

    // Hvis den beregnede sluttdatoen er etter den faktiske sluttdatoen,
    // bruk den faktiske sluttdatoen i stedet
    const chunkEnd = currentDate > targetEndDate ? new Date(targetEndDate) : new Date(currentDate - 1); // Trekk fra 1 dag for å unngå overlapp

    // Formater datoene som YYYY-MM-DD
    const formattedStart = chunkStart.toISOString().split('T')[0];
    const formattedEnd = chunkEnd.toISOString().split('T')[0];

    // Legg til chunken i resultatet
    chunks.push({
      startDate: formattedStart,
      endDate: formattedEnd
    });
  }

  return chunks;
}

/**
 * Slår sammen flere resultat-datasett fra skaderapporten
 * @param {Array<Object>} resultArray - Array med resultater fra API-kall
 * @returns {Object} - Et sammenslått resultat
 */
function mergeSkadeReportResults(resultArray) {
  if (resultArray.length === 0) return {};
  if (resultArray.length === 1) return resultArray[0];

  // Start med å kopiere det første resultatet
  const merged = JSON.parse(JSON.stringify(resultArray[0]));

  // Aggreger nøkkeltall fra alle resultater
  resultArray.slice(1).forEach(result => {
    // Totale tall
    merged.TotaltAntallSkader += result.TotaltAntallSkader || 0;
    merged.TotalUtbetalt += result.TotalUtbetalt || 0;
    merged.TotalReservert += result.TotalReservert || 0;
    merged.TotalRegress += result.TotalRegress || 0;
    merged.AntallBedriftskunder += result.AntallBedriftskunder || 0;
    merged.AntallPrivatkunder += result.AntallPrivatkunder || 0;

    // Konkatenér skadedetaljer
    if (result.SkadeDetaljer && result.SkadeDetaljer.length > 0) {
      merged.SkadeDetaljer = merged.SkadeDetaljer.concat(result.SkadeDetaljer);
    }

    // Slå sammen månedsstatistikk
    if (result.MånedsStatistikk && result.MånedsStatistikk.length > 0) {
      // Opprett en Map for enkel tilgang basert på år+måned
      const monthMap = new Map();

      // Fyll Map med eksisterende data
      merged.MånedsStatistikk.forEach(item => {
        const key = `${item.År}-${item.Måned}`;
        monthMap.set(key, item);
      });

      // Legg til eller oppdater fra nye resultater
      result.MånedsStatistikk.forEach(item => {
        const key = `${item.År}-${item.Måned}`;

        if (monthMap.has(key)) {
          // Oppdater eksisterende måned
          const existingMonth = monthMap.get(key);
          existingMonth.AntallSkader += item.AntallSkader || 0;
          existingMonth.TotalUtbetalt += item.TotalUtbetalt || 0;
          existingMonth.TotalReservert += item.TotalReservert || 0;
        } else {
          // Legg til ny måned
          monthMap.set(key, item);
        }
      });

      // Konverter Map tilbake til array og sorter etter år og måned
      merged.MånedsStatistikk = Array.from(monthMap.values())
        .sort((a, b) => (a.År - b.År) || (a.Måned - b.Måned));
    }

    // Slå sammen kundetypestatistikk
    if (result.KundetypeStatistikk && result.KundetypeStatistikk.length > 0) {
      const typeMap = new Map();

      // Fyll Map med eksisterende data
      merged.KundetypeStatistikk.forEach(item => {
        typeMap.set(item.Kundetype, item);
      });

      // Legg til eller oppdater fra nye resultater
      result.KundetypeStatistikk.forEach(item => {
        if (typeMap.has(item.Kundetype)) {
          // Oppdater eksisterende kundetype
          const existingType = typeMap.get(item.Kundetype);
          existingType.AntallSkader += item.AntallSkader || 0;
          existingType.TotalUtbetalt += item.TotalUtbetalt || 0;
          existingType.TotalReservert += item.TotalReservert || 0;
          existingType.TotalRegress += item.TotalRegress || 0;
        } else {
          // Legg til ny kundetype
          typeMap.set(item.Kundetype, item);
        }
      });

      // Konverter Map tilbake til array
      merged.KundetypeStatistikk = Array.from(typeMap.values());
    }

    // Slå sammen skadetypestatistikk
    if (result.SkadetypeStatistikk && result.SkadetypeStatistikk.length > 0) {
      const typeMap = new Map();

      // Fyll Map med eksisterende data
      merged.SkadetypeStatistikk.forEach(item => {
        typeMap.set(item.ClaimType, item);
      });

      // Legg til eller oppdater fra nye resultater
      result.SkadetypeStatistikk.forEach(item => {
        if (typeMap.has(item.ClaimType)) {
          // Oppdater eksisterende skadetype
          const existingType = typeMap.get(item.ClaimType);
          existingType.AntallSkader += item.AntallSkader || 0;
          existingType.TotalUtbetalt += item.TotalUtbetalt || 0;
          existingType.TotalReservert += item.TotalReservert || 0;
        } else {
          // Legg til ny skadetype
          typeMap.set(item.ClaimType, item);
        }
      });

      // Konverter Map tilbake til array
      merged.SkadetypeStatistikk = Array.from(typeMap.values());
    }
  });

  return merged;
}

/**
 * Henter rapportdata fra BMF-API basert på dato-periode
 * @param {string} reportName - Navnet på rapporten som skal hentes (f.eks. API_Byggbot_nysalgsrapport)
 * @param {string} startDate - Startdato på format YYYY-MM-DD
 * @param {string} endDate - Sluttdato på format YYYY-MM-DD
 * @returns {Promise<Object>} - Rapportdata som JSON
 */
async function fetchReportData(reportName, startDate, endDate) {
  try {
    if (!reportName || !startDate || !endDate) {
      throw new Error('Manglende parametre: reportName, startDate og endDate er påkrevd');
    }

    log.info(`Henter rapport: ${reportName} for periode ${startDate} til ${endDate}`);

    // Formater datoer som yyyy-MM-dd, ikke ISO-strings
    const formatDate = (dateStr) => {
      // Hvis dateStr allerede er på formatet YYYY-MM-DD, returnerer vi den direkte
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }

      // Ellers konverterer vi til Date og formatterer
      const date = new Date(dateStr);
      // Sjekker at det er en gyldig dato
      if (isNaN(date.getTime())) {
        log.error(`Ugyldig dato: ${dateStr}`);
        throw new Error(`Ugyldig datoformat: ${dateStr}. Forventet format: YYYY-MM-DD`);
      }

      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    // Formatter datoer
    let formattedStartDate, formattedEndDate;
    try {
      formattedStartDate = formatDate(startDate);
      formattedEndDate = formatDate(endDate);
      log.info(`Formaterte datoer: ${formattedStartDate} til ${formattedEndDate}`);
    } catch (error) {
      throw new Error(`Kunne ikke formatere datoer: ${error.message}`);
    }

    // Sjekk om vi trenger chunking for skaderapporten
    if (reportName === 'API_Byggbot_skaderapport') {
      const startDateObj = new Date(formattedStartDate);
      const endDateObj = new Date(formattedEndDate);

      // Beregn antall måneder mellom datoene
      const monthsDiff = (endDateObj.getFullYear() - startDateObj.getFullYear()) * 12 +
        endDateObj.getMonth() - startDateObj.getMonth();

      // Hvis perioden er større enn 6 måneder, chunk forespørselen
      if (monthsDiff > 6) {
        log.info(`Skaderapport-perioden er ${monthsDiff} måneder, deler opp i chunks på 6 måneder`);

        // Del opp i chunks på 6 måneder
        const chunks = splitDateRangeIntoChunks(formattedStartDate, formattedEndDate, 6);
        log.info(`Delt opp i ${chunks.length} chunks:`, chunks);

        // Hent data for hver chunk
        const results = [];
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          log.info(`Henter chunk ${i + 1}/${chunks.length}: ${chunk.startDate} til ${chunk.endDate}`);

          try {
            const chunkResult = await fetchSingleReportData(reportName, chunk.startDate, chunk.endDate);
            results.push(chunkResult);
          } catch (error) {
            log.error(`Feil ved henting av chunk ${i + 1}/${chunks.length}:`, error);
            // Fortsett med neste chunk selv om denne feiler
          }
        }

        // Hvis ingen chunks lyktes, kast feil
        if (results.length === 0) {
          throw new Error('Kunne ikke hente data for noen av periodene');
        }

        // Slå sammen resultatene
        log.info(`Slår sammen ${results.length} resultater`);
        return mergeSkadeReportResults(results);
      }
    }

    // For andre rapporter eller korte perioder, bruk vanlig API-kall
    return await fetchSingleReportData(reportName, formattedStartDate, formattedEndDate);
  } catch (error) {
    log.error('Feil ved henting av rapportdata:', error);
    throw new Error(`Kunne ikke hente rapportdata: ${error.message}`);
  }
}

/**
 * Henter rapportdata for en enkelt periode
 * @param {string} reportName - Navnet på rapporten som skal hentes
 * @param {string} startDate - Startdato på format YYYY-MM-DD
 * @param {string} endDate - Sluttdato på format YYYY-MM-DD
 * @returns {Promise<Object>} - Rapportdata som JSON
 */
async function fetchSingleReportData(reportName, startDate, endDate) {
  // API endpoint - merk at reportname er nå en query parameter i stedet for i path
  const baseUrl = "portal.bmf.no";
  const path = `/CallActionset/Byggmesterforsikring/PortalApi_report_json`;

  // Token - eksakt samme som i Python-koden
  const token = "c2g0NGJZWnd5SldyM0ljZEh1RHBROFQ1VmxNNmRoYmQ=";

  // Parametre for URL query (reportname)
  const queryParams = `?reportname=${reportName}`;

  // Gjør API-kall med Node.js innebygde https-bibliotek - bruk samme format som Python-koden
  const options = {
    hostname: baseUrl,
    path: path + queryParams,
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
  };

  // Setter opp parametre basert på input
  const params = [
    {
      "Name": "@FromDate",
      "Value": String(startDate)
    },
    {
      "Name": "@ToDate",
      "Value": String(endDate)
    }
  ];

  const data = {
    "Params": params
  };

  // For debugging
  log.info(`Kaller API: ${baseUrl}${path}${queryParams} med parametre:`, JSON.stringify(data));

  const response = await httpRequest(`https://${baseUrl}${path}${queryParams}`, options, data);
  log.info('API-kall vellykket');
  return response;
}

module.exports = {
  fetchDashboardData,
  getHistoricalData,
  fetchReportData
};