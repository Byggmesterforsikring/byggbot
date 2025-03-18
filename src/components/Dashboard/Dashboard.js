import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Paper, Typography, Grid, Button, Card, CardContent, useTheme, Divider, 
  CircularProgress, Skeleton, Alert, IconButton, Container, LinearProgress, Avatar,
  ToggleButtonGroup, ToggleButton, Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Calculate as CalculateIcon,
  SmartToy as SmartToyIcon,
  Gavel as GavelIcon,
  TrendingUp as TrendingUpIcon,
  ArrowForward as ArrowForwardIcon,
  Key as KeyIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  HomeWork as HomeWorkIcon,
  Payments as PaymentsIcon,
  Report as ReportIcon,
  PieChart as PieChartIcon,
  Refresh as RefreshIcon,
  AccountBalance as AccountBalanceIcon,
  People as PeopleIcon,
  Group as GroupIcon,
  WbSunny as WbSunnyIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2, 0),
  boxShadow: theme.shadows[2]
}));

const StatsCard = styled(Card)(({ theme, color }) => ({
  height: '100%',
  boxShadow: theme.shadows[2],
  borderLeft: `4px solid ${color || theme.palette.primary.main}`
}));

const CardTitle = styled(Typography)(({ theme }) => ({
  fontSize: '0.9rem',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(1)
}));

const CardValue = styled(Typography)(({ theme }) => ({
  fontSize: '1.8rem',
  fontWeight: 'bold'
}));

function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trendPeriod, setTrendPeriod] = useState(30); // Default til 30 dager

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Hent dashboard-data via Electron IPC
      const result = await window.electron.dashboard.getData({
        reportName: 'API_Byggbot_dashboard'
      });
      
      console.log('Dashboard data received:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Ukjent feil ved henting av data');
      }
      
      setDashboardData(result.data);
    } catch (err) {
      console.error('Feil ved henting av dashboard-data:', err);
      setError('Kunne ikke hente dashboard-data. Vennligst prøv igjen senere.');
      
      // Bruk mock-data for demo/utvikling hvis API-kallet feiler
      const mockData = {
        "TotalCustomers": 2335,
        "PrivateCustomers": 516,
        "BusinessCustomers": 1819,
        "TotalPremium": 71904794.0000,
        "PrivatePremium": 9839519.0000,
        "BusinessPremium": 62065275.0000,
        "ClaimsReportedYTD": 557,
        "TopClaimCategories": [
          {"ClaimCategory": "Autoskade", "ClaimCount": 425, "TotalAmount": 8075454.4000},
          {"ClaimCategory": "Tingskade", "ClaimCount": 120, "TotalAmount": 3362366.0800},
          {"ClaimCategory": "Personskade", "ClaimCount": 12, "TotalAmount": 53190.0000}
        ]
      };
      
      // Bruk mock-data for UI-testing
      setDashboardData(mockData);
    } finally {
      setLoading(false);
    }
  };

  // Stats card component
  const DashboardStatCard = ({ title, value, icon: Icon, color, suffix = "", formatter = (val) => val, trend }) => (
    <StatsCard color={color}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <CardTitle variant="subtitle2">{title}</CardTitle>
          <Avatar
            sx={{
              bgcolor: `${color}15`,
              color: color,
              width: 40,
              height: 40
            }}
          >
            <Icon fontSize="small" />
          </Avatar>
        </Box>
        
        {loading ? (
          <Skeleton variant="text" height={60} width="80%" sx={{ mb: 1 }} />
        ) : (
          <CardValue variant="h4">
            {formatter(value)}{suffix}
          </CardValue>
        )}
        
        {trend !== null && trend !== undefined ? (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <TrendingUpIcon 
              sx={{ 
                color: trend > 0 ? 'success.main' : 'error.main',
                mr: 1,
                fontSize: 16,
                transform: trend < 0 ? 'rotate(180deg)' : 'none'
              }} 
            />
            <Typography 
              variant="caption" 
              fontWeight={500}
              color={trend > 0 ? 'success.main' : 'error.main'}
            >
              {trend > 0 ? '+' : ''}{trend}% siste {trendPeriod} {trendPeriod === 1 ? 'dag' : 'dager'}
            </Typography>
          </Box>
        ) : (
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ fontStyle: 'italic', display: 'block', mt: 1 }}
          >
            Historiske data samles inn.
          </Typography>
        )}
      </CardContent>
    </StatsCard>
  );

  // Top claim categories component
  const TopClaimCategories = ({ data }) => {
    const categoryColors = [
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.info.main
    ];
    
    return (
      <StyledPaper>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center', 
          mb: 2
        }}>
          <Typography variant="h6" fontWeight={600} color="text.primary">
            Topp skadekategorier
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            Inneværende år
          </Typography>
        </Box>

        {loading ? (
          <>
            <Skeleton variant="text" height={40} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={15} sx={{ mb: 3, borderRadius: 2 }} />
            <Skeleton variant="text" height={40} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={15} sx={{ mb: 3, borderRadius: 2 }} />
            <Skeleton variant="text" height={40} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={15} sx={{ borderRadius: 2 }} />
          </>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            Kunne ikke laste skadedata
          </Alert>
        ) : (
          data?.map((category, index) => (
            <Box key={index} sx={{ mb: index !== data.length - 1 ? 3 : 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1" fontWeight={600} color="text.primary">
                  {category.ClaimCategory}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body1" fontWeight={700} color={categoryColors[index]}>
                    {category.ClaimCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                    saker
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    0
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {Math.max(...data.map(c => c.ClaimCount))}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: '100%',
                    bgcolor: 'rgba(0, 0, 0, 0.05)',
                    height: 10,
                    borderRadius: 1,
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <Box
                    sx={{
                      width: `${(category.ClaimCount / Math.max(...data.map(c => c.ClaimCount))) * 100}%`,
                      bgcolor: categoryColors[index],
                      height: '100%',
                      transition: 'width 1s ease-in-out'
                    }}
                  />
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Totalbeløp
                </Typography>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {new Intl.NumberFormat('nb-NO', { 
                    style: 'currency', 
                    currency: 'NOK',
                    maximumFractionDigits: 0 
                  }).format(category.TotalAmount)}
                </Typography>
              </Box>
              
              {index !== data.length - 1 && (
                <Divider sx={{ mt: 2, mb: 2 }} />
              )}
            </Box>
          ))
        )}
      </StyledPaper>
    );
  };

  // Format number with Norwegian formatting
  const formatNumber = (num) => {
    return new Intl.NumberFormat('nb-NO').format(num);
  };

  // Format currency 
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('nb-NO', { 
      style: 'currency', 
      currency: 'NOK',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(num);
  };
  
  // Få trender for valgt periode
  const currentTrends = useMemo(() => {
    if (!dashboardData || !dashboardData.trendsForPeriods) {
      return dashboardData?.trends || {};
    }
    
    // Prøv å få trender for den valgte perioden, eller fall tilbake til standard trends
    return dashboardData.trendsForPeriods[`days${trendPeriod}`] || dashboardData.trends;
  }, [dashboardData, trendPeriod]);

  return (
    <Box>
      {/* Dashboard Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Porteføljeoversikt
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Valgknapper for trendperioder */}
          <Tooltip title="Velg tidsperiode for trender">
            <ToggleButtonGroup
              value={trendPeriod}
              exclusive
              onChange={(e, newValue) => newValue && setTrendPeriod(newValue)}
              size="small"
              aria-label="Trendperiode"
            >
              <ToggleButton value={1} aria-label="1 dag">
                1D
              </ToggleButton>
              <ToggleButton value={7} aria-label="7 dager">
                7D
              </ToggleButton>
              <ToggleButton value={30} aria-label="30 dager">
                30D
              </ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
          
          <Tooltip title="Oppdater data">
            <IconButton 
              onClick={fetchDashboardData}
              disabled={loading}
              aria-label="Oppdater data"
            >
              {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Loading progress bar */}
      {loading && (
        <LinearProgress sx={{ mb: 3 }} />
      )}

      {/* Error display if API call failed */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardStatCard 
            title="Totalt antall kunder" 
            value={dashboardData?.TotalCustomers || 0}
            icon={GroupIcon} 
            color={theme.palette.primary.main}
            formatter={formatNumber}
            trend={currentTrends?.totalCustomers}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardStatCard 
            title="Bedriftskunder" 
            value={dashboardData?.BusinessCustomers || 0}
            icon={BusinessIcon} 
            color={theme.palette.info.main}
            formatter={formatNumber}
            trend={currentTrends?.businessCustomers}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardStatCard 
            title="Privatkunder" 
            value={dashboardData?.PrivateCustomers || 0}
            icon={PersonIcon} 
            color={theme.palette.secondary.main}
            formatter={formatNumber}
            trend={currentTrends?.privateCustomers}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardStatCard 
            title="Rapporterte skader i år" 
            value={dashboardData?.ClaimsReportedYTD || 0}
            icon={ReportIcon} 
            color={theme.palette.error.main}
            formatter={formatNumber}
            trend={currentTrends?.claimsReportedYTD}
          />
        </Grid>
      </Grid>

      {/* Additional Premium Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <DashboardStatCard 
            title="Total premieinntekt" 
            value={dashboardData?.TotalPremium || 0}
            icon={PaymentsIcon} 
            color={theme.palette.success.main}
            formatter={formatCurrency}
            trend={currentTrends?.totalPremium}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <DashboardStatCard 
            title="Premieinntekt bedrift" 
            value={dashboardData?.BusinessPremium || 0}
            icon={BusinessIcon} 
            color={theme.palette.info.main}
            formatter={formatCurrency}
            trend={currentTrends?.businessPremium}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <DashboardStatCard 
            title="Premieinntekt privat" 
            value={dashboardData?.PrivatePremium || 0}
            icon={HomeWorkIcon} 
            color={theme.palette.secondary.main}
            formatter={formatCurrency}
            trend={currentTrends?.privatePremium}
          />
        </Grid>
      </Grid>

      {/* Claims Stats */}
      <TopClaimCategories data={dashboardData?.TopClaimCategories || []} />
    </Box>
  );
}

export default Dashboard;