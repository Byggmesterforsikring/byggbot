import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Card,
  CardContent,
  CardHeader,
  Grid,
  InputAdornment,
  Stack
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Description as DescriptionIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

const ModernRulesList = ({
  rules,
  canEdit,
  isAdmin,
  handleNewRule,
  handleDeleteClick,
  formatDate,
  searchQuery,
  setSearchQuery,
  filteredRules,
  deleteDialogOpen,
  setDeleteDialogOpen,
  ruleToDelete,
  handleDeleteConfirm,
}) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 5 }}>
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              fontSize: '1.75rem',
              mb: 1
            }}
          >
            Tegningsregler
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              mb: 4
            }}
          >
            Administrer tegningsregler for forsikringer
          </Typography>
        </Box>

        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            width: '100%',
            mb: 2
          }}
        >
          <TextField
            placeholder="Søk i tegningsregler..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton 
                    size="small" 
                    onClick={() => setSearchQuery('')}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: 1,
                '&.MuiOutlinedInput-root': {
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                    borderWidth: '1px'
                  }
                }
              }
            }}
            sx={{ 
              width: { xs: '100%', sm: 350 },
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
                boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
              }
            }}
          />
          
          {canEdit && (
            <Button
              variant="contained"
              disableElevation
              startIcon={<AddIcon />}
              onClick={handleNewRule}
              sx={{
                borderRadius: 1,
                py: 1,
                px: 3,
                fontWeight: 500,
                '&:hover': {
                  bgcolor: 'primary.dark',
                  boxShadow: '0 2px 4px 0 rgba(0,0,0,0.1)',
                },
                textTransform: 'none'
              }}
            >
              Ny tegningsregel
            </Button>
          )}
        </Box>

        {/* Search Results Info */}
        {searchQuery && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Fant {filteredRules.length} {filteredRules.length === 1 ? 'resultat' : 'resultater'}
              {rules.length > 0 ? ` av ${rules.length}` : ''}
            </Typography>
            <Button
              size="small"
              onClick={() => setSearchQuery('')}
              sx={{
                textTransform: 'none',
                color: 'text.secondary',
                fontWeight: 500,
                p: 0,
                minWidth: 'auto',
                '&:hover': {
                  background: 'transparent',
                  textDecoration: 'underline'
                }
              }}
            >
              Nullstill søk
            </Button>
          </Box>
        )}
      </Box>

      {/* Rules Grid */}
      <Grid container spacing={2}>
        {(searchQuery ? filteredRules : rules).map((rule) => (
          <Grid item xs={12} md={6} lg={4} key={`${rule.id}-${rule.last_updated_at}`}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 1,
                bgcolor: 'background.paper',
                transition: 'all 0.15s ease-in-out',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: 'divider',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: '0 2px 6px 0 rgba(0,0,0,0.06)',
                }
              }}
              onClick={() => navigate(`/tegningsregler/${rule.slug}`)}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  bgcolor: 'primary.main',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                  '.MuiCard-root:hover &': {
                    opacity: 1
                  }
                }}
              />
              
              <CardContent sx={{ p: 3, flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 1, fontSize: '1.05rem' }}>
                  {rule.title}
                </Typography>
                
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    mb: 2,
                    lineHeight: 1.5
                  }}
                >
                  {rule.content ?
                    rule.content
                      .replace(/<[^>]*>/g, '') // Fjern HTML-tags
                      .split(/\n+/) // Del opp i linjer
                      .map(line => line.trim()) // Trim hver linje
                      .filter(line => line.length > 0) // Fjern tomme linjer
                      .join(' ') // Slå sammen med mellomrom
                      .replace(/\s+/g, ' ') // Erstatt multiple mellomrom med ett mellomrom
                      .trim() // Fjern whitespace i start og slutt
                      .substring(0, 160) + '...'
                    : 'Ingen beskrivelse'}
                </Typography>
                
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 'auto',
                    pt: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.8 }} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(rule.last_updated_at)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <PersonIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.8 }} />
                      <Typography variant="caption" color="text.secondary">
                        {rule.last_updated_by_email || 'Ukjent'}
                      </Typography>
                    </Box>
                  </Stack>

                  {isAdmin && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(rule, e);
                      }}
                      sx={{
                        color: 'error.main',
                        '&:hover': {
                          bgcolor: 'rgba(239, 68, 68, 0.08)',
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Show message when no results */}
      {searchQuery && filteredRules.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 2,
            color: 'text.secondary',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundColor: 'rgba(0,0,0,0.01)'
          }}
        >
          <SearchIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
            Ingen resultater funnet
          </Typography>
          <Typography variant="body2">
            Ingen tegningsregler matcher søket "{searchQuery}"
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setSearchQuery('')}
            sx={{
              mt: 1,
              textTransform: 'none',
              borderRadius: 1,
              borderColor: 'divider',
              px: 3,
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'rgba(99, 102, 241, 0.04)'
              }
            }}
          >
            Vis alle tegningsregler
          </Button>
        </Box>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 1,
            width: '100%',
            maxWidth: 400,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 600 }}>Bekreft sletting</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.secondary' }}>
            Er du sikker på at du vil slette tegningsregelen "{ruleToDelete?.title}"?
            Dette kan ikke angres.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ 
              textTransform: 'none',
              borderRadius: 1,
              fontWeight: 500,
              color: 'text.primary',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disableElevation
            sx={{
              textTransform: 'none',
              borderRadius: 1,
              px: 3,
              fontWeight: 500,
              '&:hover': {
                boxShadow: '0 2px 4px 0 rgba(239, 68, 68, 0.2)'
              }
            }}
          >
            Slett
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModernRulesList;