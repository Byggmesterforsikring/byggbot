import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  Box,
  IconButton,
  useTheme,
  Typography
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  ExpandLess,
  ExpandMore,
  Dashboard,
  Calculate,
  Build,
  Gavel,
  Description,
  Assessment
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { MENU_ITEMS } from '../../constants/menuStructure';

const DRAWER_WIDTH = 240;

const ICONS = {
  Dashboard: Dashboard,
  Calculate: Calculate,
  Build: Build,
  Gavel: Gavel,
  Description: Description,
  Assessment: Assessment
};

function Sidebar({ open, onToggle }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState({});

  const handleItemClick = (item) => {
    if (item.subItems) {
      setExpandedItems(prev => ({
        ...prev,
        [item.id]: !prev[item.id]
      }));
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? DRAWER_WIDTH : theme.spacing(7),
        '& .MuiDrawer-paper': {
          width: open ? DRAWER_WIDTH : theme.spacing(7),
          overflowX: 'hidden',
          bgcolor: '#FFFFFF',
          borderRight: '1px solid',
          borderColor: 'divider',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
      open={open}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {open && (
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            CalcPro
          </Typography>
        )}
        <IconButton onClick={onToggle}>
          {open ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
      </Box>

      <List sx={{ px: 2, py: 1 }}>
        {MENU_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <React.Fragment key={item.id}>
              <ListItem
                disablePadding
                sx={{ mb: 0.5 }}
              >
                <ListItemButton
                  onClick={() => handleItemClick(item)}
                  sx={{
                    borderRadius: 1,
                    minHeight: 44,
                    color: 'text.secondary',
                    '&.Mui-selected': {
                      bgcolor: 'primary.lighter',
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.lighter',
                      }
                    },
                    '&:hover': {
                      bgcolor: 'action.hover',
                    }
                  }}
                  selected={location.pathname === item.path}
                >
                  {Icon && (
                    <ListItemIcon sx={{ 
                      minWidth: 36,
                      color: 'inherit'
                    }}>
                      <Icon fontSize="small" />
                    </ListItemIcon>
                  )}
                  {open && <ListItemText primary={item.label} />}
                  {open && item.subItems && (
                    expandedItems[item.id] ? <ExpandLess /> : <ExpandMore />
                  )}
                </ListItemButton>
              </ListItem>
              
              {item.subItems && open && (
                <Collapse in={expandedItems[item.id]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems.map((subItem) => (
                      <ListItem key={subItem.id} disablePadding>
                        <ListItemButton
                          onClick={() => handleItemClick(subItem)}
                          selected={location.pathname === subItem.path}
                          sx={{
                            pl: 7,
                            py: 1,
                            borderRadius: 1,
                            ml: 1,
                            color: 'text.secondary',
                            '&.Mui-selected': {
                              bgcolor: 'primary.lighter',
                              color: 'primary.main',
                              '&:hover': {
                                bgcolor: 'primary.lighter',
                              }
                            },
                            '&:hover': {
                              bgcolor: 'action.hover',
                            }
                          }}
                        >
                          <ListItemText 
                            primary={subItem.label}
                            primaryTypographyProps={{
                              fontSize: '0.875rem'
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          );
        })}
      </List>
    </Drawer>
  );
}

export default Sidebar; 