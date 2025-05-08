const InvoiceService = require('../../services/invoiceService');
const invoiceService = new InvoiceService();
const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const electronLog = require('electron-log');

// API handler for faktura-relaterte funksjoner
function setupInvoiceApiHandlers(ipcMain) {
    // Hjelpefunksjon for å hente bruker-ID fra forespørselen
    const getUserIdFromEvent = (event) => {
        try {
            const url = event.sender.getURL();
            if (url.includes('userId=')) {
                const userId = url.split('userId=')[1].split('&')[0];
                return userId;
            }

            // Bruk alternativ metode om nødvendig
            return '1'; // Default admin ID hvis ikke funnet
        } catch (error) {
            electronLog.warn('Feil ved henting av bruker-ID fra URL:', error);
            return '1'; // Default admin ID hvis ikke funnet
        }
    };

    // Eksisterende API-handler for opplasting av faktura
    ipcMain.handle('invoice:upload', async (event, params) => {
        try {
            // Håndter både gammelt og nytt format
            let fileName, buffer, base64Data;

            if (typeof params === 'object' && params !== null && 'fileName' in params) {
                // Nytt format: {fileName, fileUint8Array, originalSize, base64Data}
                fileName = params.fileName;
                buffer = params.fileUint8Array;
                base64Data = params.base64Data;

                electronLog.info(`Starter prosessering av faktura (nytt format): ${fileName}, ${buffer.length} bytes`);
            } else if (arguments.length >= 3) {
                // Gammelt format: (event, fileName, buffer, base64Data)
                fileName = arguments[1];
                buffer = arguments[2];
                base64Data = arguments[3];

                electronLog.info(`Starter prosessering av faktura (gammelt format): ${fileName}`);
            } else {
                throw new Error('Ugyldig parameterformat');
            }

            const result = await invoiceService.processInvoice(fileName, buffer, base64Data);
            return { success: true, data: result };
        } catch (error) {
            electronLog.error('Feil ved prosessering av faktura:', error);
            return { success: false, error: error.message };
        }
    });

    // Ny API-handler for å hente gjeldende aktiv prompt
    ipcMain.handle('invoice:getPrompt', async (event, promptType) => {
        try {
            electronLog.info(`Henter aktiv prompt av type: ${promptType}`);
            const promptText = await invoiceService.getInvoicePrompt();

            return {
                success: true,
                data: {
                    prompt_type: promptType,
                    prompt_text: promptText,
                    is_active: true
                }
            };
        } catch (error) {
            electronLog.error('Feil ved henting av prompt:', error);
            return { success: false, error: error.message };
        }
    });

    // API-handler for å hente prompt-historikk
    ipcMain.handle('invoice:getPromptHistory', async (event, promptType) => {
        try {
            // Hent bruker-ID fra session
            const userId = getUserIdFromEvent(event);

            electronLog.info(`Henter prompt-historikk av type ${promptType} for bruker ${userId}`);
            const history = await invoiceService.getInvoicePromptHistory(userId);
            return { success: true, data: history };
        } catch (error) {
            electronLog.error('Feil ved henting av prompt-historikk:', error);
            return { success: false, error: error.message };
        }
    });

    // API-handler for å lagre ny prompt
    ipcMain.handle('invoice:setPrompt', async (event, promptType, promptText) => {
        try {
            // Hent bruker-ID fra session
            const userId = getUserIdFromEvent(event);

            electronLog.info(`Lagrer ny prompt av type ${promptType} fra bruker ${userId}`);
            const result = await invoiceService.setInvoicePrompt(promptText, userId);
            return { success: true, data: result };
        } catch (error) {
            electronLog.error('Feil ved lagring av prompt:', error);
            return { success: false, error: error.message };
        }
    });

    // API-handler for å aktivere en tidligere prompt
    ipcMain.handle('invoice:activatePrompt', async (event, promptId) => {
        try {
            // Hent bruker-ID fra session
            const userId = getUserIdFromEvent(event);

            electronLog.info(`Aktiverer prompt ${promptId} av bruker ${userId}`);

            // Dette er en spesiell versjon som aktiverer en eksisterende prompt
            // Vi må først hente prompt-teksten fra databasen basert på ID
            const dbClient = await invoiceService.pool.connect();
            try {
                await dbClient.query('BEGIN');

                // Sjekk om brukeren er admin
                const userResult = await dbClient.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
                if (userResult.rows.length === 0 || !userResult.rows[0].is_admin) {
                    throw new Error('Kun administratorer kan aktivere system-prompter');
                }

                // Hent prompt-teksten
                const promptResult = await dbClient.query(
                    'SELECT prompt_type, prompt_text FROM system_prompts WHERE id = $1',
                    [promptId]
                );

                if (promptResult.rows.length === 0) {
                    throw new Error('Prompt ikke funnet');
                }

                const { prompt_type, prompt_text } = promptResult.rows[0];

                // Deaktiver alle prompter av denne typen
                await dbClient.query(
                    'UPDATE system_prompts SET is_active = false WHERE prompt_type = $1',
                    [prompt_type]
                );

                // Aktiver den valgte prompten
                await dbClient.query(
                    'UPDATE system_prompts SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                    [promptId]
                );

                await dbClient.query('COMMIT');

                return {
                    success: true,
                    data: { id: promptId, prompt_type, is_active: true }
                };

            } catch (error) {
                await dbClient.query('ROLLBACK');
                throw error;
            } finally {
                dbClient.release();
            }

        } catch (error) {
            electronLog.error('Feil ved aktivering av prompt:', error);
            return { success: false, error: error.message };
        }
    });

    // ... eksisterende kode ...
}

module.exports = setupInvoiceApiHandlers; 