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
  Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RULES_DATA } from '../../constants/rulesData';

function RulesLayout() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRule, setSelectedRule] = useState(RULES_DATA?.[0] || null);

  const filteredRules = useMemo(() => {
    if (!searchTerm) return RULES_DATA;
    return RULES_DATA.filter(rule =>
      rule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];

    const results = [];
    const searchTermLower = searchTerm.toLowerCase();

    RULES_DATA.forEach(rule => {
      const content = rule.content;
      const lines = content.split('\n');

      lines.forEach((line, lineIndex) => {
        if (line.toLowerCase().includes(searchTermLower)) {
          const start = Math.max(0, lineIndex - 1);
          const end = Math.min(lines.length, lineIndex + 2);
          const context = lines.slice(start, end).join('\n');

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

      if (rule.title.toLowerCase().includes(searchTermLower)) {
        results.push({
          ruleId: rule.id,
          title: rule.title,
          section: '',
          context: '',
          lineNumber: -1,
          matchedText: rule.title,
        });
      }
    });

    return results;
  }, [searchTerm]);

  const highlightText = (text, searchTerm) => {
    if (!searchTerm) return text;

    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <span key={i} style={{ 
              backgroundColor: '#fff59d',
              padding: '0 4px',
              margin: '0 -4px',
              borderRadius: '2px',
              fontWeight: 600,
              color: '#1a237e'
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

  const blockquoteStyles = {
    info: {
      backgroundColor: '#e3f2fd',
      borderColor: '#2196f3',
      color: '#0d47a1',
    },
    warning: {
      backgroundColor: '#fff3cd',
      borderColor: '#ffc107',
      color: '#856404',
    },
    error: {
      backgroundColor: '#ffebee',
      borderColor: '#f44336',
      color: '#c62828',
    },
    success: {
      backgroundColor: '#e8f5e9',
      borderColor: '#4caf50',
      color: '#2e7d32',
    }
  };

  return (
    <Grid
      container
      spacing={1}
      sx={{
        margin: -2,
        width: 'calc(100% + 32px)',
        position: 'relative',
      }}
    >
      <Grid item xs={3}>
        <Paper
          sx={{
            height: 'calc(100vh - 80px)',
            borderRadius: 1,
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
                  bgcolor: 'background.default',
                },
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
                      },
                    },
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={highlightText(rule.title, searchTerm)}
                    primaryTypographyProps={{
                      fontWeight: selectedRule?.id === rule.id ? 600 : 400,
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
            borderRadius: 1,
          }}
        >
          <Box sx={{ pl: 3 }}>
            {searchTerm ? (
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
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="subtitle1" gutterBottom>
                        {result.title} - {result.section}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.9rem',
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
                          '&:hover': { textDecoration: 'underline' },
                        }}
                        onClick={() => {
                          const rule = RULES_DATA.find(
                            (r) => r.id === result.ruleId
                          );
                          setSelectedRule(rule);
                          setSearchTerm('');
                        }}
                      >
                        Vis i dokument
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            ) : (
              selectedRule && (
                <>
                  <Typography
                    variant="h4"
                    gutterBottom
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedRule.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    gutterBottom
                  >
                    Sist oppdatert:{' '}
                    {new Date(selectedRule.lastUpdated).toLocaleDateString(
                      'nb-NO'
                    )}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ node, ...props }) => (
                          <Typography variant="h4" gutterBottom {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <Typography
                            variant="h6"
                            component="h2"
                            sx={{ mt: 3, mb: 2, fontWeight: 600 }}
                            {...props}
                          />
                        ),
                        blockquote: ({ node, ...props }) => {
                          console.log('Blockquote props:', props);

                          const text = props.children
                            .map(child => child.props && child.props.children ? child.props.children : '')
                            .join('');
                          console.log('Blockquote text:', text);

                          const typeMatch = text.match(/^\[(info|warning|error|success)\]/i);
                          const type = typeMatch?.[1]?.toLowerCase() || 'info';
                          console.log('Blockquote type:', type);

                          const content = text.replace(/^\[(info|warning|error|success)\]\s*/i, '').trim();

                          return (
                            <Box
                              sx={{
                                backgroundColor: blockquoteStyles[type].backgroundColor,
                                padding: '1rem',
                                borderRadius: '4px',
                                borderLeft: `4px solid ${blockquoteStyles[type].borderColor}`,
                                margin: '1rem 0'
                              }}
                            >
                              <Typography
                                variant="body1"
                                sx={{
                                  color: blockquoteStyles[type].color,
                                  margin: 0
                                }}
                              >
                                {content}
                              </Typography>
                            </Box>
                          );
                        },
                        p: ({ node, children, ...props }) => {
                          if (
                            typeof children === 'string' &&
                            children.includes('⚠️')
                          ) {
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
                                  gap: 1,
                                }}
                              >
                                <span role="img" aria-label="warning">
                                  ⚠️
                                </span>
                                <Typography
                                  sx={{
                                    color: '#856404',
                                  }}
                                >
                                  {children.replace('⚠️', '').trim()}
                                </Typography>
                              </Box>
                            );
                          }
                          return <Typography {...props}>{children}</Typography>;
                        },
                        table: ({ node, ...props }) => (
                          <Box sx={{ my: 2 }}>
                            <table
                              style={{
                                borderCollapse: 'collapse',
                                width: '100%',
                                maxWidth: '800px',
                              }}
                            >
                              {props.children}
                            </table>
                          </Box>
                        ),
                        thead: ({ node, ...props }) => (
                          <thead style={{ backgroundColor: '#f5f5f5' }}>
                            {props.children}
                          </thead>
                        ),
                        tr: ({ node, ...props }) => (
                          <tr
                            style={{
                              borderBottom: '1px solid #e0e0e0',
                            }}
                          >
                            {props.children}
                          </tr>
                        ),
                        th: ({ node, ...props }) => (
                          <th
                            style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {props.children}
                          </th>
                        ),
                        td: ({ node, ...props }) => {
                          const isIcon = props.children === '✅' || props.children === '⚠️';
                          
                          return (
                            <td
                              style={{
                                padding: '12px 16px',
                                textAlign: isIcon ? 'center' : 'left',
                                width: isIcon ? '100px' : 'auto',
                                verticalAlign: 'middle',
                              }}
                            >
                              {isIcon ? (
                                <span
                                  style={{
                                    fontSize: '1.2rem',
                                    display: 'inline-block',
                                    lineHeight: 1,
                                    color: props.children === '⚠️' ? '#dc3545' : 'inherit'
                                  }}
                                >
                                  {props.children}
                                </span>
                              ) : (
                                props.children
                              )}
                            </td>
                          );
                        },
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