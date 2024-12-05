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
  FormControlLabel
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

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Auto Kalkulator
      </Typography>
      
      <Paper sx={{ p: 3, mt: 2 }}>
        <Grid container spacing={3}>
          {/* Vehicle Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Kjøretøyinformasjon
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
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
              <FormControl fullWidth>
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

          {/* Usage Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Bruksinformasjon
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
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

          {/* Coverage Options */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Dekning
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
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

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
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

          {/* Extras */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Tilleggsdekninger
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Grid container spacing={2}>
              {EXTRAS.map(extra => (
                shouldShowExtra(extra.id) && (
                  <Grid item xs={12} md={6} key={extra.id}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.extras.includes(extra.id)}
                          onChange={() => handleExtraChange(extra.id)}
                        />
                      }
                      label={`${extra.label} (${extra.price} kr)`}
                    />
                  </Grid>
                )
              ))}
            </Grid>
          </Grid>

          {/* Premium Display */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
              {/* Total Premium */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                pb: 2,
                borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
              }}>
                <Typography variant="h6">
                  Total premie:
                </Typography>
                <Typography variant="h4">
                  {calculatePremiumDistribution().total.toLocaleString('nb-NO')} kr
                </Typography>
              </Box>

              {/* Coverage Distribution */}
              <Typography variant="h6" gutterBottom>
                Dekninger:
              </Typography>
              <Box sx={{ mb: 3 }}>
                {/* Ansvar - vises alltid */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Ansvar</Typography>
                  <Typography>
                    {Math.round(calculatePremiumDistribution().liability).toLocaleString('nb-NO')} kr
                  </Typography>
                </Box>

                {/* Delkasko - vises ved Delkasko eller Kasko */}
                {(formData.coverage === 'PARTIAL_KASKO' || formData.coverage === 'FULL_KASKO') && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Delkasko</Typography>
                    <Typography>
                      {Math.round(calculatePremiumDistribution().partialKasko).toLocaleString('nb-NO')} kr
                    </Typography>
                  </Box>
                )}

                {/* Kasko - vises kun ved Kasko */}
                {formData.coverage === 'FULL_KASKO' && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Kasko</Typography>
                    <Typography>
                      {Math.round(calculatePremiumDistribution().kasko).toLocaleString('nb-NO')} kr
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Extras */}
              {calculatePremiumDistribution().extras.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Tillegg:
                  </Typography>
                  <Box>
                    {calculatePremiumDistribution().extras.map(extra => (
                      <Box key={extra.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>{extra.label}</Typography>
                        <Typography>{extra.price.toLocaleString('nb-NO')} kr</Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default AutoCalculator; 