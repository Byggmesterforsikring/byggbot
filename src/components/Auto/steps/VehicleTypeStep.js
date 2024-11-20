import React from 'react';
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Box
} from '@mui/material';
import { VEHICLE_TYPES, BUDGET_CAR_BRANDS } from '../constants/tariffData';

function VehicleTypeStep({ formData, onChange }) {
  const handleMileageChange = (event) => {
    const value = event.target.value.replace(/\D/g, ''); // Kun tall
    onChange('mileage', value);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <FormControl fullWidth>
        <InputLabel>Kjøretøytype</InputLabel>
        <Select
          value={formData.vehicleType}
          label="Kjøretøytype"
          onChange={(e) => onChange('vehicleType', e.target.value)}
        >
          {Object.entries(VEHICLE_TYPES).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="Årlig kjørelengde (km)"
        value={formData.mileage}
        onChange={handleMileageChange}
        helperText={
          formData.vehicleType === 'TRUCK' 
            ? 'Maks 16.000 km/år for lastebiler over 7,5 tonn'
            : 'Maks 20.000 km/år'
        }
      />

      {formData.vehicleType === 'BUDGET' && (
        <FormControl fullWidth>
          <InputLabel>Bilmerke</InputLabel>
          <Select
            value={formData.carBrand}
            label="Bilmerke"
            onChange={(e) => onChange('carBrand', e.target.value)}
          >
            {BUDGET_CAR_BRANDS.map((brand) => (
              <MenuItem key={brand} value={brand}>
                {brand}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            Velg bilmerke for spesialtariff
          </FormHelperText>
        </FormControl>
      )}
    </Box>
  );
}

export default VehicleTypeStep; 