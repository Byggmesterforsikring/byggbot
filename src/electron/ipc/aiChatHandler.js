const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const electronLog = require('electron-log');
const azureAiService = require('../services/azureAiService');

// Variabel for å spore om oppvarming er gjort
let warmupDone = false;

const setupAiChatHandlers = () => {
  // Varm opp Azure AI-tjenesten ved oppstart
  setTimeout(() => {
    if (!warmupDone) {
      electronLog.info('Starter oppvarming av Azure AI Foundry...');
      azureAiService.warmupAzureAI()
        .then(() => {
          warmupDone = true;
        })
        .catch(err => {
          electronLog.warn('Feil ved oppvarming av Azure AI Foundry:', err);
        });
    }
  }, 2000); // Vent 2 sekunder etter oppstart før oppvarming

  // Initialize AI client with API key
  ipcMain.handle('ai:init', async (event, apiKey) => {
    try {
      // Hvis oppvarming ikke er gjort ennå, gjør det nå
      if (!warmupDone) {
        try {
          await azureAiService.warmupAzureAI();
          warmupDone = true;
        } catch (warmupError) {
          electronLog.warn('Feil ved oppvarming under initialisering:', warmupError);
          // Fortsett selv om oppvarming feiler
        }
      }

      return azureAiService.initAzureClient(apiKey);
    } catch (error) {
      electronLog.error('Error initializing AI client:', error);
      throw error;
    }
  });

  // Get available models
  ipcMain.handle('ai:get-models', async () => {
    try {
      return await azureAiService.getAvailableModels();
    } catch (error) {
      electronLog.error('Error getting AI models:', error);
      throw error;
    }
  });

  // Send message to AI (non-streaming)
  ipcMain.handle('ai:send-message', async (event, { model, messages, apiKey }) => {
    try {
      return await azureAiService.sendMessage(model, messages, apiKey);
    } catch (error) {
      electronLog.error('Error sending message to AI:', error);
      throw error;
    }
  });

  // Send message to AI with streaming
  ipcMain.on('ai:send-message-stream', async (event, { model, messages, apiKey }) => {
    try {
      // Notify client that streaming is starting
      event.sender.send('ai:stream-start');

      // Logging for debugging
      electronLog.info(`Streaming request with model: ${model}, message count: ${messages.length}`);
      
      // Log message types to help debug image issues - med feilhåndtering
      try {
        const messageTypes = messages.map(msg => {
          if (!msg || !msg.content) {
            return 'undefined_content';
          }
          
          if (typeof msg.content === 'string') {
            return 'text';
          } else if (Array.isArray(msg.content)) {
            return msg.content.map(item => item?.type || 'unknown').filter(Boolean).join(',');
          }
          return typeof msg.content;
        });
        electronLog.info(`Message content types: ${messageTypes.join(' | ')}`);
      } catch (logError) {
        electronLog.error('Error analyzing message content:', logError);
      }

      // Optimaliser meldingene før de sendes
      // Fjern unødvendige meldinger og begrens lengden på lange meldinger
      const optimizedMessages = messages.map(msg => {
        // Sjekk at meldingen har gyldig innhold
        if (!msg || !msg.content) {
          electronLog.warn('Skipping invalid message:', msg);
          return {
            role: 'user',
            content: 'Ugyldig melding'
          };
        }
        
        if (typeof msg.content === 'string' && msg.content.length > 1000) {
          return {
            ...msg,
            content: msg.content.substring(0, 1000) + "..."
          };
        }
        return msg;
      });

      // Behold bare de siste 6 meldingene hvis det er mange
      const recentMessages = optimizedMessages.length > 6 ?
        optimizedMessages.slice(-6) : optimizedMessages;

      // Get streaming response
      const sseStream = await azureAiService.sendMessageStream(model, recentMessages, apiKey);

      // Prepare state tracking for the response
      let contentText = '';
      let messageContent = [];

      // Process each SSE event as it arrives
      for await (const sseEvent of sseStream) {
        try {
          // Skip [DONE] event
          if (sseEvent.data === '[DONE]') {
            continue;
          }

          // Parse the event data
          const eventData = JSON.parse(sseEvent.data);

          if (eventData.choices && eventData.choices.length > 0) {
            // Extract the delta content from the chunk
            const deltaContent = eventData.choices[0].delta?.content || '';

            // Append to the accumulated content
            contentText += deltaContent;
            
            // Sikre at vi ikke mister noen spesialtegn eller formateringskoder
            // ved å bruke en enkel tilordning uten JSON.parse/stringify
            let processedContent = contentText;
            
            // Create a text block for the current content
            // Create a fresh object each time to avoid reference issues
            const textBlock = {
              type: 'text',
              text: String(processedContent) // Ensure it's a string
            };

            // Update the message content
            messageContent = [textBlock];

            // Send the delta to the client - use a deep clone to avoid reference issues
            // but don't use JSON parse/stringify which can alter formatting
            event.sender.send('ai:stream-delta', {
              type: 'content_block_delta',
              messageContent: messageContent.map(block => ({...block}))
            });
          }
        } catch (innerError) {
          electronLog.error('Error processing stream event:', innerError);
        }
      }

      // Stream processing is complete, send the final message
      event.sender.send('ai:stream-complete', {
        role: 'assistant',
        content: messageContent
      });

    } catch (error) {
      electronLog.error('Error in streaming process:', error);
      event.sender.send('ai:stream-error', {
        error: error.message || 'Unknown error during streaming'
      });
    }
  });

  // Handle file uploads for AI chat
  ipcMain.handle('ai:upload-file', async (event, { base64data, fileName, mimeType }) => {
    try {
      // Logg hvilke parametre vi mottar
      electronLog.info(`Received file upload request: ${fileName} (${mimeType}), base64data length: ${base64data?.length || 0}`);

      // Sjekk om det er en Excel-fil
      const isExcelFile = mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                         mimeType === 'application/vnd.ms-excel' ||
                         fileName.toLowerCase().endsWith('.xlsx') ||
                         fileName.toLowerCase().endsWith('.xls');
      
      // Sjekk om det er en CSV-fil
      const isCsvFile = mimeType === 'text/csv' || 
                       fileName.toLowerCase().endsWith('.csv');
                       
      // Sjekk om det er en PDF-fil
      const isPdfFile = mimeType === 'application/pdf' || 
                       fileName.toLowerCase().endsWith('.pdf');
                         
      electronLog.info(`File type check: ${fileName} is Excel: ${isExcelFile}, is CSV: ${isCsvFile}, is PDF: ${isPdfFile}`);

      if (!base64data || typeof base64data !== 'string') {
        electronLog.error('Invalid base64 data:', { 
          received: base64data, 
          type: typeof base64data,
          fileName,
          mimeType
        });
        throw new Error('No valid file data received');
      }
      
      // Convert base64 to Buffer
      const buffer = Buffer.from(base64data, 'base64');
      electronLog.info(`Converted base64 to buffer with length: ${buffer.length}`);
      
      // Save the file to disk
      const fileInfo = azureAiService.saveUploadedFile(buffer, fileName);

      // Process the file for message content
      const contentBlock = await azureAiService.processFileForMessage(fileInfo.filePath, mimeType);
      
      // Tabell-filer (Excel/CSV) og PDF-filer vil ha type "text" og innholdet vil være den parsede teksten
      if (isExcelFile || isCsvFile || isPdfFile) {
        // Logg fil-innholdet for debugging (begrenset til 200 tegn)
        const contentPreview = contentBlock.text?.substring(0, 200) + '...' || 'Ingen innhold';
        electronLog.info(`File parsed successfully: ${fileName}, content preview: ${contentPreview}`);
        
        // Azure OpenAI API format
        // For Azure bruker vi vanlig text-format uten for_ai_only flagg
        
        // Viktig: Overstyrer contentBlock for visning i UI
        // Sjekk antall rader i filen fra contentBlock.text
        const rowCount = (contentBlock.text.match(/\n/g) || []).length;
        
        // For Excel-filer, sjekk antall ark
        const sheetCount = isExcelFile ? (contentBlock.text.match(/## Sheet:/g) || []).length : 0;
        
        // Velg riktig ikon og info basert på filtype
        let fileIcon = '📄';  // Default icon 
        let fileTypeText = '';
        let sheetInfo = '';
        
        if (isExcelFile) {
          fileIcon = '📊';
          fileTypeText = 'Excel-fil';
          sheetInfo = `${sheetCount} ark${sheetCount > 1 ? 'er' : ''}, `;
        } else if (isCsvFile) {
          fileIcon = '📄';
          fileTypeText = 'CSV-fil';
          sheetInfo = '';
        } else if (isPdfFile) {
          fileIcon = '📑';
          fileTypeText = 'PDF-fil';
          
          // For PDF-filer, sjekk antall sider
          const pageCount = (contentBlock.text.match(/## Page \d+ of (\d+)/)?.[1]) || 0;
          sheetInfo = `${pageCount} side${pageCount > 1 ? 'r' : ''}, `;
        }
        
        // Sjekk om innholdet er begrenset av token-grensen
        const isLimitedByTokens = contentBlock.text.includes("... Resten av innholdet vises ikke for å begrense datamengden ...");
        
        let limitInfo;
        if (isLimitedByTokens) {
          limitInfo = "Data er begrenset pga. størrelsen";
        } else if (rowCount > 200) {
          limitInfo = "Begrenset til 200 rader";
        } else {
          limitInfo = rowCount + ' rader';
        }
        
        const uiContentBlock = {
          type: "text",
          text: `${fileIcon} **${fileTypeText}:** ${fileName}\n\n` + 
                `*Innhold: ${sheetInfo}${limitInfo}*\n\n` +
                `Filinnholdet er behandlet og klar for AI-analyse. ` +
                `Du kan nå stille spørsmål om innholdet i denne ${fileTypeText.toLowerCase()}.`
        };
        
        // Return begge versjoner
        return {
          success: true,
          contentBlock,  // Inneholder den parsede teksten i "text" feltet
          uiContentBlock,
          filePath: fileInfo.filePath
        };
      } else {
        // Logg vanlig filinfo for debugging
        electronLog.info(`File uploaded successfully: ${fileName} (${mimeType}), contentBlock type: ${contentBlock.type}`);
      }

      return {
        success: true,
        contentBlock,
        filePath: fileInfo.filePath
      };
    } catch (error) {
      electronLog.error('Error handling file upload:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Clean up old uploads periodically
  setInterval(() => {
    azureAiService.cleanupOldUploads();
  }, 3600000); // Run every hour

  // Legg til handler for manuell opprydding
  ipcMain.handle('ai:cleanup-uploads', async () => {
    try {
      azureAiService.cleanupOldUploads();
      return true;
    } catch (error) {
      electronLog.error('Error cleaning up old uploads:', error);
      return false;
    }
  });
};

module.exports = setupAiChatHandlers;