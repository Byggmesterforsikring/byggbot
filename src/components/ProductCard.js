import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

function ProductCard({ title, icon, onClick }) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
      onClick={onClick}
    >
      <Box sx={{ mb: 2 }}>
        {icon}
      </Box>
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
    </Paper>
  );
}

export default ProductCard; 