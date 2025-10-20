const path = require('path');
const axios = require('axios');
// const isDev = process.env.NODE_ENV === 'development'; // Kan fjernes hvis ikke brukt direkte i denne filen
const electronLog = require('electron-log');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// Importer funksjonen som gir PrismaClient-instansen
const getPrismaInstance = require('../../prisma/client.js'); // Sti fra src/services/ til rot/prisma/
const prisma = getPrismaInstance(); // Kall funksjonen for å få instansen

electronLog.info(`<<<<< [invoiceService] Toppnivå: typeof prisma: ${typeof prisma}, typeof prisma.Invoices: ${typeof prisma?.Invoices}, typeof prisma.SystemPrompts: ${typeof prisma?.SystemPrompts} >>>>>`);

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_FILES_URL = 'https://api.mistral.ai/v1/files';
const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr';
const MISTRAL_CHAT_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-small-latest';
const MISTRAL_OCR_MODEL = 'mistral-ocr-latest';

// Standard prompt hvis ingen finnes i database
const DEFAULT_INVOICE_PROMPT = `Dette er tekst ekstrahert fra en faktura:\n\n{{extracted_text}}\n\nEkstraher følgende felt og returner dem i JSON-format:\n- Skadenummer (Et 5-sifret nummer som starter med tallet 3. Returner null hvis ikke funnet.)\n- Registreringsnummer (Bilens registreringsnummer. Kan ha ulike formater som AB12345, DT98765 osv. Returner null hvis ikke funnet.)\n- KID (betalingsreferanse)\n- Kontonummer (bankkonto/IBAN)\n- Beløp (total sum å betale)\n- Mottaker navn (navn på leverandør/selskapet som har utstedt fakturaen)\n\nFor mottakerens adresse, finn den fullstendige adressen til SELSKAPET SOM HAR UTSTEDT FAKTURAEN (ikke adressen til betaleren).\nDel adressen opp slik:\n- Mottaker gateadresse (kun gate og husnummer)\n- Mottaker postnummer (kun postnummer)\n- Mottaker poststed (kun poststed)\n\nReturner data i følgende strenge JSON-format uten kommentarer:\n{\n  "skadenummer": "value or null",\n  "registreringsnummer": "value or null",\n  "kid": "value or null",\n  "kontonummer": "value or null",\n  "beloep": "value or null",\n  "mottaker_navn": "value or null",\n  "mottaker_gateadresse": "value or null",\n  "mottaker_postnummer": "value or null",\n  "mottaker_poststed": "value or null"\n}`;

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
    // Ny metode for å hente GPT prompt fra database
    async getInvoicePrompt() {
        electronLog.info('InvoiceService: Henter aktiv invoice_extraction prompt med Prisma.');
        try {
            const activePrompt = await prisma.systemPrompts.findFirst({
                where: {
                    prompt_type: 'invoice_extraction',
                    is_active: true
                },
                orderBy: { updated_at: 'desc' }
            });

            if (!activePrompt) {
                electronLog.info('Ingen aktiv prompt funnet i databasen for invoice_extraction, bruker hardkodet DEFAULT_INVOICE_PROMPT.');
                return DEFAULT_INVOICE_PROMPT;
            }
            electronLog.info('Hentet aktiv prompt fra databasen.');
            return activePrompt.prompt_text;
        } catch (error) {
            electronLog.error('Feil ved henting av prompt fra database (Prisma):', error);
            electronLog.info('Bruker hardkodet DEFAULT_INVOICE_PROMPT på grunn av databasefeil.');
            return DEFAULT_INVOICE_PROMPT;
        }
    }

    // Metode for å sette inn en aktiv prompt i databasen (kun for admin)
    async setInvoicePrompt(promptText, userId) {
        electronLog.info(`InvoiceService: Bruker ${userId} prøver å sette ny invoice_extraction prompt.`);
        const numUserId = parseInt(userId);
        if (isNaN(numUserId)) throw new Error('Ugyldig bruker-ID.');

        try {
            // Sjekk om brukeren er admin
            const user = await prisma.userV2.findUnique({
                where: { id: numUserId },
                include: { roller: { include: { role: true } } }
            });
            if (!user || !user.roller.some(r => r.role.role_name === 'ADMIN')) {
                throw new Error('Kun administratorer kan endre system-prompter.');
            }

            return await prisma.$transaction(async (tx) => {
                // Sett tidligere aktive prompter for 'invoice_extraction' til inaktive
                await tx.systemPrompts.updateMany({
                    where: { prompt_type: 'invoice_extraction', is_active: true },
                    data: { is_active: false, updated_at: new Date() },
                });

                // Sett inn ny prompt
                const newPrompt = await tx.systemPrompts.create({
                    data: {
                        prompt_type: 'invoice_extraction',
                        prompt_text: promptText,
                        created_by_user_id: numUserId,
                        is_active: true,
                    }
                });
                electronLog.info(`Ny invoice-prompt lagret av bruker ${numUserId}:`, newPrompt);
                return newPrompt;
            });
        } catch (error) {
            electronLog.error(`Feil ved lagring av ny prompt av bruker ${numUserId}:`, error);
            throw error; // Kast feilen videre slik at API-handleren kan fange den
        }
    }

    // Metode for å liste alle tidligere prompter (kun for admin)
    async getInvoicePromptHistory(userId) {
        electronLog.info(`InvoiceService: Bruker ${userId} henter prompt-historikk for invoice_extraction.`);
        const numUserId = parseInt(userId);
        if (isNaN(numUserId)) throw new Error('Ugyldig bruker-ID.');

        try {
            // Sjekk om brukeren er admin
            const user = await prisma.userV2.findUnique({
                where: { id: numUserId },
                include: { roller: { include: { role: true } } }
            });
            if (!user || !user.roller.some(r => r.role.role_name === 'ADMIN')) {
                throw new Error('Kun administratorer kan se prompt-historikken.');
            }

            const history = await prisma.systemPrompts.findMany({
                where: { prompt_type: 'invoice_extraction' },
                orderBy: { created_at: 'desc' },
                include: { createdBy: { select: { id: true, navn: true, email: true } } } // Inkluder info om hvem som opprettet
            });
            return history;
        } catch (error) {
            electronLog.error('Feil ved henting av prompt-historikk:', error);
            throw error;
        }
    }

    async processInvoice(fileName, fileBuffer, base64Data = null) {
        electronLog.info('--- [processInvoice] Entering --- ');
        electronLog.info(`[processInvoice] Prisma instance type: ${typeof prisma}`);
        electronLog.info(`[processInvoice] prisma.invoices type: ${typeof prisma?.invoices}`);
        electronLog.info(`[processInvoice] prisma.invoices.create type: ${typeof prisma?.invoices?.create}`);

        // Sjekk for GPT-4o konfigurasjon hvis nødvendig
        // if (!azureAiService.isConfigured()) { 
        //     throw new Error('Azure AI Service (GPT-4o) is not configured.');
        // }

        // Validering av fileBuffer
        if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
            throw new Error(`Ugyldig eller tom PDF-fil: ${fileName}.`);
        }

        electronLog.info(`Prosesserer PDF med GPT-4o: ${fileName}, buffer størrelse: ${fileBuffer.length} bytes`);

        // Håndter base64-data hvis ikke allerede oppgitt (for kompatibilitet med eldre kode)
        if (!base64Data) {
            electronLog.info(`base64Data ikke oppgitt, konverterer fileBuffer til base64...`);
            base64Data = fileBuffer.toString('base64');
        }

        let invoiceId = null; // For å kunne referere til ID i catch-blokk utenfor transaksjon
        let tempFilePath = null; // Trenger midlertidig fil for pdf-parse

        try {
            // Opprett initiell rad og håndter AI-kall innenfor en transaksjon hvis mulig,
            // men AI-kallet er eksternt, så det er kanskje bedre å dele det opp.
            // Steg 1: Opprett initiell faktura-rad for å få en ID.
            const initialInvoice = await prisma.invoices.create({
                data: {
                    file_name: fileName,
                    status: 'processing',
                    pdf_data: base64Data, // Lagrer base64 PDF
                    uploaded_at: new Date(),
                }
            });
            invoiceId = initialInvoice.id;
            electronLog.info(`Opprettet initiell invoice record med ID: ${invoiceId} for fil: ${fileName}`);

            // Steg 2: Lagre PDF midlertidig og parse tekst
            const tmpDir = os.tmpdir();
            const randomFileName = `${crypto.randomBytes(8).toString('hex')}_${fileName}`;
            tempFilePath = path.join(tmpDir, randomFileName);
            fs.writeFileSync(tempFilePath, fileBuffer);
            electronLog.info(`Lagret PDF midlertidig for parsing: ${tempFilePath}`);

            let extractedText;
            try {
                extractedText = await azureAiService.parsePdfFile(tempFilePath);
                electronLog.info(`Tekst ekstrahert fra PDF (første 200 tegn): ${extractedText.substring(0, 200)}...`);
            } catch (parseError) {
                electronLog.error(`Klarte ikke å parse PDF ${fileName}:`, parseError);
                throw new Error(`PDF-parsing feilet: ${parseError.message}`);
            }

            // Steg 3: Hent prompt og kall AI
            const promptTemplate = await this.getInvoicePrompt(); // Denne bruker fortsatt pool, men returnerer default nå
            const promptContent = promptTemplate.replace('{{extracted_text}}', extractedText);
            const promptMessages = [{ role: "user", content: promptContent }];
            const modelToUse = 'gpt-4o';
            electronLog.info(`Sender ekstrahert tekst til Azure AI (GPT-4o) for analyse for invoice ID: ${invoiceId}...`);
            const chatResponse = await azureAiService.sendMessageWithJsonResponse(modelToUse, promptMessages);
            electronLog.info(`GPT-4o svarte for ${fileName} (ID: ${invoiceId})`);

            let extractedJSON;
            const modelResponseContent = chatResponse.choices[0].message.content;
            electronLog.info(`Raw model response content for ${fileName} (ID: ${invoiceId}): ${modelResponseContent}`);

            try {
                extractedJSON = JSON.parse(modelResponseContent);
            } catch (parseError) {
                electronLog.error(`Klarte ikke å parse JSON fra GPT-4o respons:`, parseError);
                throw new Error(`JSON-parsing feilet: ${parseError.message}`);
            }

            // Steg 4: Lagre resultat i database
            const updatedInvoice = await prisma.invoices.update({
                where: { id: invoiceId },
                data: {
                    status: 'processed',
                    extracted_text: extractedText,
                    extracted_json: extractedJSON,
                    processed_at: new Date(),
                }
            });
            electronLog.info(`Resultat lagret i database for invoice ID: ${invoiceId}`);

            return updatedInvoice;
        } catch (error) {
            electronLog.error('Feil ved prosessering av faktura:', error);
            throw error;
        }
    }

    async saveFeedback(invoiceId, feedbackStatus, feedbackDetails) {
        electronLog.info(`InvoiceService: Lagrer tilbakemelding for faktura ID: ${invoiceId}`, { feedbackStatus, feedbackDetails });
        const numInvoiceId = parseInt(invoiceId);
        if (isNaN(numInvoiceId)) {
            throw new Error('Ugyldig faktura-ID format.');
        }

        try {
            const updatedInvoice = await prisma.invoices.update({
                where: { id: numInvoiceId },
                data: {
                    feedback_rating: feedbackStatus === 'correct' ? 5 : (feedbackStatus === 'incorrect' ? 1 : null), // Eksempel på mapping
                    feedback_comment: feedbackDetails,
                    // Du kan også vurdere å legge til et felt for selve statusen 'correct'/'incorrect'
                    // status: 'reviewed' // Eventuelt oppdatere statusen på fakturaen
                },
            });
            electronLog.info(`Tilbakemelding lagret for faktura ID: ${numInvoiceId}`);
            return updatedInvoice;
        } catch (error) {
            electronLog.error(`Feil ved lagring av tilbakemelding for faktura ID ${numInvoiceId}:`, error);
            if (error.code === 'P2025') { // Record to update not found
                throw new Error(`Kunne ikke lagre tilbakemelding: Faktura med ID ${numInvoiceId} finnes ikke.`);
            }
            throw new Error(`Kunne ikke lagre tilbakemelding: ${error.message}`);
        }
    }

    async getAllInvoices() {
        electronLog.info('InvoiceService: Henter alle fakturaer');
        try {
            const invoices = await prisma.invoices.findMany({
                orderBy: {
                    uploaded_at: 'desc', // Sorter etter når de ble lastet opp, nyeste først
                },
            });
            electronLog.info(`Hentet ${invoices.length} fakturaer`);
            return invoices; // Returnerer hele objekter, frontend kan håndtere extracted_json
        } catch (error) {
            electronLog.error('Feil ved henting av alle fakturaer:', error);
            throw new Error(`Kunne ikke hente fakturaer: ${error.message}`);
        }
    }

    async getInvoiceById(id) {
        electronLog.info(`InvoiceService: Henter faktura med ID: ${id}`);
        const numId = parseInt(id);
        if (isNaN(numId)) {
            throw new Error('Ugyldig faktura-ID format.');
        }

        try {
            const invoice = await prisma.invoices.findUnique({
                where: { id: numId },
            });
            if (!invoice) {
                electronLog.warn(`Ingen faktura funnet med ID: ${numId}`);
                return null; // Eller kast en feil, avhengig av hvordan du vil håndtere "ikke funnet"
            }
            electronLog.info(`Faktura hentet med ID: ${numId}`);
            return invoice;
        } catch (error) {
            electronLog.error(`Feil ved henting av faktura med ID ${numId}:`, error);
            throw new Error(`Kunne ikke hente faktura: ${error.message}`);
        }
    }

    async getPdfForInvoice(invoiceId) {
        electronLog.info(`InvoiceService: Henter PDF for faktura ID: ${invoiceId}`);
        const numId = parseInt(invoiceId);
        if (isNaN(numId)) {
            throw new Error('Ugyldig faktura-ID format for getPdfForInvoice.');
        }

        try {
            const invoice = await prisma.invoices.findUnique({
                where: { id: numId },
                select: {
                    pdf_data: true,
                    file_name: true,
                },
            });

            if (!invoice) {
                electronLog.warn(`Ingen faktura funnet med ID: ${numId} for PDF-henting.`);
                throw new Error(`Faktura med ID ${numId} ikke funnet.`);
            }
            if (!invoice.pdf_data) {
                electronLog.warn(`Ingen PDF-data funnet for faktura ID: ${numId} (file_name: ${invoice.file_name}).`);
                throw new Error(`Ingen PDF-data tilgjengelig for faktura ${invoice.file_name}.`);
            }

            let pdfBuffer;
            if (invoice.pdf_data instanceof Uint8Array) {
                pdfBuffer = Buffer.from(invoice.pdf_data);
                electronLog.info(`[InvoiceService] Konverterte Uint8Array (pdf_data) til Buffer for ID: ${numId}`);
            } else if (typeof invoice.pdf_data === 'object' && invoice.pdf_data !== null && invoice.pdf_data.type === 'Buffer' && Array.isArray(invoice.pdf_data.data)) {
                pdfBuffer = Buffer.from(invoice.pdf_data.data);
                electronLog.info(`[InvoiceService] Konverterte serialisert Buffer-objekt (pdf_data) til Buffer for ID: ${numId}`);
            } else if (Buffer.isBuffer(invoice.pdf_data)) {
                pdfBuffer = invoice.pdf_data;
                electronLog.info(`[InvoiceService] pdf_data var allerede en Buffer for ID: ${numId}`);
            } else {
                electronLog.error(`[InvoiceService] Ukjent type for pdf_data for ID ${numId}: ${typeof invoice.pdf_data}. Kan ikke konvertere til Buffer.`);
                throw new Error(`Uforventet format på PDF-data fra databasen for faktura ${invoice.file_name}.`);
            }

            electronLog.info(`PDF-Buffer og filnavn klargjort for faktura ID: ${numId}`);
            return {
                pdfData: pdfBuffer,
                fileName: invoice.file_name,
            };
        } catch (error) {
            electronLog.error(`Feil ved henting av PDF for faktura ID ${numId}:`, error);
            if (error.message.startsWith("Faktura med ID") || error.message.startsWith("Ingen PDF-data tilgjengelig")) {
                throw error;
            }
            throw new Error(`Kunne ikke hente PDF for faktura: ${error.message}`);
        }
    }

    async deleteInvoice(invoiceId) {
        electronLog.info(`InvoiceService: Sletter faktura med ID: ${invoiceId}`);
        const numId = parseInt(invoiceId);
        if (isNaN(numId)) {
            throw new Error('Ugyldig faktura-ID format for deleteInvoice.');
        }

        try {
            const deletedInvoice = await prisma.invoices.delete({
                where: { id: numId },
            });
            electronLog.info(`Faktura med ID: ${numId} (filnavn: ${deletedInvoice.file_name}) ble slettet.`);
            return { message: `Faktura '${deletedInvoice.file_name}' (ID: ${numId}) ble slettet.` };
        } catch (error) {
            electronLog.error(`Feil ved sletting av faktura med ID ${numId}:`, error);
            if (error.code === 'P2025') { // Record to delete not found
                throw new Error(`Kunne ikke slette: Faktura med ID ${numId} finnes ikke.`);
            }
            throw new Error(`Kunne ikke slette faktura: ${error.message}`);
        }
    }

    async deleteAllInvoices() {
        electronLog.warn('InvoiceService: Sletter ALLE fakturaer fra databasen.');
        // TODO: Vurder å legge inn en ekstra sjekk her, f.eks. basert på brukerrolle eller en miljøvariabel,
        // for å forhindre utilsiktet sletting i produksjon.
        // Eksempel:
        // if (process.env.NODE_ENV === 'production') {
        //     electronLog.error('deleteAllInvoices er deaktivert i produksjonsmiljø.');
        //     throw new Error('Sletting av alle fakturaer er ikke tillatt i produksjon.');
        // }

        try {
            const result = await prisma.invoices.deleteMany({}); // Tomt filter sletter alle
            electronLog.info(`Slettet ${result.count} fakturaer.`);
            return { count: result.count, message: `${result.count} fakturaer ble slettet.` };
        } catch (error) {
            electronLog.error('Feil ved sletting av alle fakturaer:', error);
            throw new Error(`Kunne ikke slette alle fakturaer: ${error.message}`);
        }
    }
}

module.exports = new InvoiceService();