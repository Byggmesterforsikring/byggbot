const { ipcMain } = require('electron');
const electronLog = require('electron-log');
const invoiceService = require('../../services/invoiceService');

function setupInvoiceHandlers() {
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
        const { fileName, fileUint8Array, fileArray, originalSize, fileBuffer } = data || {};

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

            // Bruk Mistral OCR direkte
            const result = await invoiceService.processInvoice(fileName, nodeBuffer);

            electronLog.info(`Prosessering av ${fileName} fullført.`);
            return { success: true, data: result };
        } catch (error) {
            electronLog.error(`Feil i IPC handler 'invoice:upload' for ${fileName}:`, error);
            return { success: false, error: error.message || 'Ukjent feil under prosessering.' };
        }
    });

    // TODO: Legg til handlers for getInvoiceById, getAllInvoices, saveFeedback
    ipcMain.handle('invoice:getById', async (event, id) => {
        // ... implementasjon med kall til invoiceService.getInvoiceById ...
    });

    ipcMain.handle('invoice:getAll', async (event) => {
        // ... implementasjon med kall til invoiceService.getAllInvoices ...
    });

    ipcMain.handle('invoice:saveFeedback', async (event, { invoiceId, feedbackStatus, feedbackDetails }) => {
        electronLog.info(`Mottok IPC kall 'invoice:saveFeedback' for ID: ${invoiceId}`, { feedbackStatus, hasDetails: !!feedbackDetails });
        if (!invoiceId || !feedbackStatus) {
            electronLog.error('Mangler invoiceId eller feedbackStatus i invoice:saveFeedback kallet');
            return { success: false, error: 'Mangler nødvendig data (invoiceId, feedbackStatus).' };
        }

        try {
            const result = await invoiceService.saveFeedback(invoiceId, feedbackStatus, feedbackDetails);
            electronLog.info(`Tilbakemelding lagret via IPC for ID: ${invoiceId}`);
            return { success: true, data: result };
        } catch (error) {
            electronLog.error(`Feil i IPC handler 'invoice:saveFeedback' for ${invoiceId}:`, error);
            return { success: false, error: error.message || 'Ukjent feil under lagring av tilbakemelding.' };
        }
    });

    electronLog.info('Invoice IPC handlers satt opp.');
}

module.exports = setupInvoiceHandlers;