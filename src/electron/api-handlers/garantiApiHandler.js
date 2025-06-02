const { ipcMain } = require('electron');
const garantiService = require('../services/garantiService'); // CommonJS import (default export)
const electronLog = require('electron-log');

// Hjelpefunksjon for å hente bruker-ID (tilpass etter hvordan dere gjør dette)
// Dette er bare et eksempel; dere har kanskje en bedre måte å få tak i innlogget bruker.
const getUserIdFromEvent = (event) => {
    try {
        // Forsøk å hente fra en autentiseringskontekst eller lignende hvis dere har det
        // For eksempel, hvis brukerinfo er lagret globalt eller sendes med fra renderer:
        // if (event.sender.userInfo && event.sender.userInfo.id) return event.sender.userInfo.id;

        // En veldig enkel fallback (IKKE anbefalt for produksjon uten skikkelig auth)
        // Du må implementere en robust måte å identifisere brukeren som gjør kallet.
        // For nå, la oss anta at renderer sender med userId i params der det trengs.
        return null;
    } catch (error) {
        electronLog.warn('Kunne ikke hente bruker-ID fra event:', error);
        return null; // Eller kast en feil
    }
};

function setupGarantiApiHandlers() {
    electronLog.info('Setter opp IPC-handlere for GarantiAPI...');

    ipcMain.handle('garanti:createSak', async (event, params) => {
        // Forventer params: { requestData: { ...komplett data for selskap og prosjekt... }, opprettetAvBrukerId_UserV2: ... (valgfri) }
        try {
            const { requestData } = params;
            const brukerId = params.opprettetAvBrukerId_UserV2 || getUserIdFromEvent(event) || 1; // BrukerID håndtering som før

            if (!requestData || typeof requestData !== 'object' || Object.keys(requestData).length === 0) {
                throw new Error('Parameter `requestData` (objekt) er påkrevd.');
            }

            electronLog.info('IPC garanti:createSak (ny flyt) kalt med requestData:', requestData, 'BrukerId:', brukerId);
            const nyttProsjektMedSelskap = await garantiService.handleNewGuaranteeRequest(requestData, brukerId);
            return { success: true, data: nyttProsjektMedSelskap }; // Returnerer det nye prosjektet (som inkluderer selskap)
        } catch (error) {
            electronLog.error('Feil i IPC handler [garanti:createSak (ny flyt)]:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('garanti:uploadDokument', async (event, params) => {
        try {
            const { entityContext, filData, dokumentType, opplastetAvBrukerId } = params;

            if (!entityContext || !entityContext.id || !entityContext.type) {
                throw new Error('entityContext (med type og id) er påkrevd for dokumentopplasting.');
            }
            if (!['sak', 'selskap', 'prosjekt'].includes(entityContext.type)) {
                throw new Error('Ugyldig entityContext.type for dokumentopplasting.');
            }
            if (!filData || !filData.originaltFilnavn || !filData.buffer) {
                throw new Error('filData (med originaltFilnavn og buffer) er påkrevd.');
            }
            if (!dokumentType) {
                throw new Error('dokumentType er påkrevd.');
            }

            let filBuffer;
            if (filData.buffer instanceof ArrayBuffer) {
                filBuffer = Buffer.from(filData.buffer);
            } else if (filData.buffer instanceof Uint8Array) {
                filBuffer = Buffer.from(filData.buffer);
            } else if (filData.buffer && typeof filData.buffer === 'object' && filData.buffer.type === 'Buffer' && Array.isArray(filData.buffer.data)) {
                filBuffer = Buffer.from(filData.buffer.data);
            } else {
                electronLog.error('Ugyldig format på filData.buffer mottatt');
                throw new Error('Mottok filbuffer i ukjent format.');
            }
            if (!filBuffer || filBuffer.length === 0) {
                throw new Error('Filbuffer er tom eller ugyldig etter konvertering.');
            }

            const brukerId = opplastetAvBrukerId || getUserIdFromEvent(event) || 1;

            electronLog.info(`IPC garanti:uploadDokument kalt for ${entityContext.type} ID: ${entityContext.id}, fil: ${filData.originaltFilnavn}, type: ${dokumentType}, bruker: ${brukerId}`);
            const resultat = await garantiService.uploadDokument(
                entityContext,
                filBuffer,
                filData.originaltFilnavn,
                dokumentType,
                brukerId
            );
            return { success: true, data: resultat };
        } catch (error) {
            electronLog.error('Feil i IPC handler [garanti:uploadDokument]:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('garanti:getProsjekter', async (event, filterParams) => {
        try {
            electronLog.info('IPC garanti:getProsjekter kalt med filter:', filterParams);
            const prosjekter = await garantiService.getProsjekter(filterParams || {});
            return { success: true, data: prosjekter };
        } catch (error) {
            electronLog.error('Feil i IPC handler [garanti:getProsjekter]:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('garanti:getSelskapById', async (event, selskapId) => {
        try {
            if (!selskapId) throw new Error('Selskaps-ID er påkrevd i IPC-kallet.');
            electronLog.info(`IPC garanti:getSelskapById kalt for ID: ${selskapId}`);
            const selskap = await garantiService.getSelskapById(selskapId);
            return { success: true, data: selskap };
        } catch (error) {
            electronLog.error(`Feil i IPC handler [garanti:getSelskapById] for ID ${selskapId}:`, error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('garanti:getProsjektById', async (event, prosjektId) => {
        try {
            if (!prosjektId) throw new Error('Prosjekt-ID er påkrevd i IPC-kallet.');
            electronLog.info(`IPC garanti:getProsjektById kalt for ID: ${prosjektId}`);
            const prosjekt = await garantiService.getProsjektById(prosjektId);
            return { success: true, data: prosjekt };
        } catch (error) {
            electronLog.error(`Feil i IPC handler [garanti:getProsjektById] for ID ${prosjektId}:`, error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('garanti:getUsersV2', async (event, filterParams) => {
        try {
            electronLog.info('IPC garanti:getUsersV2 kalt med filter:', filterParams);
            const users = await garantiService.getUsersV2(filterParams);
            return { success: true, data: users };
        } catch (error) {
            electronLog.error('Feil i IPC handler [garanti:getUsersV2]:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('garanti:getDokumentSasUrl', async (event, params) => {
        try {
            const { containerName, blobName } = params;
            if (!containerName || !blobName) {
                electronLog.error('IPC garanti:getDokumentSasUrl - mangler containerName eller blobName', params);
                throw new Error("Container- og blob-navn er påkrevd for å hente dokument-URL.");
            }
            electronLog.info(`IPC garanti:getDokumentSasUrl kalt for: ${containerName}/${blobName}`);
            const sasUrl = await garantiService.generateSasTokenUrl(containerName, blobName);
            return { success: true, data: sasUrl };
        } catch (error) {
            electronLog.error('Feil i IPC handler [garanti:getDokumentSasUrl]:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('garanti:addInternKommentar', async (event, params) => {
        try {
            const { entityContext, kommentarTekst } = params;
            const faktiskBrukerId = params.brukerId_UserV2 || getUserIdFromEvent(event) || 1;

            if (!entityContext || !entityContext.id || !entityContext.type) {
                throw new Error('entityContext (med type og id) er påkrevd for å legge til kommentar.');
            }
            if (!['sak', 'selskap', 'prosjekt'].includes(entityContext.type)) {
                throw new Error('Ugyldig entityContext.type for å legge til kommentar.');
            }
            if (!kommentarTekst) {
                throw new Error("Kommentartekst er påkrevd.");
            }

            electronLog.info(`IPC garanti:addInternKommentar kalt for ${entityContext.type} ID: ${entityContext.id} av bruker: ${faktiskBrukerId}`);
            const resultat = await garantiService.addInternKommentar(entityContext, kommentarTekst, faktiskBrukerId);
            return { success: true, data: resultat };
        } catch (error) {
            electronLog.error('Feil i IPC handler [garanti:addInternKommentar]:', error);
            return { success: false, error: error.message };
        }
    });

    // NY HANDLER for findSelskap
    ipcMain.handle('garanti:findSelskap', async (event, searchTerm) => {
        try {
            // searchTerm sendes direkte fra klienten
            if (typeof searchTerm !== 'string') {
                // Selv om service-laget håndterer tom string, er det greit med en sjekk her også.
                throw new Error('Søketerm må være en streng.');
            }
            electronLog.info(`IPC garanti:findSelskap kalt med searchTerm: "${searchTerm}"`);
            const selskaper = await garantiService.findSelskap(searchTerm);
            return { success: true, data: selskaper };
        } catch (error) {
            electronLog.error(`Feil i IPC handler [garanti:findSelskap] for searchTerm "${searchTerm}":`, error);
            return { success: false, error: error.message };
        }
    });

    // NY HANDLER for createSelskap
    ipcMain.handle('garanti:createSelskap', async (event, params) => {
        // params forventes å inneholde: { selskapData: { ... }, opprettetAvBrukerId_UserV2: ... (valgfri) }
        try {
            const { selskapData } = params;
            const brukerId = params.opprettetAvBrukerId_UserV2 || getUserIdFromEvent(event) || 1; // BrukerID håndtering

            if (!selskapData || typeof selskapData !== 'object' || Object.keys(selskapData).length === 0) {
                throw new Error('Selskapsdata (selskapData) er påkrevd og må være et objekt.');
            }
            // Service-laget validerer selve innholdet i selskapData (orgnr, navn etc)

            electronLog.info('IPC garanti:createSelskap kalt med selskapData:', selskapData, 'BrukerId:', brukerId);
            const nyttSelskap = await garantiService.createSelskap(selskapData, brukerId);
            return { success: true, data: nyttSelskap };
        } catch (error) {
            electronLog.error('Feil i IPC handler [garanti:createSelskap]:', error);
            return { success: false, error: error.message };
        }
    });

    // NY HANDLER for updateSelskap
    ipcMain.handle('garanti:updateSelskap', async (event, params) => {
        // params: { selskapId, dataToUpdate, endretAvBrukerId_UserV2 (valgfri) }
        try {
            const { selskapId, dataToUpdate } = params;
            const brukerId = params.endretAvBrukerId_UserV2 || getUserIdFromEvent(event) || 1;

            if (!selskapId || !dataToUpdate || typeof dataToUpdate !== 'object' || Object.keys(dataToUpdate).length === 0) {
                throw new Error('Selskaps-ID og dataToUpdate (objekt) er påkrevd for å oppdatere selskap.');
            }

            electronLog.info(`IPC garanti:updateSelskap kalt for selskapId: ${selskapId}, data:`, dataToUpdate, 'BrukerId:', brukerId);
            const oppdatertSelskap = await garantiService.updateSelskap(selskapId, dataToUpdate, brukerId);
            return { success: true, data: oppdatertSelskap };
        } catch (error) {
            electronLog.error('Feil i IPC handler [garanti:updateSelskap]:', error);
            return { success: false, error: error.message };
        }
    });

    // NY HANDLER for createProsjekt
    ipcMain.handle('garanti:createProsjekt', async (event, params) => {
        // params: { prosjektData, selskapId, opprettetAvBrukerId_UserV2 (valgfri) }
        try {
            const { prosjektData, selskapId } = params;
            const brukerId = params.opprettetAvBrukerId_UserV2 || getUserIdFromEvent(event) || 1;

            if (!prosjektData || typeof prosjektData !== 'object' || !selskapId) {
                throw new Error('Prosjektdata (objekt) og Selskaps-ID er påkrevd for å opprette prosjekt.');
            }

            electronLog.info(`IPC garanti:createProsjekt kalt for selskapId: ${selskapId}, prosjektData:`, prosjektData, 'BrukerId:', brukerId);
            const nyttProsjekt = await garantiService.createProsjekt(prosjektData, selskapId, brukerId);
            return { success: true, data: nyttProsjekt };
        } catch (error) {
            electronLog.error('Feil i IPC handler [garanti:createProsjekt]:', error);
            return { success: false, error: error.message };
        }
    });

    // NY HANDLER for updateProsjekt
    ipcMain.handle('garanti:updateProsjekt', async (event, params) => {
        // params: { prosjektId, dataToUpdate, endretAvBrukerId_UserV2 (valgfri) }
        try {
            const { prosjektId, dataToUpdate } = params;
            const brukerId = params.endretAvBrukerId_UserV2 || getUserIdFromEvent(event) || 1;

            if (!prosjektId || !dataToUpdate || typeof dataToUpdate !== 'object' || Object.keys(dataToUpdate).length === 0) {
                throw new Error('Prosjekt-ID og dataToUpdate (objekt) er påkrevd for å oppdatere prosjekt.');
            }

            electronLog.info(`IPC garanti:updateProsjekt kalt for prosjektId: ${prosjektId}, data:`, dataToUpdate, 'BrukerId:', brukerId);
            const oppdatertProsjekt = await garantiService.updateProsjekt(prosjektId, dataToUpdate, brukerId);
            return { success: true, data: oppdatertProsjekt };
        } catch (error) {
            electronLog.error('Feil i IPC handler [garanti:updateProsjekt]:', error);
            return { success: false, error: error.message };
        }
    });

    // NY HANDLER for getSelskaper
    ipcMain.handle('garanti:getSelskaper', async (event, filterParams) => {
        try {
            electronLog.info('IPC garanti:getSelskaper kalt med filter:', filterParams);
            // Send filterParams (eller et tomt objekt hvis undefined) til service-laget
            const selskaper = await garantiService.getSelskaper(filterParams || {});
            return { success: true, data: selskaper };
        } catch (error) {
            electronLog.error('Feil i IPC handler [garanti:getSelskaper]:', error);
            return { success: false, error: error.message };
        }
    });

    electronLog.info('IPC-handlere for GarantiAPI er satt opp.');
}

module.exports = { setupGarantiApiHandlers }; 