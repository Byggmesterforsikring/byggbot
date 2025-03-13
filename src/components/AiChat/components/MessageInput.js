import React from 'react';
import { Paper, Box, TextField, Button, IconButton } from '@mui/material';
import { Send as SendIcon, AttachFile as AttachFileIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { getDropzoneAcceptConfig, MAX_FILE_SIZE } from '../utils/fileUtils';

const MessageInput = ({ 
  inputValue, 
  handleInputChange, 
  handleSubmit, 
  handleKeyPress, 
  inputRef, 
  isLoading, 
  isStreaming,
  getRootProps,
  getInputProps
}) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'flex-end',
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: '#FFFFFF',
        position: 'fixed', // Gjør input-feltet sticky
        bottom: 16, // Litt avstand fra bunnen
        left: { xs: '20px', sm: '260px' }, // Tar hensyn til venstre-menyen på større skjermer
        right: '20px', // Fast avstand fra høyre kant
        width: 'auto', // Bredden beregnes automatisk basert på left og right
        maxWidth: { xs: 'calc(100% - 40px)', sm: 'calc(100% - 280px)' }, // Justert for venstre-menyen
        zIndex: 11, // Sikre at det er over andre elementer
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)', // Legg til skygge for visuell separasjon
        borderRadius: '8px', // Avrundede hjørner for bedre visuell sammenheng
        margin: '0 auto' // Sentrerer innenfor grensene
      }}
    >
      <IconButton
        {...getRootProps()}
        size="medium"
        sx={{
          mr: 1.5,
          color: 'primary.main',
          '&:hover': {
            bgcolor: 'rgba(25, 118, 210, 0.08)'
          }
        }}
        disabled={isLoading || isStreaming}
      >
        <input {...getInputProps()} />
        <AttachFileIcon />
      </IconButton>
      <TextField
        fullWidth
        multiline
        placeholder="Skriv din melding her..."
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        inputRef={inputRef}
        maxRows={6}
        disabled={isLoading || isStreaming}
        InputProps={{
          sx: {
            pt: 1,
            borderRadius: 2,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#E0E0E0'
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main'
            }
          }
        }}
        sx={{
          '& .MuiInputBase-root': {
            backgroundColor: '#FAFAFA'
          }
        }}
      />
      <Button
        variant="contained"
        color="primary"
        endIcon={(!isLoading && !isStreaming) ? <SendIcon /> : null}
        onClick={handleSubmit}
        disabled={isLoading || isStreaming || !inputValue}
        sx={{
          ml: 1.5,
          height: 'fit-content',
          minWidth: '100px',
          borderRadius: 2,
          py: 1
        }}
      >
        {isLoading || isStreaming ? 'Tenker...' : 'Send'}
      </Button>
    </Paper>
  );
};

export default MessageInput;