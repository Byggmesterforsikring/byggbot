import React from 'react';
import { Box, Typography, CircularProgress, Button, Card, CardContent, Avatar, IconButton, Tooltip, Grid, Divider, Chip } from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  ContentCopy as ContentCopyIcon, 
  Check as CheckIcon, 
  SmartToy as SmartToyIcon, 
  AddCircleOutline as AddCircleOutlineIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  Memory as MemoryIcon
} from '@mui/icons-material';
import MessageContent from './MessageContent';

const MessageList = ({ 
  messages, 
  isLoading, 
  isStreaming, 
  loadingTextIndex,
  loadingTexts,
  formattingTransition,
  messagesEndRef,
  copiedMessageIndex,
  copyMessageToClipboard,
  retryLastQuestion,
  startNewChat,
  inputRef,
  setInputValue,
  tokenUsage // Tilføyd tokenUsage
}) => {
  if (messages.length === 0) {
    return <WelcomeScreen inputRef={inputRef} setInputValue={setInputValue} />;
  }

  return (
    <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, pb: 9, bgcolor: '#f9f9f9' }}>
      {messages.map((message, index) => (
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
                {/* Hvis streaming pågår og det er siste melding, vis en lasteindikatør hvis innholdet er tomt */}
                {index === messages.length - 1 && isStreaming && (!message.content || !message.content.length) ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    <Typography color="text.secondary">Genererer svar...</Typography>
                  </Box>
                ) : (
                  <MessageContent
                    content={message.content}
                    isLastMessage={index === messages.length - 1} 
                    message={message}
                    loadingTextIndex={loadingTextIndex}
                    loadingTexts={loadingTexts}
                    isStreaming={isStreaming}
                    formattingTransition={formattingTransition}
                  />
                )}

                {/* Handlingsknapper for assistentens meldinger */}
                {message.role === 'assistant' && !isStreaming && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mt: 1.5,
                      gap: 1
                    }}
                  >
                    {/* Kontekstbruk indikator - vises kun for siste assistentmelding */}
                    {index === messages.length - 1 && (
                      <Tooltip title="Kontekstbruk - hvor mye av modellens hukommelse som er brukt">
                        <Chip
                          icon={<MemoryIcon sx={{ fontSize: '0.9rem !important' }} />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                {Math.floor((tokenUsage.inputTokens + tokenUsage.outputTokens) / tokenUsage.contextLength * 100)}%
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.8 }}>
                                {Math.floor((tokenUsage.inputTokens + tokenUsage.outputTokens) / 1000)}k/{Math.floor(tokenUsage.contextLength / 1000)}k
                              </Typography>
                            </Box>
                          }
                          size="small"
                          color={(tokenUsage.inputTokens + tokenUsage.outputTokens) / tokenUsage.contextLength > 0.75 ? "warning" : "primary"}
                          sx={{ 
                            height: 24, 
                            borderRadius: 2,
                            '& .MuiChip-icon': { color: 'inherit' },
                            '& .MuiChip-label': { px: 1 }
                          }}
                        />
                      </Tooltip>
                    )}
                    
                    <Box sx={{ display: 'flex', marginLeft: 'auto', gap: 1 }}>
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
      ))}

      {isLoading && !isStreaming && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {messages.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          {/* Start ny samtale knapp */}
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
  );
};

// Velkomstskjerm når det ikke er meldinger
const WelcomeScreen = ({ inputRef, setInputValue }) => {
  const onQuestionSelect = (question) => {
    if (setInputValue) {
      setInputValue(question);
      inputRef?.current?.focus();
    }
  };
  
  return (
    <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, pb: 9, bgcolor: '#f9f9f9' }}>
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
                      onClick={() => onQuestionSelect(question)}
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
                      onClick={() => onQuestionSelect(question)}
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
            ByggBot er et AI-verktøy for ansatte i Byggmesterforsikring designet for å støtte ditt daglige arbeid.
            Bruk ByggBot til å effektivisere arbeidsoppgaver, men kontroller alltid viktig informasjon mot offisielle kilder.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default MessageList;