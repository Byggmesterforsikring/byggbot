const { ipcMain } = require('electron');
const drawingRulesService = require('../services/drawingRulesService');
const electronLog = require('electron-log');

function setupDrawingRulesHandlers() {
    // Hent alle tegningsregler
    ipcMain.handle('get-drawing-rules', async () => {
        try {
            return await drawingRulesService.getAllRules();
        } catch (error) {
            electronLog.error('Feil ved henting av tegningsregler:', error);
            throw error;
        }
    });

    // Hent spesifikk tegningsregel
    ipcMain.handle('get-drawing-rule', async (event, { slug, version }) => {
        try {
            return await drawingRulesService.getRuleBySlug(slug, version);
        } catch (error) {
            electronLog.error('Feil ved henting av tegningsregel:', error);
            throw error;
        }
    });

    // Opprett ny tegningsregel
    ipcMain.handle('create-drawing-rule', async (event, { title, content, userId }) => {
        try {
            electronLog.info('Oppretter ny tegningsregel med brukerId:', userId);
            return await drawingRulesService.createRule(title, content, userId);
        } catch (error) {
            electronLog.error('Feil ved opprettelse av tegningsregel:', error);
            throw error;
        }
    });

    // Oppdater tegningsregel
    ipcMain.handle('update-drawing-rule', async (event, { slug, title, content, userId }) => {
        try {
            electronLog.info('Oppdaterer tegningsregel med brukerId:', userId);
            return await drawingRulesService.updateRule(slug, title, content, userId);
        } catch (error) {
            electronLog.error('Feil ved oppdatering av tegningsregel:', error);
            throw error;
        }
    });

    // Hent versjonshistorikk
    ipcMain.handle('get-drawing-rule-versions', async (event, { slug }) => {
        try {
            return await drawingRulesService.getRuleVersions(slug);
        } catch (error) {
            electronLog.error('Feil ved henting av versjonshistorikk:', error);
            throw error;
        }
    });

    // Lagre bilde
    ipcMain.handle('save-drawing-rule-image', async (event, { ruleVersionId, filename, fileData, mimeType, userId }) => {
        try {
            return await drawingRulesService.saveImage(ruleVersionId, filename, fileData, mimeType, userId);
        } catch (error) {
            electronLog.error('Feil ved lagring av bilde:', error);
            throw error;
        }
    });

    // Hent bilde
    ipcMain.handle('get-drawing-rule-image', async (event, { imageId }) => {
        try {
            return await drawingRulesService.getImage(imageId);
        } catch (error) {
            electronLog.error('Feil ved henting av bilde:', error);
            throw error;
        }
    });

    // Slett tegningsregel
    ipcMain.handle('delete-drawing-rule', async (event, { slug }) => {
        try {
            return await drawingRulesService.deleteRule(slug);
        } catch (error) {
            electronLog.error('Feil ved sletting av tegningsregel:', error);
            throw error;
        }
    });
}

module.exports = setupDrawingRulesHandlers; 