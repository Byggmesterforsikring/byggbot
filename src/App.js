import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Button, Grid, Snackbar } from '@mui/material';
import { Refresh, DirectionsCar, LocalShipping, Security, More } from '@mui/icons-material';
import { HashRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import ProductCard from './components/ProductCard';
import AutoCalculator from './components/Auto/AutoCalculator';

const { ipcRenderer } = window.require('electron');

// Midlertidig logo-komponent siden vi har problemer med SVG-import
const Logo = () => (
  <Typography variant="h3" component="h1" sx={{ 
    fontWeight: 'bold', 
    color: '#1976d2',
    textAlign: 'center' 
  }}>
    CalcPro
  </Typography>
);

function HomePage() {
  const navigate = useNavigate();
  
  return (
    <>
      {/* Logo-område */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Logo />
        <Typography variant="h4" component="h1" sx={{ mt: 2 }}>
          CalcPro v1.0.2
        </Typography>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={() => ipcRenderer.send('check-for-updates')}
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
            onClick={() => navigate('/auto')}
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
    </>
  );
}

function App() {
  const [updateMessage, setUpdateMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    ipcRenderer.on('update-message', (_, message) => {
      setUpdateMessage(message);
      setShowMessage(true);
    });

    return () => {
      ipcRenderer.removeAllListeners('update-message');
    };
  }, []);

  return (
    <Router>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auto" element={<AutoCalculator />} />
          </Routes>
        </Box>

        <Snackbar
          open={showMessage}
          autoHideDuration={6000}
          onClose={() => setShowMessage(false)}
          message={updateMessage}
        />
      </Container>
    </Router>
  );
}

export default App; 