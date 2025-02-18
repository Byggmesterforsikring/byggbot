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
  Divider
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { MENU_ITEMS } from '../../constants/menuStructure';
import * as Icons from '@mui/icons-material';
import logo from '../../assets/logo.svg';
import authManager from '../../auth/AuthManager';

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
    return Icon ? <Icon /> : null;
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

  const isItemActive = (path) => location.pathname === path;

  const canShowMenuItem = (item) => {
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
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        },
      }}
    >
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        p: 2,
        minHeight: 64,
      }}>
        <Box
          component="img"
          src={logo}
          alt="BMF Pro Logo"
          sx={{
            height: 32,
            width: 'auto'
          }}
        />
      </Box>

      <Divider />

      <List sx={{ pt: 1 }}>
        {MENU_ITEMS.map((item) => (
          canShowMenuItem(item) && (
            <React.Fragment key={item.id}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleItemClick(item)}
                  sx={{
                    minHeight: 48,
                    px: 2.5,
                    ...(isItemActive(item.path) && {
                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.04)',
                      },
                      borderLeft: '3px solid',
                      borderColor: 'primary.main',
                    }),
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: isItemActive(item.path) ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {getIcon(item.icon)}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    sx={{
                      '& .MuiTypography-root': {
                        fontWeight: isItemActive(item.path) ? 600 : 400,
                        color: isItemActive(item.path) ? 'primary.main' : 'text.primary',
                      }
                    }}
                  />
                  {item.subItems && (
                    <ExpandMoreIcon
                      sx={{
                        transform: expandedItems[item.id] ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.3s',
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>

              {/* Submenu items */}
              {item.subItems && (
                <Collapse in={expandedItems[item.id]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems.map((subItem) => (
                      canShowMenuItem(subItem) && (
                        <ListItemButton
                          key={subItem.id}
                          onClick={() => navigate(subItem.path)}
                          sx={{
                            pl: 6,
                            py: 1,
                            minHeight: 40,
                            ...(isItemActive(subItem.path) && {
                              bgcolor: 'rgba(0, 0, 0, 0.04)',
                              '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.04)',
                              },
                              borderLeft: '3px solid',
                              borderColor: 'primary.main',
                            }),
                          }}
                        >
                          <ListItemText
                            primary={subItem.label}
                            sx={{
                              '& .MuiTypography-root': {
                                fontSize: '0.875rem',
                                fontWeight: isItemActive(subItem.path) ? 600 : 400,
                                color: isItemActive(subItem.path) ? 'primary.main' : 'text.primary',
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
    </Drawer>
  );
}

export default Sidebar; 