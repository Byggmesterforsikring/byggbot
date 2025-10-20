const electronLog = require('electron-log');
// const fetch = require('node-fetch'); // Uncomment hvis global fetch ikke er tilgjengelig

const BRREG_API_BASE_URL = 'https://data.brreg.no/enhetsregisteret/api';

class BrregService {
    async getEnhetByOrgnr(orgnr) {
        if (!orgnr) {
            electronLog.warn('[BrregService] Forsøk på å hente enhet uten orgnr.');
            throw new Error('Organisasjonsnummer er påkrevd.');
        }

        const url = `${BRREG_API_BASE_URL}/enheter/${orgnr}`;
        electronLog.info(`[BrregService] Henter enhetsdata fra Brreg for orgnr: ${orgnr} (URL: ${url})`);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json' // Eller 'application/vnd.brreg.enhetsregisteret.enhet.v1+json' hvis spesifikk versjon er nødvendig
                }
            });

            if (!response.ok) {
                electronLog.error(`[BrregService] Feil fra Brreg API (orgnr: ${orgnr}): Status ${response.status} - ${response.statusText}`);
                if (response.status === 404) {
                    return null; // Orgnr ikke funnet, returner null for å indikere dette
                }
                // For andre feil, kast en mer generell feilmelding
                throw new Error(`Klarte ikke hente data fra Brønnøysundregistrene. Status: ${response.status}`);
            }

            const data = await response.json();
            electronLog.info(`[BrregService] Mottok data for orgnr: ${orgnr}`);
            return data; // Returnerer hele JSON-objektet

        } catch (error) {
            electronLog.error(`[BrregService] Nettverks- eller parsefeil ved henting fra Brreg (orgnr: ${orgnr}):`, error);
            throw new Error(`Problem med å kommunisere med Brønnøysundregistrene: ${error.message}`);
        }
    }
}

module.exports = new BrregService(); 