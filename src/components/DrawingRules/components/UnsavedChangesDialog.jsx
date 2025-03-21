import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button
} from '@mui/material';
import { Warning } from '@mui/icons-material';

const UnsavedChangesDialog = ({ open, onClose, onDiscard, onSave }) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'flex-start',
            p: 2,
            pb: 0,
            gap: 1.5
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 1,
              backgroundColor: 'hsl(48 96% 89%)',
            }}
          >
            <Warning sx={{ color: 'hsl(38 92% 40%)' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Ulagrede endringer
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Du har ulagrede endringer som vil gå tapt hvis du navigerer bort fra denne siden uten å lagre.
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogActions sx={{ px: 3, py: 2, gap: 1, justifyContent: 'flex-end' }}>
        <Button 
          onClick={onDiscard}
          variant="outlined"
          sx={{
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 500,
            borderColor: 'divider',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'rgba(99, 102, 241, 0.04)',
            }
          }}
        >
          Forkast endringer
        </Button>
        <Button 
          onClick={onSave}
          variant="contained"
          disableElevation
          sx={{
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 500,
            px: 3,
            backgroundColor: 'primary.main',
            color: 'white',
            '&:hover': {
              backgroundColor: 'primary.dark',
              boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.1)'
            }
          }}
        >
          Lagre endringer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UnsavedChangesDialog;