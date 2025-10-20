const { ipcMain } = require('electron');
const electronLog = require('electron-log');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Forsøk å laste inn invoiceService med bedre feilhåndtering
let invoiceService;
try {
    // Logg informasjon om miljøet og filstier
    const isDev = process.env.NODE_ENV === 'development';
    const appDir = app.getAppPath();

    electronLog.info('Miljø:', process.env.NODE_ENV);
    electronLog.info('App katalog:', appDir);
    electronLog.info('__dirname:', __dirname);

    // Absolutt sti til services mappen
    const servicesPath = path.join(appDir, 'src', 'services');
    electronLog.info('Services sti:', servicesPath);

    // Sjekk om services mappen eksisterer
    if (fs.existsSync(servicesPath)) {
        electronLog.info('Services mappe funnet på:', servicesPath);
        const files = fs.readdirSync(servicesPath);
        electronLog.info('Filer i services mappen:', files);
    } else {
        electronLog.error('Services mappe ikke funnet på:', servicesPath);
    }

    // Prøv med relativ sti først
    const relativePath = '../../services/invoiceService';
    electronLog.info('Prøver å laste invoiceService fra relativ sti:', relativePath);
    invoiceService = require(relativePath);
    electronLog.info('invoiceService lastet med relativ sti:', Object.keys(invoiceService));
} catch (error) {
    electronLog.error('Feil ved lasting med relativ sti:', error);

    try {
        // Prøv med absolutt sti som backup
        const appDir = app.getAppPath();
        const absolutePath = path.join(appDir, 'src', 'services', 'invoiceService');
        electronLog.info('Prøver å laste invoiceService fra absolutt sti:', absolutePath);
        invoiceService = require(absolutePath);
        electronLog.info('invoiceService lastet med absolutt sti:', Object.keys(invoiceService));
    } catch (secondError) {
        electronLog.error('Feil ved lasting med absolutt sti:', secondError);

        // Opprett en dummy-implementering hvis modulen ikke kan lastes
        electronLog.error('Alle forsøk på å laste invoiceService feilet, bruker dummy-versjon som kaster feil');
        invoiceService = {
            processInvoice: () => { throw new Error('invoiceService kunne ikke lastes. Se logger for detaljer.'); },
            getInvoiceById: () => { throw new Error('invoiceService kunne ikke lastes. Se logger for detaljer.'); },
            getAllInvoices: () => { throw new Error('invoiceService kunne ikke lastes. Se logger for detaljer.'); },
            saveFeedback: () => { throw new Error('invoiceService kunne ikke lastes. Se logger for detaljer.'); },
            getPdfForInvoice: () => { throw new Error('invoiceService kunne ikke lastes. Se logger for detaljer.'); },
            deleteInvoice: () => { throw new Error('invoiceService kunne ikke lastes. Se logger for detaljer.'); },
            deleteAllInvoices: () => { throw new Error('invoiceService kunne ikke lastes. Se logger for detaljer.'); }
        };
    }
}

// NY DEBUG HANDLER
ipcMain.on('debug-log-from-renderer', (event, ...args) => {
    electronLog.info('[DEBUG RENDERER]', ...args);
});

function setupInvoiceHandlers() {
    // Log at funksjonen blir kalt
    electronLog.info('setupInvoiceHandlers blir kalt');

    ipcMain.handle('invoice:upload', async (event, data) => {
        // Logg HELE mottatte data-objektet
        electronLog.info("Mottatt IPC kall 'invoice:upload' med data:", JSON.stringify(data, (key, value) => {
            // Håndter Uint8Array for logging
            if (value && value.type === 'Buffer' && Array.isArray(value.data)) {
                return `<Buffer length=${value.data.length}>`;
            }
            if (value instanceof Uint8Array) {
                return `<Uint8Array length=${value.length}>`;
            }
            // Logg andre store objekter/arrays kun med lengde
            if (Array.isArray(value) && value.length > 50) {
                return `<Array length=${value.length}>`;
            }
            if (typeof value === 'string' && value.length > 200) {
                return `<String length=${value.length}>`;
            }
            return value;
        }, 2));

        // Hent ut data fra objektet
        const { fileName, fileUint8Array, fileArray, originalSize, fileBuffer, base64Data } = data || {};

        // Valider dataene
        if (!fileName) {
            electronLog.error('Mangler filnavn i invoice:upload kallet');
            return { success: false, error: 'Filnavn må sendes med.' };
        }

        let nodeBuffer;

        // Prioriter den nye metoden (fileUint8Array)
        if (fileUint8Array) {
            // Sjekk om fileUint8Array faktisk ER en Uint8Array eller et lignende objekt
            const isActualUint8Array = fileUint8Array instanceof Uint8Array;
            const looksLikeUint8Array = typeof fileUint8Array === 'object' && fileUint8Array !== null && typeof fileUint8Array.length === 'number';

            electronLog.info(`Mottok fil som ${isActualUint8Array ? 'Uint8Array' : (looksLikeUint8Array ? 'Uint8Array-lignende objekt' : typeof fileUint8Array)} (Lengde: ${fileUint8Array.length}, original størrelse: ${originalSize} bytes)`);

            try {
                // Konverter Uint8Array (eller objektet som ligner) til Node.js Buffer
                if (isActualUint8Array) {
                    // Standard konvertering for ekte Uint8Array
                    nodeBuffer = Buffer.from(fileUint8Array.buffer, fileUint8Array.byteOffset, fileUint8Array.byteLength);
                } else if (looksLikeUint8Array) {
                    // Hvis det ser ut som Uint8Array (f.eks. etter IPC-serialisering), prøv dette
                    electronLog.warn("fileUint8Array var ikke instanceof Uint8Array, prøver å konvertere fra object keys");
                    const byteArray = Object.values(fileUint8Array);
                    nodeBuffer = Buffer.from(byteArray);
                } else {
                    electronLog.error("Mottok fileUint8Array, men det var ikke en gjenkjennelig ArrayBuffer/Uint8Array type.");
                    throw new Error('Ugyldig format på fildata mottatt.');
                }

                electronLog.info(`Konvertert mottatt fildata til Node.js Buffer: ${nodeBuffer.length} bytes`);

                // Validering av buffer
                if (nodeBuffer.length === 0 || (originalSize && nodeBuffer.length !== originalSize)) {
                    electronLog.error(`Buffer-størrelse (${nodeBuffer.length}) matcher ikke original størrelse (${originalSize}) eller er 0.`);
                    return { success: false, error: `Feil under overføring - filstørrelse stemmer ikke (${nodeBuffer.length} vs ${originalSize}).` };
                }

                if (nodeBuffer.length < 10) {
                    const bufferContent = nodeBuffer.toString('utf8');
                    electronLog.error(`Buffer for kort (${nodeBuffer.length} bytes): "${bufferContent}"`);
                    if (bufferContent === 'undefined') {
                        return { success: false, error: 'Filen ble ikke korrekt overført (fikk \"undefined\")' };
                    }
                    return { success: false, error: `Filen er for kort: ${nodeBuffer.length} bytes` };
                }

                // Sjekk at vi har en gyldig PDF-fil
                const isPdf = nodeBuffer.length > 4 &&
                    nodeBuffer[0] === 0x25 && // %
                    nodeBuffer[1] === 0x50 && // P
                    nodeBuffer[2] === 0x44 && // D
                    nodeBuffer[3] === 0x46;   // F

                if (!isPdf) {
                    electronLog.error(`Filen er ikke en gyldig PDF: ${fileName}. Første bytes: ${nodeBuffer.slice(0, 10).toString('hex')}`);
                    return { success: false, error: 'Filen er ikke en gyldig PDF.' };
                }
            } catch (bufferError) {
                electronLog.error(`Feil ved konvertering av mottatt fildata til buffer: ${bufferError.message}`);
                return { success: false, error: `Kunne ikke konvertere fildata: ${bufferError.message}` };
            }
        } else if (fileArray && Array.isArray(fileArray)) {
            // Sekundær metode: Håndter vanlig array (for bakoverkompatibilitet og test-pdf)
            electronLog.warn(`Bruker utdatert fileArray-metode for ${fileName}`);
            try {
                nodeBuffer = Buffer.from(fileArray);
                electronLog.info(`Konvertert array til Node.js Buffer: ${nodeBuffer.length} bytes`);
                // Legg inn validering her om nødvendig
                if (nodeBuffer.length < 10) {
                    throw new Error('Buffer er for kort etter array-konvertering');
                }
            } catch (bufferError) {
                electronLog.error(`Feil ved konvertering av array til buffer: ${bufferError.message}`);
                return { success: false, error: `Kunne ikke konvertere fildata: ${bufferError.message}` };
            }
        } else if (fileBuffer) {
            // Eldste metode (for legacy test)
            electronLog.warn(`Bruker eldste fileBuffer-metode for ${fileName}`);
            try {
                if (fileBuffer instanceof ArrayBuffer) {
                    nodeBuffer = Buffer.from(fileBuffer);
                } else if (fileBuffer.buffer && fileBuffer.buffer instanceof ArrayBuffer) {
                    nodeBuffer = Buffer.from(fileBuffer.buffer);
                } else {
                    nodeBuffer = Buffer.from(fileBuffer);
                }

                if (!nodeBuffer || nodeBuffer.length === 0) {
                    throw new Error('Konvertering fra fileBuffer resulterte i tom buffer');
                }
            } catch (bufferError) {
                electronLog.error(`Feil ved konvertering av fileBuffer til buffer: ${bufferError.message}`);
                return { success: false, error: `Kunne ikke konvertere fildata: ${bufferError.message}` };
            }
        } else {
            electronLog.error('Ingen gjenkjennelig fildata mottatt (fileUint8Array, fileArray eller fileBuffer)');
            return { success: false, error: 'Ingen fildata mottatt' };
        }

        electronLog.info(`Konvertert til Node.js Buffer: ${nodeBuffer.length} bytes. Første 20 bytes: ${nodeBuffer.slice(0, 20).toString('hex')}`);

        try {
            electronLog.info(`Prosessering av ${fileName} startet... (buffer: ${nodeBuffer.length} bytes)`);

            // Bruk received base64Data hvis det er oppgitt, ellers er det null og konverteres i service-laget
            const result = await invoiceService.processInvoice(fileName, nodeBuffer, base64Data);

            electronLog.info(`Prosessering av ${fileName} fullført.`);
            return { success: true, data: result };
        } catch (error) {
            electronLog.error(`Feil i IPC handler 'invoice:upload' for ${fileName}:`, error);
            return { success: false, error: error.message || 'Ukjent feil under prosessering.' };
        }
    });

    ipcMain.handle('invoice:getById', async (event, id) => {
        if (!id) {
            electronLog.error('Mangler ID i invoice:getById kallet');
            return { success: false, error: 'ID må sendes med.' };
        }

        try {
            const invoice = await invoiceService.getInvoiceById(id);
            electronLog.info(`Hentet faktura med ID: ${id}`);
            return { success: true, data: invoice };
        } catch (error) {
            electronLog.error(`Feil i IPC handler "invoice:getById" for ID ${id}:`, error);
            return { success: false, error: error.message || 'Ukjent feil under henting av faktura.' };
        }
    });

    ipcMain.handle('invoice:getAll', async (event) => {
        electronLog.info('Mottok IPC kall "invoice:getAll"');
        try {
            const invoices = await invoiceService.getAllInvoices();
            electronLog.info(`Hentet ${invoices.length} fakturaer`);
            return { success: true, data: invoices };
        } catch (error) {
            electronLog.error('Feil i IPC handler "invoice:getAll":', error);
            return { success: false, error: error.message || 'Ukjent feil under henting av fakturaer.' };
        }
    });

    ipcMain.handle('invoice:saveFeedback', async (event, { invoiceId, feedbackStatus, feedbackDetails }) => {
        electronLog.info(`Mottok IPC kall 'invoice:saveFeedback' med følgende data:`, {
            invoiceId,
            feedbackStatus,
            feedbackDetails,
            typeofInvoiceId: typeof invoiceId,
            typeofFeedbackStatus: typeof feedbackStatus
        });

        if (!invoiceId || !feedbackStatus) {
            electronLog.error('Mangler invoiceId eller feedbackStatus i invoice:saveFeedback kallet', {
                invoiceId: invoiceId || 'missing',
                feedbackStatus: feedbackStatus || 'missing'
            });
            return { success: false, error: 'Mangler nødvendig data (invoiceId, feedbackStatus).' };
        }

        try {
            electronLog.info(`Kaller invoiceService.saveFeedback med parametere:`, {
                invoiceId,
                feedbackStatus,
                feedbackDetailsLength: feedbackDetails ? feedbackDetails.length : 0
            });

            const result = await invoiceService.saveFeedback(invoiceId, feedbackStatus, feedbackDetails);

            electronLog.info(`Tilbakemelding vellykket lagret for ID: ${invoiceId}`, {
                result,
                resultId: result.id,
                resultStatus: result.feedback_status
            });

            return {
                success: true,
                data: result,
                message: `Tilbakemelding lagret for faktura ${invoiceId}`
            };
        } catch (error) {
            electronLog.error(`Feil i IPC handler 'invoice:saveFeedback' for ${invoiceId}:`, error);
            return {
                success: false,
                error: error.message || 'Ukjent feil under lagring av tilbakemelding.',
                stack: error.stack
            };
        }
    });

    // Legg til en ny handler for å hente PDF-data for en faktura
    ipcMain.handle('invoice:getPdfForInvoice', async (event, invoiceId) => {
        electronLog.info(`Mottok IPC kall 'invoice:getPdfForInvoice' for faktura ID: ${invoiceId}`);

        if (!invoiceId) {
            electronLog.error('Mangler invoice ID i invoice:getPdfForInvoice kallet');
            return { success: false, error: 'Faktura ID må sendes med.' };
        }

        try {
            const result = await invoiceService.getPdfForInvoice(invoiceId);

            if (!result || !result.pdfData) {
                throw new Error(`Ingen PDF-data funnet for faktura ID: ${invoiceId}`);
            }

            let base64Data;
            if (Buffer.isBuffer(result.pdfData)) {
                base64Data = result.pdfData.toString('base64');
                electronLog.info(`[invoiceHandler] pdfData ER en Buffer. Konvertert til base64. Sample: ${base64Data.substring(0, 60)}...`);
            } else {
                electronLog.warn(`[invoiceHandler] pdfData er IKKE en Buffer. Type: ${typeof result.pdfData}. Prøver toString direkte. Sample: ${String(result.pdfData).substring(0, 60)}...`);
                base64Data = String(result.pdfData);
            }

            electronLog.info(`PDF-data (som base64) og filnavn hentet for faktura ID: ${invoiceId}, filnavn: ${result.fileName}`);
            return {
                success: true,
                data: base64Data,
                fileName: result.fileName
            };
        } catch (error) {
            electronLog.error(`Feil i IPC handler 'invoice:getPdfForInvoice' for ID ${invoiceId}:`, error);
            return { success: false, error: error.message || 'Ukjent feil under henting av PDF.' };
        }
    });

    // Legg til en ny handler for å slette en faktura
    ipcMain.handle('invoice:delete', async (event, invoiceId) => {
        electronLog.info(`Mottok IPC kall 'invoice:delete' for faktura ID: ${invoiceId}`);

        if (!invoiceId) {
            electronLog.error('Mangler invoice ID i invoice:delete kallet');
            return { success: false, error: 'Faktura ID må sendes med.' };
        }

        try {
            const result = await invoiceService.deleteInvoice(invoiceId);
            electronLog.info(`Faktura med ID: ${invoiceId} ble slettet`);
            return {
                success: true,
                data: result,
                message: `Faktura ${invoiceId} ble slettet`
            };
        } catch (error) {
            electronLog.error(`Feil i IPC handler 'invoice:delete' for ID ${invoiceId}:`, error);
            return { success: false, error: error.message || 'Ukjent feil under sletting av faktura.' };
        }
    });

    // Legg til en ny handler for å slette alle fakturaer
    ipcMain.handle('invoice:deleteAll', async (event) => {
        electronLog.info(`Mottok IPC kall 'invoice:deleteAll'`);

        try {
            const result = await invoiceService.deleteAllInvoices();
            electronLog.info(`${result.count} fakturaer ble slettet`);
            return {
                success: true,
                data: result,
                message: `${result.count} fakturaer ble slettet`
            };
        } catch (error) {
            electronLog.error(`Feil i IPC handler 'invoice:deleteAll':`, error);
            return { success: false, error: error.message || 'Ukjent feil under sletting av fakturaer.' };
        }
    });

    // Legg til en handler for å hente gjeldende aktiv prompt
    ipcMain.handle('invoice:getPrompt', async (event, promptType) => {
        electronLog.info(`Mottok IPC kall 'invoice:getPrompt' for promptType: ${promptType}`);

        try {
            const promptText = await invoiceService.getInvoicePrompt();
            electronLog.info(`Hentet aktiv prompt av type: ${promptType}`);

            return {
                success: true,
                data: {
                    prompt_type: promptType,
                    prompt_text: promptText,
                    is_active: true
                }
            };
        } catch (error) {
            electronLog.error(`Feil i IPC handler 'invoice:getPrompt':`, error);
            return { success: false, error: error.message || 'Ukjent feil under henting av prompt.' };
        }
    });

    // Legg til en handler for å hente prompt-historikk
    ipcMain.handle('invoice:getPromptHistory', async (event, promptType) => {
        electronLog.info(`Mottok IPC kall 'invoice:getPromptHistory' for promptType: ${promptType}`);

        try {
            // Hent bruker-ID (eller bruk default admin ID=1 for utvikling)
            let userId = '1';
            try {
                const url = event.sender.getURL();
                if (url && url.includes('userId=')) {
                    userId = url.split('userId=')[1].split('&')[0];
                }
            } catch (urlError) {
                electronLog.warn('Kunne ikke hente bruker-ID fra URL:', urlError);
            }

            electronLog.info(`Henter prompt-historikk for bruker ${userId}`);
            const history = await invoiceService.getInvoicePromptHistory(userId);
            return { success: true, data: history };
        } catch (error) {
            electronLog.error(`Feil i IPC handler 'invoice:getPromptHistory':`, error);
            return { success: false, error: error.message || 'Ukjent feil under henting av prompt-historikk.' };
        }
    });

    // Legg til en handler for å lagre ny prompt
    ipcMain.handle('invoice:setPrompt', async (event, promptType, promptText) => {
        electronLog.info(`Mottok IPC kall 'invoice:setPrompt' for promptType: ${promptType}`);

        if (!promptText) {
            electronLog.error('Mangler promptText i invoice:setPrompt kallet');
            return { success: false, error: 'Prompt-tekst må sendes med.' };
        }

        try {
            // Hent bruker-ID (eller bruk default admin ID=1 for utvikling)
            let userId = '1';
            try {
                const url = event.sender.getURL();
                if (url && url.includes('userId=')) {
                    userId = url.split('userId=')[1].split('&')[0];
                }
            } catch (urlError) {
                electronLog.warn('Kunne ikke hente bruker-ID fra URL:', urlError);
            }

            electronLog.info(`Lagrer ny prompt for bruker ${userId}`);
            const result = await invoiceService.setInvoicePrompt(promptText, userId);
            return { success: true, data: result };
        } catch (error) {
            electronLog.error(`Feil i IPC handler 'invoice:setPrompt':`, error);
            return { success: false, error: error.message || 'Ukjent feil under lagring av prompt.' };
        }
    });

    // Legg til en handler for å aktivere en tidligere prompt
    ipcMain.handle('invoice:activatePrompt', async (event, promptId) => {
        electronLog.info(`Mottok IPC kall 'invoice:activatePrompt' for promptId: ${promptId}`);

        if (!promptId) {
            electronLog.error('Mangler promptId i invoice:activatePrompt kallet');
            return { success: false, error: 'Prompt ID må sendes med.' };
        }

        try {
            // Hent bruker-ID (eller bruk default admin ID=1 for utvikling)
            let userId = '1';
            try {
                const url = event.sender.getURL();
                if (url && url.includes('userId=')) {
                    userId = url.split('userId=')[1].split('&')[0];
                }
            } catch (urlError) {
                electronLog.warn('Kunne ikke hente bruker-ID fra URL:', urlError);
            }

            electronLog.info(`Aktiverer prompt ${promptId} for bruker ${userId}`);
            const result = await invoiceService.activateInvoicePrompt(promptId, userId);

            return {
                success: true,
                data: result
            };
        } catch (error) {
            electronLog.error(`Feil i IPC handler 'invoice:activatePrompt':`, error);
            return { success: false, error: error.message || 'Ukjent feil under aktivering av prompt.' };
        }
    });

    electronLog.info('Invoice IPC handlers satt opp.');
}

module.exports = setupInvoiceHandlers;