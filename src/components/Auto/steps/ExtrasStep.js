import React from 'react';
import {
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
  Typography
} from '@mui/material';
import { EXTRAS, COVERAGE_TYPES } from '../constants/tariffData';

function ExtrasStep({ formData, onChange }) {
  const handleExtraChange = (extraId) => {
    const newExtras = formData.extras.includes(extraId)
      ? formData.extras.filter(id => id !== extraId)
      : [...formData.extras, extraId];
    onChange('extras', newExtras);
  };

  // Sjekk om dekningen er Kasko
  const isKasko = formData.coverage === 'FULL_KASKO';

  // Filtrer tilleggene basert på dekning
  const getFilteredExtras = () => {
    return EXTRAS.filter(extra => {
      // Disse tilleggene er kun tilgjengelige med Kasko
      const kaskoOnly = ['leasing', 'rentalCar15', 'rentalCar30'];
      if (kaskoOnly.includes(extra.id)) {
        return isKasko;
      }
      return true;
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" gutterBottom>
        Tilleggsdekninger
      </Typography>

      <FormGroup>
        {getFilteredExtras().map((extra) => (
          <FormControlLabel
            key={extra.id}
            control={
              <Checkbox
                checked={formData.extras.includes(extra.id)}
                onChange={() => handleExtraChange(extra.id)}
              />
            }
            label={`${extra.label} (${extra.price.toFixed(2)} kr)`}
          />
        ))}
      </FormGroup>

      {!isKasko && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Noen tillegg er kun tilgjengelige med Kasko-dekning
        </Typography>
      )}
    </Box>
  );
}

export default ExtrasStep; 