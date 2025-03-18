const https = require('https');
const log = require('electron-log');
const { pool } = require('../config/dbConfig');

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
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Sett inn hovedstatistikk - overskriver eksisterende data for dagen
    const statsQuery = `
      INSERT INTO dashboard_stats (
        date, 
        total_customers, 
        private_customers, 
        business_customers, 
        total_premium, 
        private_premium, 
        business_premium, 
        claims_reported_ytd
      ) VALUES (
        CURRENT_DATE, 
        $1, $2, $3, $4, $5, $6, $7
      ) 
      ON CONFLICT (date) 
      DO UPDATE SET 
        total_customers = $1,
        private_customers = $2,
        business_customers = $3,
        total_premium = $4,
        private_premium = $5,
        business_premium = $6,
        claims_reported_ytd = $7,
        created_at = CURRENT_TIMESTAMP
      RETURNING id
    `;

    const statsValues = [
      data.TotalCustomers,
      data.PrivateCustomers,
      data.BusinessCustomers,
      data.TotalPremium,
      data.PrivatePremium,
      data.BusinessPremium,
      data.ClaimsReportedYTD
    ];

    const statsResult = await client.query(statsQuery, statsValues);
    const dashboardStatsId = statsResult.rows[0].id;

    // Slett eksisterende skadekategorier for dagens dashboard_stats for å unngå duplisering
    await client.query(
      'DELETE FROM claim_categories WHERE dashboard_stats_id = $1',
      [dashboardStatsId]
    );

    // Sett inn skadekategorier
    if (data.TopClaimCategories && data.TopClaimCategories.length > 0) {
      for (const category of data.TopClaimCategories) {
        await client.query(
          `INSERT INTO claim_categories (
            dashboard_stats_id, 
            claim_category, 
            claim_count, 
            total_amount
          ) VALUES ($1, $2, $3, $4)`,
          [
            dashboardStatsId,
            category.ClaimCategory,
            category.ClaimCount,
            category.TotalAmount
          ]
        );
      }
    }

    await client.query('COMMIT');
    log.info('Dashboard-statistikk lagret i database');
  } catch (error) {
    await client.query('ROLLBACK');
    log.error('Feil ved lagring av dashboard-statistikk:', error);
    // Vi kaster ikke feilen videre her, siden dette er en tilleggsfunksjon
    // som ikke skal forhindre visning av dashbordet hvis den feiler
  } finally {
    client.release();
  }
}

/**
 * Beregner trenddata for dashboard basert på historiske data
 * @param {Object} currentData - Dashboard-data fra dagens API-kall
 * @param {Array<number>} periods - Array med antall dager å beregne trender for [1, 7, 30]
 * @returns {Object} - Dashboard-data beriket med trendinfo
 */
async function addTrendData(currentData, periods = [30]) {
  const client = await pool.connect();

  try {
    // Forbered trendobjekter for hver periode
    const trendsForPeriods = {};

    for (const period of periods) {
      // Hent data fra X dager siden for sammenligning
      // Finner nærmeste dag hvis ikke eksakt dag finnes
      const historicalQuery = `
        SELECT 
          total_customers, 
          private_customers, 
          business_customers, 
          total_premium, 
          private_premium, 
          business_premium, 
          claims_reported_ytd,
          date,
          created_at
        FROM dashboard_stats
        WHERE date <= CURRENT_DATE - INTERVAL '${period} days'
        ORDER BY date DESC
        LIMIT 1
      `;

      const result = await client.query(historicalQuery);

      // Hvis vi ikke har data fra perioden, sett trendobjekt til null verdier
      if (result.rows.length === 0) {
        log.info(`Ingen historiske data funnet for ${period} dager siden`);
        trendsForPeriods[`days${period}`] = {
          totalCustomers: null,
          privateCustomers: null,
          businessCustomers: null,
          totalPremium: null,
          privatePremium: null,
          businessPremium: null,
          claimsReportedYTD: null
        };
        continue;
      }

      const historicalData = result.rows[0];
      const actualDaysBack = Math.round((new Date() - new Date(historicalData.date)) / (1000 * 60 * 60 * 24));

      log.info(`Bruker historiske data fra ${historicalData.date} (oppdatert ${new Date(historicalData.created_at).toLocaleString('nb-NO')}), ${actualDaysBack} dager siden (ønsket ${period} dager)`);

      // Beregn prosentvise endringer
      const calculateTrend = (current, previous) => {
        if (!previous || previous === 0) return null;
        return parseFloat(((current - previous) / previous * 100).toFixed(1));
      };

      trendsForPeriods[`days${period}`] = {
        totalCustomers: calculateTrend(currentData.TotalCustomers, historicalData.total_customers),
        privateCustomers: calculateTrend(currentData.PrivateCustomers, historicalData.private_customers),
        businessCustomers: calculateTrend(currentData.BusinessCustomers, historicalData.business_customers),
        totalPremium: calculateTrend(currentData.TotalPremium, historicalData.total_premium),
        privatePremium: calculateTrend(currentData.PrivatePremium, historicalData.private_premium),
        businessPremium: calculateTrend(currentData.BusinessPremium, historicalData.business_premium),
        claimsReportedYTD: calculateTrend(currentData.ClaimsReportedYTD, historicalData.claims_reported_ytd)
      };
    }

    // For bakoverkompatibilitet, behold trends som primært trendobjekt (30 dager eller siste tilgjengelige)
    const primaryPeriod = periods.includes(30) ? 30 : periods[periods.length - 1];

    return {
      ...currentData,
      trends: trendsForPeriods[`days${primaryPeriod}`] || {
        totalCustomers: null,
        privateCustomers: null,
        businessCustomers: null,
        totalPremium: null,
        privatePremium: null,
        businessPremium: null,
        claimsReportedYTD: null
      },
      trendsForPeriods
    };

  } catch (error) {
    log.error('Feil ved beregning av trenddata:', error);
    // Returner data uten trender hvis noe går galt
    return currentData;
  } finally {
    client.release();
  }
}

/**
 * Henter historiske dashboard-data fra databasen
 * @param {number} days - Antall dager å hente historikk for (default: 30)
 * @returns {Promise<Object>} - Historiske dashboard-data
 */
async function getHistoricalData(days = 30) {
  const client = await pool.connect();

  try {
    // Hent statistikk for de siste X dagene - vi har kun én oppføring per dag
    const statsQuery = `
      SELECT 
        date, 
        created_at,
        total_customers, 
        private_customers, 
        business_customers, 
        total_premium, 
        private_premium, 
        business_premium, 
        claims_reported_ytd
      FROM dashboard_stats
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY date ASC
    `;

    const statsResult = await client.query(statsQuery);

    return {
      success: true,
      data: statsResult.rows
    };
  } catch (error) {
    log.error('Feil ved henting av historiske dashboard-data:', error);
    return {
      success: false,
      error: `Kunne ikke hente historiske data: ${error.message}`
    };
  } finally {
    client.release();
  }
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

    // API endpoint - merk at reportname er nå en query parameter i stedet for i path
    const baseUrl = "portal.bmf.no";
    const path = `/CallActionset/Byggmesterforsikring/PortalApi_report_json`;

    // Token - eksakt samme som i Python-koden
    const token = "c2g0NGJZWnd5SldyM0ljZEh1RHBROFQ1VmxNNmRoYmQ=";

    // Parametre for URL query (reportname)
    const queryParams = `?reportname=${reportName}`;

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
        "Value": String(formattedStartDate)
      },
      { 
        "Name": "@ToDate", 
        "Value": String(formattedEndDate)
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
  } catch (error) {
    log.error('Feil ved henting av rapportdata:', error);
    throw new Error(`Kunne ikke hente rapportdata: ${error.message}`);
  }
}

module.exports = {
  fetchDashboardData,
  getHistoricalData,
  fetchReportData
};