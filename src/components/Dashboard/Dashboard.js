import React from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  useTheme
} from '@mui/material';
import {
  TrendingUp,
  Assessment,
  Warning,
  CheckCircle
} from '@mui/icons-material';

function StatWidget({ title, value, icon, color }) {
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ 
          bgcolor: `${color}.lighter`,
          color: `${color}.main`,
          p: 1.5,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          mr: 2
        }}>
          {icon}
        </Box>
        <Typography variant="body1" color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" fontWeight="bold">
        {value}
      </Typography>
    </Paper>
  );
}

function Dashboard() {
  const theme = useTheme();
  
  const recentActivity = [
    { id: 1, action: 'Ny Auto forsikring opprettet', time: '10:23', status: 'success' },
    { id: 2, action: 'Garantibevis generert', time: '09:45', status: 'success' },
    { id: 3, action: 'Prisberegning feilet', time: '09:30', status: 'error' },
    { id: 4, action: 'Tilhenger forsikring oppdatert', time: '09:15', status: 'success' },
  ];

  const productStats = [
    { product: 'Auto', completed: 85, color: theme.palette.primary.main },
    { product: 'Tilhenger', completed: 65, color: theme.palette.success.main },
    { product: 'Garanti', completed: 92, color: theme.palette.info.main },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Dashboard
      </Typography>

      {/* Statistikk-widgets i egen container */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatWidget 
              title="Totalt i dag"
              value="47"
              icon={<Assessment fontSize="large" />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatWidget 
              title="Vekst"
              value="+12.5%"
              icon={<TrendingUp fontSize="large" />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatWidget 
              title="Feilrate"
              value="0.8%"
              icon={<Warning fontSize="large" />}
              color="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatWidget 
              title="Suksessrate"
              value="99.2%"
              icon={<CheckCircle fontSize="large" />}
              color="success"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Produktstatistikk og aktivitet i egen container */}
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography variant="h6" gutterBottom>
                Produktstatistikk
              </Typography>
              <Box sx={{ mt: 3 }}>
                {productStats.map((stat, index) => (
                  <Box key={stat.product} sx={{ mb: index < productStats.length - 1 ? 3 : 0 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      mb: 1,
                      alignItems: 'center'
                    }}>
                      <Typography variant="body1">
                        {stat.product}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          bgcolor: `${stat.color}15`,
                          color: stat.color,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1
                        }}
                      >
                        {stat.completed}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={stat.completed} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 2,
                        bgcolor: `${stat.color}15`,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: stat.color
                        }
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography variant="h6" gutterBottom>
                Nylig aktivitet
              </Typography>
              <List>
                {recentActivity.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem 
                      sx={{ 
                        px: 2, 
                        py: 1.5,
                        borderRadius: 1
                      }}
                    >
                      <ListItemText 
                        primary={
                          <Typography
                            variant="body1"
                            color={activity.status === 'error' ? 'error.main' : 'text.primary'}
                          >
                            {activity.action}
                          </Typography>
                        }
                        secondary={activity.time}
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && (
                      <Divider sx={{ my: 1 }} />
                    )}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default Dashboard; 