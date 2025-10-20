const { ipcMain } = require('electron');
const menuAccessService = require('../services/menuAccessService');
const electronLog = require('electron-log');

function setupMenuAccessHandlers() {
    electronLog.info('Setter opp IPC-handlere for Menu Access...');

    // Hent alle menytilgangsinnstillinger
    ipcMain.handle('menu-access:getSettings', async (event) => {
        try {
            electronLog.info('IPC menu-access:getSettings kalt');
            const settings = await menuAccessService.getMenuAccessSettings();
            return { success: true, data: settings };
        } catch (error) {
            electronLog.error('Feil i IPC handler [menu-access:getSettings]:', error);
            return { success: false, error: error.message };
        }
    });

    // Lagre menytilgangsinnstillinger
    ipcMain.handle('menu-access:saveSettings', async (event, items) => {
        try {
            electronLog.info('IPC menu-access:saveSettings kalt med', items?.length, 'elementer');
            if (!items || !Array.isArray(items)) {
                throw new Error('Items må være en array');
            }
            const result = await menuAccessService.saveMenuAccessSettings(items);
            return { success: result };
        } catch (error) {
            electronLog.error('Feil i IPC handler [menu-access:saveSettings]:', error);
            return { success: false, error: error.message };
        }
    });

    // Reset menytilgangsinnstillinger til standardverdier
    ipcMain.handle('menu-access:resetSettings', async (event) => {
        try {
            electronLog.info('IPC menu-access:resetSettings kalt');
            const result = await menuAccessService.resetMenuAccessSettings();
            return { success: result };
        } catch (error) {
            electronLog.error('Feil i IPC handler [menu-access:resetSettings]:', error);
            return { success: false, error: error.message };
        }
    });

    electronLog.info('Menu Access IPC-handlere satt opp');
}

module.exports = { setupMenuAccessHandlers };





