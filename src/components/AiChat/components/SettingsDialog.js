import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, FormControl, Select, MenuItem, InputLabel, Typography, Box } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

const SettingsDialog = ({ 
  open, 
  onClose, 
  selectedModel, 
  handleModelChange, 
  availableModels 
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxWidth: 500
        }
      }}
    >
      <DialogTitle sx={{
        borderBottom: '1px solid #E0E0E0',
        pb: 2,
        display: 'flex',
        alignItems: 'center'
      }}>
        <SettingsIcon sx={{ mr: 1.5, color: 'primary.main' }} />
        BMF Assistent Innstillinger
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <DialogContentText sx={{ mb: 3 }}>
          Velg modell for BMF assistenten.
        </DialogContentText>

        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          AI Modell
        </Typography>

        <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
          <InputLabel id="settings-model-select-label">Velg AI modell</InputLabel>
          <Select
            labelId="settings-model-select-label"
            value={selectedModel}
            onChange={handleModelChange}
            label="Velg AI modell"
          >
            {availableModels.map((model) => (
              <MenuItem key={model.id} value={model.id}>
                {model.name}
              </MenuItem>
            ))}
          </Select>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            GPT-4o er den anbefalte modellen for best ytelse.
          </Typography>
        </FormControl>

        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Om BMF Assistent
        </Typography>
        <Typography variant="body2" color="text.secondary">
          BMF Assistent er en spesialisert AI-assistent som kan hjelpe med byggrelaterte spørsmål.
          Den bruker Azure OpenAI GPT-modeller for å generere svar på norsk.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid #E0E0E0', p: 2 }}>
        <Button
          onClick={onClose}
          sx={{ borderRadius: 2 }}
        >
          Avbryt
        </Button>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{ borderRadius: 2 }}
        >
          Lukk
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;