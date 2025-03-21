import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import DrawingRuleEditor from '../editor/DrawingRuleEditor';
import RuleViewer from '../viewer/RuleViewer';
import UnsavedChangesDialog from './UnsavedChangesDialog';

const ModernRuleDetail = ({
  currentRule,
  isEditing,
  title, 
  setTitle,
  handleEditClick,
  loadVersionHistory,
  canEdit,
  handleSave,
  handleCancel,
  handleBackClick,
  showVersionHistory,
  setShowVersionHistory,
  versions,
  handleVersionSelect,
  formatDate
}) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  
  const handleHasChangesChange = (hasChanges) => {
    setHasUnsavedChanges(hasChanges);
  };
  
  // Registrer callback for editor content endringer
  React.useEffect(() => {
    window.handleEditorContentChange = (content) => {
      setEditorContent(content);
    };
    
    // Initialiser editorContent med innholdet fra currentRule når komponenten mountes
    if (currentRule?.content) {
      setEditorContent(currentRule.content);
    }
    
    return () => {
      delete window.handleEditorContentChange;
    };
  }, [currentRule]);
  
  // Tilbakestill hasUnsavedChanges når vi går ut av redigeringsmodus
  React.useEffect(() => {
    if (!isEditing) {
      setHasUnsavedChanges(false);
    }
  }, [isEditing]);
  
  const handleBackWithCheck = () => {
    // Vis advarselen kun hvis vi er i redigeringsmodus og har endringer
    if (isEditing && hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      handleBackClick();
    }
  };
  
  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false);
    handleCancel();
  };
  
  const handleSaveChanges = async () => {
    setShowUnsavedDialog(false);
    if (editorContent) {
      await handleSave(title, editorContent);
      setHasUnsavedChanges(false);
    }
  };
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 4, 
          gap: 2,
          pb: 3,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <IconButton 
          onClick={handleBackWithCheck}
          size="small"
          sx={{ 
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 1,
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.04)',
            }
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        
        <Typography 
          variant="h5" 
          component="h1" 
          sx={{ 
            fontWeight: 600,
            color: 'text.primary',
            flex: 1
          }}
        >
          {isEditing ? (currentRule ? 'Rediger' : 'Ny') + ' tegningsregel' : currentRule?.title}
        </Typography>
        
        {currentRule && !isEditing && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canEdit && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon fontSize="small" />}
                onClick={handleEditClick}
                disableElevation
                sx={{
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                  borderColor: 'divider',
                  px: 2,
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'rgba(99, 102, 241, 0.04)',
                  }
                }}
              >
                Rediger
              </Button>
            )}
            
            <Button
              variant="outlined"
              size="small"
              startIcon={<HistoryIcon fontSize="small" />}
              onClick={loadVersionHistory}
              disableElevation
              sx={{
                borderRadius: 1,
                textTransform: 'none',
                fontWeight: 500,
                borderColor: 'divider',
                px: 2,
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'rgba(99, 102, 241, 0.04)',
                }
              }}
            >
              Versjonshistorikk
            </Button>
          </Box>
        )}
      </Box>

      {isEditing ? (
        <DrawingRuleEditor
          initialContent={currentRule?.content}
          onSave={handleSave}
          title={title}
          setTitle={setTitle}
          key={currentRule?.id}
          onCancel={handleCancel}
          onHasChangesChange={handleHasChangesChange}
        />
      ) : (
        currentRule && (
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)'
            }}
          >
            <RuleViewer rule={currentRule} />
          </Paper>
        )
      )}

      <Dialog
        open={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, py: 2 }}>Versjonshistorikk</DialogTitle>
        <DialogContent dividers>
          <List sx={{ pt: 0 }}>
            {versions.map((version) => (
              <React.Fragment key={version.id}>
                <ListItem
                  button
                  onClick={() => handleVersionSelect(version)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: version.is_current ? 'rgba(99, 102, 241, 0.04)' : 'inherit',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'rgba(99, 102, 241, 0.08)',
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                          Versjon {version.version_number}
                        </Typography>
                        {version.is_current && (
                          <Chip 
                            label="Gjeldende" 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            sx={{ height: 22, borderRadius: 1, fontSize: '0.7rem', fontWeight: 500 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" component="span" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                          Opprettet: {formatDate(version.created_at)}
                        </Typography>
                        <br />
                        <Typography variant="body2" component="span" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                          Av: {version.created_by_email}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                <Divider component="li" sx={{ opacity: 0.6 }} />
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setShowVersionHistory(false)}
            sx={{
              borderRadius: 1,
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            Lukk
          </Button>
        </DialogActions>
      </Dialog>
      
      <UnsavedChangesDialog 
        open={showUnsavedDialog}
        onClose={() => setShowUnsavedDialog(false)}
        onDiscard={handleDiscardChanges}
        onSave={handleSaveChanges}
      />
    </Box>
  );
};

export default ModernRuleDetail;