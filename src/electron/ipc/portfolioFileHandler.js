const { ipcMain } = require('electron');
const portfolioFileService = require('../services/portfolioFileService');
const portefoljeanalyseService = require('../services/portefoljeanalyseService');
const electronLog = require('electron-log');

// Global abort controller for aktiv datahenting
let currentAbortController = null;

function setupPortfolioFileHandlers() {
    electronLog.info('Setter opp IPC-handlere for portfolio fil-cache...');

    // Test fil-tilganger
    ipcMain.handle('portfolio-file:test-permissions', async (event) => {
        try {
            const result = await portfolioFileService.testFilePermissions();
            electronLog.info('Fil-tilgang test:', result);
            return result;
        } catch (error) {
            electronLog.error('Feil ved test av fil-tilganger:', error);
            return { success: false, error: error.message };
        }
    });

    // Hent liste over cached perioder
    ipcMain.handle('portfolio-file:get-cached-periods', async (event) => {
        try {
            const periods = await portfolioFileService.getCachedPeriods();
            return { success: true, data: periods };
        } catch (error) {
            electronLog.error('Feil ved henting av cached perioder:', error);
            return { success: false, error: error.message };
        }
    });

    // Last porteføljedata fra fil
    ipcMain.handle('portfolio-file:load-data', async (event, { filename }) => {
        try {
            electronLog.info(`Laster porteføljedata fra fil: ${filename}`);
            const data = await portfolioFileService.loadPortfolioData(filename);

            return {
                success: true,
                data: data,
                message: `Porteføljedata lastet fra ${filename}`
            };
        } catch (error) {
            electronLog.error(`Feil ved lasting av porteföljedata fra ${filename}:`, error);
            return { success: false, error: error.message };
        }
    });

    // Hent og lagre nye porteføljedata
    ipcMain.handle('portfolio-file:fetch-and-save', async (event, { StartDate, EndDate }) => {
        // Definer abortSignal utenfor try-blokken så den er tilgjengelig i catch
        let abortSignal = null;

        try {
            electronLog.info('Starter henting og lagring av porteföljedata', { StartDate, EndDate });

            // Opprett abort controller for denne operasjonen
            currentAbortController = new AbortController();
            abortSignal = currentAbortController.signal;

            // Hvis abort kalles, send melding til frontend
            abortSignal.addEventListener('abort', () => {
                electronLog.info('⚠️ Datahenting avbrutt av bruker');
                event.sender.send('portfolio_fetch_progress', {
                    phase: 'avbrutt',
                    progress: 0,
                    message: '❌ Datahenting avbrutt av bruker'
                });
            });

            // Progress callback for å sende oppdateringer til frontend
            const progressCallback = (progressData) => {
                // Sjekk om abort er kalt
                if (abortSignal.aborted) {
                    throw new Error('ABORT');
                }
                event.sender.send('portfolio_fetch_progress', progressData);
            };

            // STEG 1: Hent porteføljedata
            const komplettData = await portefoljeanalyseService.hentKomplettPortefoljeData(
                StartDate,
                EndDate,
                progressCallback,
                abortSignal
            );

            // STEG 2: Hent skade-data for samme periode
            progressCallback({
                phase: 'skade_data_start',
                progress: 90,
                message: 'Starter henting av skadedata...'
            });

            const skadeData = await portefoljeanalyseService.hentKomplettSkadeData(StartDate, EndDate, komplettData, progressCallback, abortSignal);

            // STEG 2.5: Hent ORIGINAL skade-data (uten filtrering)
            let originalSkadeData;
            try {
                const originalSkadeFilename = `original-claims-${StartDate}-${EndDate}.json`;
                originalSkadeData = await portefoljeanalyseService.hentKomplettSkadeData(StartDate, EndDate, null, progressCallback, abortSignal); // Uten porteføljedata = ingen filtrering

                await portfolioFileService.saveDebugData(originalSkadeData, originalSkadeFilename);
                electronLog.info(`💾 Original skade-data lagret: ${originalSkadeFilename} (${originalSkadeData.SkadeDetaljer?.length || 0} skader)`);
            } catch (debugError) {
                electronLog.warn(`⚠️ Kunne ikke lagre original skade-data:`, debugError.message);
                // Fallback til filtrert data hvis original feiler
                originalSkadeData = skadeData;
            }

            // STEG 3: Merge data
            const mergedData = {
                ...komplettData,
                claimData: originalSkadeData, // Bruk ORIGINAL, ikke filtrert!
                summary: {
                    ...komplettData.summary,
                    totalClaims: originalSkadeData.TotaltAntallSkader || 0,
                    totalClaimsPaid: originalSkadeData.TotalUtbetalt || 0,
                    totalClaimsReserved: originalSkadeData.TotalReservert || 0,
                    claimDetails: originalSkadeData.SkadeDetaljer ? originalSkadeData.SkadeDetaljer.length : 0
                }
            };

            // STEG 4: Lagre merged data til fil
            progressCallback({
                phase: 'lagring',
                progress: 95,
                message: 'Lagrer porteföljedata + skade-data til lokal fil...'
            });

            const filResult = await portfolioFileService.savePortfolioData(
                mergedData,
                StartDate,
                EndDate
            );

            progressCallback({
                phase: 'ferdig',
                progress: 100,
                message: `✅ Data lagret til ${filResult.filename} (${filResult.sizeMB}MB)`,
                filResult
            });

            electronLog.info('Porteføljedata hentet og lagret:', {
                ...komplettData.summary,
                filResult
            });

            return {
                success: true,
                data: mergedData,
                filResult: filResult,
                message: `Komplett data hentet og lagret til ${filResult.filename}`
            };

        } catch (error) {
            // Hvis operasjonen ble avbrutt, returner spesiell melding
            if (error.message === 'ABORT' || abortSignal?.aborted) {
                electronLog.info('⚠️ Datahenting avbrutt av bruker');
                return {
                    success: false,
                    aborted: true,
                    error: 'Datahenting avbrutt av bruker',
                    message: 'Operasjonen ble avbrutt'
                };
            }

            electronLog.error('Feil ved henting og lagring av porteföljedata:', error);
            return {
                success: false,
                error: error.message,
                message: 'Kunne ikke hente og lagre porteföljedata'
            };
        } finally {
            // Nullstill abort controller
            currentAbortController = null;
        }
    });

    // Avbryt pågående datahenting
    ipcMain.handle('portfolio-file:abort-fetch', async (event) => {
        try {
            if (currentAbortController) {
                electronLog.info('🛑 Avbryter pågående datahenting...');
                currentAbortController.abort();
                return {
                    success: true,
                    message: 'Datahenting avbrutt'
                };
            } else {
                electronLog.info('⚠️ Ingen pågående datahenting å avbryte');
                return {
                    success: false,
                    message: 'Ingen pågående datahenting'
                };
            }
        } catch (error) {
            electronLog.error('Feil ved avbryt av datahenting:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Slett cached data
    ipcMain.handle('portfolio-file:delete-cache', async (event, { filename }) => {
        try {
            const result = await portfolioFileService.deletePortfolioCache(filename);
            return { success: true, message: result.message };
        } catch (error) {
            electronLog.error(`Feil ved sletting av cache-fil ${filename}:`, error);
            return { success: false, error: error.message };
        }
    });

    // Test skade-data for enkelt kunde
    ipcMain.handle('portfolio-file:test-claim-data', async (event, { insuredNumber }) => {
        try {
            electronLog.info(`Tester skade-data for kunde: ${insuredNumber}`);
            const result = await portefoljeanalyseService.testSkadeDataForKunde(insuredNumber);

            return {
                success: true,
                data: result,
                message: `Skade-data test for kunde ${insuredNumber} fullført`
            };
        } catch (error) {
            electronLog.error(`Feil ved test av skade-data for kunde ${insuredNumber}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Test komplett skade-rapport for periode
    ipcMain.handle('portfolio-file:test-comprehensive-claims', async (event, { startDate, endDate }) => {
        try {
            electronLog.info(`Tester komplett skaderapport for periode: ${startDate} til ${endDate}`);
            const result = await portefoljeanalyseService.testKomplettSkadeData(startDate, endDate);

            return {
                success: true,
                data: result,
                message: `Komplett skaderapport test for periode ${startDate}-${endDate} fullført`
            };
        } catch (error) {
            electronLog.error(`Feil ved test av komplett skaderapport:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    electronLog.info('✅ Portfolio fil-cache IPC-handlere satt opp');
}

module.exports = setupPortfolioFileHandlers;
