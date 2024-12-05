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
  TARIFFS
} from './constants/tariffData';

function AutoCalculator() {
  const [formData, setFormData] = useState({
    vehicleType: '',
    carBrand: '',  // For budget cars
    mileage: '',
    coverage: '',
    bonusLevel: '',
    extras: []
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleExtraChange = (extraId) => {
    setFormData(prevData => ({
      ...prevData,
      extras: prevData.extras.includes(extraId)
        ? prevData.extras.filter(id => id !== extraId)
        : [...prevData.extras, extraId]
    }));
  };

  const calculatePremium = () => {
    if (!formData.vehicleType || !formData.coverage || !formData.bonusLevel || !formData.mileage) {
      return 0;
    }

    // Get base premium from tariff
    let basePremium = TARIFFS[formData.vehicleType]?.[formData.coverage]?.[formData.bonusLevel] || 0;

    // Apply mileage factor
    const mileageOption = MILEAGE_OPTIONS.find(opt => opt.value === parseInt(formData.mileage));
    if (mileageOption) {
      basePremium *= mileageOption.factor;
    }

    // Add extras
    const extrasCost = formData.extras.reduce((sum, extraId) => {
      const extra = EXTRAS.find(e => e.id === extraId);
      return sum + (extra?.price || 0);
    }, 0);

    return Math.round(basePremium + extrasCost);
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
              ))}
            </Grid>
          </Grid>

          {/* Premium Display */}
          <Grid item xs={12}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                mt: 3, 
                bgcolor: 'primary.lighter',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant="h6">
                Beregnet premie:
              </Typography>
              <Typography variant="h4">
                {calculatePremium().toLocaleString('nb-NO')} kr
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default AutoCalculator; 