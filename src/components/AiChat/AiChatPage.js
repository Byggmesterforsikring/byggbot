import React, { useState, useEffect, useRef, Fragment } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Container,
  Tooltip,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Engineering as EngineeringIcon,
  ContentCopy as ContentCopyIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  Check as CheckIcon,
  SmartToy as SmartToyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Markdown from 'markdown-to-jsx';

// Maximum size for attachments in bytes (30MB)
const MAX_FILE_SIZE = 30 * 1024 * 1024;

// Array med byggebransje-relaterte "loading" tekster
const loadingTexts = [
  "Beregner statiske laster...",
  "Analyserer byggeforskriftene...",
  "Vurderer materialkvaliteter...",
  "Kontrollerer tilbudsgrunnlaget...",
  "Gjennomgår tegningsmaterialet...",
  "Sjekker byggtekniske detaljer...",
  "Kalkulerer forsikringsbehov...",
  "Validerer entreprenørens ansvar...",
  "Vurderer HMS-forskriftene...",
  "Analyserer prosjektplanen...",
  "Beregner takst og verdivurdering...",
  "Undersøker garantivilkår...",
  "Evaluerer risikoelementer...",
  "Leser bransjestandarder...",
  "Gjennomgår kontraktsvilkår...",
  "Vurderer miljøkrav og bærekraft...",
  "Beregner kostnadsestimat...",
];

const AiChatPage = () => {
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [availableModels, setAvailableModels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamResponse, setStreamResponse] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const streamListeners = useRef(null);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);
  const [formattedMessages, setFormattedMessages] = useState([]);
  const [formattingTransition, setFormattingTransition] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const loadingTextIntervalRef = useRef(null);

  // Effect to scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Effect for handling transition from streaming to formatted text
  useEffect(() => {
    if (formattingTransition) {
      // Trigger completion of transition after first animation completes
      const timer = setTimeout(() => {
        // Fjern flagg KUN for den siste meldingen (som faktisk gjennomgår en overgang)
        setMessages(prevMessages => {
          // Finn siste meldingen fra assistenten
          const lastMessageIndex = prevMessages.length - 1;
          if (lastMessageIndex >= 0 && prevMessages[lastMessageIndex].role === 'assistant') {
            const newMessages = [...prevMessages];
            newMessages[lastMessageIndex] = {
              ...newMessages[lastMessageIndex],
              streaming: false,
              formattingTransition: false
            };
            return newMessages;
          }
          return prevMessages;
        });
        
        // Reset transition state
        setTimeout(() => {
          setFormattingTransition(false);
        }, 50);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [formattingTransition]);

  // Effect to get available models on component mount
  useEffect(() => {
    // Initialiser AI-klienten med bedriftens felles API-nøkkel
    initializeAiClient();

    // Get available models
    fetchAvailableModels();

    // Set a timeout message for model loading
    const timeout = setTimeout(() => {
      if (availableModels.length === 0) {
        console.warn("Models are taking a long time to load, using default model");
      }
    }, 5000);

    // Clean up uploads when component unmounts
    return () => {
      window.electron.aiChat.cleanupUploads();
      clearTimeout(timeout);
    };
  }, []);

  const initializeAiClient = async () => {
    try {
      // Bruker den felles API-nøkkelen som er konfigurert i backend
      const success = await window.electron.aiChat.initClient();
      if (!success) {
        console.error("Failed to initialize AI client");
      }
    } catch (error) {
      console.error("Error initializing AI client:", error);
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const models = await window.electron.aiChat.getModels();
      console.log("Available models:", models);
      setAvailableModels(models);

      // If user's selected model is not in the list, update to default
      if (models.length > 0 && !models.find(m => m.id === selectedModel)) {
        setSelectedModel(models[0].id);
      }
    } catch (error) {
      console.error("Error fetching available models:", error);
    }
  };

  const handleModelChange = (event) => {
    setSelectedModel(event.target.value);
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  // API-nøkkel håndteres nå på backend-nivå

  // Cleanup stream listeners when component unmounts
  useEffect(() => {
    return () => {
      if (streamListeners.current) {
        streamListeners.current.cleanup();
      }
      
      // Rydd opp loading-animasjon timer hvis den finnes
      if (loadingTextIntervalRef.current) {
        clearInterval(loadingTextIntervalRef.current);
      }
    };
  }, []);
  
  // Effekt for å håndtere animert "genererer svar" tekst
  useEffect(() => {
    // Start animasjon når streaming starter
    if (isStreaming && !loadingTextIntervalRef.current) {
      // Sett en interval som roterer gjennom ulike laste-tekster
      loadingTextIntervalRef.current = setInterval(() => {
        setLoadingTextIndex(prev => (prev + 1) % loadingTexts.length);
      }, 2000); // Bytt tekst hvert 2. sekund
    } 
    // Stopp animasjon når streaming er ferdig
    else if (!isStreaming && loadingTextIntervalRef.current) {
      clearInterval(loadingTextIntervalRef.current);
      loadingTextIntervalRef.current = null;
      setLoadingTextIndex(0); // Reset til første tekst
    }
    
    // Cleanup
    return () => {
      if (loadingTextIntervalRef.current) {
        clearInterval(loadingTextIntervalRef.current);
      }
    };
  }, [isStreaming]);

  const handleSubmit = async () => {
    if ((!inputValue && attachments.length === 0) || isLoading || isStreaming) return;

    try {
      setIsLoading(true);

      // Add user message to chat - ensure content is never empty
      const userMessage = {
        role: 'user',
        content: inputValue ? [{ type: 'text', text: inputValue }] : [{ type: 'text', text: ' ' }], // Fallback to space if empty
      };

      // Håndter spesiell visning for Excel-filer i brukerens meldinger
      let hasExcelFiles = false;
      
      // Add attachments if any
      for (const attachment of attachments) {
        // Excel-filer vil bli parsert på server-siden og komme tilbake som tekst
        if (attachment.type.includes('sheet') || 
            attachment.name.endsWith('.xlsx') || 
            attachment.name.endsWith('.xls')) {
          hasExcelFiles = true;
        }
        
        // Include all attachment content blocks in the user message
        if (attachment.contentBlock) {
          // If it's Excel content, make sure it's processed correctly
          if (hasExcelFiles && attachment.contentBlock.type === 'text') {
            console.log("Excel content block to include:", attachment.contentBlock);
            
            // For Azure compatibility, we don't need the for_ai_only flag
            // Just include the full Excel content
            userMessage.content.push(attachment.contentBlock);
          } else {
            userMessage.content.push(attachment.contentBlock);
          }
        }
      }

      // Viktig: Oppdater messages state med brukerens melding OG legg til en placeholder for assistentens svar
      // Dette sikrer at vi har en assistentmelding som kan oppdateres når streaming starter
      setMessages((prevMessages) => [
        ...prevMessages,
        userMessage,
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Genererer svar...' }]
        }
      ]);
      console.log('La til brukermelding og tom assistentmelding');

      // Clear input field and attachments
      setInputValue('');
      setAttachments([]);

      // Send message to Azure OpenAI API with streaming - Viktig å bruke oppdatert meldingshistorikk
      // OBS: Siden vi nettopp la til to meldinger i setMessages, men state er ikke oppdatert ennå,
      // må vi lage en kopi av meldingene for å sende til API-et
      const allMessages = [...messages, userMessage]; // Ikke inkluder placeholder-meldingen til API
      console.log('Meldingshistorikk som sendes til API:', allMessages);

      // Set up streaming
      setIsStreaming(true);

      // Initialize an empty reference since we don't have a message yet
      setStreamResponse(null);

      // Fast systemmelding på norsk
      const systemInstruction = "Du er en hjelpsom assistent som svarer på norsk.";

      // Start streaming
      const stream = window.electron.aiChat.sendMessageStream({
        model: selectedModel,
        messages: allMessages,
        system: systemInstruction
      });

      // Store listeners for cleanup
      streamListeners.current = stream;

      // Listen for stream events
      stream.onStart(() => {
        console.log('Stream started');
      });

      // Handle streaming content updates
      stream.onDelta((data) => {
        console.log('Received delta update:', data.type, data);

        // Skip if no data or invalid update
        if (!data || !data.type) {
          console.warn('Received empty or invalid data in stream delta');
          return;
        }

        // For content-related events, we need messageContent
        if (data.type !== 'message_start' &&
          (data.type === 'content_block_start' || data.type === 'content_block_delta' || data.type === 'content_block_stop')
          && (!data.messageContent || !Array.isArray(data.messageContent))) {
          console.warn(`Missing messageContent for ${data.type} event`);
          return;
        }

        // Process each event type according to the docs
        if (data.type === 'message_start') {
          console.log('Message start event received');
          // Når vi mottar message_start, har vi allerede lagt til en tom assistentmelding i handleSubmit
          // Vi trenger derfor ikke å legge til en ny melding her, men kan fortsette med oppdateringer
          console.log('Mottok message_start, fortsetter med oppdateringer');

          // Hvis vi av en eller annen grunn ikke har en assistentmelding som siste melding:
          setMessages(prevMessages => {
            const lastIndex = prevMessages.length - 1;
            if (lastIndex < 0 || prevMessages[lastIndex].role !== 'assistant') {
              console.warn('Ingen assistentmelding funnet ved message_start, legger til ny');
              // Legg til en ny tom assistentmelding
              return [...prevMessages, {
                role: 'assistant',
                content: [{ type: 'text', text: 'Genererer svar...' }]
              }];
            }
            return prevMessages; // Ingen endring nødvendig
          });
        }
        else if (data.type === 'content_block_start') {
          console.log('Content block starting:', data.contentBlockType);
        }
        else if (data.type === 'content_block_delta') {
          console.log('Content delta received - length:', (data.deltaText || '').length);
        }
        else if (data.type === 'content_block_stop') {
          console.log('Content block completed');
        }
        else if (data.type === 'message_delta') {
          console.log('Message metadata update received');
          // Usually contains usage information
          return; // Don't update UI for metadata
        }
        else if (data.type === 'message_stop') {
          console.log('Message stop event received');
          // Final event, handled by onComplete
          return;
        }

        // Update the message with the latest content for all content-related events
        // Skip updating for message_start since we handle that separately
        if (data.type !== 'message_start' && data.messageContent) {
          console.log('Oppdaterer melding med nytt innhold', data.type, data.messageContent);

          setMessages(prevMessages => {
            const newMessages = [...prevMessages];

            // Siden vi alltid legger til en 'message_start' i streaming, bør det alltid være en assistentmelding sist
            // Vi oppdaterer kun hvis siste melding er fra assistenten
            const lastIndex = newMessages.length - 1;

            if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
              console.log('Fant assistentmelding på index', lastIndex);
              // Oppdater kun siste meldingen hvis den er fra assistenten
              // Viktig: Vi bruker en dyp klone av data.messageContent for å unngå referanseproblemer
              if (Array.isArray(data.messageContent) && data.messageContent.length > 0) {
                const safeMessageContent = data.messageContent.map(content => {
                  if (content.type === 'text') {
                    return {
                      type: 'text',
                      text: content.text
                    };
                  }
                  return content;
                });
                
                newMessages[lastIndex] = {
                  role: 'assistant',
                  content: safeMessageContent,
                  streaming: true // Marker at denne meldingen fortsatt streames
                };
              }
            } else {
              // Fallback: Hvis det av en eller annen grunn ikke finnes en assistentmelding
              console.warn('Ingen assistentmelding funnet for oppdatering, legger til ny', newMessages);
              
              const safeMessageContent = Array.isArray(data.messageContent) ? 
                data.messageContent.map(c => ({...c})) : data.messageContent;
                
              newMessages.push({
                role: 'assistant',
                content: safeMessageContent,
                streaming: true // Marker at denne meldingen fortsatt streames
              });
            }

            return newMessages;
          });
        }
      });

      stream.onComplete((finalResponse) => {
        console.log('Stream completed, received complete response');

        // Start the formatting transition animation med litt forsinkelse
        setTimeout(() => {
          setFormattingTransition(true);
        }, 100);

        // At this point the streaming is done and we have the final response
        // We could replace the message with the finalResponse, but that's not needed
        // since we've been updating it all along. Just update the state to indicate streaming is done.

        // First make sure our final message has all content exactly as the finalResponse
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          // Ved onComplete bør siste melding være assistentens melding som vi oppdaterer
          if (newMessages.length > 0 && finalResponse) {
            const lastIndex = newMessages.length - 1;

            // Bare oppdater hvis siste melding er fra assistenten
            if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
              // Sjekk at finalResponse faktisk har innhold
              if (finalResponse.content && Array.isArray(finalResponse.content) && finalResponse.content.length > 0) {
                // Sjekk at minst én content block har faktisk tekst
                const hasContent = finalResponse.content.some(item =>
                  (item.type === 'text' && item.text && item.text.trim() !== '') ||
                  (item.type === 'image' && item.source && item.source.data)
                );

                // Oppdater bare hvis det faktisk finnes innhold
                if (hasContent) {
                  // Kopier finalResponse og merk at meldingen skal ha formaterings-overgang
                  const finalResponseWithTransition = {
                    ...finalResponse,
                    streaming: false,
                    formattingTransition: true
                  };
                  newMessages[lastIndex] = finalResponseWithTransition;
                  
                  // Start animasjonstransisjon etter en kort forsinkelse
                  setTimeout(() => {
                    setFormattingTransition(true);
                  }, 50);
                } else {
                  // Hvis det ikke er noe innhold, legg til en feilmelding
                  newMessages[lastIndex] = {
                    role: 'assistant',
                    content: [{ type: 'text', text: 'Kunne ikke generere et svar. Vennligst prøv igjen.' }],
                    streaming: false
                  };
                }
              } else {
                // Hvis response ikke har innhold, legg til en feilmelding
                newMessages[lastIndex] = {
                  role: 'assistant',
                  content: [{ type: 'text', text: 'Kunne ikke generere et svar. Vennligst prøv igjen.' }],
                  streaming: false
                };
              }
            }
          }
          return newMessages;
        });

        setIsStreaming(false);
        setStreamResponse(null);
      });

      stream.onError((error) => {
        console.error('Stream error:', error);

        // Håndter feil i streaming - oppdater siste assistentmelding eller legg til en ny
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          const lastIndex = updatedMessages.length - 1;

          // Sjekk om siste melding er fra assistenten
          if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'assistant') {
            // Hvis siste melding er fra assistenten, oppdater den med feilmelding
            // Create a fresh object to avoid reference issues
            updatedMessages[lastIndex] = {
              role: 'assistant',
              content: [{
                type: 'text',
                text: `Feil: ${error.error || 'Kunne ikke hente svar fra AI'}`
              }]
            };
          } else {
            // Legg til en ny assistentmelding med feilmeldingen
            // Create a fresh object to avoid reference issues
            updatedMessages.push({
              role: 'assistant',
              content: [{
                type: 'text',
                text: `Feil: ${error.error || 'Kunne ikke hente svar fra AI'}`
              }]
            });
          }

          return updatedMessages;
        });

        setIsStreaming(false);
        setStreamResponse(null);
      });

    } catch (error) {
      console.error('Error sending message:', error);

      // Add error message to chat
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: `Feil: ${error.message || 'Kunne ikke hente svar fra AI'}`,
            },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: async (acceptedFiles) => {
      // Filter files that are too large
      const validFiles = acceptedFiles.filter(file => file.size <= MAX_FILE_SIZE);

      if (validFiles.length !== acceptedFiles.length) {
        alert(`Some files were too large. Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }

      // Kategoriser filer etter type
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const documentTypes = ['application/pdf'];
      const dataTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'application/vnd.oasis.opendocument.spreadsheet'
      ];
      const textTypes = [
        'text/plain',
        'application/rtf',
        'text/markdown'
      ];

      // Alle støttede filtyper kombinert
      const supportedTypes = [...imageTypes, ...documentTypes, ...dataTypes, ...textTypes];

      // Filtrer ut ugyldige filtyper
      const typesValidFiles = validFiles.filter(file => supportedTypes.includes(file.type) || 
        file.name.endsWith('.xlsx') || file.name.endsWith('.xls')); // Legg til Excel-filer basert på filendelse

      if (typesValidFiles.length !== validFiles.length) {
        const unsupportedFiles = validFiles.filter(file => !supportedTypes.includes(file.type) && 
          !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls'))
          .map(file => `${file.name} (${file.type})`).join(', ');
        alert(`Unsupported file types: ${unsupportedFiles}\n\nSupported file types include:\n- Images (JPEG, PNG, GIF, WebP)\n- Documents (PDF)\n- Data files (Excel, CSV)`);
      }

      // Process valid files
      for (const file of typesValidFiles) {
        try {
          console.log(`Processing file: ${file.name}, type: ${file.type}`);

          // Kategoriser filen basert på type
          const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
          const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf');
          const isDataFile = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'application/vnd.oasis.opendocument.spreadsheet'
          ].includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
          const isTextFile = ['text/plain', 'application/rtf', 'text/markdown'].includes(file.type);

          // Is it specifically Excel
          const isExcelFile = file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
          
          // Is it specifically CSV
          const isCsvFile = file.type === 'text/csv' || file.name.endsWith('.csv');

          // Les filen riktig basert på filtype
          const reader = new FileReader();

          // Bruk Promise for å vente på at filen er lest
          const fileContent = await new Promise((resolve, reject) => {
            if (isImage) {
              // For bilder, les som data URL
              reader.onload = () => resolve(reader.result);
              reader.onerror = error => reject(error);
              reader.readAsDataURL(file);
            } else if (isPDF) {
              // For PDF-filer, bruk ArrayBuffer så vi kan lese binært data på server-siden
              reader.onload = () => resolve({
                name: file.name,
                size: file.size,
                type: 'application/pdf',
                rawData: reader.result,  // Binærdata som vil bli håndtert på serveren
                isPdf: true
              });
              reader.onerror = error => reject(error);
              reader.readAsArrayBuffer(file);
            } else if (isExcelFile) {
              // For Excel-filer, bruk ArrayBuffer så vi kan lese binært data på server-siden
              reader.onload = () => resolve({
                name: file.name,
                size: file.size,
                type: file.type.includes('sheet') ? file.type : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                rawData: reader.result,  // Binærdata som vil bli håndtert på serveren
                isExcel: true
              });
              reader.onerror = error => reject(error);
              reader.readAsArrayBuffer(file);
            } else if (isCsvFile) {
              // For CSV-filer
              if (file.size > 5 * 1024 * 1024) { // For store CSV-filer (over 5MB), bruk ArrayBuffer
                reader.onload = () => resolve({
                  name: file.name,
                  size: file.size,
                  type: 'text/csv',
                  rawData: reader.result,  // Binærdata som vil bli håndtert på serveren
                  isCsv: true
                });
                reader.onerror = error => reject(error);
                reader.readAsArrayBuffer(file);
              } else {
                // For mindre CSV-filer kan vi lese som tekst, men vi sender den fortsatt til backend for parsing
                reader.onload = () => resolve({
                  name: file.name,
                  size: file.size,
                  type: 'text/csv',
                  rawData: reader.result,  // Tekstdata som vil bli håndtert på serveren
                  isCsv: true,
                  isText: true
                });
                reader.onerror = error => reject(error);
                reader.readAsText(file);
              }
            } else {
              // For tekst og andre data-filer, prøv å lese som tekst
              reader.onload = () => resolve(reader.result);
              reader.onerror = error => reject(error);
              reader.readAsText(file);
            }
          });

          let contentBlock;
          let uiContentBlock; // Separate content block for UI display

          if (isImage) {
            // For bilder, bruk image content block med base64 data
            contentBlock = {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type,
                data: fileContent.split(',')[1] // Remove the data URL prefix
              }
            };
          } else if (isPDF) {
            // For PDF-filer, forbered for opplasting til server
            // Chatten vil vise en foreløpig melding inntil server parser PDF
            
            // For visning i chatten (brukerens melding under opplasting)
            uiContentBlock = {
              type: "text",
              text: `📑 **PDF-fil:** ${file.name} (${Math.round(file.size / 1024)} KB)\n\n*Analyserer innhold fra PDF-filen...*`
            };
          } else if (isExcelFile || isCsvFile) {
            // For Excel og CSV filer, forbered for opplasting til server
            // Chatten vil vise en foreløpig melding inntil server parser filen
            
            // Velg riktig ikon og filtype basert på filformatet
            const fileIcon = isExcelFile ? '📊' : '📄';
            const fileType = isExcelFile ? 'Excel-fil' : 'CSV-fil';
            
            // For visning i chatten (brukerens melding under opplasting)
            uiContentBlock = {
              type: "text",
              text: `${fileIcon} **${fileType}:** ${file.name} (${Math.round(file.size / 1024)} KB)\n\n*Analyserer data fra ${fileType.toLowerCase()}...*`
            };
            
            // For data som sendes til AI-server
            if (fileContent && fileContent.rawData) {
              // Server vil konvertere Excel til tekst med exceljs, men vi trenger en placeholder her
              const base64Data = btoa(String.fromCharCode.apply(null, 
                new Uint8Array(fileContent.rawData).slice(0, 100)));  // bare start for logg
              
              console.log(`Preparing to send Excel file (${file.name}, ${fileContent.rawData.byteLength} bytes) to server`);
              
              // Sett opp en midlertidig content-block inntil serveren returnerer parsede data
              contentBlock = { 
                type: "text",
                text: `[Excel-fil: ${file.name}]`,
                is_excel: true,
                needs_parsing: true
              };
            } else {
              contentBlock = {
                type: "text",
                text: `Excel-fil: ${file.name} kunne ikke leses.`
              };
            }
          } else {
            // For tekst- og datafiler
            let textContent = "";
            
            // For CSV, forbedre håndteringen
            if (isDataFile && file.name.endsWith('.csv')) {
              // For CSV, prøv å formatere som tabell
              textContent = `CSV-fil: ${file.name}\n\n`;
              try {
                const rows = fileContent.split('\n').filter(line => line.trim());
                // Legg til faktisk innhold hvis det ikke er binært
                if (rows.length > 0 && !(/[^\x20-\x7E]/.test(rows[0]))) {
                  textContent += fileContent;
                } else {
                  textContent += "[CSV-innholdet kan ikke vises direkte, men AI-modellen kan analysere informasjonen. Vennligst still spørsmål om dataene.]";
                }
              } catch (e) {
                textContent += "[CSV-innholdet kan ikke vises direkte, men AI-modellen kan analysere informasjonen. Vennligst still spørsmål om dataene.]";
              }
            } else if (isDataFile) {
              // For andre datafiler, vis ikon og filnavn med veiledning
              textContent = `📄 Datafil: ${file.name} (${Math.round(file.size / 1024)} KB)\n\n`;
              textContent += "For å gjøre innholdet i denne datafilen tilgjengelig for AI-assistenten, vennligst:\n\n";
              textContent += "1. Beskriv innholdet i filen (hva slags data den inneholder)\n";
              textContent += "2. Kopier relevante deler fra filen hvis mulig\n";
              textContent += "3. Still konkrete spørsmål om dataene du er interessert i";
              
              // Legg til en identifikator
              textContent += "\n\n[DATA_FILE_IDENTIFIER]";
            } else {
              // For vanlige tekstfiler
              textContent = fileContent;
            }

            // Bruk vanlig tekstblokk for tekst og data
            contentBlock = {
              type: "text",
              text: textContent
            };
          }

          console.log(`File processed successfully: ${file.name}`);

          // Add to attachments, with special handling for Excel/CSV/PDF files
          if ((isExcelFile || isCsvFile || isPDF) && uiContentBlock) {
            // For Excel, CSV and PDF files, upload to server for parsing
            try {
              if (window.electron && window.electron.aiChat) {
                let fileType;
                if (isExcelFile) fileType = 'Excel';
                else if (isCsvFile) fileType = 'CSV';
                else if (isPDF) fileType = 'PDF';
                else fileType = 'unknown';
                
                console.log(`Uploading ${fileType} file ${file.name} to backend for parsing...`);
                
                let base64data;
                
                if (fileContent.isText && fileContent.rawData) {
                  // For text-based CSV files, convert text to Base64
                  base64data = btoa(unescape(encodeURIComponent(fileContent.rawData)));
                } else {
                  // For binary data (Excel, PDF, and large CSV files), extract base64 data from ArrayBuffer
                  const array = new Uint8Array(fileContent.rawData);
                  const chunks = [];
                  const chunkSize = 8192;
                  
                  for (let i = 0; i < array.length; i += chunkSize) {
                    chunks.push(String.fromCharCode.apply(null, array.slice(i, i + chunkSize)));
                  }
                  
                  base64data = btoa(chunks.join(''));
                }
                
                // Make sure we have proper data to upload
                console.log(`Preparing ${fileType} upload: ${file.name}, base64data length: ${base64data.length}`);
                
                // Upload file to server for parsing
                const response = await window.electron.aiChat.uploadFile({ 
                  base64data, 
                  fileName: file.name,
                  mimeType: fileContent.type || 
                           (isExcelFile ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
                            isCsvFile ? 'text/csv' : 
                            isPDF ? 'application/pdf' : 'application/octet-stream')
                });
                
                if (response.success) {
                  let fileTypeDesc;
                  if (isExcelFile) fileTypeDesc = 'Excel';
                  else if (isCsvFile) fileTypeDesc = 'CSV';
                  else if (isPDF) fileTypeDesc = 'PDF';
                  else fileTypeDesc = 'file';
                  
                  console.log(`${fileTypeDesc} file ${file.name} uploaded successfully, received parsed content (${response.contentBlock.text.length} chars)`);
                  
                  // Get proper mime type
                  let mimeType;
                  if (isExcelFile) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                  else if (isCsvFile) mimeType = 'text/csv';
                  else if (isPDF) mimeType = 'application/pdf';
                  else mimeType = 'application/octet-stream';
                  
                  // Add both the parsed content for AI and the UI version for display
                  setAttachments(prev => [
                    ...prev,
                    {
                      name: file.name,
                      size: file.size,
                      type: fileContent.type || mimeType,
                      contentBlock: response.contentBlock,   // Actual parsed content for AI
                      uiContentBlock: uiContentBlock         // Simple display version for UI
                    }
                  ]);
                } else {
                  let fileTypeDesc;
                  if (isExcelFile) fileTypeDesc = 'Excel';
                  else if (isCsvFile) fileTypeDesc = 'CSV';
                  else if (isPDF) fileTypeDesc = 'PDF';
                  else fileTypeDesc = 'file';
                  
                  console.error(`Error uploading ${fileTypeDesc} file ${file.name}:`, response.error);
                  alert(`Error processing ${fileTypeDesc} file: ${response.error}`);
                }
              } else {
                // Fallback if not in Electron context
                setAttachments(prev => [
                  ...prev,
                  {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    contentBlock: uiContentBlock || contentBlock
                  }
                ]);
              }
            } catch (error) {
              console.error("Error uploading Excel file:", error);
              alert(`Failed to process Excel file ${file.name}: ${error.message}`);
            }
          } else {
            // Regular file handling
            setAttachments(prev => [
              ...prev,
              {
                name: file.name,
                size: file.size,
                type: file.type,
                contentBlock
              }
            ]);
          }
        } catch (error) {
          console.error("Error processing file:", error);
          alert(`Failed to process file ${file.name}: ${error.message}`);
        }
      }
    },
    maxSize: MAX_FILE_SIZE,
    accept: {
      // Bilder
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      // Dokumenter
      'application/pdf': ['.pdf'],
      // Excel/Data filer
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'text/comma-separated-values': ['.csv'], // Alternative MIME type for CSV
      'application/csv': ['.csv'], // Another alternative MIME type for CSV
      'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
      // Tekstfiler
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf'],
      'text/markdown': ['.md', '.markdown']
    }
  });

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const renderMessageContent = (content, isLastMessage = false, message = null) => {
    // Make sure we have valid content
    if (!content || !Array.isArray(content) || content.length === 0) {
      if (isStreaming && isLastMessage) {
        // Viser en lasteindikatør under streaming
        return <Typography color="text.secondary">Genererer svar...</Typography>;
      }
      return <Typography color="text.secondary">Ingen innhold</Typography>;
    }
    
    // Sjekk om denne meldingen er under formaterings-overgang
    // Viktig: Formaterings-overgangen gjelder kun for den SISTE meldingen
    const isTransitioning = isLastMessage && message && message.formattingTransition;
    
    // Fjern eventuelle skjulte data-flagg fra visningen (men ikke fra dataen som sendes til AI)
    const processedContent = content.map(item => {
      if (item.type === 'text' && item.text) {
        // Fjern blokkene med [EXCEL_DATA:...] og [DATA_FILE:...] for visning
        let processedText = item.text.replace(/\n\n\[(EXCEL_DATA|DATA_FILE):[^\]]+\]/g, '');
        
        // Sjekk om dette er tabell-innhold (Excel, CSV eller PDF)
        if (item.text.includes("EXCEL FILE CONTENT")) {
          // Skjul selve Excel-dataene, men vis en oppsummering
          const rows = item.text.split('\n').length - 3; // Cirka antall rader
          const sheetsMatch = item.text.match(/## Sheet: /g);
          const sheets = sheetsMatch ? sheetsMatch.length : 1;
          
          // For Excel-filer som er sendt til AI, vis kun en kompakt oppsummering, ikke hele innholdet
          processedText = `📊 **Excel-data** (${sheets} ark${sheets > 1 ? 'er' : ''}, ${rows} rader er tilgjengelig for AI)`;
        } else if (item.text.includes("CSV FILE CONTENT")) {
          // Skjul selve CSV-dataene, men vis en oppsummering
          const rows = item.text.split('\n').length - 3; // Cirka antall rader
          
          // For CSV-filer som er sendt til AI, vis kun en kompakt oppsummering, ikke hele innholdet
          processedText = `📄 **CSV-data** (${rows} rader er tilgjengelig for AI)`;
        } else if (item.text.includes("PDF FILE CONTENT")) {
          // Skjul selve PDF-dataene, men vis en oppsummering
          const pageMatch = item.text.match(/## Page \d+ of (\d+)/);
          const pages = pageMatch ? parseInt(pageMatch[1]) : 0;
          
          // For PDF-filer som er sendt til AI, vis kun en kompakt oppsummering, ikke hele innholdet
          processedText = `📑 **PDF-data** (${pages} side${pages !== 1 ? 'r' : ''} er tilgjengelig for AI)`;
        }
        
        return {
          ...item,
          text: processedText
        };
      }
      return item;
    });

    return processedContent.map((item, index) => {
      if (!item) {
        return null;
      }

      if (item.type === 'text') {
        // Get the text content and handle empty case
        const text = item.text || '';
        
        // Sjekker om dette er tabellfil-data (Excel, CSV eller PDF) for spesialhåndtering
        const isTableFile = text.includes('**Excel-fil:**') || text.includes('**CSV-fil:**') || 
                            text.includes('**PDF-fil:**') || text.includes('**Excel-data**') || 
                            text.includes('**CSV-data**') || text.includes('**PDF-data**');
        
        // Hvis teksten er tom og dette er den eneste innholdsdelen, vis en beskjed
        if (text.trim() === '' && content.length === 1) {
          if (isStreaming && isLastMessage) {
            return (
              <Box 
                key={index} 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  animation: 'pulse 1.5s infinite ease-in-out',
                  '@keyframes pulse': {
                    '0%': { opacity: 0.6 },
                    '50%': { opacity: 1 },
                    '100%': { opacity: 0.6 }
                  }
                }}
              >
                <Typography color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={14} thickness={4} sx={{ mr: 1.5 }} />
                  {loadingTexts[loadingTextIndex]}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontSize: '0.7rem', opacity: 0.7 }}>
                  Bygger svaret på grunnlag av alle tilgjengelige data...
                </Typography>
              </Box>
            );
          }
          return <Typography key={index} color="text.secondary">Ingen innhold</Typography>;
        }
        
        // Spesialhåndtering for tabell-filer (Excel/CSV)
        if (isTableFile) {
          return (
            <Box 
              key={index} 
              sx={{
                display: 'flex',
                flexDirection: 'column',
                padding: '8px 12px',
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                borderRadius: '8px',
                borderLeft: '3px solid #1976d2',
                margin: '8px 0'
              }}
            >
              <Markdown>{text}</Markdown>
            </Box>
          );
        }

        // Fjern horisontale skillelinjer (---) og forbedre spacing mellom innhold og overskrifter
        let processedText = text.replace(/\n\s*---+\s*\n/g, '\n\n');
        // Legg til litt ekstra mellomrom før overskrifter for bedre visuell separasjon
        processedText = processedText.replace(/(\n[^#\n]+\n)(#+\s+)/g, '$1\n$2');
        
        // For normal markdown content
        return (
          <Box
            key={index}
            className="markdown-content"
            sx={{
              width: '100%',
              whiteSpace: 'pre-wrap',
              padding: '0.25rem',
              position: 'relative',
              // Fjerne nesten alt mellomrom mellom elementer
              // Prioritize our direct styles over global rules
              'h1, h2, h3, p, ul, ol, li': { 
                margin: '0 !important',
                lineHeight: '1.5 !important'
              },
              'ul, ol': { 
                padding: '0 0 0 1.5rem !important',
                marginBottom: '0.8rem !important',
                marginTop: '0.5rem !important'
              },
              'li': {
                marginBottom: '0.4rem !important',
                paddingBottom: '0 !important'
              },
              'p + p': {
                marginTop: '0.8rem !important'
              },
              'h1, h2, h3': {
                marginTop: '1.8rem !important',
                marginBottom: '0.5rem !important',
                color: '#333333 !important'
              },
              'h1:first-child, h2:first-child, h3:first-child': {
                marginTop: '0.8rem !important'
              },
              'h1 + p, h2 + p, h3 + p': {
                marginTop: '0.5rem !important'
              },
              'ul ul, ol ol, ul ol, ol ul': {
                marginTop: '0.2rem !important',
                marginBottom: '0.2rem !important'
              },
              'hr': {
                display: 'none !important' // Skjul horisontale skillelinjer
              },
              'table': {
                borderCollapse: 'collapse !important',
                width: '100% !important',
                margin: '1rem 0 !important',
                border: '1px solid #e0e0e0 !important',
                tableLayout: 'fixed !important'
              },
              'th, td': {
                border: '1px solid #e0e0e0 !important',
                padding: '0.5rem !important',
                textAlign: 'left !important'
              },
              'th': {
                backgroundColor: '#f5f5f5 !important',
                fontWeight: 'bold !important'
              },
              'tr:nth-of-type(even)': {
                backgroundColor: '#fafafa !important'
              }
            }}>
            <Fragment>
              {/* Under streaming og ved formatering, viser den uformaterte teksten med crossfade-effekt */}
              {((isStreaming && isLastMessage) || (message?.streaming && isLastMessage) || isTransitioning) && (
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  fontFamily: 'inherit',
                  margin: '0.25rem 0',
                  position: 'relative',
                  opacity: isTransitioning ? 0 : 1,
                  transition: 'opacity 0.3s ease-out',
                  zIndex: isTransitioning ? 1 : 2,
                  // Trimmer whitespace i bunnen av teksten under streaming
                  maxHeight: (isStreaming && isLastMessage) ? (processedText.split('\n').filter(line => line.trim()).length * 24) + 'px' : 'auto',
                  overflow: 'hidden'
                }}>
                  {processedText}
                </div>
              )}
              
              {/* Formatert markdown som fades inn når den er klar */}
              <div style={{
                position: 'relative', 
                zIndex: isTransitioning ? 2 : 1,
                opacity: isTransitioning ? 1 : ((!isStreaming || !isLastMessage) ? 1 : 0),
                transition: 'opacity 0.4s ease-in',
                display: (isStreaming && isLastMessage && !isTransitioning) ? 'none' : 'block',
                height: (isStreaming && isLastMessage && !isTransitioning) ? 0 : 'auto'
              }}>
                <Markdown
                  options={{
                    overrides: {
                    p: {
                      component: 'p',
                      props: {
                        style: {
                          margin: '0.7rem 0',
                          padding: 0,
                          lineHeight: 1.6
                        }
                      }
                    },
                    h1: {
                      component: 'h1',
                      props: {
                        style: {
                          margin: '1.8rem 0 0.6rem',
                          fontSize: '1.4rem',
                          fontWeight: 'bold',
                          lineHeight: 1.3,
                          color: '#333333'
                        }
                      }
                    },
                    h2: {
                      component: 'h2',
                      props: {
                        style: {
                          margin: '1.8rem 0 0.5rem',
                          fontSize: '1.3rem',
                          fontWeight: 'bold',
                          lineHeight: 1.3,
                          color: '#333333'
                        }
                      }
                    },
                    h3: {
                      component: 'h3',
                      props: {
                        style: {
                          margin: '1.6rem 0 0.4rem',
                          fontSize: '1.2rem',
                          fontWeight: 'bold',
                          lineHeight: 1.3,
                          color: '#333333'
                        }
                      }
                    },
                    ul: {
                      component: 'ul',
                      props: {
                        style: {
                          margin: '0.8rem 0',
                          paddingLeft: '1.8rem',
                          lineHeight: 1.5
                        }
                      }
                    },
                    ol: {
                      component: 'ol',
                      props: {
                        style: {
                          margin: '0.8rem 0',
                          paddingLeft: '1.8rem',
                          lineHeight: 1.5
                        }
                      }
                    },
                    li: {
                      component: 'li',
                      props: {
                        style: {
                          margin: '0.4rem 0',
                          padding: 0,
                          lineHeight: 1.5
                        }
                      }
                    },
                    code: {
                      component: 'code',
                      props: {
                        style: {
                          backgroundColor: '#f5f5f5',
                          padding: '0.1rem 0.3rem',
                          borderRadius: '3px',
                          fontSize: '0.9em'
                        }
                      }
                    },
                    pre: {
                      component: 'pre',
                      props: {
                        style: {
                          backgroundColor: '#f5f5f5',
                          padding: '0.8rem',
                          margin: '0.8rem 0',
                          borderRadius: '4px',
                          overflowX: 'auto',
                          lineHeight: 1.4,
                          fontSize: '0.95em'
                        }
                      }
                    },
                    table: {
                      component: 'table',
                      props: {
                        style: {
                          borderCollapse: 'collapse',
                          width: '100%',
                          margin: '1rem 0',
                          border: '1px solid #e0e0e0',
                          tableLayout: 'fixed'
                        }
                      }
                    },
                    th: {
                      component: 'th',
                      props: {
                        style: {
                          border: '1px solid #e0e0e0',
                          padding: '0.5rem',
                          backgroundColor: '#f5f5f5',
                          fontWeight: 'bold',
                          textAlign: 'left'
                        }
                      }
                    },
                    td: {
                      component: 'td',
                      props: {
                        style: {
                          border: '1px solid #e0e0e0',
                          padding: '0.5rem',
                          textAlign: 'left'
                        }
                      }
                    },
                    blockquote: {
                      component: 'blockquote',
                      props: {
                        style: {
                          borderLeft: '4px solid #e0e0e0',
                          paddingLeft: '1rem',
                          margin: '0.8rem 0',
                          color: '#555'
                        }
                      }
                    }
                  }
                }}
              >
                {processedText}
              </Markdown>
              </div>
            </Fragment>
          </Box>
        );
      } else if (item.type === 'image') {
        // Render image from base64 data
        const imageData = item.source?.data;
        const mimeType = item.source?.media_type;
        if (!imageData || !mimeType) return null;

        return (
          <Box key={index} sx={{ my: 2 }}>
            <img
              src={`data:${mimeType};base64,${imageData}`}
              alt="Attached image"
              style={{
                maxWidth: '100%',
                maxHeight: '300px',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
          </Box>
        );
      }
      return null;
    });
  };


  const copyMessageToClipboard = (message, index) => {
    // Ekstraherer tekst fra meldingsinnholdet
    let textToCopy = '';
    if (message.content && Array.isArray(message.content)) {
      message.content.forEach(item => {
        if (item.type === 'text') {
          textToCopy += item.text;
        }
      });
    }

    // Kopier til utklippstavlen
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopiedMessageIndex(index);
        // Tilbakestill ikonstatus etter 2 sekunder
        setTimeout(() => {
          setCopiedMessageIndex(null);
        }, 2000);
      })
      .catch(err => {
        console.error('Feil ved kopiering:', err);
        alert('Kunne ikke kopiere teksten: ' + err);
      });
  };

  // Funksjon for å prøve på nytt med samme spørsmål
  const retryLastQuestion = () => {
    // Sjekk at det er minst en bruker-melding og en assistent-melding
    if (messages.length < 2) return;

    // Finn siste bruker-melding
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) return;

    // Fjern alle meldinger etter den siste bruker-meldingen
    const newMessages = messages.slice(0, lastUserMessageIndex + 1);
    setMessages(newMessages);

    // Kjør brukerens siste melding på nytt
    const lastUserMessage = messages[lastUserMessageIndex];

    // For å unngå duplikat-meldinger i historikken, fjern først den siste brukermeldingen
    // som vi nettopp har beholdt, siden vi vil legge den til igjen i handleSubmit
    setMessages(newMessages.slice(0, newMessages.length - 1));

    // Kjør denne meldingen som en ny forespørsel
    // Sett inputValue til brukerens tekst så handleSubmit kan bruke den
    if (lastUserMessage.content && Array.isArray(lastUserMessage.content)) {
      // Finn tekstinnholdet
      const textContent = lastUserMessage.content.find(item => item.type === 'text');
      if (textContent && textContent.text) {
        setInputValue(textContent.text);
        // Bruk setTimeout for å sikre at state er oppdatert
        setTimeout(() => {
          handleSubmit();
        }, 0);
      }
    }
  };

  const startNewChat = () => {
    // Bekreft hvis det er meldinger i chatvinduet
    if (messages.length > 0) {
      if (window.confirm('Er du sikker på at du vil starte en ny samtale? Nåværende samtale vil bli slettet.')) {
        setMessages([]);
        setAttachments([]);
        setInputValue('');
      }
    } else {
      // Hvis det ikke er noen meldinger, bare nullstill uten å spørre
      setMessages([]);
      setAttachments([]);
      setInputValue('');
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 1,
                  bgcolor: '#6158e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <SmartToyIcon sx={{ color: 'white', fontSize: 32 }} />
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 600,
                    color: 'text.primary',
                  }}
                >
                  BMF Assistent
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    mt: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  Byggmesterforsikring <InfoIcon fontSize="small" sx={{ ml: 0.5, fontSize: 16 }} />
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddCircleOutlineIcon />}
                onClick={startNewChat}
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  textTransform: 'none',
                  bgcolor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                }}
              >
                Ny samtale
              </Button>

              <Tooltip title="Ny samtale">
                <IconButton
                  onClick={startNewChat}
                  sx={{
                    display: { xs: 'flex', md: 'none' }
                  }}
                >
                  <AddCircleOutlineIcon />
                </IconButton>
              </Tooltip>

              <FormControl sx={{ minWidth: { xs: 150, sm: 200 } }}>
                <InputLabel id="model-select-label">Modell</InputLabel>
                <Select
                  labelId="model-select-label"
                  value={selectedModel}
                  onChange={handleModelChange}
                  label="Modell"
                  size="small"
                >
                  {availableModels.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Tooltip title="Innstillinger">
                <IconButton
                  onClick={() => setSettingsOpen(true)}
                >
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        {/* Messages Container */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, pb: 9, bgcolor: '#f9f9f9' }}>
          {messages.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                py: 4
              }}
            >
              {/* Grid med funksjoner og eksempler - redusert til 2 */}
              <Grid container spacing={3} sx={{ maxWidth: 1000, mb: 5 }}>
                {/* Første seksjon - Daglig kundeservice */}
                <Grid item xs={12} md={6}>
                  <Card sx={{
                    height: '100%',
                    p: 3,
                    borderRadius: 3,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.07)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 15px rgba(0,0,0,0.1)'
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.light', mr: 2 }}>
                        <InfoIcon />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Kundekorrespondanse
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                      Få hjelp med kundehenvendelser, utforminger av e-poster, og svar på vanlige spørsmål om forsikringer og tjenester.
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Prøv å spørre om:
                    </Typography>
                    <Box sx={{ pl: 1 }}>
                      {['Kan du hjelpe meg med å svare på denne e-posten?',
                        'Kan du oversette denne teksten til Norsk?',
                        'Jeg trenger hjelp med å forklare en kunde hvordan grønt kort fungerer.'].map((question, index) => (
                          <Button
                            key={index}
                            variant="text"
                            size="small"
                            sx={{
                              justifyContent: 'flex-start',
                              textAlign: 'left',
                              textTransform: 'none',
                              display: 'block',
                              mb: 0.5,
                              fontWeight: 'normal',
                              color: 'primary.dark'
                            }}
                            onClick={() => {
                              setInputValue(question);
                              inputRef.current?.focus();
                            }}
                          >
                            • {question}
                          </Button>
                        ))}
                    </Box>
                  </Card>
                </Grid>

                {/* Andre seksjon - Verktøy og daglig arbeid */}
                <Grid item xs={12} md={6}>
                  <Card sx={{
                    height: '100%',
                    p: 3,
                    borderRadius: 3,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.07)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 15px rgba(0,0,0,0.1)'
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'info.light', mr: 2 }}>
                        <SettingsIcon />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Daglig arbeid og verktøy
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                      Effektiviser dine daglige arbeidsoppgaver med hjelp til Excel-formler, rapporter, presentasjoner og tolkning av tegningsregler.
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Prøv å spørre om:
                    </Typography>
                    <Box sx={{ pl: 1 }}>
                      {['Lag en Excel-formel for å beregne månedlig premie basert på forsikringssum',
                        'Sammenstill data fra ukesrapporter til en månedsoversikt',
                        'Hjelp meg å tolke tegningsreglene for våtrom i dette prosjektet'].map((question, index) => (
                          <Button
                            key={index}
                            variant="text"
                            size="small"
                            sx={{
                              justifyContent: 'flex-start',
                              textAlign: 'left',
                              textTransform: 'none',
                              display: 'block',
                              mb: 0.5,
                              fontWeight: 'normal',
                              color: 'info.dark'
                            }}
                            onClick={() => {
                              setInputValue(question);
                              inputRef.current?.focus();
                            }}
                          >
                            • {question}
                          </Button>
                        ))}
                    </Box>
                  </Card>
                </Grid>
              </Grid>

              {/* Bunntekst med ytterligere info */}
              <Box
                sx={{
                  maxWidth: 800,
                  textAlign: 'center',
                  p: 3,
                  bgcolor: '#f5f5f5',
                  borderRadius: 3
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  <InfoIcon sx={{ fontSize: 16, mr: 0.5, mb: -0.3 }} />
                  BMF Assistent er et AI-verktøy for ansatte i Byggmesterforsikring designet for å støtte ditt daglige arbeid.
                  Bruk BMF Assistent til å effektivisere arbeidsoppgaver, men kontroller alltid viktig informasjon mot offisielle kilder.
                </Typography>
              </Box>
            </Box>
          ) : (
            messages.map((message, index) => (
              <Box
                key={index}
                sx={{
                  mb: 2,
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  position: 'relative'
                }}
              >
                <Card
                  sx={{
                    maxWidth: '90%',
                    borderRadius: '18px',
                    bgcolor: message.role === 'user'
                      ? '#E3F2FD' // Light blue for user
                      : (index === messages.length - 1 && isStreaming)
                        ? '#F5F5F5' // Light gray for streaming message
                        : '#FFFFFF', // White for assistant
                    boxShadow: message.role === 'user' ? 1 : 2,
                    borderTopRightRadius: message.role === 'user' ? 0 : '18px',
                    borderTopLeftRadius: message.role === 'user' ? '18px' : 0,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: message.role === 'user' ? '#90CAF9' : '#E0E0E0',
                    marginLeft: message.role === 'user' ? 'auto' : '40px',
                    marginRight: message.role === 'user' ? '40px' : 'auto',
                  }}
                >
                  <CardContent sx={{ pt: 2, pb: 2, px: 3, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ position: 'relative' }}>
                      {/* Debugging info - fjern i produksjon */}
                      {/* <Typography variant="caption" color="gray">
                        {index}. {message.role}: {JSON.stringify(message.content).substring(0, 50)}...
                      </Typography> */}

                      {/* Hvis streaming pågår og det er siste melding, vis en lasteindikatør hvis innholdet er tomt */}
                      {index === messages.length - 1 && isStreaming && (!message.content || !message.content.length) ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                          <CircularProgress size={16} sx={{ mr: 1 }} />
                          <Typography color="text.secondary">Genererer svar...</Typography>
                        </Box>
                      ) : (
                        renderMessageContent(
                          message.content,
                          index === messages.length - 1 && isStreaming,
                          message
                        )
                      )}

                      {/* Handlingsknapper for assistentens meldinger */}
                      {message.role === 'assistant' && !isStreaming && (
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            mt: 1.5,
                            gap: 1
                          }}
                        >
                          {/* Retry-knapp */}
                          <Tooltip title="Prøv på nytt">
                            <IconButton
                              size="small"
                              onClick={retryLastQuestion}
                              sx={{
                                color: 'text.secondary',
                                bgcolor: 'rgba(255, 255, 255, 0.7)',
                                border: '1px solid rgba(0, 0, 0, 0.05)',
                                padding: '3px',
                                '&:hover': {
                                  opacity: 1,
                                  color: 'primary.main',
                                  bgcolor: 'rgba(255, 255, 255, 0.9)'
                                }
                              }}
                            >
                              <RefreshIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* Kopieringsknapp */}
                          <Tooltip title="Kopier svar">
                            <IconButton
                              size="small"
                              onClick={() => copyMessageToClipboard(message, index)}
                              sx={{
                                color: copiedMessageIndex === index ? 'success.main' : 'text.secondary',
                                bgcolor: 'rgba(255, 255, 255, 0.7)',
                                border: '1px solid rgba(0, 0, 0, 0.05)',
                                padding: '3px',
                                '&:hover': {
                                  opacity: 1,
                                  color: 'primary.main',
                                  bgcolor: 'rgba(255, 255, 255, 0.9)'
                                }
                              }}
                            >
                              {copiedMessageIndex === index ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>

                {/* Avatar - positioned outside the card */}
                {message.role !== 'user' && (
                  <Avatar
                    alt="BMF"
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bgcolor: '#6158e5', // Samme lilla farge som i logoen
                      width: 32,
                      height: 32,
                      boxShadow: 1,
                    }}
                  >
                    <SmartToyIcon sx={{ fontSize: 18, color: 'white' }} />
                  </Avatar>
                )}

                {message.role === 'user' && (
                  <Avatar
                    sx={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bgcolor: 'primary.main',
                      width: 32,
                      height: 32,
                      boxShadow: 1,
                    }}
                  >
                    U
                  </Avatar>
                )}
              </Box>
            ))
          )}
          {isLoading && !isStreaming && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {messages.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddCircleOutlineIcon />}
                onClick={startNewChat}
                sx={{
                  borderRadius: 4,
                  px: 3,
                  py: 1,
                  fontSize: '0.9rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)'
                  }
                }}
              >
                Start ny samtale
              </Button>
            </Box>
          )}
          <Box ref={messagesEndRef} />
        </Box>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <Box sx={{
            p: 1.5,
            bgcolor: '#F5F5F5',
            borderTop: '1px solid #E0E0E0',
            position: 'fixed',
            bottom: 73, // Plassering rett over input-feltet
            left: { xs: '20px', sm: '260px' }, // Tar hensyn til venstre-menyen
            right: '20px', // Avstand fra høyre kant
            width: 'auto', // Bredden beregnes fra left og right
            maxWidth: { xs: 'calc(100% - 40px)', sm: 'calc(100% - 280px)' }, // Justert for venstre-menyen
            zIndex: 10,
            boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
            borderRadius: '8px 8px 0 0',
            margin: '0 auto' // Sentrerer innenfor grensene
          }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Vedlegg ({attachments.length})
            </Typography>
            <Grid container spacing={1.5}>
              {attachments.map((file, index) => (
                <Grid item key={index}>
                  <Box
                    sx={{
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      bgcolor: '#FFFFFF',
                      borderRadius: 2,
                      border: '1px solid #E0E0E0',
                      boxShadow: 1,
                    }}
                  >
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      mr: 1.5
                    }}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150, fontWeight: 500 }}>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => removeAttachment(index)}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Input Area */}
        <Paper
          elevation={3}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'flex-end',
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: '#FFFFFF',
            position: 'fixed', // Gjør input-feltet sticky
            bottom: 16, // Litt avstand fra bunnen
            left: { xs: '20px', sm: '260px' }, // Tar hensyn til venstre-menyen på større skjermer
            right: '20px', // Fast avstand fra høyre kant
            width: 'auto', // Bredden beregnes automatisk basert på left og right
            maxWidth: { xs: 'calc(100% - 40px)', sm: 'calc(100% - 280px)' }, // Justert for venstre-menyen
            zIndex: 11, // Sikre at det er over andre elementer
            boxShadow: '0 -2px 8px rgba(0,0,0,0.1)', // Legg til skygge for visuell separasjon
            borderRadius: '8px', // Avrundede hjørner for bedre visuell sammenheng
            margin: '0 auto' // Sentrerer innenfor grensene
          }}
        >
          <IconButton
            {...getRootProps()}
            size="medium"
            sx={{
              mr: 1.5,
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'rgba(25, 118, 210, 0.08)'
              }
            }}
            disabled={isLoading || isStreaming}
          >
            <input {...getInputProps()} />
            <AttachFileIcon />
          </IconButton>
          <TextField
            fullWidth
            multiline
            placeholder="Skriv din melding her..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            inputRef={inputRef}
            maxRows={6}
            disabled={isLoading || isStreaming}
            InputProps={{
              sx: {
                pt: 1,
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#E0E0E0'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main'
                }
              }
            }}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: '#FAFAFA'
              }
            }}
          />
          <Button
            variant="contained"
            color="primary"
            endIcon={(!isLoading && !isStreaming) ? <SendIcon /> : null}
            onClick={handleSubmit}
            disabled={isLoading || isStreaming || (!inputValue && attachments.length === 0)}
            sx={{
              ml: 1.5,
              height: 'fit-content',
              minWidth: '100px',
              borderRadius: 2,
              py: 1
            }}
          >
            {isLoading || isStreaming ?
              'Tenker...' :
              'Send'}
          </Button>
        </Paper>

        {/* Settings Dialog */}
        <Dialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              maxWidth: 500
            }
          }}
        >
          <DialogTitle sx={{
            borderBottom: '1px solid #E0E0E0',
            pb: 2,
            display: 'flex',
            alignItems: 'center'
          }}>
            <SettingsIcon sx={{ mr: 1.5, color: 'primary.main' }} />
            BMF Assistent Innstillinger
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <DialogContentText sx={{ mb: 3 }}>
              Velg modell for BMF assistenten.
            </DialogContentText>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              AI Modell
            </Typography>

            <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
              <InputLabel id="settings-model-select-label">Velg AI modell</InputLabel>
              <Select
                labelId="settings-model-select-label"
                value={selectedModel}
                onChange={handleModelChange}
                label="Velg AI modell"
              >
                {availableModels.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                GPT-4o er den anbefalte modellen for best ytelse.
              </Typography>
            </FormControl>

            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Om BMF Assistent
            </Typography>
            <Typography variant="body2" color="text.secondary">
              BMF Assistent er en spesialisert AI-assistent som kan hjelpe med byggrelaterte spørsmål.
              Den bruker Azure OpenAI GPT-modeller for å generere svar på norsk.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid #E0E0E0', p: 2 }}>
            <Button
              onClick={() => setSettingsOpen(false)}
              sx={{ borderRadius: 2 }}
            >
              Avbryt
            </Button>
            <Button
              onClick={() => setSettingsOpen(false)}
              variant="contained"
              sx={{ borderRadius: 2 }}
            >
              Lukk
            </Button>
          </DialogActions>
        </Dialog>

        {/* API-nøkkel dialogen er fjernet siden vi bruker en felles nøkkel for hele bedriften */}
      </Box>
    </Container>
  );
};

export default AiChatPage;