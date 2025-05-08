const path = require('path');
const axios = require('axios');
const isDev = process.env.NODE_ENV === 'development';
const electronLog = require('electron-log');
const fs = require('fs');
// const FormData = require('form-data'); // Fjernet - sannsynligvis ikke nødvendig
const os = require('os');
const crypto = require('crypto');

// Importer database config
const dbConfigPath = '../config/dbConfig';
// Legg til en kommentar om at dette må endres basert på miljø i en annen mekanisme
// For eksempel gjennom webpack DefinePlugin eller environment variabler
const { pool } = require(dbConfigPath);

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_FILES_URL = 'https://api.mistral.ai/v1/files';
const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr';
const MISTRAL_CHAT_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-small-latest';
const MISTRAL_OCR_MODEL = 'mistral-ocr-latest';

// Importer Azure AI Service
const azureAiService = require('./azureAiService');

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
    async processInvoice(fileName, fileBuffer, base64Data = null) {
        // Sjekk for GPT-4o konfigurasjon hvis nødvendig
        // if (!azureAiService.isConfigured()) { 
        //     throw new Error('Azure AI Service (GPT-4o) is not configured.');
        // }

        // Validering av fileBuffer
        if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
            throw new Error(`Ugyldig eller tom PDF-fil: ${fileName}. Buffer størrelse: ${fileBuffer ? fileBuffer.length : 'undefined'}`);
        }

        electronLog.info(`Prosesserer PDF med GPT-4o: ${fileName}, buffer størrelse: ${fileBuffer.length} bytes`);

        // Håndter base64-data hvis ikke allerede oppgitt (for kompatibilitet med eldre kode)
        if (!base64Data) {
            electronLog.info(`base64Data ikke oppgitt, konverterer fileBuffer til base64...`);
            base64Data = fileBuffer.toString('base64');
        }

        let dbClient;
        let invoiceId = null;
        let tempFilePath = null; // Trenger midlertidig fil for pdf-parse

        try {
            dbClient = await pool.connect();
            await dbClient.query('BEGIN');

            // 1. Opprett en initiell rad i databasen med pdf_data
            const insertRes = await dbClient.query(
                'INSERT INTO invoices (file_name, status, pdf_data) VALUES ($1, $2, $3) RETURNING id',
                [fileName, 'processing', base64Data]
            );
            invoiceId = insertRes.rows[0].id;
            electronLog.info(`Opprettet invoice record med ID: ${invoiceId} for fil: ${fileName} (PDF-data lagret)`);

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
        try {
            const result = await pool.query(`
                SELECT * FROM invoices WHERE id = $1
            `, [id]);

            if (result.rows.length === 0) {
                throw new Error(`Ingen faktura funnet med ID: ${id}`);
            }
            return result.rows[0];
        } catch (error) {
            electronLog.error(`Feil ved henting av faktura med ID ${id}:`, error);
            throw new Error(`Kunne ikke hente faktura: ${error.message}`);
        }
    }

    async getAllInvoices() {
        try {
            const result = await pool.query(`
                SELECT 
                    id, 
                    file_name, 
                    uploaded_at, 
                    processed_at, 
                    status, 
                    skadenummer, 
                    registreringsnummer, 
                    kid, 
                    kontonummer, 
                    beloep, 
                    mottaker_navn, 
                    mottaker_adresse,
                    feedback_status,
                    feedback_details,
                    feedback_at,
                    error_message
                FROM invoices 
                ORDER BY uploaded_at DESC
            `);
            return result.rows;
        } catch (error) {
            electronLog.error('Feil ved henting av alle fakturaer:', error);
            throw new Error(`Kunne ikke hente fakturaer: ${error.message}`);
        }
    }

    async saveFeedback(invoiceId, feedbackStatus, feedbackDetails) {
        // Valider input
        if (!invoiceId) {
            const err = new Error('Mangler invoiceId for å lagre tilbakemelding.');
            electronLog.error('Valideringsfeil i saveFeedback:', err);
            throw err;
        }

        if (!feedbackStatus) {
            const err = new Error('Mangler feedbackStatus for å lagre tilbakemelding.');
            electronLog.error('Valideringsfeil i saveFeedback:', err);
            throw err;
        }

        if (feedbackStatus === 'incorrect' && !feedbackDetails) {
            const err = new Error("Detaljer må oppgis når tilbakemelding er 'feil'.");
            electronLog.error('Valideringsfeil i saveFeedback:', err);
            throw err;
        }

        // Konverter invoiceId til nummer hvis det er en string
        let numericInvoiceId = invoiceId;
        if (typeof invoiceId === 'string') {
            numericInvoiceId = parseInt(invoiceId, 10);
            if (isNaN(numericInvoiceId)) {
                const err = new Error(`Ugyldig invoiceId format: ${invoiceId}`);
                electronLog.error('Valideringsfeil i saveFeedback:', err);
                throw err;
            }
        }

        electronLog.info(`Lagrer tilbakemelding for invoice ID: ${numericInvoiceId}`, {
            feedbackStatus,
            hasDetails: !!feedbackDetails,
            originalInvoiceId: invoiceId,
            numericInvoiceId
        });

        let dbClient;
        try {
            // Bruk transaksjon for å sikre atomisitet
            dbClient = await pool.connect();
            await dbClient.query('BEGIN');

            // Sjekk først om fakturaen eksisterer
            const checkRes = await dbClient.query('SELECT id FROM invoices WHERE id = $1', [numericInvoiceId]);

            if (checkRes.rowCount === 0) {
                throw new Error(`Ingen faktura funnet med ID: ${numericInvoiceId}`);
            }

            // Utfør oppdatering
            const updateQuery = `
                UPDATE invoices
                SET
                    feedback_status = $1,
                    feedback_details = $2,
                    feedback_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING id, feedback_status
            `;

            const updateParams = [feedbackStatus, feedbackDetails, numericInvoiceId];
            electronLog.info(`Kjører database-spørring med parametere:`, updateParams);

            const result = await dbClient.query(updateQuery, updateParams);

            if (result.rowCount === 0) {
                throw new Error(`Oppdatering av faktura med ID ${numericInvoiceId} påvirket 0 rader.`);
            }

            await dbClient.query('COMMIT');
            electronLog.info(`Tilbakemelding lagret for faktura ID ${numericInvoiceId}:`, result.rows[0]);

            return result.rows[0];
        } catch (error) {
            electronLog.error(`Feil ved lagring av tilbakemelding for ID: ${numericInvoiceId}:`, error);

            if (dbClient) {
                await dbClient.query('ROLLBACK').catch(rollbackErr => {
                    electronLog.error('Feil ved rollback:', rollbackErr);
                });
            }

            throw error;
        } finally {
            if (dbClient) {
                dbClient.release();
            }
        }
    }

    // Legg til en ny funksjon for å hente PDF-data for en faktura
    async getPdfForInvoice(id) {
        try {
            electronLog.info(`Henter PDF-data for faktura ID: ${id}`);
            const result = await pool.query(`
                SELECT file_name, pdf_data 
                FROM invoices 
                WHERE id = $1 AND pdf_data IS NOT NULL
            `, [id]);

            if (result.rows.length === 0) {
                throw new Error(`Ingen PDF funnet for faktura med ID: ${id}`);
            }

            if (!result.rows[0].pdf_data) {
                throw new Error(`Fakturaen finnes, men har ingen lagret PDF-data (ID: ${id})`);
            }

            electronLog.info(`PDF-data hentet for faktura ID: ${id}, filnavn: ${result.rows[0].file_name}`);
            return {
                fileName: result.rows[0].file_name,
                pdfData: result.rows[0].pdf_data
            };
        } catch (error) {
            electronLog.error(`Feil ved henting av PDF for faktura ID ${id}:`, error);
            throw new Error(`Kunne ikke hente PDF: ${error.message}`);
        }
    }

    // Funksjon for å slette en faktura
    async deleteInvoice(id) {
        if (!id) {
            throw new Error('ID må oppgis for å slette en faktura');
        }

        let dbClient;
        try {
            dbClient = await pool.connect();
            await dbClient.query('BEGIN');

            // Sjekk først om fakturaen eksisterer
            const checkResult = await dbClient.query('SELECT id, file_name FROM invoices WHERE id = $1', [id]);

            if (checkResult.rows.length === 0) {
                throw new Error(`Ingen faktura funnet med ID: ${id}`);
            }

            const fileName = checkResult.rows[0].file_name;

            // Slett fakturaen
            const deleteResult = await dbClient.query('DELETE FROM invoices WHERE id = $1', [id]);

            if (deleteResult.rowCount === 0) {
                throw new Error(`Kunne ikke slette faktura med ID: ${id}`);
            }

            await dbClient.query('COMMIT');

            electronLog.info(`Faktura med ID: ${id} og filnavn: ${fileName} er slettet`);
            return { success: true, id, fileName };
        } catch (error) {
            if (dbClient) {
                await dbClient.query('ROLLBACK');
            }
            electronLog.error(`Feil ved sletting av faktura med ID ${id}:`, error);
            throw new Error(`Kunne ikke slette faktura: ${error.message}`);
        } finally {
            if (dbClient) {
                dbClient.release();
            }
        }
    }

    // Funksjon for å slette alle fakturaer
    async deleteAllInvoices() {
        let dbClient;
        try {
            dbClient = await pool.connect();
            await dbClient.query('BEGIN');

            // Hent antall fakturaer som vil bli slettet
            const countResult = await dbClient.query('SELECT COUNT(*) as count FROM invoices');
            const count = parseInt(countResult.rows[0].count, 10);

            // Slett alle fakturaer
            const deleteResult = await dbClient.query('DELETE FROM invoices');

            if (deleteResult.rowCount === 0 && count > 0) {
                throw new Error('Kunne ikke slette fakturaene');
            }

            await dbClient.query('COMMIT');

            electronLog.info(`${deleteResult.rowCount} fakturaer er slettet`);
            return { success: true, count: deleteResult.rowCount };
        } catch (error) {
            if (dbClient) {
                await dbClient.query('ROLLBACK');
            }
            electronLog.error('Feil ved sletting av alle fakturaer:', error);
            throw new Error(`Kunne ikke slette fakturaer: ${error.message}`);
        } finally {
            if (dbClient) {
                dbClient.release();
            }
        }
    }

    // Funksjoner for håndtering av AI-prompter
    async getInvoicePrompt() {
        try {
            electronLog.info('Henter aktiv invoice prompt');
            const result = await pool.query(`
                SELECT prompt_text 
                FROM system_prompts 
                WHERE prompt_type = 'invoice_extraction' AND is_active = true
                ORDER BY updated_at DESC 
                LIMIT 1
            `);

            if (result.rows.length === 0) {
                electronLog.info('Ingen aktiv prompt funnet, returnerer standardprompt');
                return this.getDefaultInvoicePrompt();
            }

            electronLog.info('Aktiv prompt hentet fra databasen');
            return result.rows[0].prompt_text;
        } catch (error) {
            electronLog.error('Feil ved henting av aktiv prompt:', error);
            // Returner standard-prompt ved feil
            return this.getDefaultInvoicePrompt();
        }
    }

    async getInvoicePromptHistory(userId) {
        try {
            electronLog.info(`Henter prompt-historikk for bruker ${userId}`);
            const result = await pool.query(`
                SELECT id, prompt_type, prompt_text, created_at, updated_at, is_active, created_by
                FROM system_prompts 
                WHERE prompt_type = 'invoice_extraction'
                ORDER BY updated_at DESC
            `);

            electronLog.info(`Hentet ${result.rows.length} prompter fra historikk`);
            return result.rows;
        } catch (error) {
            electronLog.error('Feil ved henting av prompt-historikk:', error);
            throw new Error(`Kunne ikke hente prompt-historikk: ${error.message}`);
        }
    }

    async setInvoicePrompt(promptText, userId) {
        if (!promptText) {
            throw new Error('Prompttekst må oppgis');
        }

        let dbClient;
        try {
            dbClient = await pool.connect();
            await dbClient.query('BEGIN');

            // Sjekk om brukeren er admin
            const userResult = await dbClient.query('SELECT role FROM user_roles WHERE id = $1', [userId]);
            if (userResult.rows.length === 0 || userResult.rows[0].role !== 'ADMIN') {
                throw new Error('Kun administratorer kan oppdatere system-prompter');
            }

            // Deaktiver alle eksisterende prompter
            await dbClient.query(`
                UPDATE system_prompts 
                SET is_active = false 
                WHERE prompt_type = 'invoice_extraction'
            `);

            // Legg til ny prompt som aktiv
            const insertResult = await dbClient.query(`
                INSERT INTO system_prompts (prompt_type, prompt_text, is_active, created_by)
                VALUES ('invoice_extraction', $1, true, $2)
                RETURNING id, prompt_type, prompt_text, created_at, updated_at, is_active
            `, [promptText, userId]);

            await dbClient.query('COMMIT');

            electronLog.info(`Ny prompt lagt til med ID: ${insertResult.rows[0].id} av bruker ${userId}`);
            return insertResult.rows[0];
        } catch (error) {
            if (dbClient) {
                await dbClient.query('ROLLBACK');
            }
            electronLog.error('Feil ved oppdatering av prompt:', error);
            throw new Error(`Kunne ikke oppdatere prompt: ${error.message}`);
        } finally {
            if (dbClient) {
                dbClient.release();
            }
        }
    }

    async activateInvoicePrompt(promptId, userId) {
        let dbClient;
        try {
            dbClient = await pool.connect();
            await dbClient.query('BEGIN');

            // Sjekk om brukeren er admin
            const userResult = await dbClient.query('SELECT role FROM user_roles WHERE id = $1', [userId]);
            if (userResult.rows.length === 0 || userResult.rows[0].role !== 'ADMIN') {
                throw new Error('Kun administratorer kan aktivere system-prompter');
            }

            // Hent prompt-type for den valgte prompten
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
            electronLog.info(`Prompt ${promptId} aktivert av bruker ${userId}`);

            return { id: promptId, prompt_type, is_active: true, prompt_text };
        } catch (error) {
            if (dbClient) {
                await dbClient.query('ROLLBACK');
            }
            electronLog.error('Feil ved aktivering av prompt:', error);
            throw new Error(`Kunne ikke aktivere prompt: ${error.message}`);
        } finally {
            if (dbClient) {
                dbClient.release();
            }
        }
    }

    // Hjelpefunksjon for å returnere en standardprompt
    getDefaultInvoicePrompt() {
        return `Dette er tekst ekstrahert fra en faktura:

{{extracted_text}}

Ekstraher følgende felt og returner dem i JSON-format:
- Skadenummer (Et 5-sifret nummer som starter med tallet 3. Returner null hvis ikke funnet.)
- Registreringsnummer (Bilens registreringsnummer. Kan ha ulike formater som AB12345, DT98765 osv. Returner null hvis ikke funnet.)
- KID (betalingsreferanse)
- Kontonummer (bankkonto/IBAN)
- Beløp (total sum å betale)
- Mottaker navn (navn på leverandør/selskapet som har utstedt fakturaen)

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
}`;
    }
}

module.exports = new InvoiceService(); 