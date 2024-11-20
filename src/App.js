import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box,
  Snackbar,
  Button
} from '@mui/material';
import {
  DirectionsCar,
  LocalShipping,
  Security,
  More,
  Refresh
} from '@mui/icons-material';
import logo from '../assets/BMF_logo_sort.svg';

const { ipcRenderer } = window.require('electron');

const ProductCard = ({ title, icon, onClick }) => (
  <Card 
    sx={{ 
      cursor: 'pointer',
      '&:hover': {
        transform: 'scale(1.05)',
        transition: 'transform 0.2s'
      }
    }}
    onClick={onClick}
  >
    <CardContent>
      <Box display="flex" flexDirection="column" alignItems="center">
        {icon}
        <Typography variant="h6" component="div" sx={{ mt: 2 }}>
          {title}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

function App() {
  const [updateMessage, setUpdateMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // Lytt på oppdateringsmeldinger
    ipcRenderer.on('update-message', (_, message) => {
      setUpdateMessage(message);
      setShowMessage(true);
    });

    return () => {
      ipcRenderer.removeAllListeners('update-message');
    };
  }, []);

  const checkForUpdates = () => {
    ipcRenderer.send('check-for-updates');
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        {/* Logo-område */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <img src={logo} alt="CalcPro Logo" style={{ height: '80px' }} />
          <Typography variant="h4" component="h1" sx={{ mt: 2 }}>
            CalcPro v1.0.2
          </Typography>
          <Button
            startIcon={<Refresh />}
            onClick={checkForUpdates}
            sx={{ mt: 2 }}
          >
            Sjekk for oppdateringer
          </Button>
        </Box>

        {/* Produktkort */}
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={3}>
            <ProductCard 
              title="Auto" 
              icon={<DirectionsCar sx={{ fontSize: 60 }} />}
              onClick={() => {/* Navigering til auto-kalkulator */}}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ProductCard 
              title="Tilhenger" 
              icon={<LocalShipping sx={{ fontSize: 60 }} />}
              onClick={() => {/* Navigering til tilhenger-kalkulator */}}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ProductCard 
              title="Garanti" 
              icon={<Security sx={{ fontSize: 60 }} />}
              onClick={() => {/* Navigering til garanti-kalkulator */}}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ProductCard 
              title="Andre Produkter" 
              icon={<More sx={{ fontSize: 60 }} />}
              onClick={() => {/* Navigering til andre produkter */}}
            />
          </Grid>
        </Grid>

        <Snackbar
          open={showMessage}
          autoHideDuration={6000}
          onClose={() => setShowMessage(false)}
          message={updateMessage}
        />
      </Box>
    </Container>
  );
}

export default App; 