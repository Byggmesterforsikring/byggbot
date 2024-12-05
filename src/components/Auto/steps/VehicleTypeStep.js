import React from 'react';
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Box
} from '@mui/material';
import { 
  VEHICLE_TYPES, 
  BUDGET_CAR_BRANDS,
  MILEAGE_OPTIONS 
} from '../constants/tariffData';

function VehicleTypeStep({ formData, onChange }) {
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

      <FormControl fullWidth>
        <InputLabel>Årlig kjørelengde</InputLabel>
        <Select
          value={formData.mileage}
          label="Årlig kjørelengde"
          onChange={(e) => onChange('mileage', e.target.value)}
        >
          {MILEAGE_OPTIONS.map(({ value, label }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>
          {formData.vehicleType === 'TRUCK' 
            ? 'Maks 16.000 km/år for lastebiler over 7,5 tonn'
            : 'Velg årlig kjørelengde'
          }
        </FormHelperText>
      </FormControl>

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