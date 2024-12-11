import React from 'react';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Typography,
  IconButton,
  Collapse,
  Divider
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft as ChevronLeftIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { MENU_ITEMS } from '../../constants/menuStructure';
import * as Icons from '@mui/icons-material';

function Sidebar({ open, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = React.useState({});

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

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? 240 : 72,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? 240 : 72,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          transition: theme => theme.transitions.create(['width'], {
            duration: theme.transitions.duration.shorter,
          }),
          overflowX: 'hidden',
        },
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: open ? 'space-between' : 'center',
        p: 2,
        minHeight: 64,
      }}>
        {open && (
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            BMF pro
          </Typography>
        )}
        <IconButton onClick={onToggle} size="small">
          <ChevronLeftIcon 
            sx={{ 
              transform: open ? 'none' : 'rotate(180deg)',
              transition: theme => theme.transitions.create(['transform'])
            }} 
          />
        </IconButton>
      </Box>

      <Divider />

      <List sx={{ pt: 1 }}>
        {MENU_ITEMS.map((item) => (
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
                {open && (
                  <>
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
                  </>
                )}
              </ListItemButton>
            </ListItem>

            {/* Submenu items */}
            {open && item.subItems && (
              <Collapse in={expandedItems[item.id]} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.subItems.map((subItem) => (
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
                  ))}
                </List>
              </Collapse>
            )}
          </React.Fragment>
        ))}
      </List>
    </Drawer>
  );
}

export default Sidebar; 