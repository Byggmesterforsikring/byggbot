import React, { Fragment, useState } from 'react';
import { Box, Typography, CircularProgress, Collapse, IconButton } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, Psychology as PsychologyIcon } from '@mui/icons-material';
import Markdown from 'markdown-to-jsx';

// Cache for å beholde ekspansjonstilstand når komponenten re-rendres under streaming
const expandedStateCache = new Map();

// Funksjon for å rydde opp i cache
export const clearThinkingStateCache = () => {
  expandedStateCache.clear();
};

const MessageContent = ({ 
  content, 
  isLastMessage = false, 
  message = null,
  loadingTextIndex,
  loadingTexts,
  isStreaming = false,
  formattingTransition = false
}) => {
  // Collapsible thinking block for DeepSeek-R1
  const ThinkingBlock = ({ content, messageId }) => {
    // Generer en unik ID for denne tenkeblokken basert på meldingsID og "think"
    const blockId = `think-${messageId || 'latest'}`;
    
    // Initialiser tilstand fra cache hvis den eksisterer, ellers bruk false
    const [expanded, setExpanded] = useState(() => {
      return expandedStateCache.get(blockId) || false;
    });
    
    // Oppdater cache når tilstanden endres
    const toggleExpanded = () => {
      const newState = !expanded;
      setExpanded(newState);
      expandedStateCache.set(blockId, newState);
    };
    
    return (
      <Box sx={{ 
        mt: 1, 
        mb: 2, 
        borderRadius: '8px',
        border: '1px solid rgba(103, 58, 183, 0.3)',
        overflow: 'hidden'
      }}>
        <Box
          onClick={toggleExpanded}
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1,
            cursor: 'pointer',
            bgcolor: 'rgba(103, 58, 183, 0.08)',
            borderBottom: expanded ? '1px solid rgba(103, 58, 183, 0.3)' : 'none',
            transition: 'background-color 0.2s',
            '&:hover': {
              bgcolor: 'rgba(103, 58, 183, 0.12)'
            }
          }}
        >
          <PsychologyIcon sx={{ mr: 1, color: 'rgb(103, 58, 183)' }} />
          <Typography variant="body2" sx={{ fontWeight: 500, flexGrow: 1, color: 'rgb(103, 58, 183)' }}>
            Modellens tankeprosess
          </Typography>
          <IconButton size="small" sx={{ p: 0, color: 'rgb(103, 58, 183)' }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        <Collapse in={expanded}>
          <Box sx={{ p: 1.5, bgcolor: 'rgba(103, 58, 183, 0.04)' }}>
            <Markdown
              options={{
                forceBlock: true
              }}
            >
              {content}
            </Markdown>
          </Box>
        </Collapse>
      </Box>
    );
  };

  // Make sure we have valid content
  if (!content || !Array.isArray(content) || content.length === 0) {
    if (isStreaming && isLastMessage) {
      // Viser en lasteindikatør under streaming
      return (
        <Box 
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
    return <Typography color="text.secondary">Ingen innhold</Typography>;
  }
  
  // Sjekk spesifikt etter "Genererer svar..." som er placeholder for å vise animert laster
  if (content.length === 1 && content[0].type === 'text' && 
      content[0].text === 'Genererer svar...' && isLastMessage) {
    // Vis samme animerte lasteindikatør som ovenfor
    return (
      <Box 
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
  
  // Sjekk om denne meldingen er under formaterings-overgang
  // Viktig: Formaterings-overgangen gjelder kun for den SISTE meldingen
  const isTransitioning = isLastMessage && message && message.formattingTransition;
  
  // Fjern eventuelle skjulte data-flagg fra visningen (men ikke fra dataen som sendes til AI)
  const processedContent = content.map(item => {
    if (item.type === 'text' && item.text) {
      // Fjern blokkene med [EXCEL_DATA:...] og [DATA_FILE:...] for visning
      let processedText = item.text.replace(/\n\n\[(EXCEL_DATA|DATA_FILE):[^\]]+\]/g, '');
      
      // Sjekk om dette er tabell-innhold (Excel, CSV, PDF eller e-post)
      if (item.text.includes("EXCEL FILE CONTENT")) {
        // Skjul selve Excel-dataene, men vis en informativ oppsummering
        const rows = item.text.split('\n').length - 3; // Cirka antall rader
        const sheetsMatch = item.text.match(/## Sheet: /g);
        const sheets = sheetsMatch ? sheetsMatch.length : 1;
        
        // Sjekk om innholdet er begrenset pga. token-begrensning
        const isLimited = item.text.includes("Resten av innholdet vises ikke for å begrense datamengden");
        const hasMoreRows = item.text.includes("more rows not shown");
        
        // Beregn antall rader totalt fra "and X more rows not shown"
        let totalRows = rows;
        if (hasMoreRows) {
          const moreRowsMatch = item.text.match(/and (\d+) more rows not shown/);
          if (moreRowsMatch) {
            totalRows += parseInt(moreRowsMatch[1]);
          }
        }
        
        // For Excel-filer, bygg en mer detaljert og visuelt tiltalende oppsummering
        processedText = `📊 **Excel-fil analysert**\n\n` +
          `**Oversikt:**\n` +
          `- **${sheets} ark${sheets > 1 ? 'er' : ''}** i dokumentet\n` +
          `- **${rows} av ${isLimited || hasMoreRows ? totalRows : rows} rader** er tilgjengelig for AI${isLimited ? ' (tokenbegrensning)' : ''}\n\n` +
          `${isLimited ? '⚠️ _Merk: Ikke hele dokumentet kunne leses inn på grunn av størrelsen._' : '_Dokumentet er komplett analysert av AI._'}`;
          
      } else if (item.text.includes("CSV FILE CONTENT")) {
        // Skjul selve CSV-dataene, men vis en informativ oppsummering
        const rows = item.text.split('\n').length - 3; // Cirka antall rader
        
        // Sjekk om innholdet er begrenset
        const isLimited = item.text.includes("Resten av innholdet vises ikke for å begrense datamengden");
        const hasMoreRows = item.text.includes("more rows not shown");
        
        // Beregn antall rader totalt
        let totalRows = rows;
        if (hasMoreRows) {
          const moreRowsMatch = item.text.match(/and (\d+) more rows not shown/);
          if (moreRowsMatch) {
            totalRows += parseInt(moreRowsMatch[1]);
          }
        }
        
        // For CSV-filer, bygg en mer detaljert oppsummering
        processedText = `📄 **CSV-fil analysert**\n\n` +
          `**Oversikt:**\n` +
          `- **${rows} av ${isLimited || hasMoreRows ? totalRows : rows} rader** er tilgjengelig for AI${isLimited ? ' (tokenbegrensning)' : ''}\n\n` +
          `${isLimited ? '⚠️ _Merk: Ikke hele dokumentet kunne leses inn på grunn av størrelsen._' : '_Dokumentet er komplett analysert av AI._'}`;
          
      } else if (item.text.includes("PDF FILE CONTENT")) {
        // Skjul selve PDF-dataene, men vis en informativ oppsummering
        const pageMatch = item.text.match(/## Page \d+ of (\d+)/);
        const pages = pageMatch ? parseInt(pageMatch[1]) : 0;
        
        // Hent tittel hvis tilgjengelig
        const titleMatch = item.text.match(/Title: (.*?)(?:\n|$)/);
        const title = titleMatch ? titleMatch[1].trim() : null;
        
        // Sjekk om innholdet er begrenset
        const isLimited = item.text.includes("Resten av innholdet vises ikke for å begrense datamengden");
        const pageContentEstimate = Math.min(pages, 5); // Anslår at vi kan lese rundt 5 sider med detaljer
        
        // For PDF-filer, bygg en mer detaljert og visuelt tiltalende oppsummering
        processedText = `📑 **PDF-dokument analysert**\n\n` +
          `**Oversikt:**\n` +
          `${title ? `- **Tittel:** ${title}\n` : ''}` +
          `- **${pages} side${pages !== 1 ? 'r' : ''}** i dokumentet\n` +
          `- **${isLimited ? `Cirka ${pageContentEstimate} av ${pages}` : 'Alle'} sider** er tilgjengelig for AI${isLimited ? ' (tokenbegrensning)' : ''}\n\n` +
          `${isLimited ? '⚠️ _Merk: Ikke hele dokumentet kunne leses inn på grunn av størrelsen._' : '_Dokumentet er komplett analysert av AI._'}`;
          
      } else if (item.text.includes("EMAIL CONTENT")) {
        // Skjul selve e-postinnholdet, men vis en informativ oppsummering
        
        // Sjekk om e-posten har vedlegg
        const hasAttachments = item.text.includes("## Attachments:");
        const attachmentCount = hasAttachments ? 
          (item.text.match(/\d+\.\s+[\w\.-]+\s+\(/g) || []).length : 0;
        
        // Hent emne og avsender fra e-posten
        const subjectMatch = item.text.match(/Subject:\s*(.*?)(?:\n|$)/);
        const subject = subjectMatch ? subjectMatch[1].trim() : 'Ingen emne';
        
        const fromMatch = item.text.match(/From:\s*(.*?)(?:\n|$)/);
        const from = fromMatch ? fromMatch[1].trim() : null;
        
        // Sjekk om innholdet er begrenset
        const isLimited = item.text.includes("Resten av innholdet vises ikke for å begrense datamengden");
        
        // For e-postfiler, bygg en mer detaljert og visuelt tiltalende oppsummering
        processedText = `✉️ **E-post analysert**\n\n` +
          `**Oversikt:**\n` +
          `- **Emne:** ${subject}\n` +
          `${from ? `- **Fra:** ${from}\n` : ''}` +
          `${hasAttachments ? `- **${attachmentCount} vedlegg** i e-posten\n` : ''}` +
          `\n${isLimited ? '⚠️ _Merk: Ikke hele e-posten kunne leses inn på grunn av størrelsen._' : '_E-posten er komplett analysert av AI._'}`;
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
    
    if (item.type === 'think') {
      // Vis ThinkingBlock for think-type innhold
      // Bruk meldingsID hvis tilgjengelig, ellers bruk en standardverdi
      const messageId = message?.id || (isLastMessage ? 'latest' : `msg-${index}`);
      return <ThinkingBlock key={index} content={item.text} messageId={messageId} />;
    }
    else if (item.type === 'text') {
      // Get the text content and handle empty case
      const text = item.text || '';
      
      // Sjekker om dette er tabellfil-data (Excel, CSV, PDF eller e-post) for spesialhåndtering
      const isTableFile = text.includes('**Excel-fil:**') || text.includes('**CSV-fil:**') || 
                          text.includes('**PDF-fil:**') || text.includes('**EML-fil:**') || 
                          text.includes('**MSG-fil:**') || text.includes('**Excel-data**') || 
                          text.includes('**CSV-data**') || text.includes('**PDF-data**') ||
                          text.includes('**E-post**');
      
      // Hvis teksten er tom og dette er den eneste innholdsdelen, vis en beskjed
      if (text.trim() === '' && processedContent.length === 1) {
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
      
      // Spesialhåndtering for tabell-filer og dokumenter (Excel/CSV/PDF/Email)
      if (isTableFile) {
        // Bestem hvilken type fil det er basert på teksten
        const isExcel = text.includes('Excel-fil analysert');
        const isPdf = text.includes('PDF-dokument analysert');
        const isCsv = text.includes('CSV-fil analysert');
        const isEmail = text.includes('E-post analysert');
        
        // Velg fargetema basert på filtype
        let themeColor = '#1976d2'; // Default blå
        if (isExcel) themeColor = '#2E7D32'; // Grønn for Excel
        else if (isPdf) themeColor = '#D32F2F'; // Rød for PDF
        else if (isCsv) themeColor = '#7B1FA2'; // Lilla for CSV
        else if (isEmail) themeColor = '#0288D1'; // Lyseblå for e-post
        
        // Sjekk om innholdet er begrenset
        const isLimited = text.includes('⚠️');
        
        return (
          <Box 
            key={index} 
            sx={{
              display: 'flex',
              flexDirection: 'column',
              padding: '12px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: `1px solid ${themeColor}20`,
              borderLeft: `4px solid ${themeColor}`,
              margin: '12px 0',
              position: 'relative',
              overflow: 'hidden',
              '&:before': isLimited ? {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '80px',
                height: '80px',
                backgroundImage: 'linear-gradient(135deg, transparent 50%, rgba(255, 152, 0, 0.1) 50%)'
              } : {}
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
          }}
        >
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

export default MessageContent;