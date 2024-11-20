import React from 'react';
import {
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
  Typography
} from '@mui/material';
import { EXTRAS } from '../constants/tariffData';

function ExtrasStep({ formData, onChange }) {
  const handleExtraChange = (extraId) => {
    const newExtras = formData.extras.includes(extraId)
      ? formData.extras.filter(id => id !== extraId)
      : [...formData.extras, extraId];
    onChange('extras', newExtras);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" gutterBottom>
        Tilleggsdekninger
      </Typography>

      <FormGroup>
        {EXTRAS.map((extra) => (
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
    </Box>
  );
}

export default ExtrasStep; 