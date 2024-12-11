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
  Button
} from '@mui/material';
import { 
  VEHICLE_TYPES, 
  COVERAGE_TYPES, 
  BONUS_LEVELS, 
  BUDGET_CAR_BRANDS,
  MILEAGE_OPTIONS,
  EXTRAS,
  TARIFFS,
  BUDGET_TARIFFS
} from './constants/tariffData';
import { 
  DirectionsCar as CarIcon 
} from '@mui/icons-material';

function AutoCalculator() {
  const [formData, setFormData] = useState({
    vehicleType: '',
    carBrand: '',
    mileage: '',
    coverage: '',
    bonusLevel: '',
    extras: ['driverAccident']
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleExtraChange = (extraId) => {
    setFormData(prevData => {
      let newExtras = [...prevData.extras];
      
      if (extraId === 'rentalCar15' || extraId === 'rentalCar30') {
        newExtras = newExtras.filter(id => id !== 'rentalCar15' && id !== 'rentalCar30');
        if (!prevData.extras.includes(extraId)) {
          newExtras.push(extraId);
        }
      } else {
        newExtras = prevData.extras.includes(extraId)
          ? newExtras.filter(id => id !== extraId)
          : [...newExtras, extraId];
      }
      
      return {
        ...prevData,
        extras: newExtras
      };
    });
  };

  const shouldShowExtra = (extraId) => {
    const isKasko = formData.coverage === 'FULL_KASKO';
    
    switch (extraId) {
      case 'driverAccident':
        return true;
      case 'craneLiability':
        return formData.vehicleType === 'TRUCK';
      case 'rentalCar15':
      case 'rentalCar30':
        return isKasko;
      case 'leasing':
        return isKasko;
      default:
        return true;
    }
  };

  const calculatePremiumDistribution = () => {
    if (!formData.vehicleType || !formData.coverage || !formData.bonusLevel || !formData.mileage) {
      return {
        liability: 0,
        partialKasko: 0,
        kasko: 0,
        extras: [],
        total: 0
      };
    }

    // Beregn basispremie uten tillegg
    let basePremium;
    if (formData.vehicleType === 'BUDGET') {
      basePremium = BUDGET_TARIFFS[formData.coverage]?.[formData.bonusLevel] || 0;
    } else {
      basePremium = TARIFFS[formData.vehicleType]?.[formData.coverage]?.[formData.bonusLevel] || 0;
    }

    const mileageOption = MILEAGE_OPTIONS.find(opt => opt.value === parseInt(formData.mileage));
    if (mileageOption) {
      basePremium *= mileageOption.factor;
    }

    // Beregn tilleggsdekninger
    const extras = formData.extras.map(extraId => {
      const extra = EXTRAS.find(e => e.id === extraId);
      return {
        id: extraId,
        label: extra.label,
        price: extra.price
      };
    });

    const extrasCost = extras.reduce((sum, extra) => sum + extra.price, 0);

    // Fordel premie basert på dekningstype og kjøretøytype
    let distribution = {
      liability: 0,
      partialKasko: 0,
      kasko: 0,
      extras: extras,
      total: Math.round(basePremium + extrasCost)
    };

    // For lette kjøretøy og budsjettbiler
    if (['PRIVATE_LIGHT', 'ELECTRIC_LIGHT', 'BUDGET'].includes(formData.vehicleType)) {
      switch (formData.coverage) {
        case 'LIABILITY':
          distribution.liability = basePremium;
          break;
        case 'PARTIAL_KASKO':
          distribution.liability = 2949;
          distribution.partialKasko = basePremium - 2949;
          break;
        case 'FULL_KASKO':
          distribution.liability = 2949;
          distribution.partialKasko = basePremium * 0.28;
          distribution.kasko = basePremium - 2949 - (basePremium * 0.28);
          break;
      }
    } 
    // For mellomtunge kjøretøy (3,5 - 7,499 tonn)
    else if (formData.vehicleType === 'PRIVATE_MEDIUM') {
      switch (formData.coverage) {
        case 'LIABILITY':
          distribution.liability = basePremium;
          break;
        case 'PARTIAL_KASKO':
          distribution.liability = 3449;
          distribution.partialKasko = basePremium - 3449;
          break;
        case 'FULL_KASKO':
          distribution.liability = 3449;
          distribution.partialKasko = basePremium * 0.25;
          distribution.kasko = basePremium - 3449 - (basePremium * 0.25);
          break;
      }
    }
    // For lastebiler (7,5 tonn og over)
    else if (formData.vehicleType === 'TRUCK') {
      switch (formData.coverage) {
        case 'LIABILITY':
          distribution.liability = basePremium;
          break;
        case 'PARTIAL_KASKO':
          distribution.liability = 4842;
          distribution.partialKasko = basePremium - 4842;
          break;
        case 'FULL_KASKO':
          distribution.liability = 4842;
          distribution.partialKasko = basePremium * 0.36;
          distribution.kasko = basePremium - 4842 - (basePremium * 0.36);
          break;
      }
    }

    return distribution;
  };

  const handleReset = () => {
    setFormData({
      vehicleType: '',
      carBrand: '',
      mileage: '',
      coverage: '',
      bonusLevel: '',
      extras: ['driverAccident']
    });
  };

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
              justifyContent: 'center'
            }}
          >
            <CarIcon fontSize="large" />
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
              Auto Kalkulator
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                mt: 0.5 
              }}
            >
              Beregn forsikringspremie for kjøretøy
            </Typography>
          </Box>
        </Box>
        
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            sx={{
              borderColor: 'rgba(99, 102, 241, 0.1)',
              bgcolor: 'rgba(99, 102, 241, 0.05)',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'rgba(99, 102, 241, 0.1)',
              }
            }}
          >
            Se tegningsregler
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleReset}
            sx={{
              bgcolor: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.dark',
              }
            }}
          >
            Nullstill skjema
          </Button>
        </Box>
      </Paper>
      
      <Grid container spacing={3}>
        {/* Venstre side - Input felter */}
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
              {/* Kjøretøyinformasjon */}
              <Grid item xs={12}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 500,
                    color: 'text.primary',
                    mb: 2 
                  }}
                >
                  Kjøretøyinformasjon
                </Typography>
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Kjøretøytype</InputLabel>
                        <Select
                          name="vehicleType"
                          value={formData.vehicleType}
                          onChange={handleChange}
                          label="Kjøretøytype"
                        >
                          {Object.entries(VEHICLE_TYPES).map(([key, label]) => (
                            <MenuItem key={key} value={key}>{label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {formData.vehicleType === 'BUDGET' && (
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Bilmerke</InputLabel>
                          <Select
                            name="carBrand"
                            value={formData.carBrand}
                            onChange={handleChange}
                            label="Bilmerke"
                          >
                            {BUDGET_CAR_BRANDS.map(brand => (
                              <MenuItem key={brand} value={brand}>{brand}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </Grid>

              {/* Bruksinformasjon */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary', mb: 2 }}>
                  Bruksinformasjon
                </Typography>
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Kjørelengde</InputLabel>
                        <Select
                          name="mileage"
                          value={formData.mileage}
                          onChange={handleChange}
                          label="Kjørelengde"
                        >
                          {MILEAGE_OPTIONS.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Bonus</InputLabel>
                        <Select
                          name="bonusLevel"
                          value={formData.bonusLevel}
                          onChange={handleChange}
                          label="Bonus"
                        >
                          {BONUS_LEVELS.map(level => (
                            <MenuItem key={level} value={level}>{level}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* Dekning */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary', mb: 2 }}>
                  Dekning
                </Typography>
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Dekningstype</InputLabel>
                        <Select
                          name="coverage"
                          value={formData.coverage}
                          onChange={handleChange}
                          label="Dekningstype"
                        >
                          {Object.entries(COVERAGE_TYPES).map(([key, label]) => (
                            <MenuItem key={key} value={key}>{label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* Tilleggsdekninger */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary', mb: 2 }}>
                  Tilleggsdekninger
                </Typography>
                <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    {EXTRAS.map(extra => (
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
                                {extra.label} <span style={{ color: 'text.secondary' }}>({extra.price} kr)</span>
                              </Typography>
                            }
                          />
                        </Grid>
                      )
                    ))}
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Høyre side - Premievisning */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3,
              height: '100%',
              borderRadius: 2,
              bgcolor: 'background.paper',
              position: 'sticky',
              top: 24
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              height: '100%'
            }}>
              {/* Total Premium */}
              <Box sx={{ 
                p: 2,
                mb: 3,
                borderRadius: 1,
                bgcolor: 'primary.main',
                color: 'white'
              }}>
                <Typography variant="body1" sx={{ mb: 1, opacity: 0.9 }}>
                  Total premie
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {calculatePremiumDistribution().total.toLocaleString('nb-NO')} kr
                </Typography>
              </Box>

              {/* Dekninger */}
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                Dekninger
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2">Ansvar</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {Math.round(calculatePremiumDistribution().liability).toLocaleString('nb-NO')} kr
                  </Typography>
                </Box>

                {(formData.coverage === 'PARTIAL_KASKO' || formData.coverage === 'FULL_KASKO') && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2">Delkasko</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {Math.round(calculatePremiumDistribution().partialKasko).toLocaleString('nb-NO')} kr
                    </Typography>
                  </Box>
                )}

                {formData.coverage === 'FULL_KASKO' && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2">Kasko</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {Math.round(calculatePremiumDistribution().kasko).toLocaleString('nb-NO')} kr
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Extras */}
              {calculatePremiumDistribution().extras.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                    Tillegg
                  </Typography>
                  <Box>
                    {calculatePremiumDistribution().extras.map(extra => (
                      <Box key={extra.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="body2">{extra.label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {extra.price.toLocaleString('nb-NO')} kr
                        </Typography>
                      </Box>
                    ))}
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

export default AutoCalculator; 