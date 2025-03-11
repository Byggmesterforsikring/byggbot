import React, { useState, useEffect, useRef } from 'react';
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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Maximum size for attachments in bytes (30MB)
const MAX_FILE_SIZE = 30 * 1024 * 1024;

const AiChatPage = () => {
  const [selectedModel, setSelectedModel] = useState('claude-3-7-sonnet-20250219');
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

  // Effect to scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    };
  }, []);

  const handleSubmit = async () => {
    if ((!inputValue && attachments.length === 0) || isLoading || isStreaming) return;

    try {
      setIsLoading(true);

      // Add user message to chat - ensure content is never empty
      const userMessage = {
        role: 'user',
        content: inputValue ? [{ type: 'text', text: inputValue }] : [{ type: 'text', text: ' ' }], // Fallback to space if empty
      };

      // Add attachments if any
      for (const attachment of attachments) {
        userMessage.content.push(attachment.contentBlock);
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

      // Send message to Anthropic API with streaming - Viktig å bruke oppdatert meldingshistorikk
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
              if (Array.isArray(data.messageContent) && data.messageContent.length > 0) {
                newMessages[lastIndex] = {
                  role: 'assistant',
                  content: data.messageContent
                };
              }
            } else {
              // Fallback: Hvis det av en eller annen grunn ikke finnes en assistentmelding
              console.warn('Ingen assistentmelding funnet for oppdatering, legger til ny', newMessages);
              newMessages.push({
                role: 'assistant',
                content: data.messageContent
              });
            }
            
            return newMessages;
          });
        }
      });

      stream.onComplete((finalResponse) => {
        console.log('Stream completed, received complete response');

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
                  newMessages[lastIndex] = finalResponse;
                } else {
                  // Hvis det ikke er noe innhold, legg til en feilmelding
                  newMessages[lastIndex] = {
                    role: 'assistant',
                    content: [{ type: 'text', text: 'Kunne ikke generere et svar. Vennligst prøv igjen.' }]
                  };
                }
              } else {
                // Hvis response ikke har innhold, legg til en feilmelding
                newMessages[lastIndex] = {
                  role: 'assistant',
                  content: [{ type: 'text', text: 'Kunne ikke generere et svar. Vennligst prøv igjen.' }]
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
            updatedMessages[lastIndex] = {
              role: 'assistant',
              content: [{
                type: 'text',
                text: `Feil: ${error.error || 'Kunne ikke hente svar fra AI'}`
              }]
            };
          } else {
            // Legg til en ny assistentmelding med feilmeldingen
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
      const typesValidFiles = validFiles.filter(file => supportedTypes.includes(file.type));

      if (typesValidFiles.length !== validFiles.length) {
        const unsupportedFiles = validFiles.filter(file => !supportedTypes.includes(file.type))
          .map(file => `${file.name} (${file.type})`).join(', ');
        alert(`Unsupported file types: ${unsupportedFiles}\n\nSupported file types include:\n- Images (JPEG, PNG, GIF, WebP)\n- Documents (PDF)\n- Data files (Excel, CSV)`);
      }

      // Process valid files
      for (const file of typesValidFiles) {
        try {
          console.log(`Processing file: ${file.name}, type: ${file.type}`);
          
          // Kategoriser filen basert på type
          const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
          const isPDF = file.type === 'application/pdf';
          const isDataFile = [
            'application/vnd.ms-excel', 
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'application/vnd.oasis.opendocument.spreadsheet'
          ].includes(file.type);
          const isTextFile = ['text/plain', 'application/rtf', 'text/markdown'].includes(file.type);
          
          // Les filen som base64 data
          const reader = new FileReader();
          
          // Bruk Promise for å vente på at filen er lest
          const fileContent = await new Promise((resolve, reject) => {
            if (isImage || isPDF) {
              // For bilder og PDF, les som data URL
              reader.onload = () => resolve(reader.result);
              reader.onerror = error => reject(error);
              reader.readAsDataURL(file);
            } else {
              // For tekst og data-filer, les som tekst
              reader.onload = () => resolve(reader.result);
              reader.onerror = error => reject(error);
              reader.readAsText(file);
            }
          });
          
          let contentBlock;
          
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
            // For PDF-filer, konverter til tekst-beskrivelse siden Azure ikke støtter direkte PDF-innhold
            console.log('PDF file detected, converting to text description');
            contentBlock = {
              type: "text",
              text: `Dette er en PDF-fil (${file.name}, ${Math.round(file.size/1024)} KB). Filen kan ikke vises direkte, men inneholder potensielt tekstinnhold og bilder. Hvis du trenger å analysere innholdet, vennligst last opp bilder av de relevante sidene fra PDFen.`
            };
          } else {
            // For tekst- og datafiler, konverter til tekst
            let textContent = fileContent;
            
            // For Excel/CSV, kan vi legge til litt formatering for å gjøre det mer lesbart
            if (isDataFile && file.name.endsWith('.csv')) {
              textContent = `CSV file from ${file.name}:\n\n${textContent}`;
            } else if (isDataFile) {
              // For andre datafiler som Excel, forklar at innholdet er begrenset
              textContent = `Content from data file ${file.name}:\n\n${textContent.substring(0, 5000)}${textContent.length > 5000 ? '...\n[File truncated due to size]' : ''}`;
            }
            
            // Bruk vanlig tekstblokk for tekst og data
            contentBlock = {
              type: "text",
              text: textContent
            };
          }
          
          console.log(`File processed successfully: ${file.name}`);
          
          // Add to attachments
          setAttachments(prev => [
            ...prev,
            {
              name: file.name,
              size: file.size,
              type: file.type,
              contentBlock
            }
          ]);
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

  const renderMessageContent = (content, isLastMessage = false) => {
    // Make sure we have valid content
    if (!content || !Array.isArray(content) || content.length === 0) {
      if (isStreaming && isLastMessage) {
        // Viser en lasteindikatør under streaming
        return <Typography color="text.secondary">Genererer svar...</Typography>;
      }
      return <Typography color="text.secondary">Ingen innhold</Typography>;
    }

    return content.map((item, index) => {
      if (!item) {
        return null;
      }

      if (item.type === 'text') {
        // Get the text content and handle empty case
        const text = item.text || '';

        // Hvis teksten er tom og dette er den eneste innholdsdelen, vis en beskjed
        if (text.trim() === '' && content.length === 1) {
          if (isStreaming && isLastMessage) {
            return <Typography key={index} color="text.secondary">Genererer svar...</Typography>;
          }
          return <Typography key={index} color="text.secondary">Ingen innhold</Typography>;
        }

        // For normal markdown content
        return (
          <Box
            key={index}
            className="markdown-content"
            sx={{
              width: '100%',
              whiteSpace: 'pre-wrap',
              '& p': {
                margin: 0,
                marginBottom: '0.1rem',
                whiteSpace: 'pre-wrap'
              },
              '& p:last-child': {
                marginBottom: 0
              },
              '& ul, & ol': {
                marginTop: '0.1rem',
                marginBottom: '0.1rem',
                paddingLeft: '1.5rem'
              },
              '& li': {
                marginBottom: '0rem'
              },
              '& code': {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                padding: '0.2rem 0.4rem',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              },
              '& pre': {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                padding: '0.3rem',
                borderRadius: '4px',
                overflowX: 'auto',
                '& code': {
                  backgroundColor: 'transparent',
                  padding: 0
                }
              },
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                marginTop: '0.3rem',
                marginBottom: '0.2rem',
                fontWeight: 'bold'
              },
              '& p + ul, & p + ol': {
                marginTop: '0.05rem'
              },
              '& h1 + p, & h2 + p, & h3 + p': {
                marginTop: '0.1rem'
              }
            }}>
            <ReactMarkdown
              key={isLastMessage ? 'streaming' : 'complete'}
              remarkPlugins={[remarkGfm]}
              components={{
                // Ensure line breaks are preserved properly
                p: ({ node, children, ...props }) => (
                  <p style={{
                    whiteSpace: 'pre-wrap',
                    marginTop: '0.1rem',
                    marginBottom: '0.1rem'
                  }} {...props}>
                    {children}
                  </p>
                ),
                // Properly render line breaks and ensure headings stand out
                h1: ({ node, ...props }) => <h1 style={{ marginTop: '0.3rem', marginBottom: '0.2rem' }} {...props} />,
                h2: ({ node, ...props }) => <h2 style={{ marginTop: '0.3rem', marginBottom: '0.2rem' }} {...props} />,
                h3: ({ node, ...props }) => <h3 style={{ marginTop: '0.3rem', marginBottom: '0.2rem' }} {...props} />,
                // Lists should be properly spaced with minimal margin
                ul: ({ node, ...props }) => <ul style={{ marginTop: '0.1rem', marginBottom: '0.1rem', paddingLeft: '1.5rem' }} {...props} />,
                ol: ({ node, ...props }) => <ol style={{ marginTop: '0.1rem', marginBottom: '0.1rem', paddingLeft: '1.5rem' }} {...props} />,
                li: ({ node, ...props }) => <li style={{ marginBottom: '0rem' }} {...props} />
              }}
            >
              {text}
            </ReactMarkdown>
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
                      {['Lag et forslag til svar på en e-post om fornyelse av garantiforsikring',
                        'Hvordan kan jeg forklare vilkårene for skadeforsikring til en kunde?',
                        'Skriv en høflig e-post som minner kunden om manglende dokumentasjon'].map((question, index) => (
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
                  <CardContent sx={{ pt: 1.5, pb: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
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
                          index === messages.length - 1 && isStreaming
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
                Claude 3.7 Sonnet er nyeste modell og anbefales for best ytelse.
              </Typography>
            </FormControl>

            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Om BMF Assistent
            </Typography>
            <Typography variant="body2" color="text.secondary">
              BMF Assistent er en spesialisert AI-assistent som kan hjelpe med byggrelaterte spørsmål.
              Den bruker Anthropic Claude AI-modeller for å generere svar på norsk.
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