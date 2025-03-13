import React from 'react';
import { Container, Box, Paper, Typography, IconButton, FormControl, InputLabel, Select, MenuItem, Tooltip } from '@mui/material';
import { Settings as SettingsIcon, SmartToy as SmartToyIcon, Info as InfoIcon } from '@mui/icons-material';

// Custom hooks and components
import useChat from './hooks/useChat';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import AttachmentsList from './components/AttachmentsList';
import SettingsDialog from './components/SettingsDialog';
import FileUploader from './components/FileUploader';

const AiChatPage = () => {
  const chatHook = useChat();
  const {
    selectedModel,
    handleModelChange,
    availableModels,
    messages,
    inputValue,
    setInputValue,
    handleInputChange,
    isLoading,
    isStreaming,
    attachments,
    setAttachments,
    settingsOpen,
    setSettingsOpen,
    messagesEndRef,
    inputRef,
    copiedMessageIndex,
    tokenUsage,
    formattingTransition,
    loadingTextIndex,
    loadingTexts,
    handleSubmit,
    copyMessageToClipboard,
    retryLastQuestion,
    startNewChat
  } = chatHook;

  // Handle file uploads
  const handleFilesAdded = (files) => {
    setAttachments(prev => [...prev, ...files]);
  };

  // Setup file uploader
  const fileUploader = FileUploader({ onFilesAdded: handleFilesAdded });
  const { getRootProps, getInputProps } = fileUploader;

  // Handle key press for input
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  // Remove attachment handler
  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 1,
                  bgcolor: '#6158e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <SmartToyIcon sx={{ color: 'white', fontSize: 32 }} />
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 600,
                    color: 'text.primary',
                  }}
                >
                  BMF Assistent
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    mt: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  Byggmesterforsikring <InfoIcon fontSize="small" sx={{ ml: 0.5, fontSize: 16 }} />
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Removed token usage display - moved to MessageList component */}
              
              <FormControl sx={{ minWidth: { xs: 150, sm: 200 } }}>
                <InputLabel id="model-select-label">Modell</InputLabel>
                <Select
                  labelId="model-select-label"
                  value={selectedModel}
                  onChange={handleModelChange}
                  label="Modell"
                  size="small"
                >
                  {availableModels.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Tooltip title="Innstillinger">
                <IconButton onClick={() => setSettingsOpen(true)}>
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        {/* Messages List Component */}
        <MessageList 
          messages={messages}
          isLoading={isLoading}
          isStreaming={isStreaming}
          loadingTextIndex={loadingTextIndex}
          loadingTexts={loadingTexts}
          formattingTransition={formattingTransition}
          messagesEndRef={messagesEndRef}
          copiedMessageIndex={copiedMessageIndex}
          copyMessageToClipboard={copyMessageToClipboard}
          retryLastQuestion={retryLastQuestion}
          startNewChat={startNewChat}
          inputRef={inputRef}
          setInputValue={setInputValue}
          tokenUsage={tokenUsage}
        />

        {/* Attachments List Component */}
        <AttachmentsList 
          attachments={attachments} 
          removeAttachment={removeAttachment} 
        />

        {/* Message Input Component */}
        <MessageInput 
          inputValue={inputValue}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          handleKeyPress={handleKeyPress}
          inputRef={inputRef}
          isLoading={isLoading}
          isStreaming={isStreaming}
          getRootProps={getRootProps}
          getInputProps={getInputProps}
        />

        {/* Settings Dialog Component */}
        <SettingsDialog 
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          selectedModel={selectedModel}
          handleModelChange={handleModelChange}
          availableModels={availableModels}
        />
      </Box>
    </Container>
  );
};

export default AiChatPage;