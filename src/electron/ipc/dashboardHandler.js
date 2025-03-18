const { ipcMain } = require('electron');
const log = require('electron-log');
const { fetchDashboardData, getHistoricalData, fetchReportData } = require('../services/dashboardService');

/**
 * Setter opp IPC-handlere for dashboard-relaterte funksjoner
 */
function setupDashboardHandlers() {
  // Handler for å hente dashboard-data
  ipcMain.handle('dashboard:getData', async (event, { reportName, params } = {}) => {
    try {
      log.info(`Henter dashboard-data for rapport: ${reportName || 'API_Byggbot_dashboard'}`);
      const data = await fetchDashboardData(reportName, params);
      return { success: true, data };
    } catch (error) {
      log.error('Feil ved håndtering av dashboard:getData:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });
  
  // Handler for å hente historiske dashboard-data
  ipcMain.handle('dashboard:getHistoricalData', async (event, { days = 30 } = {}) => {
    try {
      log.info(`Henter historiske dashboard-data for ${days} dager`);
      return await getHistoricalData(days);
    } catch (error) {
      log.error('Feil ved håndtering av dashboard:getHistoricalData:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });
  
  // Handler for å hente rapportdata
  ipcMain.handle('dashboard:fetchStats', async (event, { reportName, startDate, endDate }) => {
    try {
      if (!startDate || !endDate) {
        return { error: 'Manglende dato-parametre' };
      }
      
      log.info(`Henter rapportdata fra ${reportName} for perioden ${startDate} til ${endDate}`);
      
      const result = await fetchReportData(reportName, startDate, endDate);
      return result;
    } catch (error) {
      log.error('Feil ved håndtering av dashboard:fetchStats:', error);
      return { error: error.message };
    }
  });
}

module.exports = {
  setupDashboardHandlers
};