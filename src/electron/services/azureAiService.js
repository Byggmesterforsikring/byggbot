const electronLog = require('electron-log');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { app } = require('electron');
const config = require('../config');
const ModelClient = require('@azure-rest/ai-inference').default;
const { AzureKeyCredential } = require('@azure/core-auth');
const { createSseStream } = require('@azure/core-sse');
const ExcelJS = require('exceljs');
// Bruk enkel pdf-parse for PDF-filer
const pdfParse = require('pdf-parse');
// For EML og MSG filparsing
const { simpleParser } = require('mailparser');

// Max file size: 30MB in bytes
const MAX_FILE_SIZE = 30 * 1024 * 1024;

// Azure AI Foundry klienter for ulike modeller
let azureClient = null;
let deepseekClient = null;

// Initialiser Azure AI Foundry klient for GPT-4o
function initAzureClient(apiKey = null) {
    try {
        // Prioritér API nøkkel fra parameter, deretter fra config
        const key = apiKey || config.AZURE_AI_FOUNDRY_KEY;

        if (!key) {
            throw new Error('Mangler API-nøkkel for Azure AI Foundry');
        }

        const endpoint = config.AZURE_AI_FOUNDRY_ENDPOINT || 'https://byggbot3881369052.cognitiveservices.azure.com';

        azureClient = new ModelClient(
            endpoint,
            new AzureKeyCredential(key)
        );

        return true;
    } catch (error) {
        electronLog.error('Kunne ikke initialisere Azure AI Foundry klient:', error);
        return false;
    }
}

// Initialiser DeepSeek-R1 klient
function initDeepseekClient(apiKey = null) {
    try {
        // Prioritér API nøkkel fra parameter, deretter fra config
        const key = apiKey || config.DEEPSEEK_R1_KEY;

        if (!key) {
            throw new Error('Mangler API-nøkkel for DeepSeek-R1');
        }

        const endpoint = config.DEEPSEEK_R1_ENDPOINT || 'https://byggbot3881369052.services.ai.azure.com';

        deepseekClient = new ModelClient(
            endpoint,
            new AzureKeyCredential(key)
        );

        electronLog.info('DeepSeek klient initialisert: ' + endpoint);
        return true;
    } catch (error) {
        electronLog.error('Kunne ikke initialisere DeepSeek-R1 klient:', error);
        return false;
    }
}

// Opprett uploads-mappe hvis den ikke eksisterer
const createUploadsDirIfNeeded = () => {
    const uploadsDir = path.join(app.getPath('userData'), 'ai_uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    return uploadsDir;
};

// Lagre opplastet fil til disk
const saveUploadedFile = (fileBuffer, fileName) => {
    const uploadsDir = createUploadsDirIfNeeded();
    const uniqueFileName = `${uuidv4()}-${fileName}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    fs.writeFileSync(filePath, fileBuffer);

    return {
        fileName: uniqueFileName,
        filePath,
        originalName: fileName
    };
};

// Hent tilgjengelige modeller
const getAvailableModels = async () => {
    try {
        // Initialiser begge klientene
        if (!azureClient) {
            const initialized = initAzureClient();
            if (!initialized) {
                electronLog.warn('Kunne ikke initialisere Azure AI Foundry klient');
            }
        }

        if (!deepseekClient) {
            const initialized = initDeepseekClient();
            if (!initialized) {
                electronLog.warn('Kunne ikke initialisere DeepSeek-R1 klient');
            }
        }

        // For nå, returner hardkodede modeller siden Azure AI Foundry ikke har en API for å liste modeller
        // Dette kan utvides senere når flere modeller blir tilgjengelige
        return [
            { id: 'gpt-4o', name: 'GPT-4o', provider: 'azure' },
            { id: 'deepseek-r1', name: 'DeepSeek-R1', provider: 'azure' }
        ];
    } catch (error) {
        electronLog.error('Feil i getAvailableModels, bruker reservemodeller:', error);
        // Grunnleggende reservemodeller hvis alt annet feiler
        return [
            { id: 'gpt-4o', name: 'GPT-4o', provider: 'azure' },
            { id: 'deepseek-r1', name: 'DeepSeek-R1', provider: 'azure' }
        ];
    }
};

// Send melding til Azure AI Foundry API (ikke-strømmende)
const sendMessage = async (model, messages, apiKey = null) => {
    // Logg hvilken modell som faktisk sendes inn
    electronLog.info(`sendMessage called with model: ${model}, type: ${typeof model}`);

    // Velg riktig klient og initialiser hvis nødvendig
    let client, deploymentPath, apiVersion, payloadExtras = {};

    if (model === 'deepseek-r1') {
        // DeepSeek-R1 bruker egen klient, endpoint og api-versjon
        if (!deepseekClient) {
            const initialized = initDeepseekClient(apiKey || config.DEEPSEEK_R1_KEY);
            if (!initialized) {
                throw new Error('Kunne ikke initialisere DeepSeek-R1 klient');
            }
        }
        client = deepseekClient;
        deploymentPath = '/models/chat/completions'; // DeepSeek-R1 spesifikk sti
        apiVersion = '2024-05-01-preview'; // DeepSeek-R1 spesifikk API-versjon
        payloadExtras.model = "DeepSeek-R1"; // Påkrevd parameter for DeepSeek API

        electronLog.info('Bruker DeepSeek-R1 modell med eget endepunkt og API-versjon');
    } else {
        // Standard GPT-4o bruker Azure OpenAI klient
        if (!azureClient) {
            const initialized = initAzureClient(apiKey || config.AZURE_AI_FOUNDRY_KEY);
            if (!initialized) {
                throw new Error('Kunde ikke initialisere Azure AI Foundry klient');
            }
        }
        client = azureClient;
        deploymentPath = '/openai/deployments/gpt-4o/chat/completions';
        apiVersion = '2025-01-01-preview';

        electronLog.info('Bruker GPT-4o med standard Azure OpenAI endepunkt');
    }

    try {
        // Optimaliser meldingene men utnytt større kontekstvindu
        // Behold flere av de siste meldingene siden modellene har større kontekstvindu (128k tokens)
        const recentMessages = messages.length > 20 ? messages.slice(-20) : messages;

        // Konverter meldingsformatet til Azure AI Foundry format
        const azureMessages = recentMessages.map(msg => {
            // Hvis innholdet er en array (f.eks. med bilder), konverterer vi det til riktig format
            if (Array.isArray(msg.content)) {
                // Convert message format to Azure OpenAI format
                const contents = msg.content.map(item => {
                    if (item.type === 'text') {
                        return { type: 'text', text: item.text };
                    }
                    else if (item.type === 'image' && item.source) {
                        // Convert image format to Azure OpenAI image_url format
                        return {
                            type: 'image_url',
                            image_url: {
                                url: `data:${item.source.media_type};base64,${item.source.data}`
                            }
                        };
                    }
                    else if (item.type === 'image_url') {
                        // Dette er allerede på OpenAI format
                        return item;
                    }
                    // Returnere null for ukjente typer, så vi kan filtrere bort senere
                    return null;
                }).filter(Boolean); // Fjern null-verdier

                return {
                    role: msg.role,
                    content: contents
                };
            }

            // For vanlig tekstinnhold
            return {
                role: msg.role,
                // Økt grense for meldingens lengde for å utnytte større kontekstvindu
                content: typeof msg.content === 'string' && msg.content.length > 32000
                    ? msg.content.substring(0, 32000) + "..."
                    : msg.content
            };
        });

        // Legg til system message som ber om å unngå markdown formatering
        // Gjør dette hvis det ikke allerede er en system melding
        let hasSystemMessage = azureMessages.some(msg => msg.role === 'system');
        if (!hasSystemMessage) {
            azureMessages.unshift({
                role: 'system',
                content: 'You are Byggbot, a professional assistant for construction and building topics. Output plain text without markdown formatting. Do not use headings, bullet points, or other markdown formatting.'
            });
        }

        // Opprett payload for Azure AI Foundry
        const payload = {
            messages: azureMessages,
            // Ingen spesifikk max_tokens grense så modellen kan avslutte når den er ferdig
            temperature: 0.4, // Ytterligere redusert for raskere svar
            top_p: 0.9, // Ytterligere redusert for raskere svar
            presence_penalty: 0,
            frequency_penalty: 0,
            ...payloadExtras // Legg til modellspesifikke parametere (som model for DeepSeek)
        };

        // Logg payload for debugging
        electronLog.info(`Sending request with model=${model}, endpoint=${client?.endpoint || 'unknown'}${deploymentPath}`);
        electronLog.info(`API version: ${apiVersion}, model parameter: ${payload.model || 'Not set'}`);

        // Send forespørsel til riktig klient og endepunkt
        const response = await client.path(deploymentPath).post({
            body: payload,
            queryParameters: { 'api-version': apiVersion }
        });

        // Konverter svaret til et format som ligner på Anthropic-formatet for kompatibilitet
        return {
            id: response.body.id || uuidv4(),
            type: 'message',
            role: 'assistant',
            content: response.body.choices[0].message.content,
            model: response.body.model,
            usage: {
                inputTokens: response.body.usage.prompt_tokens,
                outputTokens: response.body.usage.completion_tokens,
                contextLength: 128000
            }
        };
    } catch (error) {
        electronLog.error('Feil ved sending av melding til Azure AI Foundry:', error);
        throw error;
    }
};

// Send melding til Azure AI Foundry API med strømming
const sendMessageStream = async (model, messages, apiKey = null) => {
    // Logg hvilken modell som faktisk sendes inn
    electronLog.info(`sendMessageStream called with model: ${model}, type: ${typeof model}`);

    // Velg riktig klient og initialiser hvis nødvendig
    let client, deploymentPath, apiVersion, payloadExtras = {};

    if (model === 'deepseek-r1') {
        // DeepSeek-R1 bruker egen klient, endpoint og api-versjon
        if (!deepseekClient) {
            const initialized = initDeepseekClient(apiKey || config.DEEPSEEK_R1_KEY);
            if (!initialized) {
                throw new Error('Kunne ikke initialisere DeepSeek-R1 klient');
            }
        }
        client = deepseekClient;
        deploymentPath = '/models/chat/completions'; // DeepSeek-R1 spesifikk sti
        apiVersion = '2024-05-01-preview'; // DeepSeek-R1 spesifikk API-versjon
        payloadExtras.model = "DeepSeek-R1"; // Påkrevd parameter for DeepSeek API

        electronLog.info('Bruker DeepSeek-R1 modell med eget endepunkt og API-versjon for streaming');
    } else {
        // Standard GPT-4o bruker Azure OpenAI klient
        if (!azureClient) {
            const initialized = initAzureClient(apiKey || config.AZURE_AI_FOUNDRY_KEY);
            if (!initialized) {
                throw new Error('Kunne ikke initialisere Azure AI Foundry klient');
            }
        }
        client = azureClient;
        deploymentPath = '/openai/deployments/gpt-4o/chat/completions';
        apiVersion = '2025-01-01-preview';

        electronLog.info('Bruker GPT-4o med standard Azure OpenAI endepunkt for streaming');
    }

    try {
        // Optimaliser meldingene men utnytt større kontekstvindu
        // Behold flere av de siste meldingene siden modellene har større kontekstvindu (128k tokens)
        const recentMessages = messages.length > 20 ? messages.slice(-20) : messages;

        // Konverter meldingsformatet til Azure AI Foundry format - med grundig feilhåndtering
        const azureMessages = [];

        // Logg original meldingsformat for debugging
        electronLog.info('Original messages structure:', JSON.stringify(recentMessages.map(m => ({
            role: m.role,
            contentType: m.content ? (Array.isArray(m.content) ? 'array' : typeof m.content) : 'undefined'
        })), null, 2)); // Mer lesbart format med indentation

        for (const msg of recentMessages) {
            try {
                // Sjekk at meldingsstrukturen er gyldig
                if (!msg || !msg.role) {
                    electronLog.warn('Skipping message with missing role');
                    continue;
                }

                // Standardinnhold hvis content mangler
                if (!msg.content) {
                    azureMessages.push({
                        role: msg.role,
                        content: msg.role === 'user' ? 'Empty message' : 'I apologize, but I could not understand the input'
                    });
                    continue;
                }

                // Hvis innholdet er en array (f.eks. med bilder), konverterer vi det til riktig format
                if (Array.isArray(msg.content)) {
                    const contents = [];

                    for (const item of msg.content) {
                        try {
                            if (!item) continue;

                            if (item.type === 'text') {
                                // Special handling for Excel content
                                if (item.for_ai_only && item.text && item.text.includes("EXCEL FILE CONTENT")) {
                                    // This is Excel content - include it directly
                                    electronLog.info('Processing Excel content block for AI');
                                    contents.push({ type: 'text', text: item.text || '' });
                                } else {
                                    contents.push({ type: 'text', text: item.text || '' });
                                }
                            }
                            else if (item.type === 'image' && item.source) {
                                // Convert image format to Azure OpenAI image_url format
                                contents.push({
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:${item.source.media_type};base64,${item.source.data}`
                                    }
                                });
                            }
                            else if (item.type === 'image_url') {
                                // Dette er allerede på OpenAI format
                                contents.push(item);
                            }
                        } catch (itemError) {
                            electronLog.error('Error processing message content item:', itemError);
                        }
                    }

                    // Legg bare til meldingen hvis den har innhold
                    if (contents.length > 0) {
                        azureMessages.push({
                            role: msg.role,
                            content: contents
                        });
                    } else {
                        // Legg til en standardtekst hvis det ikke finnes gyldig innhold
                        azureMessages.push({
                            role: msg.role,
                            content: msg.role === 'user' ? 'Empty message' : 'I apologize, but I could not understand the input'
                        });
                    }
                } else {
                    // For vanlig tekstinnhold
                    azureMessages.push({
                        role: msg.role,
                        // Økt grense for meldingens lengde for å utnytte større kontekstvindu
                        content: typeof msg.content === 'string' && msg.content.length > 32000
                            ? msg.content.substring(0, 32000) + "..."
                            : msg.content
                    });
                }
            } catch (msgError) {
                electronLog.error('Error processing message:', msgError);
            }
        }

        // Logg resulterende meldingsformat for debugging (begrenset utdrag for å unngå for mye logging)
        electronLog.info('Converted Azure messages structure:', JSON.stringify(azureMessages.map(m => ({
            role: m.role,
            contentType: Array.isArray(m.content) ? 'array' : typeof m.content,
            sampleContent: Array.isArray(m.content)
                ? m.content.map(c => ({ type: c.type, preview: c.type === 'text' ? (c.text?.substring(0, 50) + '...') : '[media content]' }))
                : (typeof m.content === 'string' ? m.content.substring(0, 50) + '...' : typeof m.content)
        })), null, 2)); // Mer lesbart format med indentation

        // Sikre at vi har minst en melding
        if (azureMessages.length === 0) {
            azureMessages.push({
                role: 'user',
                content: 'Hello'
            });
        }

        // Opprett payload for Azure AI Foundry
        const payload = {
            messages: azureMessages,
            // Ingen spesifikk max_tokens grense så modellen kan avslutte når den er ferdig
            temperature: 0.4, // Ytterligere redusert for raskere svar
            top_p: 0.9, // Ytterligere redusert for raskere svar
            stream: true,
            presence_penalty: 0,
            frequency_penalty: 0,
            ...payloadExtras // Legg til modellspesifikke parametere (som model for DeepSeek)
        };

        // Logg payload for debugging
        electronLog.info(`Sending streaming request with model=${model}, endpoint=${client?.endpoint || 'unknown'}${deploymentPath}`);
        electronLog.info(`API version: ${apiVersion}, model parameter: ${payload.model || 'Not set'}`);

        // Opprett en controller for timeout
        const controller = new AbortController();

        // Sett en timeout på 60 sekunder for å unngå at programmet henger
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, 60000); // 60 sekunder timeout for å håndtere større dokumenter

        try {
            // Send strømmende forespørsel til riktig klient og endepunkt med timeout
            const response = await client.path(deploymentPath).post({
                body: payload,
                queryParameters: { 'api-version': apiVersion },
                abortSignal: controller.signal
            }).asNodeStream();

            // Clear timeout since request completed
            clearTimeout(timeoutId);

            // Sjekk om responsen er vellykket
            if (response.status !== "200") {
                throw new Error(`Feil ved sending av strømmende melding til Azure AI Foundry: ${response.body?.error || 'Ukjent feil'}`);
            }

            // Opprett en SSE-strøm fra responsen
            const stream = response.body;
            if (!stream) {
                throw new Error('Responsen fra Azure AI Foundry inneholder ingen strøm');
            }

            // Returner en SSE-strøm som kan itereres over
            return createSseStream(stream);
        } catch (error) {
            // Clean up timeout
            clearTimeout(timeoutId);

            // If it was aborted due to timeout
            if (error.name === 'AbortError') {
                throw new Error('Forespørselen tok for lang tid og ble avbrutt. Dette kan skyldes at filen er for stor.');
            }

            // Rethrow other errors
            throw error;
        }
    } catch (error) {
        electronLog.error('Feil ved sending av strømmende melding til Azure AI Foundry:', error);
        throw error;
    }
};

// Ny funksjon for å sende melding og få garantert JSON-respons
const sendMessageWithJsonResponse = async (model, messages, apiKey = null) => {
    electronLog.info(`sendMessageWithJsonResponse called with model: ${model}`);

    // Velg riktig klient og initialiser hvis nødvendig
    let client, deploymentPath, apiVersion, payloadExtras = {};

    if (model === 'deepseek-r1') {
        if (!deepseekClient) initDeepseekClient(apiKey || config.DEEPSEEK_R1_KEY);
        client = deepseekClient;
        deploymentPath = '/models/chat/completions';
        apiVersion = '2024-05-01-preview';
        payloadExtras.model = "DeepSeek-R1";
        electronLog.info('Bruker DeepSeek-R1 for JSON-respons');
    } else { // Antar GPT-4o ellers
        if (!azureClient) initAzureClient(apiKey || config.AZURE_AI_FOUNDRY_KEY);
        client = azureClient;
        deploymentPath = '/openai/deployments/gpt-4o/chat/completions';
        apiVersion = '2025-01-01-preview';
        electronLog.info('Bruker GPT-4o for JSON-respons');
    }

    if (!client) {
        throw new Error('AI Client ikke initialisert');
    }

    try {
        // Konverter meldingsformat til Azure AI format (ligner på sendMessage)
        const azureMessages = messages.map(msg => {
            if (Array.isArray(msg.content)) {
                const contents = msg.content.map(item => {
                    if (item.type === 'text') {
                        return { type: 'text', text: item.text };
                    } else if (item.type === 'image_url') { // Forventer base64-kodet data i image_url.url
                        return { type: 'image_url', image_url: { url: item.image_url } };
                    }
                    return null;
                }).filter(Boolean);
                return { role: msg.role, content: contents };
            } else {
                return { role: msg.role, content: msg.content };
            }
        });

        // Opprett payload med krav om JSON-respons
        const payload = {
            messages: azureMessages,
            response_format: { type: "json_object" }, // Viktig for å garantere JSON
            temperature: 0, // Lavere temperatur for mer deterministisk JSON
            top_p: 1,
            ...payloadExtras
        };

        electronLog.info(`Sending request for JSON response with model=${model}`);

        const response = await client.path(deploymentPath).post({
            body: payload,
            queryParameters: { 'api-version': apiVersion }
        });

        // Returner hele respons-body som inneholder choices, usage etc.
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Feil fra Azure AI API (${response.status}): ${JSON.stringify(response.body)}`);
        }

        return response.body;

    } catch (error) {
        electronLog.error('Feil ved sending av melding for JSON-respons:', error);
        throw error;
    }
};

// Estimerer tokens fra tekst (grov estimering: ca 4 chars = 1 token)
const estimateTokens = (text) => {
    return Math.ceil(text.length / 4);
};

// Parse PDF file to readable text using pdf-parse
const parsePdfFile = async (filePath) => {
    try {
        electronLog.info(`Parsing PDF file: ${filePath}`);
        const dataBuffer = fs.readFileSync(filePath);

        // Betydelig økt max tokens grense for AI-modellen for å håndtere større dokumenter
        const MAX_TOKENS = 30000;
        let estimatedTokens = 0;

        // Parse PDF document
        const pdfData = await pdfParse(dataBuffer);

        // Extract useful metadata
        const numPages = pdfData.numpages;
        const info = pdfData.info || {};
        const pdfText = pdfData.text || '';

        // Split the text into lines for processing
        const lines = pdfText.split('\n').filter(line => line.trim().length > 0);

        let pdfContent = "PDF FILE CONTENT:\n\n";

        // Add metadata
        pdfContent += `Title: ${info.Title || 'Unknown'}\n`;
        pdfContent += `Pages: ${numPages}\n`;
        // Legg til et format som matcher regex i AiChatHandler.js og AiChatPage.js
        pdfContent += `## Page 1 of ${numPages}\n\n`;

        estimatedTokens = estimateTokens(pdfContent);

        // Add the content with token limitation
        let linesAdded = 0;
        const maxLines = Math.min(lines.length, 500);  // Limit lines to avoid too much content

        for (let i = 0; i < maxLines; i++) {
            const line = lines[i];
            const lineTokens = estimateTokens(line + '\n');

            // Check if we'd exceed token limit
            if (estimatedTokens + lineTokens > MAX_TOKENS) {
                pdfContent += `\n... Resten av innholdet vises ikke for å begrense datamengden ...\n`;
                break;
            }

            pdfContent += line + '\n';
            estimatedTokens += lineTokens;
            linesAdded++;

            // Add visual separation between paragraphs
            if (line.trim().length === 0) {
                pdfContent += '\n';
            }
        }

        // Add note if there is more content
        if (linesAdded < lines.length) {
            pdfContent += `\n... Document has ${lines.length - linesAdded} more lines not shown ...\n`;
        }

        electronLog.info(`PDF parsed, estimated tokens: ${estimatedTokens}, lines processed: ${linesAdded}`);
        return pdfContent;

    } catch (error) {
        electronLog.error('Error parsing PDF file:', error);
        return `Error parsing PDF file: ${error.message}`;
    }
};

// Parse Excel file to readable text
const parseExcelFile = async (filePath) => {
    try {
        electronLog.info(`Parsing Excel file: ${filePath}`);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        let excelContent = "EXCEL FILE CONTENT:\n\n";

        // Betydelig økt max tokens grense for AI-modellen for å håndtere større dokumenter
        const MAX_TOKENS = 30000;
        let estimatedTokens = estimateTokens(excelContent);
        let shouldBreak = false;

        // Process each worksheet
        for (let sheetIndex = 0; sheetIndex < workbook.worksheets.length && !shouldBreak; sheetIndex++) {
            const worksheet = workbook.worksheets[sheetIndex];

            // Legg til arknavnet og oppdater token-estimat
            const sheetHeader = `## Sheet: ${worksheet.name}\n\n`;
            excelContent += sheetHeader;
            estimatedTokens += estimateTokens(sheetHeader);

            // Get column headers (first row)
            const headerRow = worksheet.getRow(1);
            const headers = [];
            headerRow.eachCell((cell, colNumber) => {
                headers[colNumber] = cell.value?.toString() || `Column ${colNumber}`;
            });

            // Process rows (limit based on tokens og max 1000 rows)
            const maxRows = Math.min(worksheet.rowCount, 1000);
            const maxCols = Math.min(worksheet.columnCount, 50); // Økt antall kolonner som kan vises

            // Create a text representation of the data
            for (let rowNumber = 1; rowNumber <= maxRows && !shouldBreak; rowNumber++) {
                const row = worksheet.getRow(rowNumber);
                let rowText = "";

                // Process cells in this row
                for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
                    const cell = row.getCell(colNumber);
                    const value = cell.value !== null && cell.value !== undefined ? cell.value.toString() : "";
                    // Økt lengde for celleverdier til 60 tegn
                    const trimmedValue = value.length > 60 ? value.substring(0, 57) + "..." : value;
                    rowText += trimmedValue.padEnd(20, ' ') + " | ";
                }

                // Beregn tokens for denne raden og sjekk om vi nærmer oss grensen
                const tokensForRow = estimateTokens(rowText + "\n");
                if (estimatedTokens + tokensForRow > MAX_TOKENS) {
                    excelContent += `\n... Resten av innholdet vises ikke for å begrense datamengden ...\n`;
                    shouldBreak = true;
                    break;
                }

                excelContent += rowText + "\n";
                estimatedTokens += tokensForRow;

                // Add separator after header row
                if (rowNumber === 1) {
                    const separator = "-".repeat(rowText.length) + "\n";
                    excelContent += separator;
                    estimatedTokens += estimateTokens(separator);
                }
            }

            // Add note if there are more rows and we didn't break due to token limit
            if (worksheet.rowCount > maxRows && !shouldBreak) {
                const moreRowsNote = `\n... and ${worksheet.rowCount - maxRows} more rows not shown ...\n`;
                excelContent += moreRowsNote;
                estimatedTokens += estimateTokens(moreRowsNote);
            }

            if (!shouldBreak) {
                excelContent += "\n\n";
                estimatedTokens += 2; // for newlines
            }
        }

        electronLog.info(`Excel parsed, estimated tokens: ${estimatedTokens}`);
        return excelContent;
    } catch (error) {
        electronLog.error('Error parsing Excel file:', error);
        return `Error parsing Excel file: ${error.message}`;
    }
};

// Parse CSV file to readable text
const parseCsvFile = async (filePath) => {
    try {
        electronLog.info(`Parsing CSV file: ${filePath}`);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split('\n');

        // Skip empty lines
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);

        if (nonEmptyLines.length === 0) {
            return "CSV FILE CONTENT:\n\nEmpty file or no valid data found.";
        }

        let csvContent = "CSV FILE CONTENT:\n\n";

        // Betydelig økt max tokens grense for AI-modellen for å håndtere større dokumenter
        const MAX_TOKENS = 30000;
        let estimatedTokens = estimateTokens(csvContent);

        // Get headers from first line
        const headers = nonEmptyLines[0].split(',').map(header => header.trim());

        // Økt antall kolonner som kan vises
        const maxCols = Math.min(headers.length, 50);
        const limitedHeaders = headers.slice(0, maxCols);

        // Calculate column widths for better formatting
        const columnWidths = limitedHeaders.map(header => Math.max(header.length, 10));

        // Add headers
        let headerRow = "";
        limitedHeaders.forEach((header, index) => {
            // Økt lengde for overskrifter til 40 tegn
            const trimmedHeader = header.length > 40 ? header.substring(0, 37) + "..." : header;
            headerRow += trimmedHeader.padEnd(columnWidths[index] + 2, ' ') + " | ";
        });
        csvContent += headerRow + "\n";

        const separator = "-".repeat(headerRow.length) + "\n";
        csvContent += separator;

        // Oppdater token-estimat for header og separator
        estimatedTokens += estimateTokens(headerRow + "\n" + separator);

        // Process up to 1000 data rows, men stopp hvis vi når token-grensen
        const maxRows = Math.min(nonEmptyLines.length, 1000);
        let finalRow = maxRows;

        // Add data rows
        for (let i = 1; i < maxRows; i++) {
            const values = nonEmptyLines[i].split(',').map(value => value.trim());
            let rowText = "";

            // Process only up to maxCols
            for (let j = 0; j < maxCols; j++) {
                const value = j < values.length ? values[j] : "";
                // Økt lengde for celleverdier til 60 tegn
                const trimmedValue = value.length > 60 ? value.substring(0, 57) + "..." : value;

                // Use the same width as the header
                const width = j < columnWidths.length ? columnWidths[j] : 10;
                rowText += trimmedValue.padEnd(width + 2, ' ') + " | ";
            }

            // Beregn tokens for denne raden og sjekk om vi nærmer oss grensen
            const tokensForRow = estimateTokens(rowText + "\n");
            if (estimatedTokens + tokensForRow > MAX_TOKENS) {
                csvContent += `\n... Resten av innholdet vises ikke for å begrense datamengden ...\n`;
                finalRow = i;
                break;
            }

            csvContent += rowText + "\n";
            estimatedTokens += tokensForRow;
        }

        // Add note if there are more rows
        if (nonEmptyLines.length > finalRow) {
            const moreRowsNote = `\n... and ${nonEmptyLines.length - finalRow} more rows not shown ...\n`;
            csvContent += moreRowsNote;
            estimatedTokens += estimateTokens(moreRowsNote);
        }

        // Add note if there are more columns
        if (headers.length > maxCols) {
            const moreColsNote = `\n... and ${headers.length - maxCols} more columns not shown ...\n`;
            csvContent += moreColsNote;
            estimatedTokens += estimateTokens(moreColsNote);
        }

        electronLog.info(`CSV parsed, estimated tokens: ${estimatedTokens}`);
        return csvContent;
    } catch (error) {
        electronLog.error('Error parsing CSV file:', error);
        return `Error parsing CSV file: ${error.message}`;
    }
};

// Parse email file (EML or MSG) to readable text
const parseEmailFile = async (filePath) => {
    try {
        electronLog.info(`Parsing email file: ${filePath}`);
        const fileBuffer = fs.readFileSync(filePath);

        // Betydelig økt max tokens grense for AI-modellen for å håndtere større dokumenter
        const MAX_TOKENS = 30000;

        // Parse email using mailparser
        const parsedEmail = await simpleParser(fileBuffer);

        let emailContent = "EMAIL CONTENT:\n\n";

        // Add metadata
        emailContent += `From: ${parsedEmail.from?.text || 'Unknown'}\n`;
        emailContent += `To: ${parsedEmail.to?.text || 'Unknown'}\n`;
        if (parsedEmail.cc) emailContent += `CC: ${parsedEmail.cc.text}\n`;
        emailContent += `Subject: ${parsedEmail.subject || 'No Subject'}\n`;
        emailContent += `Date: ${parsedEmail.date?.toISOString() || 'Unknown'}\n\n`;

        // Add message body
        if (parsedEmail.text) {
            emailContent += `## Body:\n${parsedEmail.text}\n\n`;
        } else if (parsedEmail.html) {
            // Strip HTML tags in a simple way
            const strippedHtml = parsedEmail.html.replace(/<[^>]*>/g, '');
            emailContent += `## Body:\n${strippedHtml}\n\n`;
        } else {
            emailContent += "## Body:\n(No text content)\n\n";
        }

        // Add attachments info
        if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
            emailContent += `## Attachments:\n`;
            parsedEmail.attachments.forEach((attachment, index) => {
                emailContent += `${index + 1}. ${attachment.filename} (${attachment.contentType}, ${Math.round(attachment.size / 1024)} KB)\n`;
            });
            emailContent += '\n';
        }

        // Check if we need to truncate content
        let estimatedTokens = estimateTokens(emailContent);
        if (estimatedTokens > MAX_TOKENS) {
            // Simple truncation strategy
            emailContent = emailContent.substring(0, Math.floor(MAX_TOKENS * 4));
            emailContent += `\n\n... Resten av innholdet vises ikke for å begrense datamengden ...`;
        }

        electronLog.info(`Email parsed, estimated tokens: ${estimatedTokens}`);
        return emailContent;
    } catch (error) {
        electronLog.error('Error parsing email file:', error);
        return `Error parsing email file: ${error.message}`;
    }
};

// Behandle fil for melding
const processFileForMessage = async (filePath, fileType) => {
    try {
        const fileBuffer = fs.readFileSync(filePath);

        // Sjekk filstørrelse
        if (fileBuffer.length > MAX_FILE_SIZE) {
            throw new Error(`Filen er for stor. Maksimal tillatt størrelse er ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
        }

        // Handle Excel files
        const isExcel = fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            fileType === 'application/vnd.ms-excel' ||
            path.extname(filePath).toLowerCase() === '.xlsx' ||
            path.extname(filePath).toLowerCase() === '.xls';

        // Handle CSV files
        const isCsv = fileType === 'text/csv' ||
            path.extname(filePath).toLowerCase() === '.csv';

        // Handle Email files (EML, MSG)
        const isEmail = fileType === 'message/rfc822' ||
            fileType === 'application/vnd.ms-outlook' ||
            path.extname(filePath).toLowerCase() === '.eml' ||
            path.extname(filePath).toLowerCase() === '.msg';

        // Process Excel files
        if (isExcel) {
            electronLog.info(`Processing Excel file: ${filePath}`);

            // Parse Excel file
            const excelContent = await parseExcelFile(filePath);

            // Return as text content (Azure format)
            return {
                type: "text",
                text: excelContent
            };
        }

        // Process CSV files
        if (isCsv) {
            electronLog.info(`Processing CSV file: ${filePath}`);

            // Parse CSV file
            const csvContent = await parseCsvFile(filePath);

            // Return as text content (Azure format)
            return {
                type: "text",
                text: csvContent
            };
        }

        // Process Email files (EML, MSG)
        if (isEmail) {
            electronLog.info(`Processing email file: ${filePath}`);

            // Parse Email file
            const emailContent = await parseEmailFile(filePath);

            // Return as text content (Azure format)
            return {
                type: "text",
                text: emailContent
            };
        }

        // Fra dette punktet håndterer vi bare bildefiler og PDFs
        electronLog.info(`Processing image or PDF file: ${filePath}`);

        // For other file types (images)
        // Konverter fil til base64
        const base64Content = fileBuffer.toString('base64');

        // Handle PDF files
        const isPdf = fileType === 'application/pdf' ||
            path.extname(filePath).toLowerCase() === '.pdf';

        if (isPdf) {
            electronLog.info(`Processing PDF file: ${filePath}`);

            // Parse PDF file
            const pdfContent = await parsePdfFile(filePath);

            // Return as text content (Azure format)
            return {
                type: "text",
                text: pdfContent
            };
        }

        // Sikre at fileType er en av de støttede bildetypene
        const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!supportedTypes.includes(fileType)) {
            throw new Error('Filtypen støttes ikke. Kun JPEG, PNG, GIF og WebP-bilder støttes.');
        }

        // Returner i et format som er kompatibelt med Azure AI Foundry og OpenAI API
        return {
            type: "image_url",
            image_url: {
                url: `data:${fileType};base64,${base64Content}`
            }
        };
    } catch (error) {
        electronLog.error('Feil ved behandling av fil for melding:', error);
        throw error;
    }
};

// Rydd opp i gamle opplastinger
const cleanupOldUploads = () => {
    try {
        const uploadsDir = path.join(app.getPath('userData'), 'ai_uploads');
        if (!fs.existsSync(uploadsDir)) return;

        const files = fs.readdirSync(uploadsDir);
        const now = Date.now();

        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);

            // Fjern filer eldre enn 24 timer
            if (now - stats.mtimeMs > 24 * 60 * 60 * 1000) {
                fs.unlinkSync(filePath);
            }
        });
    } catch (error) {
        electronLog.error('Feil ved opprydding av gamle opplastinger:', error);
    }
};

// Varm opp Azure AI-tjenesten ved å sende en enkel forespørsel
const warmupAzureAI = async () => {
    try {
        // Initialiser og varm opp standard Azure OpenAI klient (GPT-4o)
        if (!azureClient) {
            const initialized = initAzureClient();
            if (!initialized) {
                electronLog.warn('Kunne ikke initialisere Azure AI Foundry klient for oppvarming');
                return;
            }
        }

        // Enkel oppvarmingsforespørsel med minimal token-bruk
        const warmupPayload = {
            messages: [{ role: 'user', content: 'Hei' }],
            max_tokens: 5,
            temperature: 0.1,
            top_p: 0.5
        };

        // Standard GPT-4o modell
        const gpt4oPath = '/openai/deployments/gpt-4o/chat/completions';
        const gpt4oApiVersion = '2025-01-01-preview';

        // Logg oppvarmingsendpoint for debugging
        electronLog.info(`GPT-4o warmup endpoint: ${azureClient?.endpoint || 'null'} with deployment path: ${gpt4oPath}`);

        electronLog.info('Sender oppvarmingsforespørsel til Azure OpenAI API...');

        // Send forespørsel med kort timeout for å unngå å blokkere for lenge
        const controller1 = new AbortController();
        const timeoutId1 = setTimeout(() => controller1.abort(), 5000); // 5 sekunder timeout

        try {
            await azureClient.path(gpt4oPath).post({
                body: warmupPayload,
                queryParameters: { 'api-version': gpt4oApiVersion },
                abortSignal: controller1.signal
            });

            electronLog.info('Azure OpenAI API (GPT-4o) oppvarming fullført');
        } catch (abortError) {
            // Hvis forespørselen tar for lang tid, avbryt den men ikke rapporter det som en feil
            if (abortError.name === 'AbortError') {
                electronLog.info('Azure OpenAI API oppvarming avbrutt (timeout), men tjenesten er sannsynligvis varmet opp');
            } else {
                throw abortError;
            }
        } finally {
            clearTimeout(timeoutId1);
        }

        // Initialiser og varm opp DeepSeek-R1 klient
        if (!deepseekClient) {
            const initialized = initDeepseekClient();
            if (!initialized) {
                electronLog.warn('Kunne ikke initialisere DeepSeek-R1 klient for oppvarming');
                return;
            }
        }

        // DeepSeek-R1 modell
        const deepseekPayload = {
            messages: [{ role: 'user', content: 'Hei' }],
            max_tokens: 5,
            temperature: 0.1,
            top_p: 0.5,
            model: 'DeepSeek-R1'
        };

        const deepseekPath = '/models/chat/completions';
        const deepseekApiVersion = '2024-05-01-preview';

        // Logg DeepSeek oppvarmingsendpoint
        electronLog.info(`DeepSeek-R1 warmup endpoint: ${deepseekClient?.endpoint || 'null'} with path: ${deepseekPath}`);

        electronLog.info('Sender oppvarmingsforespørsel til DeepSeek-R1 API...');

        // Send forespørsel med kort timeout
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 5000); // 5 sekunder timeout

        try {
            await deepseekClient.path(deepseekPath).post({
                body: deepseekPayload,
                queryParameters: { 'api-version': deepseekApiVersion },
                abortSignal: controller2.signal
            });

            electronLog.info('DeepSeek-R1 API oppvarming fullført');
        } catch (abortError) {
            if (abortError.name === 'AbortError') {
                electronLog.info('DeepSeek-R1 API oppvarming avbrutt (timeout), men tjenesten er sannsynligvis varmet opp');
            } else {
                throw abortError;
            }
        } finally {
            clearTimeout(timeoutId2);
        }
    } catch (error) {
        electronLog.warn('Feil ved oppvarming av AI-tjenester:', error);
        // Ignorer feil ved oppvarming - dette er bare en optimalisering
    }
};

// Eksporter funksjonen
module.exports = {
    initAzureClient,
    initDeepseekClient,
    saveUploadedFile,
    getAvailableModels,
    sendMessage,
    sendMessageStream,
    processFileForMessage,
    cleanupOldUploads,
    warmupAzureAI,
    parseExcelFile,
    parseCsvFile,
    parsePdfFile,
    parseEmailFile,
    MAX_FILE_SIZE,
    sendMessageWithJsonResponse
}; 