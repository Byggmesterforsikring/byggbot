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

            // Create a text block for the current content
            const textBlock = {
              type: 'text',
              text: contentText
            };

            // Update the message content
            messageContent = [textBlock];

            // Send the delta to the client
            event.sender.send('ai:stream-delta', {
              type: 'content_block_delta',
              messageContent: JSON.parse(JSON.stringify(messageContent))
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
      
      // Logg bildeinformasjon for debugging
      electronLog.info(`File uploaded successfully: ${fileName} (${mimeType}), contentBlock type: ${contentBlock.type}`);

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