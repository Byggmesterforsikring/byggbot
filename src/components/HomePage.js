import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { DirectionsCar, LocalShipping, Security, More } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import logo from '../../assets/BMF_logo_sort.svg';

function HomePage() {
  const navigate = useNavigate();
  
  return (
    <>
      {/* Logo-område */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <img 
          src={logo} 
          alt="BMF Logo" 
          style={{ 
            height: '80px',
            marginBottom: '16px'
          }} 
        />
        <Typography 
          variant="subtitle1" 
          component="h2" 
          sx={{ 
            mt: 1,
            color: 'text.secondary',
            fontSize: '1rem'
          }}
        >
          CalcPro v1.0.2
        </Typography>
      </Box>

      {/* Produktkort */}
      <Grid container spacing={4}>
        <Grid item xs={12} sm={6} md={3}>
          <ProductCard 
            title="Auto" 
            icon={<DirectionsCar sx={{ fontSize: 60 }} />}
            onClick={() => navigate('/calculators/auto')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ProductCard 
            title="Tilhenger" 
            icon={<LocalShipping sx={{ fontSize: 60 }} />}
            onClick={() => navigate('/calculators/trailer')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ProductCard 
            title="Garanti" 
            icon={<Security sx={{ fontSize: 60 }} />}
            onClick={() => navigate('/calculators/warranty')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ProductCard 
            title="Andre Produkter" 
            icon={<More sx={{ fontSize: 60 }} />}
            onClick={() => navigate('/tools')}
          />
        </Grid>
      </Grid>
    </>
  );
}

export default HomePage; 