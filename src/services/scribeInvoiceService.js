import path from 'path';
import axios from 'axios';
import isDev from process.env.NODE_ENV === 'development';
import electronLog from 'electron-log';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
// Dynamisk import for ES Modules
// const scribe = require('scribe.js-ocr');

// Importer database config
const dbConfigPath = isDev
    ? '../config/dbConfig'
    : path.join(process.resourcesPath, 'app/config/dbConfig');
import dbConfig from dbConfigPath;
const { pool } = dbConfig;

// Chat API for å ekstrahere strukturerte data
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_CHAT_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-small-latest';

if (!MISTRAL_API_KEY) {
    electronLog.error('MISTRAL_API_KEY is not set in environment variables.');
}

class ScribeInvoiceService {
    constructor() {
        // Vi vil laste scribe dynamisk når vi faktisk trenger det
        this.scribeModule = null;
    }

    async processInvoice(fileName, fileBuffer) {
        if (!MISTRAL_API_KEY) {
            throw new Error('Mistral API key is not configured.');
        }

        // Validering av fileBuffer
        if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
            throw new Error(`Ugyldig eller tom PDF-fil: ${fileName}. Buffer størrelse: ${fileBuffer ? fileBuffer.length : 'undefined'}`);
        }

        electronLog.info(`Prosesserer PDF med filnavn: ${fileName}, buffer størrelse: ${fileBuffer.length} bytes`);

        let dbClient;
        let invoiceId = null;
        let tempFilePath = null;

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

            // 2. Lagre PDF-bufferen til en midlertidig fil
            const tmpDir = os.tmpdir();
            const randomFileName = `${crypto.randomBytes(8).toString('hex')}_${fileName}`;
            tempFilePath = path.join(tmpDir, randomFileName);

            electronLog.info(`Lagrer PDF til midlertidig fil: ${tempFilePath}`);
            fs.writeFileSync(tempFilePath, fileBuffer);

            // 3. Bruk Scribe.js for å ekstrahere tekst fra PDF
            electronLog.info(`Ekstraherer tekst fra PDF med Scribe.js: ${tempFilePath}`);

            // Hvis vi ikke har lastet Scribe modulen ennå, last den dynamisk
            if (!this.scribeModule) {
                electronLog.info(`Laster Scribe.js module dynamisk...`);
                this.scribeModule = await import('scribe.js-ocr');
                electronLog.info(`Scribe.js module lastet.`);
            }

            // Bruk Scribe.js med dynamisk import
            const extractionResult = await this.scribeModule.default.extractText([tempFilePath]);

            if (!extractionResult || !extractionResult.length || !extractionResult[0]) {
                throw new Error(`Ingen tekst ekstrahert fra PDF: ${fileName}`);
            }

            const extractedText = extractionResult[0];

            // Logg ekstrahert tekst for debugging
            electronLog.info(`Scribe.js ekstrahert tekst (første 200 tegn): ${extractedText.substring(0, 200)}...`);
            electronLog.info(`FULL SCRIBE.JS TEKST:\n${extractedText}`);

            // 4. Send ekstrahert tekst til Mistral Chat API for strukturert data-ekstraksjon
            electronLog.info(`Sender ekstrahert tekst til Mistral AI Chat API for strukturerte data...`);

            const chatRequestData = {
                model: MISTRAL_MODEL,
                messages: [
                    {
                        role: "user",
                        content: `Dette er tekst ekstrahert fra en faktura:\n\n${extractedText}\n\nEkstraher følgende felt og returner dem i JSON-format:\n- Skadenummer (Et 5-sifret nummer som ALLTID starter med tallet 3. Eks: 32456, 39871. Returner null hvis ikke funnet.)\n- Registreringsnummer (Bilens registreringsnummer. Vanligvis 2 store bokstaver etterfulgt av 5 tall, f.eks. AB12345, DT98765. Kan ha andre formater. Returner null hvis ikke funnet.)\n- KID (betalingsreferanse)\n- Kontonummer (bankkonto/IBAN)\n- Beløp (total sum å betale)\n- Mottaker navn (navn på leverandør/selskapet som har utstedt fakturaen)\n\nFor mottakerens adresse (dvs. adressen til selskapet som har utstedt fakturaen):\n- Se nøye etter adresseinformasjon i fakturadataene. Ofte finnes adressen i nærheten av firmalogo, kontaktinformasjon, eller i bunntekst/header.\n- Vær oppmerksom på at det kan finnes flere adresser i samme dokument! Vi er kun interessert i adressen til fakturaens UTSTEDER (mottakeren av pengene), IKKE betaleren.\n\nDel adressen opp slik (sett alle til null hvis du ikke finner adressen til selskapet som har utstedt fakturaen):\n- Mottaker gateadresse (kun gate og husnummer, f.eks. "Schweigaards gate 12")\n- Mottaker postnummer (kun postnummer, f.eks. "0185")\n- Mottaker poststed (kun poststed, f.eks. "OSLO")\n\nReturner data i følgende strenge JSON-format uten kommentarer:\n{\n  "skadenummer": "value or null",\n  "registreringsnummer": "value or null",\n  "kid": "value or null",\n  "kontonummer": "value or null",\n  "beloep": value or null,\n  "mottaker_navn": "value or null",\n  "mottaker_gateadresse": "value or null",\n  "mottaker_postnummer": "value or null",\n  "mottaker_poststed": "value or null"\n}`
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0
            };

            const chatResponse = await axios.post(MISTRAL_CHAT_API_URL, chatRequestData, {
                headers: {
                    'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                responseType: 'json'
            });

            electronLog.info(`Chat API svarte med status: ${chatResponse.status} for ${fileName} (ID: ${invoiceId})`);

            // 5. Parse JSON-svaret
            let extractedJSON;
            const modelResponse = chatResponse.data.choices[0].message.content;
            electronLog.info(`Raw model response: ${modelResponse}`);

            try {
                extractedJSON = JSON.parse(modelResponse);
                electronLog.info(`Extracted JSON data:`, extractedJSON);
            } catch (jsonError) {
                electronLog.error(`Failed to parse JSON from model response:`, jsonError);
                // Fallback til regex-ekstraksjon hvis JSON-parsing feiler
                electronLog.info(`Prøver fallback regex-ekstraksjon...`);
                extractedJSON = {
                    skadenummer: this.extractSkadenummer(modelResponse),
                    registreringsnummer: this.extractRegistreringsnummer(modelResponse),
                    kid: this.extractFieldFromText(modelResponse, "kid"),
                    kontonummer: this.extractFieldFromText(modelResponse, "kontonummer"),
                    beloep: this.extractAmountFromText(modelResponse, "beloep"),
                    mottaker_navn: this.extractFieldFromText(modelResponse, "mottaker_navn"),
                    mottaker_gateadresse: this.extractFieldFromText(modelResponse, "mottaker_gateadresse"),
                    mottaker_postnummer: this.extractFieldFromText(modelResponse, "mottaker_postnummer"),
                    mottaker_poststed: this.extractFieldFromText(modelResponse, "mottaker_poststed")
                };
                electronLog.info(`Extracted data using regex:`, extractedJSON);
            }

            // Konstruer fullstendig adresse fra de separate feltene for bakoverkompatibilitet
            const fullAddress = [
                extractedJSON.mottaker_gateadresse,
                extractedJSON.mottaker_postnummer && extractedJSON.mottaker_poststed ?
                    `${extractedJSON.mottaker_postnummer} ${extractedJSON.mottaker_poststed}` : null
            ].filter(Boolean).join('\n');

            // 6. Oppdater databasen med resultatet
            const updateQuery = `
                UPDATE invoices
                SET
                    processed_at = CURRENT_TIMESTAMP,
                    status = $1,
                    mistral_request_id = $2,
                    extracted_data = $3,
                    skadenummer = $4,
                    registreringsnummer = $5,
                    kid = $6,
                    kontonummer = $7,
                    beloep = $8,
                    mottaker_navn = $9,
                    mottaker_adresse = $10,
                    mottaker_gateadresse = $11,
                    mottaker_postnummer = $12,
                    mottaker_poststed = $13,
                    error_message = NULL
                WHERE id = $14
                RETURNING *
            `;

            // Sanitize values
            const updateParams = [
                'processed',
                chatResponse.data.id || null,
                JSON.stringify({
                    text: extractedText.substring(0, 5000), // Begrens størrelsen på lagret tekst
                    chat: chatResponse.data
                }),
                extractedJSON.skadenummer || null,
                extractedJSON.registreringsnummer || null,
                extractedJSON.kid || null,
                extractedJSON.kontonummer || null,
                typeof extractedJSON.beloep === 'number' ? extractedJSON.beloep :
                    (typeof extractedJSON.beloep === 'string' ? this.parseAmountString(extractedJSON.beloep) : null),
                extractedJSON.mottaker_navn || null,
                fullAddress || extractedJSON.mottaker_adresse || null,
                extractedJSON.mottaker_gateadresse || null,
                extractedJSON.mottaker_postnummer || null,
                extractedJSON.mottaker_poststed || null,
                invoiceId
            ];

            electronLog.info(`Oppdaterer database for ID: ${invoiceId} med data:`, {
                status: 'processed',
                skadenummer: updateParams[3],
                registreringsnummer: updateParams[4],
                kid: updateParams[5],
                kontonummer: updateParams[6],
                beloep: updateParams[7],
                mottaker_navn: updateParams[8],
                mottaker_adresse: updateParams[9],
                mottaker_gateadresse: updateParams[10],
                mottaker_postnummer: updateParams[11],
                mottaker_poststed: updateParams[12]
            });

            const updateRes = await dbClient.query(updateQuery, updateParams);
            await dbClient.query('COMMIT');

            electronLog.info(`Invoice ID: ${invoiceId} prosessert og lagret med Scribe.js.`);
            return updateRes.rows[0];

        } catch (error) {
            electronLog.error(`Feil under prosessering av invoice ID: ${invoiceId || 'N/A'} (${fileName}) med Scribe.js:`, error);
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
            throw new Error(`Prosessering feilet for ${fileName} med Scribe.js: ${error.message}`);
        } finally {
            if (dbClient) {
                dbClient.release();
            }

            // Fjern midlertidig fil
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

    // Hjelpemetoder for tekstekstraksjon (kopiert fra original InvoiceService)
    extractFieldFromText(text, fieldName) {
        const regex = new RegExp(`["']?${fieldName}["']?\s*:\s*["']?([^,"'{}\[\]]+)["']?`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : null;
    }

    extractSkadenummer(text) {
        const regex = /\b(3\d{4})\b/;
        const match = text.match(regex);
        return match ? match[1] : null;
    }

    extractRegistreringsnummer(text) {
        const regex = /\b([A-Z]{2}\s?\d{5})\b/i;
        const match = text.match(regex);
        return match ? match[1].replace(/\s/g, '') : null;
    }

    extractAmountFromText(text, fieldName) {
        const regex = new RegExp(`["']?${fieldName}["']?\\s*:\\s*([0-9.,]+)`, 'i');
        const match = text.match(regex);
        return match ? parseFloat(match[1]) : null;
    }

    parseAmountString(amountStr) {
        const cleanedStr = amountStr.replace(/[^0-9.,]/g, '')
            .replace(',', '.');
        return parseFloat(cleanedStr) || null;
    }

    // Videreførte metoder for databaseforespørsler
    async getInvoiceById(id) {
        // Implementasjon (kan kopiere fra original service)
    }

    async getAllInvoices() {
        // Implementasjon (kan kopiere fra original service)
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

module.exports = new ScribeInvoiceService(); 