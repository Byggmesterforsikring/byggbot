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
    </>
  );
}

export default HomePage; 