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
  Checkbox,
  FormControlLabel,
  Button,
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

const COVERAGE_TYPES = {
  LIABILITY: 'Ansvar',
  FIRE_THEFT: 'Brann/Tyveri',
  KASKO: 'Kasko',
};

const EXTRAS = [
  { id: 'driverAccident', label: 'Fører- og passasjerulykke', price: 210 },
  { id: 'leasing', label: 'Leasing / 3.mannsinteresse', price: 199 },
  { id: 'limitedIdentification', label: 'Begrenset identifikasjon', price: 245 },
  { id: 'craneLiability', label: 'Kranansvar', price: 1700 },
  { id: 'snowPlowing', label: 'Snøbrøyting', price: 1450 },
];

function ArbeidsmaskinCalculator() {
  const [formData, setFormData] = useState({
    vehicleType: '',
    value: '',
    coverageType: '',
    extras: ['driverAccident'],
  });

  const handleReset = () => {
    setFormData({
      vehicleType: '',
      value: '',
      coverageType: '',
      extras: ['driverAccident'],
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => {
      let newExtras = prevData.extras;

      if (name === 'coverageType' && value !== 'KASKO') {
        newExtras = newExtras.filter(
          (extraId) => !['leasing', 'craneLiability'].includes(extraId)
        );
      }

      return {
        ...prevData,
        [name]: name === 'value' ? value.replace(/\D/g, '') : value,
        extras: newExtras,
      };
    });
  };

  const formatNumber = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const handleExtraChange = (extraId) => {
    setFormData((prevData) => {
      const newExtras = prevData.extras.includes(extraId)
        ? prevData.extras.filter((id) => id !== extraId)
        : [...prevData.extras, extraId];
      return { ...prevData, extras: newExtras };
    });
  };

  const shouldShowExtra = (extraId) => {
    if (extraId === 'leasing' || extraId === 'craneLiability') {
      return formData.coverageType === 'KASKO';
    }
    return true;
  };

  const calculatePremiums = () => {
    const { vehicleType, value, coverageType, extras } = formData;
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

    let total = 0;
    if (coverageType === 'LIABILITY') {
      total = liability;
    } else if (coverageType === 'FIRE_THEFT') {
      total = liability + fireTheft;
    } else if (coverageType === 'KASKO') {
      total = liability + fireTheft + kasko;
    }

    const extrasCost = extras.reduce((sum, extraId) => {
      const extra = EXTRAS.find((e) => e.id === extraId);
      return sum + (extra ? extra.price : 0);
    }, 0);

    return {
      liability: Math.round(liability),
      fireTheft: Math.round(fireTheft),
      kasko: Math.round(kasko),
      total: Math.round(total + extrasCost),
      extrasCost: Math.round(extrasCost),
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
              Arbeidsmaskin
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

        <Button
          variant="contained"
          size="small"
          onClick={handleReset}
          sx={{
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          Nullstill skjema
        </Button>
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
                  value={formatNumber(formData.value)}
                  onChange={handleChange}
                />
                {parseFloat(formData.value) >= 1000000 && (
                  <Typography
                    variant="body2"
                    sx={{ color: 'error.main', mt: 1 }}
                  >
                    Maskiner med verdi over Kr. 1 million må godkjennes av UW.
                  </Typography>
                )}
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
                  Dekningstype
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>Dekningstype</InputLabel>
                  <Select
                    name="coverageType"
                    value={formData.coverageType}
                    onChange={handleChange}
                    label="Dekningstype"
                  >
                    {Object.entries(COVERAGE_TYPES).map(([key, label]) => (
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
                  sx={{ fontWeight: 500, color: 'text.primary', mb: 2 }}
                >
                  Tilleggsdekninger
                </Typography>
                <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    {EXTRAS.map((extra) => (
                      shouldShowExtra(extra.id) && (
                        <Grid item xs={12} md={6} key={extra.id}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.extras.includes(extra.id)}
                                onChange={() => handleExtraChange(extra.id)}
                                size="small"
                              />
                            }
                            label={
                              <Typography variant="body2">
                                {extra.label}{' '}
                                <span style={{ color: 'text.secondary' }}>
                                  ({extra.price} kr)
                                </span>
                              </Typography>
                            }
                          />
                        </Grid>
                      )
                    ))}
                  </Grid>
                  {formData.extras.includes('snowPlowing') && (
                    <Typography
                      variant="body2"
                      sx={{ color: 'info.main', mt: 1 }}
                    >
                      Dekningen gjelder snøbrøyting utenfor egen eiendom.
                    </Typography>
                  )}
                </Box>
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

                {(formData.coverageType === 'FIRE_THEFT' || formData.coverageType === 'KASKO') && (
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
                )}

                {formData.coverageType === 'KASKO' && (
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
                )}
              </Box>

              {formData.extras.length > 0 && (
                <>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 2, color: 'text.secondary' }}
                  >
                    Tillegg
                  </Typography>
                  <Box sx={{ mb: 3 }}>
                    {formData.extras.map((extraId) => {
                      const extra = EXTRAS.find((e) => e.id === extraId);
                      return (
                        <Box
                          key={extraId}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            mb: 1.5,
                          }}
                        >
                          <Typography variant="body2">{extra.label}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {extra.price.toLocaleString('nb-NO')} kr
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ArbeidsmaskinCalculator;
