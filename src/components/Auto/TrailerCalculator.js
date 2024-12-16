import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Grid,
  Button
} from '@mui/material';
import { RvHookup as TrailerIcon } from '@mui/icons-material';

function TrailerCalculator() {
  const [value, setValue] = useState('');

  const handleValueChange = (event) => {
    setValue(event.target.value.replace(/\D/g, ''));
  };

  const formatNumber = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const calculateBrannTyveri = () => {
    return Math.round(value * 0.0118);
  };

  const calculateKasko = () => {
    return Math.round(value * 0.0177);
  };

  const calculateTotalPremium = () => {
    return calculateBrannTyveri() + calculateKasko();
  };

  const showWarning = value > 100000;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              p: 1,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrailerIcon fontSize="large" />
          </Box>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Tilhenger
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              Beregn forsikringspremie for tilhenger
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 500,
                    color: 'text.primary',
                    mb: 2,
                  }}
                >
                  Verdi
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Verdi"
                  value={formatNumber(value)}
                  onChange={handleValueChange}
                />
                {showWarning && (
                  <Typography
                    variant="body2"
                    sx={{ color: 'error.main', mt: 1 }}
                  >
                    Ved forsikringsum over Kr. 100 000 må UW konfereres for rabatt.
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              borderRadius: 2,
              bgcolor: 'background.paper',
              position: 'sticky',
              top: 24,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              <Box
                sx={{
                  p: 2,
                  mb: 3,
                  borderRadius: 1,
                  bgcolor: 'primary.main',
                  color: 'white',
                }}
              >
                <Typography variant="body1" sx={{ mb: 1, opacity: 0.9 }}>
                  Total premie
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {calculateTotalPremium().toLocaleString('nb-NO')} kr
                </Typography>
              </Box>

              <Typography
                variant="subtitle2"
                sx={{ mb: 2, color: 'text.secondary' }}
              >
                Dekninger
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1.5,
                  }}
                >
                  <Typography variant="body2">Brann/Tyveri</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {calculateBrannTyveri().toLocaleString('nb-NO')} kr
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1.5,
                  }}
                >
                  <Typography variant="body2">Kasko</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {calculateKasko().toLocaleString('nb-NO')} kr
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default TrailerCalculator; 