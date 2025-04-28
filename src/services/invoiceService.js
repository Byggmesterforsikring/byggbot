const path = require('path');
const axios = require('axios');
const isDev = process.env.NODE_ENV === 'development';
const electronLog = require('electron-log');
const fs = require('fs');
// const FormData = require('form-data'); // Fjernet - sannsynligvis ikke nødvendig
const os = require('os');
const crypto = require('crypto');

// Importer database config
const dbConfigPath = isDev
    ? '../config/dbConfig'
    : path.join(process.resourcesPath, 'app/config/dbConfig');
const { pool } = require(dbConfigPath);

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_FILES_URL = 'https://api.mistral.ai/v1/files';
const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr';
const MISTRAL_CHAT_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-small-latest';
const MISTRAL_OCR_MODEL = 'mistral-ocr-latest';

// Importer Azure AI Service
const azureAiService = require('../electron/services/azureAiService');

// Sjekk om Azure AI Service er konfigurert (antar en slik metode finnes)
// if (!azureAiService.isConfigured()) { 
//     electronLog.error('Azure AI Service (GPT-4o) is not configured.');
//     // Kast feil eller håndter manglende konfigurasjon
// }

if (!MISTRAL_API_KEY) {
    electronLog.error('MISTRAL_API_KEY is not set in environment variables.');
}

// TODO: Legg til sjekk for GPT-4o konfigurasjon/API-nøkkel hvis nødvendig
// if (!gpt4oService.isConfigured()) {
//     throw new Error('GPT-4o service is not configured.');
// }

class InvoiceService {
    async processInvoice(fileName, fileBuffer) {
        // Sjekk for GPT-4o konfigurasjon hvis nødvendig
        // if (!azureAiService.isConfigured()) { 
        //     throw new Error('Azure AI Service (GPT-4o) is not configured.');
        // }

        // Validering av fileBuffer
        if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
            throw new Error(`Ugyldig eller tom PDF-fil: ${fileName}. Buffer størrelse: ${fileBuffer ? fileBuffer.length : 'undefined'}`);
        }

        electronLog.info(`Prosesserer PDF med GPT-4o: ${fileName}, buffer størrelse: ${fileBuffer.length} bytes`);

        let dbClient;
        let invoiceId = null;
        let tempFilePath = null; // Trenger midlertidig fil for pdf-parse

        try {
            dbClient = await pool.connect();
            await dbClient.query('BEGIN');

            // 1. Opprett en initiell rad i databasen
            const insertRes = await dbClient.query(
                'INSERT INTO invoices (file_name, status) VALUES ($1, $2) RETURNING id',
                [fileName, 'processing']
            );
            invoiceId = insertRes.rows[0].id;
            electronLog.info(`Opprettet invoice record med ID: ${invoiceId} for fil: ${fileName}`);

            // 2. Lagre PDF til midlertidig fil for parsing
            const tmpDir = os.tmpdir();
            const randomFileName = `${crypto.randomBytes(8).toString('hex')}_${fileName}`;
            tempFilePath = path.join(tmpDir, randomFileName);
            fs.writeFileSync(tempFilePath, fileBuffer);
            electronLog.info(`Lagret PDF midlertidig for parsing: ${tempFilePath}`);

            // 3. Bruk azureAiService.parsePdfFile for å ekstrahere tekst
            let extractedText;
            try {
                extractedText = await azureAiService.parsePdfFile(tempFilePath);
                electronLog.info(`Tekst ekstrahert fra PDF (første 200 tegn): ${extractedText.substring(0, 200)}...`);
            } catch (parseError) {
                electronLog.error(`Klarte ikke å parse PDF ${fileName}:`, parseError);
                throw new Error(`PDF-parsing feilet: ${parseError.message}`);
            }

            // 4. Lag prompt for GPT-4o med den ekstraherte teksten
            const promptMessages = [
                {
                    role: "user",
                    content: `Dette er tekst ekstrahert fra en faktura:\n\n${extractedText}\n\nEkstraher følgende felt og returner dem i JSON-format:\n- Skadenummer (Et 5-sifret nummer som starter med tallet 3. Returner null hvis ikke funnet.)\n- Registreringsnummer (Bilens registreringsnummer. Kan ha ulike formater som AB12345, DT98765 osv. Returner null hvis ikke funnet.)\n- KID (betalingsreferanse)\n- Kontonummer (bankkonto/IBAN)\n- Beløp (total sum å betale)\n- Mottaker navn (navn på leverandør/selskapet som har utstedt fakturaen)

For mottakerens adresse, finn den fullstendige adressen til SELSKAPET SOM HAR UTSTEDT FAKTURAEN (ikke adressen til betaleren).
Del adressen opp slik:
- Mottaker gateadresse (kun gate og husnummer)
- Mottaker postnummer (kun postnummer)
- Mottaker poststed (kun poststed)

Returner data i følgende strenge JSON-format uten kommentarer:
{
  "skadenummer": "value or null",
  "registreringsnummer": "value or null",
  "kid": "value or null",
  "kontonummer": "value or null",
  "beloep": value or null,
  "mottaker_navn": "value or null",
  "mottaker_gateadresse": "value or null",
  "mottaker_postnummer": "value or null",
  "mottaker_poststed": "value or null"
}`
                }
            ];

            // 5. Kall Azure AI Service for å få strukturert data
            electronLog.info(`Sender ekstrahert tekst til Azure AI (GPT-4o) for analyse...`);

            // Bruk en passende modell fra Azure (f.eks. gpt-4o)
            const modelToUse = 'gpt-4o'; // Eller hent fra konfigurasjon

            // Kall funksjonen som sikrer JSON-respons
            const chatResponse = await azureAiService.sendMessageWithJsonResponse(modelToUse, promptMessages);

            electronLog.info(`GPT-4o svarte for ${fileName} (ID: ${invoiceId})`);

            // 6. Parse JSON-svaret
            let extractedJSON;
            const modelResponseContent = chatResponse.choices[0].message.content;
            electronLog.info(`Raw model response: ${modelResponseContent}`);

            try {
                extractedJSON = JSON.parse(modelResponseContent);
                electronLog.info(`Extracted JSON data:`, extractedJSON);
            } catch (jsonError) {
                electronLog.error(`Failed to parse JSON from GPT-4o response:`, jsonError);
                throw new Error(`GPT-4o returnerte ikke gyldig JSON: ${jsonError.message}`);
            }

            // 7. Konstruer fullstendig adresse
            const fullAddress = [
                extractedJSON.mottaker_gateadresse,
                extractedJSON.mottaker_postnummer && extractedJSON.mottaker_poststed ?
                    `${extractedJSON.mottaker_postnummer} ${extractedJSON.mottaker_poststed}` : null
            ].filter(Boolean).join('\n');

            // 8. Oppdater databasen med resultatet
            const updateQuery = `
                UPDATE invoices
                SET
                    processed_at = CURRENT_TIMESTAMP,
                    status = $1,
                    extracted_data = $2,
                    skadenummer = $3,
                    registreringsnummer = $4,
                    kid = $5,
                    kontonummer = $6,
                    beloep = $7,
                    mottaker_navn = $8,
                    mottaker_adresse = $9,
                    mottaker_gateadresse = $10,
                    mottaker_postnummer = $11,
                    mottaker_poststed = $12,
                    error_message = NULL
                WHERE id = $13
                RETURNING *
            `;

            // Sanitize values
            const updateParams = [
                'processed',
                JSON.stringify({
                    gpt_response: chatResponse,
                    extracted_text_preview: extractedText.substring(0, 500) // Lagre en forhåndsvisning av teksten
                }),
                extractedJSON.skadenummer || null,
                extractedJSON.registreringsnummer || null,
                extractedJSON.kid || null,
                extractedJSON.kontonummer || null,
                typeof extractedJSON.beloep === 'number' ? extractedJSON.beloep :
                    (typeof extractedJSON.beloep === 'string' ? this.parseAmountString(extractedJSON.beloep) : null),
                extractedJSON.mottaker_navn || null,
                fullAddress || null,
                extractedJSON.mottaker_gateadresse || null,
                extractedJSON.mottaker_postnummer || null,
                extractedJSON.mottaker_poststed || null,
                invoiceId
            ];

            electronLog.info(`Oppdaterer database for ID: ${invoiceId} med data fra GPT-4o (basert på ekstrahert tekst):`, {
                status: 'processed',
                skadenummer: updateParams[2],
                registreringsnummer: updateParams[3],
                kid: updateParams[4],
                kontonummer: updateParams[5],
                beloep: updateParams[6],
                mottaker_navn: updateParams[7],
                mottaker_adresse: updateParams[8],
                mottaker_gateadresse: updateParams[9],
                mottaker_postnummer: updateParams[10],
                mottaker_poststed: updateParams[11]
            });

            const updateRes = await dbClient.query(updateQuery, updateParams);
            await dbClient.query('COMMIT');

            electronLog.info(`Invoice ID: ${invoiceId} prosessert og lagret med GPT-4o.`);
            return updateRes.rows[0];

        } catch (error) {
            electronLog.error(`Feil under prosessering av invoice ID: ${invoiceId || 'N/A'} (${fileName}) med GPT-4o:`, error);
            if (dbClient) {
                await dbClient.query('ROLLBACK');
                if (invoiceId) {
                    try {
                        await dbClient.query(
                            'UPDATE invoices SET status = $1, error_message = $2 WHERE id = $3',
                            ['error', error.message || 'Ukjent feil', invoiceId]
                        );
                        await dbClient.query('COMMIT');
                    } catch (dbError) {
                        electronLog.error(`Klarte ikke å logge feil til DB for invoice ID: ${invoiceId}:`, dbError);
                        await dbClient.query('ROLLBACK');
                    }
                }
            }
            throw new Error(`Prosessering feilet for ${fileName} med GPT-4o: ${error.message}`);
        } finally {
            if (dbClient) {
                dbClient.release();
            }
            // Rydd opp midlertidig fil
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                    electronLog.info(`Midlertidig fil slettet: ${tempFilePath}`);
                } catch (unlinkError) {
                    electronLog.error(`Kunne ikke slette midlertidig fil ${tempFilePath}:`, unlinkError);
                }
            }
        }
    }

    // Fallback regex-funksjoner fjernet da GPT-4o håndterer JSON direkte

    parseAmountString(amountStr) {
        // Fjern valuta-symbol og konverter til tall
        const cleanedStr = amountStr.replace(/[^0-9.,]/g, '')
            .replace(',', '.'); // Norsk format til standard
        return parseFloat(cleanedStr) || null;
    }

    // TODO: Legg til funksjoner for å hente fakturaer og lagre feedback
    async getInvoiceById(id) {
        // ... implementasjon ...
    }

    async getAllInvoices() {
        // ... implementasjon ...
    }

    async saveFeedback(invoiceId, feedbackStatus, feedbackDetails) {
        if (!invoiceId || !feedbackStatus) {
            throw new Error('Mangler invoiceId eller feedbackStatus for å lagre tilbakemelding.');
        }
        if (feedbackStatus === 'incorrect' && !feedbackDetails) {
            throw new Error("Detaljer må oppgis når tilbakemelding er 'feil'.");
        }

        electronLog.info(`Lagrer tilbakemelding for invoice ID: ${invoiceId}`, { feedbackStatus, hasDetails: !!feedbackDetails });

        try {
            const result = await pool.query(
                `UPDATE invoices
                 SET
                    feedback_status = $1,
                    feedback_details = $2,
                    feedback_at = CURRENT_TIMESTAMP
                 WHERE id = $3
                 RETURNING id, feedback_status`,
                [feedbackStatus, feedbackDetails, invoiceId]
            );

            if (result.rowCount === 0) {
                throw new Error(`Ingen faktura funnet med ID: ${invoiceId}`);
            }

            return result.rows[0];
        } catch (error) {
            electronLog.error(`Feil ved lagring av tilbakemelding for ID: ${invoiceId}:`, error);
            throw error;
        }
    }
}

module.exports = new InvoiceService(); 