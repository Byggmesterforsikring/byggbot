const { ipcMain } = require('electron');
const portefoljeanalyseService = require('../services/portefoljeanalyseService.js');
const electronLog = require('electron-log');

function setupPortefoljeanalyseHandlers() {
    electronLog.info('Setter opp IPC-handlere for nytt Porteføljeanalyse API...');

    // Porteføljeanalyse ViewDate-basert API
    ipcMain.handle('API_Byggbot_giverrapport_viewdate', async (event, { StartDate, EndDate }) => {
        try {
            electronLog.info('IPC API_Byggbot_giverrapport_viewdate kalt', { StartDate, EndDate });

            if (!StartDate || !EndDate) {
                throw new Error('StartDate og EndDate er påkrevd for porteføljeanalyse');
            }

            const portefoljeData = await portefoljeanalyseService.hentGiverrapportViewDate(StartDate, EndDate);

            electronLog.info('Porteføljeanalyse data hentet suksessfullt:', {
                hasData: !!portefoljeData,
                dataCount: Array.isArray(portefoljeData) ? portefoljeData.length : 'ikke array'
            });

            return {
                success: true,
                data: portefoljeData,
                message: `Porteføljedata hentet for periode ${StartDate} til ${EndDate}`
            };

        } catch (error) {
            electronLog.error('Feil i IPC handler [API_Byggbot_giverrapport_viewdate]:', error);
            return {
                success: false,
                error: error.message,
                message: 'Kunne ikke hente porteföljedata'
            };
        }
    });

    // Komplett porteføljeanalyse med 2-stegs API
    ipcMain.handle('API_Byggbot_komplett_portefolje', async (event, { StartDate, EndDate }) => {
        try {
            electronLog.info('IPC API_Byggbot_komplett_portefolje kalt', { StartDate, EndDate });

            if (!StartDate || !EndDate) {
                throw new Error('StartDate og EndDate er påkrevd for komplett porteføljeanalyse');
            }

            // Progress callback for å sende oppdateringer til frontend
            const progressCallback = (progressData) => {
                event.sender.send('portefolje_progress', progressData);
            };

            const komplettData = await portefoljeanalyseService.hentKomplettPortefoljeData(
                StartDate,
                EndDate,
                progressCallback
            );

            electronLog.info('Komplett porteföljeanalyse fullført:', {
                totalCustomers: komplettData.summary.totalCustomers,
                totalPolicies: komplettData.summary.totalPolicies,
                totalCovers: komplettData.summary.totalCovers
            });

            return {
                success: true,
                data: komplettData,
                message: `Komplett porteföljedata hentet: ${komplettData.summary.totalCustomers} kunder`
            };

        } catch (error) {
            electronLog.error('Feil i IPC handler [API_Byggbot_komplett_portefolje]:', error);
            return {
                success: false,
                error: error.message,
                message: 'Kunne ikke hente komplett porteföljedata'
            };
        }
    });

    electronLog.info('✅ Porteføljeanalyse IPC-handlere satt opp (ViewDate-basert + Komplett)');
}

module.exports = setupPortefoljeanalyseHandlers;

