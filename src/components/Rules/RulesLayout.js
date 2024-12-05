import React, { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  InputAdornment,
  Grid,
  Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RULES_DATA } from '../../constants/rulesData';

function RulesLayout() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRule, setSelectedRule] = useState(RULES_DATA?.[0] || null);

  // Filtrer dokumentlisten
  const filteredRules = useMemo(() => {
    if (!searchTerm) return RULES_DATA;
    return RULES_DATA.filter(rule =>
      rule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Funksjon for å finne og formatere søkeresultater
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];

    const results = [];
    const searchTermLower = searchTerm.toLowerCase();

    RULES_DATA.forEach(rule => {
      const content = rule.content;
      const lines = content.split('\n');
      let matchFound = false;

      // Søk gjennom hver linje
      lines.forEach((line, lineIndex) => {
        if (line.toLowerCase().includes(searchTermLower)) {
          matchFound = true;
          
          // Finn kontekst (linjer før og etter)
          const start = Math.max(0, lineIndex - 1);
          const end = Math.min(lines.length, lineIndex + 2);
          const context = lines.slice(start, end).join('\n');

          // Finn overskriften denne seksjonen tilhører
          let section = '';
          for (let i = lineIndex; i >= 0; i--) {
            if (lines[i].startsWith('##')) {
              section = lines[i].replace(/^##\s*/, '');
              break;
            }
          }

          results.push({
            ruleId: rule.id,
            title: rule.title,
            section,
            context,
            lineNumber: lineIndex,
            matchedText: line,
          });
        }
      });

      // Hvis det er treff i tittelen
      if (rule.title.toLowerCase().includes(searchTermLower)) {
        matchFound = true;
      }
    });

    return results;
  }, [searchTerm]);

  // Funksjon for å highlighte søketekst
  const highlightText = (text, searchTerm) => {
    if (!searchTerm) return text;

    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <span key={i} style={{ 
              backgroundColor: '#fff59d', // Lys gul bakgrunnsfarge
              padding: '0 4px',
              margin: '0 -4px',
              borderRadius: '2px',
              fontWeight: 600,
              color: '#1a237e' // Mørkere tekstfarge for kontrast
            }}>
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <Grid 
      container 
      spacing={1} 
      sx={{ 
        margin: -2,     // Negativ margin for å motvirke parent padding
        width: 'calc(100% + 32px)',  // Kompenser for negativ margin
        position: 'relative'
      }}
    >
      <Grid item xs={3}>
        <Paper 
          sx={{ 
            height: 'calc(100vh - 80px)',
            borderRadius: 1
          }}
        >
          <Box sx={{ p: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Søk i tegningsregler..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'background.default'
                }
              }}
            />
          </Box>
          <List>
            {filteredRules.map((rule) => (
              <ListItem key={rule.id} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  selected={selectedRule?.id === rule.id}
                  onClick={() => setSelectedRule(rule)}
                  sx={{
                    borderRadius: 1,
                    mx: 1,
                    '&.Mui-selected': {
                      bgcolor: 'primary.lighter',
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.lighter',
                      }
                    },
                    '&:hover': {
                      bgcolor: 'action.hover',
                    }
                  }}
                >
                  <ListItemText 
                    primary={highlightText(rule.title, searchTerm)}
                    primaryTypographyProps={{
                      fontWeight: selectedRule?.id === rule.id ? 600 : 400
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Grid>

      <Grid item xs={9}>
        <Paper 
          sx={{ 
            p: 2,
            minHeight: 'calc(100vh - 80px)',
            borderRadius: 1
          }}
        >
          <Box sx={{ pl: 3 }}>
            {searchTerm ? (
              // Vis søkeresultater
              <Box>
                <Typography variant="h5" gutterBottom>
                  Søkeresultater for "{searchTerm}"
                </Typography>
                {searchResults.length === 0 ? (
                  <Typography>Ingen treff</Typography>
                ) : (
                  searchResults.map((result, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        mb: 3,
                        p: 2,
                        bgcolor: 'background.default',
                        borderRadius: 1
                      }}
                    >
                      <Typography variant="subtitle1" gutterBottom>
                        {result.title} - {result.section}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.9rem'
                        }}
                      >
                        {highlightText(result.context, searchTerm)}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          mt: 1,
                          cursor: 'pointer',
                          color: 'primary.main',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                        onClick={() => {
                          const rule = RULES_DATA.find(r => r.id === result.ruleId);
                          setSelectedRule(rule);
                          setSearchTerm(''); // Fjern søketermen for å vise hele dokumentet
                        }}
                      >
                        Vis i dokument
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            ) : (
              // Vis valgt dokument når det ikke søkes
              selectedRule && (
                <>
                  <Typography variant="h4" gutterBottom sx={{ fontWeight: 500 }}>
                    {selectedRule.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Sist oppdatert: {new Date(selectedRule.lastUpdated).toLocaleDateString('nb-NO')}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => (
                          <Typography variant="h4" gutterBottom {...props} />
                        ),
                        h2: ({node, ...props}) => (
                          <Typography
                            variant="h6"
                            component="h2"
                            sx={{ mt: 3, mb: 2, fontWeight: 600 }}
                            {...props}
                          />
                        ),
                        blockquote: ({node, ...props}) => (
                          <Box
                            sx={{
                              backgroundColor: '#fff3cd',
                              padding: '1rem',
                              borderRadius: '4px',
                              borderLeft: '4px solid #ffc107',
                              margin: '1rem 0'
                            }}
                          >
                            {props.children}
                          </Box>
                        ),
                        // Legg til støtte for emojis/ikoner
                        p: ({node, children, ...props}) => {
                          // Sjekk om dette er en advarsel-paragraf
                          if (typeof children === 'string' && children.includes('⚠️')) {
                            return (
                              <Box
                                sx={{
                                  backgroundColor: '#fff3cd',
                                  padding: '1rem',
                                  borderRadius: '4px',
                                  borderLeft: '4px solid #ffc107',
                                  margin: '1rem 0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1
                                }}
                              >
                                <span role="img" aria-label="warning">⚠️</span>
                                <Typography 
                                  sx={{ 
                                    color: '#856404'
                                  }}
                                >
                                  {children.replace('⚠️', '').trim()}
                                </Typography>
                              </Box>
                            );
                          }
                          return <Typography {...props}>{children}</Typography>;
                        },
                        table: ({node, ...props}) => (
                          <Box sx={{ my: 2 }}>
                            <table style={{ 
                              borderCollapse: 'collapse', 
                              width: '100%',
                              maxWidth: '800px'  // Økt bredde for å gi plass til tre kolonner
                            }}>
                              {props.children}
                            </table>
                          </Box>
                        ),
                        thead: ({node, ...props}) => (
                          <thead style={{ backgroundColor: '#f5f5f5' }}>
                            {props.children}
                          </thead>
                        ),
                        tr: ({node, ...props}) => (
                          <tr style={{ 
                            borderBottom: '1px solid #e0e0e0'
                          }}>
                            {props.children}
                          </tr>
                        ),
                        th: ({node, ...props}) => (
                          <th style={{ 
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}>
                            {props.children}
                          </th>
                        ),
                        td: ({node, ...props}) => {
                          // Sjekk om innholdet er et ikon
                          const isIcon = props.children === '✅' || props.children === '⚠️';
                          
                          return (
                            <td style={{ 
                              padding: '12px 16px',
                              textAlign: isIcon ? 'center' : 'left',
                              width: isIcon ? '100px' : 'auto',  // Fast bredde for ikonkolonnen
                              verticalAlign: 'middle'  // Vertikal sentrering
                            }}>
                              {isIcon ? (
                                <span style={{ 
                                  fontSize: '1.2rem',  // Større ikoner
                                  display: 'inline-block',  // Hjelper med sentrering
                                  lineHeight: 1  // Bedre vertikal alignment
                                }}>
                                  {props.children}
                                </span>
                              ) : props.children}
                            </td>
                          );
                        }
                      }}
                    >
                      {selectedRule.content}
                    </ReactMarkdown>
                  </Box>
                </>
              )
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}

export default RulesLayout; 