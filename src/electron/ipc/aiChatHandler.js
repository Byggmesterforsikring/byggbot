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

      // Behold flere meldinger for å utnytte større kontekstvindu
      const recentMessages = optimizedMessages.length > 20 ?
        optimizedMessages.slice(-20) : optimizedMessages;

      // Logg detaljert info før vi sender til Azure
      electronLog.info(`Sending request to Azure AI with model=${model}`);
      electronLog.info(`Model type: ${typeof model}, value: ${JSON.stringify(model)}`);

      // Get streaming response
      const sseStream = await azureAiService.sendMessageStream(model, recentMessages, apiKey);

      // Prepare state tracking for the response
      let contentText = '';
      let messageContent = [];
      let tokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        contextLength: model === 'deepseek-r1' ? 128000 : 128000 // Begge modeller har samme kontekstvindu
      };

      // Process each SSE event as it arrives
      for await (const sseEvent of sseStream) {
        try {
          // Log [DONE] event but don't process it further
          if (sseEvent.data === '[DONE]') {
            electronLog.info('Received [DONE] event at end of stream');
            continue;
          }

          // Parse the event data
          const eventData = JSON.parse(sseEvent.data);

          // Logg event data for debugging
          electronLog.info(`Received event data type: ${eventData.object || 'unknown'}`);
          if (eventData.usage) {
            electronLog.info(`Event contains usage data: ${JSON.stringify(eventData.usage)}`);
          }

          // Hent token-bruk hvis den er tilgjengelig og lagre for endelig oppsummering
          if (eventData.usage) {
            tokenUsage.inputTokens = eventData.usage.prompt_tokens || tokenUsage.inputTokens;
            tokenUsage.outputTokens = eventData.usage.completion_tokens || tokenUsage.outputTokens;
            electronLog.info(`Updated token usage: input=${tokenUsage.inputTokens}, output=${tokenUsage.outputTokens}`);
          }

          if (eventData.choices && eventData.choices.length > 0) {
            // Extract the delta content from the chunk
            const deltaContent = eventData.choices[0].delta?.content || '';

            // Append to the accumulated content
            contentText += deltaContent;

            // Håndter <think> tags spesielt for DeepSeek-R1
            let processedContent = contentText;

            // Dette er spesialbehandling for DeepSeek-R1 som bruker <think></think> tags
            if (model === 'deepseek-r1') {
              // Sjekk om teksten inneholder <think>-tags
              const thinkMatch = processedContent.match(/<think>([\s\S]*?)(<\/think>|$)/);

              if (thinkMatch) {
                // Vi har funnet en <think>-tag, så vi må behandle dette spesielt
                const thinkContent = thinkMatch[1]; // Innholdet mellom tagene

                // Sjekk om det er innhold etter </think> taggen
                const endThinkTag = '</think>';
                const endThinkIndex = processedContent.indexOf(endThinkTag);
                let mainContent = '';

                if (endThinkIndex > -1 && endThinkIndex + endThinkTag.length < processedContent.length) {
                  // Det er innhold etter </think> taggen
                  mainContent = processedContent.substring(endThinkIndex + endThinkTag.length);
                }

                // Logg at vi fant think content
                electronLog.info(`DeepSeek-R1 thinking: Found think content (${thinkContent.length} chars) and main content (${mainContent.length} chars)`);

                // Opprett to blokker: en for tenketekst og en for hovedinnhold
                const blocks = [];

                // Legg til tenkeblokken
                blocks.push({
                  type: 'think',
                  text: thinkContent
                });

                // Legg til hovedinnholdet hvis det finnes
                if (mainContent) {
                  blocks.push({
                    type: 'text',
                    text: mainContent
                  });
                }

                // Oppdater meldingsinnholdet med begge blokkene
                messageContent = blocks;
              } else {
                // Ingen <think>-tags funnet ennå, behandle som vanlig tekst
                const textBlock = {
                  type: 'text',
                  text: String(processedContent) // Ensure it's a string
                };
                messageContent = [textBlock];
              }
            } else {
              // For andre modeller enn DeepSeek-R1, behandle som vanlig tekst
              const textBlock = {
                type: 'text',
                text: String(processedContent) // Ensure it's a string
              };
              messageContent = [textBlock];
            }

            // Send the delta to the client - use a deep clone to avoid reference issues
            // but don't use JSON parse/stringify which can alter formatting
            event.sender.send('ai:stream-delta', {
              type: 'content_block_delta',
              messageContent: messageContent.map(block => ({ ...block }))
            });
          }
        } catch (innerError) {
          electronLog.error('Error processing stream event:', innerError);
        }
      }

      // Stream processing is complete, prepare final response with token usage
      electronLog.info(`Stream complete. Final token usage: input=${tokenUsage.inputTokens}, output=${tokenUsage.outputTokens}, total=${tokenUsage.inputTokens + tokenUsage.outputTokens}`);

      // If we didn't get any token counts, estimate them from the messages
      if (tokenUsage.inputTokens === 0 && recentMessages.length > 0) {
        // Rough estimation: ~4 chars = 1 token
        let inputChars = 0;
        recentMessages.forEach(msg => {
          if (typeof msg.content === 'string') {
            inputChars += msg.content.length;
          } else if (Array.isArray(msg.content)) {
            msg.content.forEach(block => {
              if (block.type === 'text' && block.text) {
                inputChars += block.text.length;
              }
            });
          }
        });
        // Estimate input tokens
        tokenUsage.inputTokens = Math.ceil(inputChars / 4);
        electronLog.info(`Estimated input tokens: ${tokenUsage.inputTokens} (from ${inputChars} chars)`);
      }

      // Estimate output tokens from generated text
      if (tokenUsage.outputTokens === 0 && messageContent.length > 0) {
        let outputChars = 0;
        messageContent.forEach(block => {
          if (block.type === 'text' && block.text) {
            outputChars += block.text.length;
          }
        });
        // Estimate output tokens
        tokenUsage.outputTokens = Math.ceil(outputChars / 4);
        electronLog.info(`Estimated output tokens: ${tokenUsage.outputTokens} (from ${outputChars} chars)`);
      }

      // Send final message with token usage
      event.sender.send('ai:stream-complete', {
        role: 'assistant',
        content: messageContent,
        usage: tokenUsage
      });

    } catch (error) {
      electronLog.error('Error in streaming process:', error);

      // Lag en mer brukervenlig feilmelding basert på feilen
      let userFriendlyError = error.message || 'Unknown error during streaming';

      // Sjekk for spesifikke typer feil vi kan gi bedre feilmeldinger for
      if (error.message?.includes('tok for lang tid') || error.message?.includes('timeout')) {
        userFriendlyError = 'Filen er for stor eller kompleks for AI-analyse. Prøv å dele opp i mindre deler, eller prøv en annen AI-modell.';
      } else if (error.message?.includes('size')) {
        userFriendlyError = 'Filen er for stor. Maksimal filstørrelse er 30MB.';
      } else if (error.message?.toLowerCase().includes('service unavailable') || error.message?.includes('503')) {
        userFriendlyError = 'AI-tjenesten er midlertidig utilgjengelig. Vennligst prøv igjen senere.';
      }

      // Send feilmelding til klienten
      event.sender.send('ai:stream-error', {
        error: userFriendlyError
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

      // Sjekk om det er en e-post fil (EML eller MSG)
      const isEmailFile = mimeType === 'message/rfc822' ||
        mimeType === 'application/vnd.ms-outlook' ||
        fileName.toLowerCase().endsWith('.eml') ||
        fileName.toLowerCase().endsWith('.msg');

      electronLog.info(`File type check: ${fileName} is Excel: ${isExcelFile}, is CSV: ${isCsvFile}, is PDF: ${isPdfFile}, is Email: ${isEmailFile}`);

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

      // Tabell-filer (Excel/CSV), PDF-filer og e-post filer vil ha type "text" og innholdet vil være den parsede teksten
      if (isExcelFile || isCsvFile || isPdfFile || isEmailFile) {
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
        } else if (isEmailFile) {
          fileIcon = '✉️';
          fileTypeText = fileName.toLowerCase().endsWith('.eml') ? 'EML-fil' : 'MSG-fil';

          // For e-post filer, vis metadata
          const hasAttachments = contentBlock.text.includes("## Attachments:");
          sheetInfo = hasAttachments ? 'Med vedlegg, ' : '';
        }

        // Sjekk om innholdet er begrenset av token-grensen
        const isLimitedByTokens = contentBlock.text.includes("... Resten av innholdet vises ikke for å begrense datamengden ...");

        let limitInfo;
        if (isLimitedByTokens) {
          limitInfo = "Data er begrenset pga. størrelsen";
        } else if (rowCount > 200 && !isEmailFile) {
          limitInfo = "Begrenset til 200 rader";
        } else if (isEmailFile) {
          limitInfo = "Fullstendig e-post";
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