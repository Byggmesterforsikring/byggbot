import React from 'react';
import { Box, Paper, Typography, Grid, Button, Card, CardContent, useTheme, Divider } from '@mui/material';
import { 
  Calculate as CalculateIcon,
  SmartToy as SmartToyIcon,
  Gavel as GavelIcon,
  TrendingUp as TrendingUpIcon,
  ArrowForward as ArrowForwardIcon,
  Key as KeyIcon,
  Build as BuildIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();

  // Function to navigate to different routes
  const navigateTo = (path) => {
    navigate(path);
  };

  // Dashboard feature card with button
  const FeatureCard = ({ title, icon: Icon, description, color, buttonText, path }) => (
    <Paper
      elevation={1}
      sx={{
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'transform 0.3s, box-shadow 0.3s',
        border: '1px solid #f0f0f0',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: theme.shadows[6],
        },
      }}
    >
      <Box sx={{ 
        py: 2, 
        px: 3, 
        display: 'flex', 
        alignItems: 'center', 
        bgcolor: `${color}08`,
        borderBottom: `1px solid ${color}20`
      }}>
        <Box
          sx={{
            bgcolor: `${color}15`,
            p: 1.5,
            borderRadius: 2,
            mr: 2,
          }}
        >
          <Icon sx={{ color: color, fontSize: 28 }} />
        </Box>
        <Typography variant="h6" color="text.primary" fontWeight={600}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" paragraph>
          {description}
        </Typography>
        <Button 
          variant="outlined" 
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigateTo(path)}
          sx={{ 
            mt: 1,
            borderColor: color,
            color: color,
            '&:hover': {
              borderColor: color,
              bgcolor: `${color}08`,
            }
          }}
        >
          {buttonText}
        </Button>
      </Box>
    </Paper>
  );

  // Quick navigation icon button
  const QuickButton = ({ icon: Icon, title, color, path }) => (
    <Button
      onClick={() => navigateTo(path)}
      sx={{
        flexDirection: 'column',
        alignItems: 'center',
        p: 1.5,
        borderRadius: 2,
        minWidth: 100,
        bgcolor: `${color}10`,
        color: 'text.primary',
        '&:hover': {
          bgcolor: `${color}20`,
        }
      }}
    >
      <Box
        sx={{
          bgcolor: 'white',
          p: 1,
          borderRadius: '50%',
          mb: 1,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Icon sx={{ color: color, fontSize: 24 }} />
      </Box>
      <Typography variant="body2" fontWeight={500}>
        {title}
      </Typography>
    </Button>
  );

  // Welcome section with logo
  const WelcomeSection = () => (
    <Card sx={{ 
      mb: 4, 
      borderRadius: 3,
      backgroundImage: 'linear-gradient(135deg, #fff 0%, #f9f9f9 100%)',
      boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
      overflow: 'visible',
      position: 'relative'
    }}>
      <CardContent sx={{ py: 4, px: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Velkommen til ByggBot Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Et felles arbeidsområde med verktøy og ressurser for Byggmesterforsikring.
              Bruk de ulike funksjonene til å beregne premier, sjekke tegningsregler eller kommunisere med ByggBot.
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SmartToyIcon />}
                onClick={() => navigateTo('/ai-chat')}
                sx={{ py: 1, px: 3, borderRadius: 2 }}
              >
                Start en ByggBot-samtale
              </Button>
              <Button
                variant="outlined"
                startIcon={<CalculateIcon />}
                onClick={() => navigateTo('/calculators/auto')}
                sx={{ py: 1, px: 3, borderRadius: 2 }}
              >
                Åpne kalkulatorer
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box 
              component="img"
              src="/assets/BMF_logo_sort.svg"
              alt="Byggmesterforsikring Logo"
              sx={{ 
                maxWidth: 200,
                mx: 'auto',
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
              }}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Welcome Banner */}
      <WelcomeSection />

      {/* Quick Access Row */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Rask tilgang
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <QuickButton 
            icon={SmartToyIcon} 
            title="ByggBot" 
            color={theme.palette.secondary.main} 
            path="/ai-chat"
          />
          <QuickButton 
            icon={CalculateIcon} 
            title="Auto" 
            color={theme.palette.primary.main} 
            path="/calculators/auto"
          />
          <QuickButton 
            icon={GavelIcon} 
            title="Tegningsregler" 
            color={theme.palette.success.main} 
            path="/tegningsregler"
          />
          <QuickButton 
            icon={KeyIcon} 
            title="Admin" 
            color={theme.palette.info.main} 
            path="/admin/users"
          />
        </Box>
      </Box>

      {/* Main Features Grid */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Hovedfunksjoner
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={6}>
          <FeatureCard
            title="ByggBot AI-Assistent"
            icon={SmartToyIcon}
            description="Få hjelp med daglige oppgaver, forsikringsspørsmål, og teknisk støtte gjennom vår AI-assistent."
            color={theme.palette.secondary.main}
            buttonText="Start samtale"
            path="/ai-chat"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <FeatureCard
            title="Kalkulatorer"
            icon={CalculateIcon}
            description="Beregn forsikringspremier for ulike typer kjøretøy, flåter og arbeidsmaskiner raskt og presist."
            color={theme.palette.primary.main}
            buttonText="Åpne kalkulatorer"
            path="/calculators/auto"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <FeatureCard
            title="Tegningsregler"
            icon={GavelIcon}
            description="Få full oversikt over gjeldende regler og retningslinjer for tegning av forsikringer."
            color={theme.palette.success.main}
            buttonText="Se retningslinjer"
            path="/tegningsregler"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <FeatureCard
            title="Brukeradministrasjon"
            icon={PersonIcon}
            description="Administrer brukere og tilgangsnivåer for ulike funksjoner i systemet."
            color={theme.palette.info.main}
            buttonText="Administrer brukere"
            path="/admin/users"
          />
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard; 