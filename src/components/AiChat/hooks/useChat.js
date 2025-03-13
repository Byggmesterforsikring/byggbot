import { useState, useEffect, useRef } from 'react';

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

export default function useChat() {
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

  return {
    selectedModel,
    setSelectedModel,
    handleModelChange,
    availableModels,
    messages,
    setMessages,
    inputValue,
    setInputValue,
    handleInputChange,
    isLoading,
    isStreaming,
    streamResponse,
    attachments,
    setAttachments,
    settingsOpen,
    setSettingsOpen,
    messagesEndRef,
    inputRef,
    copiedMessageIndex,
    formattingTransition,
    loadingTextIndex,
    loadingTexts,
    handleSubmit,
    copyMessageToClipboard,
    retryLastQuestion,
    startNewChat
  };
}