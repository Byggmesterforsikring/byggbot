import React from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Box,
  Typography
} from '@mui/material';
import { COVERAGE_TYPES, BONUS_LEVELS } from '../constants/tariffData';

function CoverageStep({ formData, onChange }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <FormControl fullWidth>
        <InputLabel>Dekning</InputLabel>
        <Select
          value={formData.coverage}
          label="Dekning"
          onChange={(e) => onChange('coverage', e.target.value)}
        >
          {Object.entries(COVERAGE_TYPES).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Bonusnivå</InputLabel>
        <Select
          value={formData.bonusLevel}
          label="Bonusnivå"
          onChange={(e) => onChange('bonusLevel', e.target.value)}
        >
          {BONUS_LEVELS.map((level) => (
            <MenuItem key={level} value={level}>
              {level}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {formData.coverage && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Egenandel: {formData.coverage === 'FULL_KASKO' ? '7.500' : '5.000'} kr
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vilkår: {formData.vehicleType === 'TRUCK' ? 'MVL 110' : 'MV 100'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default CoverageStep; 