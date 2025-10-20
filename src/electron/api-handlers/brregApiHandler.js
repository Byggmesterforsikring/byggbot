const { ipcMain } = require('electron');
const brregService = require('../services/brregService');
const electronLog = require('electron-log');

function setupBrregApiHandlers() {
    electronLog.info('[BrregApiHandler] Setter opp IPC-handler for Brreg API...');

    ipcMain.handle('brreg:getEnhetInfo', async (event, orgnr) => {
        try {
            if (!orgnr || typeof orgnr !== 'string' || orgnr.trim() === '') {
                electronLog.warn('[BrregApiHandler] IPC brreg:getEnhetInfo kalt med ugyldig orgnr:', orgnr);
                throw new Error('Organisasjonsnummer er påkrevd og må være en gyldig streng.');
            }
            electronLog.info(`[BrregApiHandler] IPC brreg:getEnhetInfo kalt for orgnr: ${orgnr}`);

            const enhetData = await brregService.getEnhetByOrgnr(orgnr.trim());

            if (enhetData === null) {
                electronLog.info(`[BrregApiHandler] Ingen enhet funnet i Brreg for orgnr: ${orgnr}`);
                return { success: true, data: null, message: 'Ingen enhet funnet for det organisasjonsnummeret.' };
            }

            return { success: true, data: enhetData };

        } catch (error) {
            electronLog.error(`[BrregApiHandler] Feil i IPC handler [brreg:getEnhetInfo] for orgnr ${orgnr}:`, error);
            return { success: false, error: error.message };
        }
    });

    electronLog.info('[BrregApiHandler] IPC-handler for Brreg API er satt opp.');
}

module.exports = { setupBrregApiHandlers }; 