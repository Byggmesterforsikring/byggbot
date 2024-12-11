import React from 'react';
import { Box, Typography } from '@mui/material';

function Dashboard() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Velkommen til Dashboard
      </Typography>
      
      <Box sx={{ 
        backgroundColor: '#fff3e0', 
        p: 2, 
        borderRadius: 1,
        border: '1px solid #ffb74d'
      }}>
        <Typography variant="body1" sx={{ color: '#e65100' }}>
          Dette er en applikasjon under utvikling. Ved feil eller problemer, vennligst kontakt IT-avdelingen.
        </Typography>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Kommende funksjonalitet
        </Typography>
        <Typography variant="body1">
          Dette dashbordet vil i fremtiden kunne vise nyttig informasjon og statistikk relevant for din rolle.
          Her vil du få tilgang til:
        </Typography>
        <Box component="ul" sx={{ mt: 1, ml: 2 }}>
          <Typography component="li">Oversikt over aktive saker</Typography>
          <Typography component="li">Relevante statistikker</Typography>
          <Typography component="li">Viktige varsler og meldinger</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default Dashboard; 