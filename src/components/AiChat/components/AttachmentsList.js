import React from 'react';
import { Box, Typography, Grid, IconButton } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

const AttachmentsList = ({ attachments, removeAttachment }) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <Box sx={{
      p: 1.5,
      bgcolor: '#F5F5F5',
      borderTop: '1px solid #E0E0E0',
      position: 'fixed',
      bottom: 73, // Plassering rett over input-feltet
      left: { xs: '20px', sm: '260px' }, // Tar hensyn til venstre-menyen
      right: '20px', // Avstand fra høyre kant
      width: 'auto', // Bredden beregnes fra left og right
      maxWidth: { xs: 'calc(100% - 40px)', sm: 'calc(100% - 280px)' }, // Justert for venstre-menyen
      zIndex: 10,
      boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
      borderRadius: '8px 8px 0 0',
      margin: '0 auto' // Sentrerer innenfor grensene
    }}>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
        Vedlegg ({attachments.length})
      </Typography>
      <Grid container spacing={1.5}>
        {attachments.map((file, index) => (
          <Grid item key={index}>
            <Box
              sx={{
                p: 1,
                display: 'flex',
                alignItems: 'center',
                bgcolor: '#FFFFFF',
                borderRadius: 2,
                border: '1px solid #E0E0E0',
                boxShadow: 1,
              }}
            >
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                mr: 1.5
              }}>
                <Typography variant="body2" noWrap sx={{ maxWidth: 150, fontWeight: 500 }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => removeAttachment(index)}
                sx={{ color: 'error.main' }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AttachmentsList;