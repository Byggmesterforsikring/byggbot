import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Typography,
  alpha,
  useTheme
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { MENU_ITEMS } from '../../constants/menuStructure';
import * as Icons from '@mui/icons-material';
import logo from '../../assets/logo.svg';
import authManager from '../../auth/AuthManager';
import packageJson from '../../../package.json';
const { version } = packageJson;

const isDev = process.env.NODE_ENV === 'development';

const devlog = (message, data = null) => {
  if (isDev) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] Sidebar: ${message}`;
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
};

function Sidebar() {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});
  const [userRole, setUserRole] = useState('USER');

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const account = authManager.getCurrentAccount();
        if (account) {
          devlog('Henter brukerrolle for:', { email: account.username });
          const role = await authManager.getUserRole();
          devlog('Mottatt brukerrolle:', { role });
          setUserRole(role || 'USER');
        }
      } catch (error) {
        devlog('Feil ved henting av brukerrolle:', { error: error.message });
        setUserRole('USER');
      }
    };

    fetchUserRole();
  }, []);

  // Dynamisk icon-rendering
  const getIcon = (iconName) => {
    const Icon = Icons[iconName];
    return Icon ? <Icon fontSize="small" /> : null;
  };

  const handleItemClick = (item) => {
    if (item.subItems) {
      setExpandedItems(prev => ({
        ...prev,
        [item.id]: !prev[item.id]
      }));
    } else {
      navigate(item.path);
    }
  };

  const isItemActive = (path) => {
    // Handle undefined path
    if (!path) return false;
    
    // For report paths with query parameters, check only the base path
    if (path.startsWith('/reports?')) {
      return location.pathname === '/reports' && location.search.includes(path.split('?')[1]);
    }
    return location.pathname === path;
  };

  const canShowMenuItem = (item) => {
    // Check if item is defined
    if (!item) return false;
    
    devlog('Sjekker tilgang for meny-item:', {
      label: item.label,
      requiredRole: item.requiredRole,
      userRole
    });
    if (!item.requiredRole) return true;
    return userRole === item.requiredRole || userRole === 'ADMIN';
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 260,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 260,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.15),
          bgcolor: 'background.paper',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden'
        },
      }}
    >
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        p: 3,
        minHeight: 68,
      }}>
        <Box
          component="img"
          src={logo}
          alt="BMF Pro Logo"
          sx={{
            height: 36,
            width: 'auto'
          }}
        />
      </Box>

      <Divider sx={{ 
        opacity: 0.15, 
        borderColor: theme.palette.divider,
        my: 0.5
      }} />

      <Box sx={{ 
        pt: 1.5, 
        pb: 1.5,
        mx: 2,
        overflow: 'auto',
        height: 'calc(100vh - 140px)',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: alpha(theme.palette.primary.main, 0.2),
          borderRadius: '6px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: alpha(theme.palette.primary.main, 0.3),
        }
      }}>
        <List disablePadding>
          {MENU_ITEMS.filter(Boolean).map((item) => (
            canShowMenuItem(item) && (
              <React.Fragment key={item.id || Math.random()}>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleItemClick(item)}
                    sx={{
                      minHeight: 48,
                      px: 2,
                      py: 1,
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      // Styling for ripple effect 
                      '& .MuiTouchRipple-root': { 
                        color: alpha(theme.palette.primary.main, 0.3)
                      },
                      ...(isItemActive(item.path) && !item.subItems && {
                        bgcolor: alpha(theme.palette.primary.main, 0.06),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                        },
                      }),
                      ...(!isItemActive(item.path) && {
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.04),
                        },
                      }),
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: isItemActive(item.path) ? theme.palette.primary.main : alpha(theme.palette.text.primary, 0.7),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Box 
                        sx={{ 
                          p: 0.5, 
                          borderRadius: '8px',
                          bgcolor: isItemActive(item.path) && !item.subItems ? alpha(theme.palette.primary.main, 0.12) : 'transparent'
                        }}
                      >
                        {getIcon(item.icon)}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      sx={{
                        '& .MuiTypography-root': {
                          fontWeight: isItemActive(item.path) ? 600 : 500,
                          fontSize: '0.9rem',
                          color: isItemActive(item.path) 
                            ? theme.palette.primary.main 
                            : theme.palette.text.primary,
                        }
                      }}
                    />
                    {item.subItems && (
                      <ExpandMoreIcon
                        sx={{
                          fontSize: '1.2rem',
                          transform: expandedItems[item.id] ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.3s',
                          color: alpha(theme.palette.text.primary, 0.5),
                        }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>

                {/* Submenu items */}
                {item.subItems && Array.isArray(item.subItems) && (
                  <Collapse in={expandedItems[item.id]} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ pl: 3, pr: 1, mt: 0.5, mb: 1 }}>
                      {item.subItems.filter(Boolean).map((subItem) => (
                        canShowMenuItem(subItem) && (
                          <ListItemButton
                            key={subItem.id || Math.random()}
                            onClick={() => navigate(subItem.path || '/')}
                            sx={{
                              py: 0.7,
                              minHeight: 40,
                              pl: 2,
                              borderRadius: '10px',
                              mb: 0.5,
                              transition: 'all 0.2s',
                              // Styling for ripple effect
                              '& .MuiTouchRipple-root': { 
                                color: alpha(theme.palette.primary.main, 0.3)
                              },
                              ...(isItemActive(subItem.path) && {
                                bgcolor: alpha(theme.palette.primary.main, 0.06),
                                '&:hover': {
                                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                                },
                              }),
                              ...(!isItemActive(subItem.path) && {
                                '&:hover': {
                                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                                },
                              }),
                            }}
                          >
                            <Box 
                              sx={{ 
                                width: '6px', 
                                height: '6px', 
                                borderRadius: '50%', 
                                mr: 1.5,
                                bgcolor: isItemActive(subItem.path) 
                                  ? theme.palette.primary.main 
                                  : alpha(theme.palette.text.primary, 0.3)
                              }} 
                            />
                            <ListItemText
                              primary={subItem.label}
                              sx={{
                                '& .MuiTypography-root': {
                                  fontSize: '0.85rem',
                                  fontWeight: isItemActive(subItem.path) ? 600 : 400,
                                  color: isItemActive(subItem.path) 
                                    ? theme.palette.primary.main 
                                    : alpha(theme.palette.text.primary, 0.85),
                                }
                              }}
                            />
                          </ListItemButton>
                        )
                      ))}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            )
          ))}
        </List>
      </Box>
      
      {/* Versjonsvisning nederst i menyen */}
      <Box 
        sx={{
          mt: 'auto', 
          p: 2, 
          borderTop: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.15),
          display: 'flex',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.background.default, 0.4)
        }}
      >
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '0.75rem',
            fontWeight: 500,
            color: alpha(theme.palette.text.secondary, 0.8)
          }}
        >
          Versjon {version} {isDev ? '(Dev)' : ''}
        </Typography>
      </Box>
    </Drawer>
  );
}

export default Sidebar; 