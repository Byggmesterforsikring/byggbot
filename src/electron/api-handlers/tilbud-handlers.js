const { ipcMain } = require('electron');
const tilbudService = require('../services/tilbud-service');
const electronLog = require('electron-log');

// Hjelpefunksjon for å serialisere Decimal-objekter til strenger
const serializeDecimalData = (obj) => {
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Håndter primitive typer
    if (typeof obj !== 'object') {
        return obj;
    }

    // Håndter Date objekter
    if (obj instanceof Date) {
        return obj;
    }

    // Håndter arrays
    if (Array.isArray(obj)) {
        return obj.map(serializeDecimalData);
    }

    // Sjekk om det er et Decimal-objekt (Prisma)
    if (obj.constructor && (obj.constructor.name === 'Decimal' || obj.constructor.name === 'PrismaDecimal')) {
        return obj.toString();
    }

    // Spesiell håndtering for objekt med toFixed metode (kan være Decimal-lignende)
    if (typeof obj.toFixed === 'function' && typeof obj.toString === 'function') {
        try {
            return obj.toString();
        } catch (e) {
            // Fallback hvis toString feiler
        }
    }

    // Serialiser alle objektets properties dypt
    const serialized = {};
    for (const [key, value] of Object.entries(obj)) {
        try {
            if (value === null || value === undefined) {
                serialized[key] = value;
            } else if (typeof value === 'object') {
                // Sjekk om det er et Decimal først
                if (value.constructor && (value.constructor.name === 'Decimal' || value.constructor.name === 'PrismaDecimal')) {
                    serialized[key] = value.toString();
                } else if (value instanceof Date) {
                    serialized[key] = value;
                } else if (Array.isArray(value)) {
                    serialized[key] = value.map(serializeDecimalData);
                } else if (typeof value.toFixed === 'function' && typeof value.toString === 'function') {
                    // Potensielt et Decimal-lignende objekt
                    serialized[key] = value.toString();
                } else {
                    // Rekursivt serialiser nestede objekter
                    serialized[key] = serializeDecimalData(value);
                }
            } else {
                serialized[key] = value;
            }
        } catch (error) {
            electronLog.warn(`Feil ved serialisering av felt '${key}':`, error);
            // Fallback til original verdi hvis serialisering feiler
            serialized[key] = value;
        }
    }

    return serialized;
};

// Backup serialiseringsfunksjon som bruker JSON.stringify med replacer
const jsonSerializeDecimalData = (obj) => {
    try {
        // Bruk JSON.stringify med en replacer-funksjon som konverterer Decimal objekter
        const jsonString = JSON.stringify(obj, (key, value) => {
            // Håndter Decimal objekter
            if (value && typeof value === 'object' && value.constructor) {
                if (value.constructor.name === 'Decimal' || value.constructor.name === 'PrismaDecimal') {
                    return value.toString();
                }
                // Håndter objekter med toFixed metode (potensielle Decimal-lignende objekter)
                if (typeof value.toFixed === 'function' && typeof value.toString === 'function') {
                    try {
                        return value.toString();
                    } catch (e) {
                        return value;
                    }
                }
            }
            return value;
        });

        // Parse tilbake til objekt
        return JSON.parse(jsonString);
    } catch (error) {
        electronLog.error('Feil ved JSON-serialisering:', error);
        // Fallback til original serialiseringsfunksjon
        return serializeDecimalData(obj);
    }
};

// Hjelpefunksjon for å hente bruker-ID (samme som i garantiApiHandler)
const getUserIdFromEvent = (event) => {
    try {
        // For nå returnerer vi null og bruker fallback i selve handleren
        return null;
    } catch (error) {
        electronLog.warn('Kunne ikke hente bruker-ID fra event:', error);
        return null;
    }
};

function setupTilbudApiHandlers() {
    electronLog.info('Setter opp IPC-handlere for Tilbud API...');

    // TILBUD CRUD OPERASJONER

    // Opprett tilbud (kun ett tilbud per prosjekt)
    ipcMain.handle('tilbud:createTilbud', async (event, params) => {
        try {
            const { prosjektId, tilbudData } = params;
            const brukerId = params.opprettetAvBrukerId || getUserIdFromEvent(event) || 1;

            if (!prosjektId) {
                throw new Error('Prosjekt-ID er påkrevd for å opprette tilbud.');
            }
            if (!tilbudData || typeof tilbudData !== 'object') {
                throw new Error('Tilbudsdata er påkrevd og må være et objekt.');
            }

            electronLog.info(`IPC tilbud:createTilbud kalt for prosjektId: ${prosjektId}`, tilbudData);
            const nyttTilbud = await tilbudService.createTilbud(prosjektId, tilbudData, brukerId);
            const serializedTilbud = jsonSerializeDecimalData(nyttTilbud);
            return { success: true, data: serializedTilbud };
        } catch (error) {
            electronLog.error('Feil i IPC handler [tilbud:createTilbud]:', error);
            return { success: false, error: error.message };
        }
    });

    // Hent tilbud for prosjekt (1:1 relasjon)
    ipcMain.handle('tilbud:getTilbudByProsjektId', async (event, prosjektId) => {
        try {
            if (!prosjektId) {
                throw new Error('Prosjekt-ID er påkrevd for å hente tilbud.');
            }

            electronLog.info(`IPC tilbud:getTilbudByProsjektId kalt for prosjektId: ${prosjektId}`);
            const tilbud = await tilbudService.getTilbudByProsjektId(prosjektId);

            // Serialiser data før retur for å håndtere Decimal-objekter
            const serializedTilbud = jsonSerializeDecimalData(tilbud);

            electronLog.info(`Tilbud hentet og Decimal-felter konvertert for prosjekt ${prosjektId}`);
            return { success: true, data: serializedTilbud };
        } catch (error) {
            electronLog.error(`Feil i IPC handler [tilbud:getTilbudByProsjektId] for prosjektId ${prosjektId}:`, error);
            return { success: false, error: error.message };
        }
    });

    // Oppdater tilbud
    ipcMain.handle('tilbud:updateTilbud', async (event, params) => {
        try {
            const { tilbudId, dataToUpdate } = params;
            const brukerId = params.endretAvBrukerId || getUserIdFromEvent(event) || 1;

            if (!tilbudId) {
                throw new Error('Tilbud-ID er påkrevd for å oppdatere tilbud.');
            }
            if (!dataToUpdate || typeof dataToUpdate !== 'object' || Object.keys(dataToUpdate).length === 0) {
                throw new Error('DataToUpdate er påkrevd og må være et objekt med innhold.');
            }

            electronLog.info(`IPC tilbud:updateTilbud kalt for tilbudId: ${tilbudId}`, dataToUpdate);
            const oppdatertTilbud = await tilbudService.updateTilbud(tilbudId, dataToUpdate, brukerId);
            const serializedTilbud = jsonSerializeDecimalData(oppdatertTilbud);
            return { success: true, data: serializedTilbud };
        } catch (error) {
            electronLog.error('Feil i IPC handler [tilbud:updateTilbud]:', error);
            return { success: false, error: error.message };
        }
    });

    // Slett tilbud
    ipcMain.handle('tilbud:deleteTilbud', async (event, tilbudId) => {
        try {
            if (!tilbudId) {
                throw new Error('Tilbud-ID er påkrevd for å slette tilbud.');
            }

            electronLog.info(`IPC tilbud:deleteTilbud kalt for tilbudId: ${tilbudId}`);
            await tilbudService.deleteTilbud(tilbudId);
            return { success: true };
        } catch (error) {
            electronLog.error(`Feil i IPC handler [tilbud:deleteTilbud] for tilbudId ${tilbudId}:`, error);
            return { success: false, error: error.message };
        }
    });

    // TILBUDSBEREGNING OPERASJONER

    // Opprett eller oppdater beregning
    ipcMain.handle('tilbud:saveBeregning', async (event, params) => {
        try {
            const { tilbudId, beregningData } = params;

            if (!tilbudId) {
                throw new Error('Tilbud-ID er påkrevd for å lagre beregning.');
            }
            if (!beregningData || typeof beregningData !== 'object') {
                throw new Error('Beregningsdata er påkrevd og må være et objekt.');
            }

            electronLog.info(`IPC tilbud:saveBeregning kalt for tilbudId: ${tilbudId}`, beregningData);
            const beregning = await tilbudService.saveBeregning(tilbudId, beregningData);
            const serializedBeregning = jsonSerializeDecimalData(beregning);
            return { success: true, data: serializedBeregning };
        } catch (error) {
            electronLog.error('Feil i IPC handler [tilbud:saveBeregning]:', error);
            return { success: false, error: error.message };
        }
    });

    // Automatisk beregning av premie
    ipcMain.handle('tilbud:beregnPremie', async (event, params) => {
        try {
            const { produkttype, beregningParams } = params;

            if (!produkttype) {
                throw new Error('Produkttype er påkrevd for automatisk beregning.');
            }
            if (!beregningParams || typeof beregningParams !== 'object') {
                throw new Error('Beregningsparametere er påkrevd og må være et objekt.');
            }

            electronLog.info(`IPC tilbud:beregnPremie kalt for produkttype: ${produkttype}`, beregningParams);
            const beregning = await tilbudService.beregnPremie(produkttype, beregningParams);
            const serializedBeregning = jsonSerializeDecimalData(beregning);
            return { success: true, data: serializedBeregning };
        } catch (error) {
            electronLog.error('Feil i IPC handler [tilbud:beregnPremie]:', error);
            return { success: false, error: error.message };
        }
    });

    // BENEFISIENT OPERASJONER

    // Hent benefisienter for tilbud
    ipcMain.handle('tilbud:getBenefisienter', async (event, tilbudId) => {
        try {
            if (!tilbudId) {
                throw new Error('Tilbud-ID er påkrevd for å hente benefisienter.');
            }

            electronLog.info(`IPC tilbud:getBenefisienter kalt for tilbudId: ${tilbudId}`);
            const benefisienter = await tilbudService.getBenefisienter(tilbudId);
            const serializedBenefisienter = jsonSerializeDecimalData(benefisienter);
            return { success: true, data: serializedBenefisienter };
        } catch (error) {
            electronLog.error(`Feil i IPC handler [tilbud:getBenefisienter] for tilbudId ${tilbudId}:`, error);
            return { success: false, error: error.message };
        }
    });

    // Opprett benefisient
    ipcMain.handle('tilbud:createBenefisient', async (event, params) => {
        try {
            const { tilbudId, benefisientData } = params;

            if (!tilbudId) {
                throw new Error('Tilbud-ID er påkrevd for å opprette benefisient.');
            }
            if (!benefisientData || typeof benefisientData !== 'object') {
                throw new Error('Benefisientdata er påkrevd og må være et objekt.');
            }

            electronLog.info(`IPC tilbud:createBenefisient kalt for tilbudId: ${tilbudId}`, benefisientData);
            const benefisient = await tilbudService.createBenefisient(tilbudId, benefisientData);
            const serializedBenefisient = jsonSerializeDecimalData(benefisient);
            return { success: true, data: serializedBenefisient };
        } catch (error) {
            electronLog.error('Feil i IPC handler [tilbud:createBenefisient]:', error);
            return { success: false, error: error.message };
        }
    });

    // Oppdater benefisient
    ipcMain.handle('tilbud:updateBenefisient', async (event, params) => {
        try {
            const { benefisientId, dataToUpdate } = params;

            if (!benefisientId) {
                throw new Error('Benefisient-ID er påkrevd for å oppdatere benefisient.');
            }
            if (!dataToUpdate || typeof dataToUpdate !== 'object' || Object.keys(dataToUpdate).length === 0) {
                throw new Error('DataToUpdate er påkrevd og må være et objekt med innhold.');
            }

            electronLog.info(`IPC tilbud:updateBenefisient kalt for benefisientId: ${benefisientId}`, dataToUpdate);
            const benefisient = await tilbudService.updateBenefisient(benefisientId, dataToUpdate);
            const serializedBenefisient = jsonSerializeDecimalData(benefisient);
            return { success: true, data: serializedBenefisient };
        } catch (error) {
            electronLog.error('Feil i IPC handler [tilbud:updateBenefisient]:', error);
            return { success: false, error: error.message };
        }
    });

    // Slett benefisient
    ipcMain.handle('tilbud:deleteBenefisient', async (event, benefisientId) => {
        try {
            if (!benefisientId) {
                throw new Error('Benefisient-ID er påkrevd for å slette benefisient.');
            }

            electronLog.info(`IPC tilbud:deleteBenefisient kalt for benefisientId: ${benefisientId}`);
            await tilbudService.deleteBenefisient(benefisientId);
            return { success: true };
        } catch (error) {
            electronLog.error(`Feil i IPC handler [tilbud:deleteBenefisient] for benefisientId ${benefisientId}:`, error);
            return { success: false, error: error.message };
        }
    });

    // PRODUKTKONFIGURASJON OPERASJONER

    // Hent alle aktive produktkonfigurasjoner
    ipcMain.handle('tilbud:getProduktKonfigurasjoner', async (event) => {
        try {
            electronLog.info('IPC tilbud:getProduktKonfigurasjoner kalt');
            const produkter = await tilbudService.getProduktKonfigurasjoner();
            const serializedProdukter = jsonSerializeDecimalData(produkter);
            return { success: true, data: serializedProdukter };
        } catch (error) {
            electronLog.error('Feil i IPC handler [tilbud:getProduktKonfigurasjoner]:', error);
            return { success: false, error: error.message };
        }
    });

    // Hent produktkonfigurasjon by navn
    ipcMain.handle('tilbud:getProduktKonfigurasjonByNavn', async (event, produktnavn) => {
        try {
            if (!produktnavn) {
                throw new Error('Produktnavn er påkrevd.');
            }

            electronLog.info(`IPC tilbud:getProduktKonfigurasjonByNavn kalt for produktnavn: ${produktnavn}`);
            const produkt = await tilbudService.getProduktKonfigurasjonByNavn(produktnavn);
            const serializedProdukt = jsonSerializeDecimalData(produkt);
            return { success: true, data: serializedProdukt };
        } catch (error) {
            electronLog.error(`Feil i IPC handler [tilbud:getProduktKonfigurasjonByNavn] for produktnavn ${produktnavn}:`, error);
            return { success: false, error: error.message };
        }
    });

    // RAMMEOVERVÅKING

    // Hent rammeforbruk for selskap
    ipcMain.handle('tilbud:getRammeForbruk', async (event, params) => {
        try {
            const { selskapId, navarendeProsjektId } = typeof params === 'string' ? { selskapId: params, navarendeProsjektId: null } : params;

            if (!selskapId) {
                throw new Error('Selskaps-ID er påkrevd for å hente rammeforbruk.');
            }

            electronLog.info(`IPC tilbud:getRammeForbruk kalt for selskapId: ${selskapId}, nåværende prosjekt: ${navarendeProsjektId || 'ingen'}`);
            const rammeInfo = await tilbudService.getRammeForbruk(selskapId, navarendeProsjektId);
            const serializedRammeInfo = jsonSerializeDecimalData(rammeInfo);
            return { success: true, data: serializedRammeInfo };
        } catch (error) {
            electronLog.error(`Feil i IPC handler [tilbud:getRammeForbruk]:`, error);
            return { success: false, error: error.message };
        }
    });

    // Valider rammeforbruk
    ipcMain.handle('tilbud:validerRammeForbruk', async (event, params) => {
        try {
            const { selskapId, tilbudBelop } = params;

            if (!selskapId || !tilbudBelop) {
                throw new Error('Selskaps-ID og tilbudsbeløp er påkrevd for rammevalidering.');
            }

            electronLog.info(`IPC tilbud:validerRammeForbruk kalt for selskapId: ${selskapId}, beløp: ${tilbudBelop}`);
            const validering = await tilbudService.validerRammeForbruk(selskapId, tilbudBelop);
            const serializedValidering = jsonSerializeDecimalData(validering);
            return { success: true, data: serializedValidering };
        } catch (error) {
            electronLog.error('Feil i IPC handler [tilbud:validerRammeForbruk]:', error);
            return { success: false, error: error.message };
        }
    });

    electronLog.info('IPC-handlere for Tilbud API er satt opp.');
}

module.exports = { setupTilbudApiHandlers }; 