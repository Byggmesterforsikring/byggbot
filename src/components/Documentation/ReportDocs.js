import React, { useState } from 'react';
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

// Eksempel på rapportdata - dette bør flyttes til en egen fil som rulesData
const REPORTS_DATA = [
  {
    id: 'policy-history',
    title: 'PolicyHistory',
    content: `# PolicyHistory Report

## Beskrivelse
Rapporten viser alle endringer som er gjort på en forsikringspolise over tid. Dette inkluderer 
endringer i dekning, pris, og andre polisedetaljer.

## Database View
CREATE VIEW vw_PolicyHistory AS
SELECT 
    ph.PolicyHistoryId,
    ph.PolicyId,
    ph.ChangeDate,
    ph.ChangedBy,
    ph.ChangeType,
    ph.OldValue,
    ph.NewValue,
    p.PolicyNumber
FROM 
    PolicyHistory ph
    INNER JOIN Policies p ON ph.PolicyId = p.PolicyId
WHERE 
    ph.IsDeleted = 0`,
    lastUpdated: '2024-02-15'
  },
  // ... flere rapporter
];

function ReportDocs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(REPORTS_DATA?.[0] || null);

  const filteredReports = REPORTS_DATA?.filter(report =>
    report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.content.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Grid container spacing={2}>
      <Grid item xs={3}>
        <Paper sx={{ height: 'calc(100vh - 100px)' }}>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Søk i rapporter..."
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
            {filteredReports.map((report) => (
              <ListItem key={report.id} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  selected={selectedReport?.id === report.id}
                  onClick={() => setSelectedReport(report)}
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
                    primary={report.title}
                    primaryTypographyProps={{
                      fontWeight: selectedReport?.id === report.id ? 600 : 400
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Grid>

      <Grid item xs={9}>
        <Paper sx={{ p: 3, minHeight: 'calc(100vh - 100px)' }}>
          {selectedReport ? (
            <>
              <Typography variant="h5" gutterBottom>
                {selectedReport.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Sist oppdatert: {new Date(selectedReport.lastUpdated).toLocaleDateString('nb-NO')}
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
                    )
                  }}
                >
                  {selectedReport.content}
                </ReactMarkdown>
              </Box>
            </>
          ) : (
            <Typography>
              Ingen rapport valgt
            </Typography>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}

export default ReportDocs; 