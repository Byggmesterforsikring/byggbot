import React from 'react';
import { Box, Paper, Typography, Grid, useTheme } from '@mui/material';
import { 
  Calculate as CalculateIcon,
  Description as DescriptionIcon,
  Gavel as GavelIcon,
  TrendingUp as TrendingUpIcon 
} from '@mui/icons-material';

function Dashboard() {
  const theme = useTheme();

  const DashboardCard = ({ title, icon: Icon, description, color }) => (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        borderRadius: 2,
        bgcolor: 'white',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            bgcolor: `${color}15`, // Transparent version of the color
            p: 1,
            borderRadius: 1,
            mr: 2,
          }}
        >
          <Icon sx={{ color: color }} />
        </Box>
        <Typography variant="h6" color="text.primary">
          {title}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Paper>
  );

  return (
    <Box>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4,
          fontWeight: 600,
          color: 'text.primary'
        }}
      >
        Velkommen til Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Kalkulatorer"
            icon={CalculateIcon}
            description="Beregn forsikringspremier og utfør andre kalkulasjoner"
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Tegningsregler"
            icon={GavelIcon}
            description="Se gjeldende regler og retningslinjer"
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Dokumentasjon"
            icon={DescriptionIcon}
            description="Tilgang til brukermanualer og API-dokumentasjon"
            color={theme.palette.info.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Statistikk"
            icon={TrendingUpIcon}
            description="Se aktuelle tall og statistikker"
            color={theme.palette.warning.main}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard; 