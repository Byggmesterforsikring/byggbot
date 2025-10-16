const https = require('https');
const log = require('electron-log');
const getPrismaInstance = require('../../../prisma/client.js');
const prisma = getPrismaInstance();

function httpRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP Error: ${res.statusCode} - ${res.statusMessage}, Body: ${responseBody}`));
        }
        log.info(`API Response received with length: ${responseBody.length} bytes`);
        log.info(`API Response start: ${responseBody.substring(0, 200)}...`);
        if (responseBody.includes('ErrorCode') && responseBody.includes('ErrorMessage')) {
          try {
            const errorMatch = responseBody.match(/"ErrorMessage"\s*:\s*"([^"]+)"/);
            if (errorMatch && errorMatch[1]) {
              const errorMessage = errorMatch[1];
              if (errorMessage.includes('not found in query definition') || errorMessage.includes('Value is not defined')) {
                return reject(new Error('API-parameterfeil: Parameterne ble ikke funnet i spørringen. Kontakt systemadministrator.'));
              }
              return reject(new Error(`API-feil: ${errorMessage.split('.')[0]}`));
            }
          } catch (e) { log.error('Feil ved parsing av API-feilmelding:', e); }
        }
        try {
          try {
            const parsedData = JSON.parse(responseBody);
            log.info('JSON parsed successfully');
            resolve(parsedData);
            return;
          } catch (directError) { log.info('Direct JSON parsing failed, attempting cleanup'); }
          let cleanedResponse = responseBody.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\n/g, ' ').replace(/\\"/g, '"').replace(/'/g, '"').replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
          try {
            const parsedData = JSON.parse(cleanedResponse);
            log.info('JSON parsed after initial cleaning');
            resolve(parsedData);
            return;
          } catch (cleanError) { log.info('Initial cleaning failed, attempting advanced fixes'); }
          const jsonMatch = responseBody.match(/{[\s\S]*}/);
          if (jsonMatch) {
            try {
              const extractedJson = jsonMatch[0];
              const parsedData = JSON.parse(extractedJson);
              log.info('JSON parsed from extracted content');
              resolve(parsedData);
              return;
            } catch (extractError) { log.error('Failed to parse extracted JSON:', extractError); }
          }
          if (responseBody.includes("API_Byggbot_nysalgsrapport")) {
            if (responseBody.includes("parameter") && responseBody.includes("not found")) {
              return reject(new Error("API-feil: Parameter mangler eller er ugyldig. Sjekk datoformatet (YYYY-MM-DD) og prøv igjen."));
            }
          }
          reject(new Error("Kunne ikke tolke API-responsen. Kontakt systemadministrator."));
        } catch (e) {
          log.error(`General error processing response: ${e.message}`);
          reject(new Error(`Feil ved behandling av API-respons: ${e.message}`));
        }
      });
    });
    req.on('error', (error) => { log.error(`HTTP Request Error: ${error.message}`); reject(error); });
    req.on('timeout', () => { req.destroy(); reject(new Error('API-forespørsel tidsavbrutt. Prøv igjen senere.')); });
    if (data) {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      log.debug(`Sending data: ${dataString}`);
      req.write(dataString);
    }
    req.end();
  });
}

function extractPositionFromError(errorMessage) {
  const match = errorMessage.match(/position (\d+)/);
  if (match && match[1]) { return parseInt(match[1], 10); }
  return null;
}

async function fetchDashboardData(reportName = 'API_Byggbot_dashboard', params = []) {
  try {
    const baseUrl = "portal.bmf.no";
    const path = `/CallActionset/Byggmesterforsikring/PortalApi_report_json?reportname=${reportName}`;
    const token = "c2g0NGJZWnd5SldyM0ljZEh1RHBROFQ1VmxNNmRoYmQ=";
    const options = { hostname: baseUrl, path: path, method: 'POST', headers: { 'Authorization': token, 'Content-Type': 'application/json' } };
    const data = { Params: params };
    const response = await httpRequest(`https://${baseUrl}${path}`, options, data);
    await storeDashboardStats(response);
    const dataWithTrends = await addTrendData(response, [1, 7, 30]);
    return dataWithTrends;
  } catch (error) {
    log.error('Feil ved henting av dashboard-data:', error);
    throw new Error(`Kunne ikke hente dashboard-data: ${error.message}`);
  }
}

async function storeDashboardStats(data) {
  const statsData = {
    total_customers: data.TotalCustomers ? parseInt(data.TotalCustomers, 10) : null,
    private_customers: data.PrivateCustomers ? parseInt(data.PrivateCustomers, 10) : null,
    business_customers: data.BusinessCustomers ? parseInt(data.BusinessCustomers, 10) : null,
    total_premium: data.TotalPremium ? Math.round(parseFloat(data.TotalPremium)) : null,
    private_premium: data.PrivatePremium ? Math.round(parseFloat(data.PrivatePremium)) : null,
    business_premium: data.BusinessPremium ? Math.round(parseFloat(data.BusinessPremium)) : null,
    claims_reported_ytd: data.ClaimsReportedYTD ? parseInt(data.ClaimsReportedYTD, 10) : null,
  };
  const today = new Date();
  const todayDateOnly = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  try {
    const result = await prisma.$transaction(async (tx) => {
      const dashboardStat = await tx.dashboardStats.upsert({ where: { date: todayDateOnly }, update: { ...statsData }, create: { date: todayDateOnly, ...statsData } });
      const dashboardStatsId = dashboardStat.id;
      // TopClaimCategories fjernet - lagres ikke lenger i database
      return dashboardStat;
    });
    log.info('Dashboard-statistikk lagret i database med Prisma', { id: result.id, date: result.date });
  } catch (error) { log.error('Feil ved lagring av dashboard-statistikk med Prisma:', error); }
}

async function addTrendData(currentData, periods = [30]) {
  try {
    const trendsForPeriods = {};
    for (const period of periods) {
      const targetDate = new Date();
      targetDate.setUTCDate(targetDate.getUTCDate() - period);
      const targetDateOnly = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));
      const historicalData = await prisma.dashboardStats.findFirst({ where: { date: { lte: targetDateOnly } }, orderBy: { date: 'desc' } });
      if (!historicalData) {
        log.info(`Ingen historiske data funnet for ${period} dager siden (måldato: ${targetDateOnly.toISOString().split('T')[0]})`);
        trendsForPeriods[`days${period}`] = { totalCustomers: null, privateCustomers: null, businessCustomers: null, totalPremium: null, privatePremium: null, businessPremium: null, claimsReportedYTD: null, totalCustomersValue: null, privateCustomersValue: null, businessCustomersValue: null, totalPremiumValue: null, privatePremiumValue: null, businessPremiumValue: null, claimsReportedYTDValue: null };
        continue;
      }
      const actualDaysBack = Math.round((new Date() - new Date(historicalData.date)) / (1000 * 60 * 60 * 24));
      log.info(`Bruker historiske data fra ${historicalData.date.toISOString().split('T')[0]} (oppdatert ${historicalData.updatedAt.toLocaleString('nb-NO')}), ${actualDaysBack} dager siden (ønsket ${period} dager)`);
      const calculateTrends = (current, previous) => {
        if (previous === null || previous === undefined || previous === 0) return { percent: null, value: null };
        const currentVal = current === null || current === undefined ? 0 : parseFloat(current);
        const previousVal = parseFloat(previous);
        const diff = currentVal - previousVal;
        return { percent: parseFloat(((diff) / previousVal * 100).toFixed(1)), value: diff };
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
      trendsForPeriods[`days${period}`] = { totalCustomers: totalCustomersTrend.percent, privateCustomers: privateCustomersTrend.percent, businessCustomers: businessCustomersTrend.percent, totalPremium: totalPremiumTrend.percent, privatePremium: privatePremiumTrend.percent, businessPremium: businessPremiumTrend.percent, claimsReportedYTD: claimsReportedYTDTrend.percent, totalCustomersValue: totalCustomersTrend.value, privateCustomersValue: privateCustomersTrend.value, businessCustomersValue: businessCustomersTrend.value, totalPremiumValue: totalPremiumTrend.value, privatePremiumValue: privatePremiumTrend.value, businessPremiumValue: businessPremiumTrend.value, claimsReportedYTDValue: claimsReportedYTDTrend.value };
    }
    const primaryPeriod = periods.includes(30) ? 30 : periods[periods.length - 1];
    const defaultTrends = { totalCustomers: null, privateCustomers: null, businessCustomers: null, totalPremium: null, privatePremium: null, businessPremium: null, claimsReportedYTD: null, totalCustomersValue: null, privateCustomersValue: null, businessCustomersValue: null, totalPremiumValue: null, privatePremiumValue: null, businessPremiumValue: null, claimsReportedYTDValue: null };
    return { ...currentData, trends: trendsForPeriods[`days${primaryPeriod}`] || defaultTrends, trendsForPeriods };
  } catch (error) {
    log.error('Feil ved beregning av trenddata med Prisma:', error);
    return currentData;
  }
}

async function getHistoricalData(days = 30) {
  try {
    const targetStartDate = new Date();
    targetStartDate.setUTCDate(targetStartDate.getUTCDate() - days);
    const startDateOnly = new Date(Date.UTC(targetStartDate.getUTCFullYear(), targetStartDate.getUTCMonth(), targetStartDate.getUTCDate()));
    const historicalStats = await prisma.dashboardStats.findMany({ where: { date: { gte: startDateOnly } }, orderBy: { date: 'asc' } });
    return { success: true, data: historicalStats };
  } catch (error) {
    log.error('Feil ved henting av historiske dashboard-data med Prisma:', error);
    return { success: false, error: `Kunne ikke hente historiske data: ${error.message}` };
  }
}

function splitDateRangeIntoChunks(startDate, endDate, chunkSizeMonths = 6) {
  const chunks = [];
  let currentDate = new Date(startDate);
  const targetEndDate = new Date(endDate);
  while (currentDate <= targetEndDate) {
    const chunkStart = new Date(currentDate);
    currentDate.setMonth(currentDate.getMonth() + chunkSizeMonths);
    const chunkEnd = currentDate > targetEndDate ? new Date(targetEndDate) : new Date(currentDate - 1);
    const formattedStart = chunkStart.toISOString().split('T')[0];
    const formattedEnd = chunkEnd.toISOString().split('T')[0];
    chunks.push({ startDate: formattedStart, endDate: formattedEnd });
  }
  return chunks;
}

function mergeSkadeReportResults(resultArray) {
  if (resultArray.length === 0) return {};
  if (resultArray.length === 1) return resultArray[0];
  const merged = JSON.parse(JSON.stringify(resultArray[0]));
  resultArray.slice(1).forEach(result => {
    merged.TotaltAntallSkader += result.TotaltAntallSkader || 0;
    merged.TotalUtbetalt += result.TotalUtbetalt || 0;
    merged.TotalReservert += result.TotalReservert || 0;
    merged.TotalRegress += result.TotalRegress || 0;
    merged.AntallBedriftskunder += result.AntallBedriftskunder || 0;
    merged.AntallPrivatkunder += result.AntallPrivatkunder || 0;
    if (result.SkadeDetaljer && result.SkadeDetaljer.length > 0) {
      merged.SkadeDetaljer = merged.SkadeDetaljer.concat(result.SkadeDetaljer);
    }
    if (result.MånedsStatistikk && result.MånedsStatistikk.length > 0) {
      const monthMap = new Map();
      merged.MånedsStatistikk.forEach(item => { monthMap.set(`${item.År}-${item.Måned}`, item); });
      result.MånedsStatistikk.forEach(item => {
        const key = `${item.År}-${item.Måned}`;
        if (monthMap.has(key)) {
          const existingMonth = monthMap.get(key);
          existingMonth.AntallSkader += item.AntallSkader || 0;
          existingMonth.TotalUtbetalt += item.TotalUtbetalt || 0;
          existingMonth.TotalReservert += item.TotalReservert || 0;
        } else { monthMap.set(key, item); }
      });
      merged.MånedsStatistikk = Array.from(monthMap.values()).sort((a, b) => (a.År - b.År) || (a.Måned - b.Måned));
    }
    if (result.KundetypeStatistikk && result.KundetypeStatistikk.length > 0) {
      const typeMap = new Map();
      merged.KundetypeStatistikk.forEach(item => { typeMap.set(item.Kundetype, item); });
      result.KundetypeStatistikk.forEach(item => {
        if (typeMap.has(item.Kundetype)) {
          const existingType = typeMap.get(item.Kundetype);
          existingType.AntallSkader += item.AntallSkader || 0;
          existingType.TotalUtbetalt += item.TotalUtbetalt || 0;
          existingType.TotalReservert += item.TotalReservert || 0;
          existingType.TotalRegress += item.TotalRegress || 0;
        } else { typeMap.set(item.Kundetype, item); }
      });
      merged.KundetypeStatistikk = Array.from(typeMap.values());
    }
    if (result.SkadetypeStatistikk && result.SkadetypeStatistikk.length > 0) {
      const typeMap = new Map();
      merged.SkadetypeStatistikk.forEach(item => { typeMap.set(item.ClaimType, item); });
      result.SkadetypeStatistikk.forEach(item => {
        if (typeMap.has(item.ClaimType)) {
          const existingType = typeMap.get(item.ClaimType);
          existingType.AntallSkader += item.AntallSkader || 0;
          existingType.TotalUtbetalt += item.TotalUtbetalt || 0;
          existingType.TotalReservert += item.TotalReservert || 0;
        } else { typeMap.set(item.ClaimType, item); }
      });
      merged.SkadetypeStatistikk = Array.from(typeMap.values());
    }
  });
  return merged;
}

function mergeNysalgsReportResults(resultArray) {
  if (resultArray.length === 0) return [];
  if (resultArray.length === 1) return resultArray[0];

  // Nysalgsrapporter returnerer vanligvis en array av objekter
  let merged = [];
  resultArray.forEach(result => {
    if (Array.isArray(result)) {
      merged = merged.concat(result);
    }
  });

  log.info(`Slått sammen ${resultArray.length} nysalgs-chunks til ${merged.length} totale poster`);
  return merged;
}

function mergeGarantiReportResults(resultArray) {
  if (resultArray.length === 0) return {};
  if (resultArray.length === 1) return resultArray[0];

  // Garanti-rapporter kan ha ulik struktur, håndter både array og objekt med GarantiDetaljer
  let merged = { GarantiDetaljer: [] };

  resultArray.forEach(result => {
    if (Array.isArray(result)) {
      merged.GarantiDetaljer = merged.GarantiDetaljer.concat(result);
    } else if (result && result.GarantiDetaljer && Array.isArray(result.GarantiDetaljer)) {
      merged.GarantiDetaljer = merged.GarantiDetaljer.concat(result.GarantiDetaljer);

      // Merge other potential aggregate fields
      Object.keys(result).forEach(key => {
        if (key !== 'GarantiDetaljer' && typeof result[key] === 'number') {
          merged[key] = (merged[key] || 0) + result[key];
        }
      });
    }
  });

  log.info(`Slått sammen ${resultArray.length} garanti-chunks til ${merged.GarantiDetaljer.length} totale poster`);
  return merged;
}

function mergeGenericReportResults(resultArray) {
  if (resultArray.length === 0) return [];
  if (resultArray.length === 1) return resultArray[0];

  // Generic merge - assume array of data objects
  let merged = [];
  resultArray.forEach(result => {
    if (Array.isArray(result)) {
      merged = merged.concat(result);
    } else if (result && typeof result === 'object') {
      // If it's an object, try to find arrays within it
      Object.values(result).forEach(value => {
        if (Array.isArray(value)) {
          merged = merged.concat(value);
        }
      });
    }
  });

  log.info(`Slått sammen ${resultArray.length} generiske chunks til ${merged.length} totale poster`);
  return merged;
}

function formatDate(dateStr) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    log.error(`Ugyldig dato: ${dateStr}`);
    throw new Error(`Ugyldig datoformat: ${dateStr}. Forventet format: YYYY-MM-DD`);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function fetchReportData(reportName, StartDate, EndDate) {
  try {
    if (!reportName || !StartDate || !EndDate) {
      throw new Error('Manglende parametre: reportName, StartDate og EndDate er påkrevd');
    }
    log.info(`🔍 [CHUNKING DEBUG] Henter rapport: ${reportName} for periode ${StartDate} til ${EndDate}`);
    console.log(`🔍 [CHUNKING DEBUG] Henter rapport: ${reportName} for periode ${StartDate} til ${EndDate}`);
    let formattedStartDate, formattedEndDate;
    try {
      formattedStartDate = formatDate(StartDate);
      formattedEndDate = formatDate(EndDate);
      log.info(`Formaterte datoer: ${formattedStartDate} til ${formattedEndDate}`);
    } catch (error) {
      throw new Error(`Kunne ikke formatere datoer: ${error.message}`);
    }
    // Check if we need to chunk the request for any report type
    const startDateObj = new Date(formattedStartDate);
    const endDateObj = new Date(formattedEndDate);
    const monthsDiff = (endDateObj.getFullYear() - startDateObj.getFullYear()) * 12 + endDateObj.getMonth() - startDateObj.getMonth();

    log.info(`🔍 [CHUNKING DEBUG] startDateObj: ${startDateObj.toISOString()}`);
    log.info(`🔍 [CHUNKING DEBUG] endDateObj: ${endDateObj.toISOString()}`);
    log.info(`🔍 [CHUNKING DEBUG] Start år/måned: ${startDateObj.getFullYear()}/${startDateObj.getMonth()}`);
    log.info(`🔍 [CHUNKING DEBUG] Slutt år/måned: ${endDateObj.getFullYear()}/${endDateObj.getMonth()}`);
    log.info(`🔍 [CHUNKING DEBUG] Månedsforskjell: ${monthsDiff} måneder (${formattedStartDate} til ${formattedEndDate})`);
    log.info(`🔍 [CHUNKING DEBUG] Sjekker om ${monthsDiff} > 6 = ${monthsDiff > 6}`);
    console.log(`🔍 [CHUNKING DEBUG] Sjekker om ${monthsDiff} > 6 = ${monthsDiff > 6}`);

    // Chunk all reports if period is longer than 6 months
    if (monthsDiff > 6) {
      log.info(`🔍 [CHUNKING DEBUG] TRIGGER: Periode er ${monthsDiff} måneder, starter chunking...`);
      console.log(`🔍 [CHUNKING DEBUG] TRIGGER: Periode er ${monthsDiff} måneder, starter chunking...`);
      log.info(`${reportName}-perioden er ${monthsDiff} måneder, deler opp i chunks på 6 måneder`);
      const chunks = splitDateRangeIntoChunks(formattedStartDate, formattedEndDate, 6);
      log.info(`Delt opp i ${chunks.length} chunks:`, chunks);
      const results = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        log.info(`Henter chunk ${i + 1}/${chunks.length}: ${chunk.startDate} til ${chunk.endDate}`);
        try {
          const chunkResult = await fetchSingleReportData(reportName, chunk.startDate, chunk.endDate);
          results.push(chunkResult);
        } catch (error) {
          log.error(`Feil ved henting av chunk ${i + 1}/${chunks.length}:`, error);
        }
      }

      if (results.length === 0) {
        throw new Error('Kunne ikke hente data for noen av periodene');
      }

      log.info(`Slår sammen ${results.length} resultater`);

      // Use appropriate merge function based on report type
      switch (reportName) {
        case 'API_Byggbot_skaderapport':
          return mergeSkadeReportResults(results);
        case 'API_Byggbot_nysalgsrapport':
          return mergeNysalgsReportResults(results);
        case 'API_Byggbot_garantirapport':
          return mergeGarantiReportResults(results);
        default:
          // Generic merge for unknown report types
          return mergeGenericReportResults(results);
      }
    }

    log.info(`🔍 [CHUNKING DEBUG] INGEN CHUNKING: Kjører single request for ${monthsDiff} måneder`);
    return await fetchSingleReportData(reportName, formattedStartDate, formattedEndDate);
  } catch (error) {
    log.error('Feil ved henting av rapportdata:', error);
    throw new Error(`Kunne ikke hente rapportdata: ${error.message}`);
  }
}

async function fetchSingleReportData(reportName, startDate, endDate) {
  const baseUrl = "portal.bmf.no";
  const path = `/CallActionset/Byggmesterforsikring/PortalApi_report_json`;
  const token = "c2g0NGJZWnd5SldyM0ljZEh1RHBROFQ1VmxNNmRoYmQ=";
  const queryParams = `?reportname=${reportName}`;
  const options = {
    hostname: baseUrl,
    path: path + queryParams,
    method: 'POST',
    headers: { 'Authorization': token, 'Content-Type': 'application/json' }
  };
  const params = [
    { "Name": "@StartDate", "Value": String(startDate) },
    { "Name": "@EndDate", "Value": String(endDate) }
  ];
  const data = { "Params": params };
  log.info(`Kaller API: ${baseUrl}${path}${queryParams} med parametre:`, JSON.stringify(data));
  const response = await httpRequest(`https://${baseUrl}${path}${queryParams}`, options, data);
  log.info('API-kall vellykket');
  return response;
}

// New function to fetch customer analysis data (kun kundenr parameter)
async function fetchCustomerAnalysis(kundenr) {
  try {
    const reportName = 'API_Byggbot_fornyelsesanalyse';
    const baseUrl = "portal.bmf.no";
    const path = `/CallActionset/Byggmesterforsikring/PortalApi_report_json`;
    const token = "c2g0NGJZWnd5SldyM0ljZEh1RHBROFQ1VmxNNmRoYmQ=";
    const queryParams = `?reportname=${reportName}`;

    const options = {
      hostname: baseUrl,
      path: path + queryParams,
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' }
    };

    const params = [
      { "Name": "@Kundenr", "Value": String(kundenr) }
    ];

    const data = { "Params": params };
    log.info(`Henter kundeanalyse for kunde ${kundenr}`);
    log.info(`API-parametere:`, JSON.stringify(params, null, 2));
    log.info(`Full API URL: https://${baseUrl}${path}${queryParams}`);
    log.info(`Request data:`, JSON.stringify(data, null, 2));

    const response = await httpRequest(`https://${baseUrl}${path}${queryParams}`, options, data);
    log.info('Kundeanalyse-API kall vellykket');

    return processCustomerAnalysisData(response);
  } catch (error) {
    log.error('Feil ved henting av kundeanalyse:', error);
    log.error('API-kall detaljer:', { reportName: 'API_Byggbot_fornyelsesanalyse', kundenr });

    // More specific error messages
    if (error.message.includes('parameter')) {
      throw new Error(`API-parameterfeil: Parameterne ble ikke funnet i spørringen. Kontakt systemadministrator.`);
    } else if (error.message.includes('Exception callig query')) {
      throw new Error(`SQL-feil på serveren. Dette kan skyldes ugyldig kundenummer eller manglende data for perioden.`);
    } else {
      throw new Error(`Kunne ikke hente kundeanalyse: ${error.message}`);
    }
  }
}

// Process and structure the customer analysis data
function processCustomerAnalysisData(rawData) {
  try {
    log.info('Processing customer analysis data');

    if (!rawData) {
      return { error: 'Ingen data mottatt fra API' };
    }

    // Return the raw data directly - let frontend handle processing
    // API should return data in KUNDEINFO.json structure
    log.info('Customer analysis data processed successfully');
    return rawData;

  } catch (error) {
    log.error('Feil ved behandling av kundedata:', error);
    return { error: `Feil ved behandling av kundedata: ${error.message}` };
  }
}


module.exports = {
  fetchDashboardData,
  getHistoricalData,
  fetchReportData,
  fetchCustomerAnalysis
};