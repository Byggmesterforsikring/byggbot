const electronLog = require('electron-log');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { app } = require('electron');
const config = require('../config');
const ModelClient = require('@azure-rest/ai-inference').default;
const { AzureKeyCredential } = require('@azure/core-auth');
const { createSseStream } = require('@azure/core-sse');

// Max file size: 30MB in bytes
const MAX_FILE_SIZE = 30 * 1024 * 1024;

// Azure AI Foundry klient
let azureClient = null;

// Initialiser Azure AI Foundry klient
function initAzureClient(apiKey = null) {
    try {
        // Prioritér API nøkkel fra parameter, deretter fra config
        const key = apiKey || config.AZURE_AI_FOUNDRY_KEY;

        if (!key) {
            throw new Error('Mangler API-nøkkel for Azure AI Foundry');
        }

        const endpoint = config.AZURE_AI_FOUNDRY_ENDPOINT || 'https://byggbot3881369052.openai.azure.com';

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
        if (!azureClient) {
            // Sikre at klienten er initialisert
            const initialized = initAzureClient();
            if (!initialized) {
                throw new Error('Kunne ikke initialisere Azure AI Foundry klient');
            }
        }

        // For nå, returner hardkodede modeller siden Azure AI Foundry ikke har en API for å liste modeller
        // Dette kan utvides senere når flere modeller blir tilgjengelige
        return [
            { id: 'gpt-4o', name: 'GPT-4o', provider: 'azure' }
        ];
    } catch (error) {
        electronLog.error('Feil i getAvailableModels, bruker reservemodeller:', error);
        // Grunnleggende reservemodeller hvis alt annet feiler
        return [
            { id: 'gpt-4o', name: 'GPT-4o', provider: 'azure' }
        ];
    }
};

// Send melding til Azure AI Foundry API (ikke-strømmende)
const sendMessage = async (model, messages, apiKey = null) => {
    if (!azureClient) {
        // Bruk den angitte API-nøkkelen eller den fra config
        const initialized = initAzureClient(apiKey || config.AZURE_AI_FOUNDRY_KEY);
        if (!initialized) {
            throw new Error('Kunne ikke initialisere Azure AI Foundry klient');
        }
    }

    try {
        // Optimaliser meldingene for raskere respons
        // Behold bare de siste 6 meldingene for å redusere kontekststørrelsen og token-bruk
        const recentMessages = messages.length > 6 ? messages.slice(-6) : messages;

        // Konverter meldingsformatet til Azure AI Foundry format
        const azureMessages = recentMessages.map(msg => {
            // Hvis innholdet er en array (f.eks. med bilder), konverterer vi det til riktig format
            if (Array.isArray(msg.content)) {
                // For Azure API, må vi konvertere Anthropic-format til OpenAI-format
                const contents = msg.content.map(item => {
                    if (item.type === 'text') {
                        return { type: 'text', text: item.text };
                    } 
                    else if (item.type === 'image' && item.source) {
                        // Konvertere Anthropic image format til OpenAI image_url format
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
                // Begrens lengden på hver melding for å redusere token-bruk
                content: typeof msg.content === 'string' && msg.content.length > 1000
                    ? msg.content.substring(0, 1000) + "..."
                    : msg.content
            };
        });

        // Opprett payload for Azure AI Foundry
        const payload = {
            messages: azureMessages,
            max_tokens: 1024, // Ytterligere redusert for raskere respons og mindre token-bruk
            temperature: 0.4, // Ytterligere redusert for raskere svar
            top_p: 0.9, // Ytterligere redusert for raskere svar
            presence_penalty: 0,
            frequency_penalty: 0
        };

        // Bruk det korrekte endepunktet og API-versjonen
        const deploymentPath = '/openai/deployments/gpt-4o/chat/completions';
        const apiVersion = '2025-01-01-preview';

        // Send forespørsel til Azure AI Foundry
        const response = await azureClient.path(deploymentPath).post({
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
                input_tokens: response.body.usage.prompt_tokens,
                output_tokens: response.body.usage.completion_tokens
            }
        };
    } catch (error) {
        electronLog.error('Feil ved sending av melding til Azure AI Foundry:', error);
        throw error;
    }
};

// Send melding til Azure AI Foundry API med strømming
const sendMessageStream = async (model, messages, apiKey = null) => {
    if (!azureClient) {
        // Bruk den angitte API-nøkkelen eller den fra config
        const initialized = initAzureClient(apiKey || config.AZURE_AI_FOUNDRY_KEY);
        if (!initialized) {
            throw new Error('Kunne ikke initialisere Azure AI Foundry klient');
        }
    }

    try {
        // Optimaliser meldingene for raskere respons
        // Behold bare de siste 6 meldingene for å redusere kontekststørrelsen og token-bruk
        const recentMessages = messages.length > 6 ? messages.slice(-6) : messages;

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
                                contents.push({ type: 'text', text: item.text || '' });
                            } 
                            else if (item.type === 'image' && item.source) {
                                // Konvertere Anthropic image format til OpenAI image_url format
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
                        // Begrens lengden på hver melding for å redusere token-bruk
                        content: typeof msg.content === 'string' && msg.content.length > 1000
                            ? msg.content.substring(0, 1000) + "..."
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
            max_tokens: 1024, // Ytterligere redusert for raskere respons og mindre token-bruk
            temperature: 0.4, // Ytterligere redusert for raskere svar
            top_p: 0.9, // Ytterligere redusert for raskere svar
            stream: true,
            presence_penalty: 0,
            frequency_penalty: 0
        };

        // Bruk det korrekte endepunktet og API-versjonen
        const deploymentPath = '/openai/deployments/gpt-4o/chat/completions';
        const apiVersion = '2025-01-01-preview';

        // Send strømmende forespørsel til Azure AI Foundry
        const response = await azureClient.path(deploymentPath).post({
            body: payload,
            queryParameters: { 'api-version': apiVersion }
        }).asNodeStream();

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
        electronLog.error('Feil ved sending av strømmende melding til Azure AI Foundry:', error);
        throw error;
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

        // Konverter fil til base64
        const base64Content = fileBuffer.toString('base64');

        // Sjekk om det er en PDF - vi må konvertere PDF-er til bilder eller håndtere dem annerledes
        if (fileType === 'application/pdf') {
            throw new Error('PDF-format støttes ikke. Vennligst konverter til bildeformat (JPEG, PNG, GIF eller WebP) før opplasting.');
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

        const deploymentPath = '/openai/deployments/gpt-4o/chat/completions';
        const apiVersion = '2025-01-01-preview';

        electronLog.info('Sender oppvarmingsforespørsel til Azure AI Foundry...');

        // Send forespørsel med kort timeout for å unngå å blokkere for lenge
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sekunder timeout

        try {
            await azureClient.path(deploymentPath).post({
                body: warmupPayload,
                queryParameters: { 'api-version': apiVersion },
                abortSignal: controller.signal
            });

            electronLog.info('Azure AI Foundry oppvarming fullført');
        } catch (abortError) {
            // Hvis forespørselen tar for lang tid, avbryt den men ikke rapporter det som en feil
            if (abortError.name === 'AbortError') {
                electronLog.info('Azure AI Foundry oppvarming avbrutt (timeout), men tjenesten er sannsynligvis varmet opp');
            } else {
                throw abortError;
            }
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (error) {
        electronLog.warn('Feil ved oppvarming av Azure AI Foundry:', error);
        // Ignorer feil ved oppvarming - dette er bare en optimalisering
    }
};

// Eksporter funksjonen
module.exports = {
    initAzureClient,
    saveUploadedFile,
    getAvailableModels,
    sendMessage,
    sendMessageStream,
    processFileForMessage,
    cleanupOldUploads,
    warmupAzureAI,
    MAX_FILE_SIZE
}; 