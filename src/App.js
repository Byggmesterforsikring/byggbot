import React from 'react';
import { 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box 
} from '@mui/material';
import {
  DirectionsCar,
  LocalShipping,
  Security,
  More
} from '@mui/icons-material';

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
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        {/* Logo-område */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <img src="path-to-your-logo.png" alt="CalcPro Logo" style={{ height: '80px' }} />
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
      </Box>
    </Container>
  );
}

export default App; 