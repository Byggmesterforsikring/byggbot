import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { Agriculture as MachineIcon } from '@mui/icons-material';

const VEHICLE_TYPES = {
  SMALL_EXCAVATOR: 'Gravemaskin / Hjullaster - inntil 3,5t',
  MEDIUM_EXCAVATOR: 'Gravemaskin / Hjullaster - 3,5-7,5t',
  LARGE_EXCAVATOR: 'Gravemaskin / Hjullaster - 7,5-15t',
  XLARGE_EXCAVATOR: 'Gravemaskin / Hjullaster - +15t',
  TRACTOR: 'Traktor',
  WAREHOUSE_TRUCK: 'Truck (Lager)',
  TELESCOPIC_TRUCK: 'Teleskoptruck (Manitou og lignende)',
};

function ArbeidsmaskinCalculator() {
  const [formData, setFormData] = useState({
    vehicleType: '',
    value: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const calculatePremiums = () => {
    const { vehicleType, value } = formData;
    const numericValue = parseFloat(value) || 0;

    let liability = 0;
    let fireTheft = 0;
    let kasko = 0;

    switch (vehicleType) {
      case 'SMALL_EXCAVATOR':
        liability = 1923;
        fireTheft = numericValue * 0.0105084;
        kasko = numericValue * 0.007506;
        break;
      case 'MEDIUM_EXCAVATOR':
        liability = 3078;
        fireTheft = numericValue * 0.007506;
        kasko = numericValue * 0.0060048;
        break;
      case 'LARGE_EXCAVATOR':
        liability = 3847;
        fireTheft = numericValue * 0.007506;
        kasko = numericValue * 0.0060048;
        break;
      case 'XLARGE_EXCAVATOR':
        liability = 4616;
        fireTheft = numericValue * 0.007506;
        kasko = numericValue * 0.0060048;
        break;
      case 'TRACTOR':
        liability = 2308;
        fireTheft = numericValue * 0.0052542;
        kasko = numericValue * 0.0045036;
        break;
      case 'WAREHOUSE_TRUCK':
        liability = 1154;
        fireTheft = numericValue * 0.0052542;
        kasko = numericValue * 0.0052542;
        break;
      case 'TELESCOPIC_TRUCK':
        liability = 2308;
        fireTheft = numericValue * 0.0052542;
        kasko = numericValue * 0.0052542;
        break;
      default:
        break;
    }

    return {
      liability: Math.round(liability),
      fireTheft: Math.round(fireTheft),
      kasko: Math.round(kasko),
      total: Math.round(liability + fireTheft + kasko),
    };
  };

  const premiums = calculatePremiums();

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
            <MachineIcon fontSize="large" />
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
              Arbeidsmaskin Kalkulator
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              Beregn forsikringspremie for arbeidsmaskiner
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
                  Kjøretøytype
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>Kjøretøytype</InputLabel>
                  <Select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    label="Kjøretøytype"
                  >
                    {Object.entries(VEHICLE_TYPES).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
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
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                />
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
                  {premiums.total.toLocaleString('nb-NO')} kr
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
                  <Typography variant="body2">Ansvar</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {premiums.liability.toLocaleString('nb-NO')} kr
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1.5,
                  }}
                >
                  <Typography variant="body2">Brann/Tyveri</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {premiums.fireTheft.toLocaleString('nb-NO')} kr
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
                    {premiums.kasko.toLocaleString('nb-NO')} kr
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

export default ArbeidsmaskinCalculator;
