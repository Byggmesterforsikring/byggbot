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
        try {
          const parsedData = JSON.parse(responseBody);
          resolve(parsedData);
        } catch (e) {
          reject(new Error(`Parsing error: ${e.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
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

module.exports = {
  fetchDashboardData,
  getHistoricalData
};