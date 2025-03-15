import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Paper, Typography, Grid, Button, Card, CardContent, useTheme, Divider, 
  CircularProgress, Skeleton, Alert, IconButton, Container, LinearProgress, Avatar,
  ToggleButtonGroup, ToggleButton, Tooltip
} from '@mui/material';
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
  const StatCard = ({ title, value, icon: Icon, color, suffix = "", formatter = (val) => val, trend }) => (
    <Card sx={{ 
      borderRadius: 3, 
      height: '100%',
      transition: 'transform 0.3s, box-shadow 0.3s',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
      position: 'relative',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)',
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '4px',
        backgroundColor: color,
        zIndex: 1
      }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} color="text.primary">
            {title}
          </Typography>
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
          <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
            {formatter(value)}{suffix}
          </Typography>
        )}
        
        {trend !== null && trend !== undefined ? (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <TrendingUpIcon 
              sx={{ 
                color: trend > 0 ? 'success.main' : 'error.main',
                mr: 1,
                fontSize: 18,
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
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <Typography 
              variant="caption" 
              fontWeight={500}
              color="text.secondary"
              sx={{ fontStyle: 'italic' }}
            >
              Historiske data samles inn. Trender vil vises når det finnes data å sammenligne med.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // Top claim categories component
  const TopClaimCategories = ({ data }) => {
    const categoryColors = [
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.info.main
    ];
    
    return (
      <Card sx={{ 
        borderRadius: 3, 
        height: '100%', 
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        position: 'relative',
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)',
        }
      }}>
        <Box sx={{ 
          py: 2, 
          px: 3, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center', 
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          bgcolor: 'rgba(0, 0, 0, 0.02)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              sx={{ 
                bgcolor: theme.palette.error.light, 
                color: 'white', 
                width: 36, 
                height: 36,
                mr: 2
              }}
            >
              <ReportIcon fontSize="small" />
            </Avatar>
            <Typography variant="h6" fontWeight={600} color="text.primary">
              Topp skadekategorier
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            Inneværende år
          </Typography>
        </Box>

        <CardContent sx={{ p: 3 }}>
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
                      height: 12,
                      borderRadius: 6,
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <Box
                      sx={{
                        width: `${(category.ClaimCount / Math.max(...data.map(c => c.ClaimCount))) * 100}%`,
                        bgcolor: categoryColors[index],
                        height: '100%',
                        transition: 'width 1s ease-in-out',
                        borderRadius: 6
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
                  <Divider sx={{ mt: 2.5, mb: 2.5 }} />
                )}
              </Box>
            ))
          )}
        </CardContent>
      </Card>
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
    <Box sx={{ py: 3 }}>
      {/* Dashboard Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 4,
          pb: 3,
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            sx={{
              bgcolor: theme.palette.primary.main,
              width: 48,
              height: 48,
              mr: 2
            }}
          >
            <PieChartIcon />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={800} color="text.primary">
              Porteføljeoversikt
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Oppdatert {new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Typography>
          </Box>
        </Box>
        
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
          
          <IconButton 
            sx={{ 
              bgcolor: 'rgba(0, 0, 0, 0.04)',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.08)' }
            }}
            onClick={fetchDashboardData}
            disabled={loading}
            aria-label="Oppdater data"
          >
            {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        </Box>
      </Box>
      
      {/* Loading progress bar */}
      {loading && (
        <LinearProgress 
          sx={{ 
            mb: 4, 
            height: 6, 
            borderRadius: 3 
          }} 
        />
      )}

      {/* Error display if API call failed */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 4, 
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}
        >
          {error}
        </Alert>
      )}

      {/* Customer Statistics */}
      <Box sx={{ mb: 5 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mb: 3
        }}>
          <PeopleIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Kundestatistikk
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <StatCard 
              title="Totalt antall kunder" 
              value={dashboardData?.TotalCustomers || 0}
              icon={GroupIcon} 
              color={theme.palette.primary.main}
              formatter={formatNumber}
              trend={currentTrends?.totalCustomers}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard 
              title="Privatkunder" 
              value={dashboardData?.PrivateCustomers || 0}
              icon={PersonIcon} 
              color={theme.palette.secondary.main}
              formatter={formatNumber}
              trend={currentTrends?.privateCustomers}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard 
              title="Bedriftskunder" 
              value={dashboardData?.BusinessCustomers || 0}
              icon={BusinessIcon} 
              color={theme.palette.info.main}
              formatter={formatNumber}
              trend={currentTrends?.businessCustomers}
            />
          </Grid>
        </Grid>
      </Box>
      
      {/* Premium Stats */}
      <Box sx={{ mb: 5 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mb: 3
        }}>
          <AccountBalanceIcon sx={{ mr: 1.5, color: theme.palette.success.main }} />
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Premieoversikt
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <StatCard 
              title="Total premieinntekt" 
              value={dashboardData?.TotalPremium || 0}
              icon={PaymentsIcon} 
              color={theme.palette.success.main}
              formatter={formatCurrency}
              trend={currentTrends?.totalPremium}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard 
              title="Premieinntekt privat" 
              value={dashboardData?.PrivatePremium || 0}
              icon={HomeWorkIcon} 
              color={theme.palette.secondary.main}
              formatter={formatCurrency}
              trend={currentTrends?.privatePremium}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard 
              title="Premieinntekt bedrift" 
              value={dashboardData?.BusinessPremium || 0}
              icon={BusinessIcon} 
              color={theme.palette.info.main}
              formatter={formatCurrency}
              trend={currentTrends?.businessPremium}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Claims Stats */}
      <Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mb: 3
        }}>
          <ReportIcon sx={{ mr: 1.5, color: theme.palette.error.main }} />
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Skadestatistikk
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <StatCard 
              title="Rapporterte skader i år" 
              value={dashboardData?.ClaimsReportedYTD || 0}
              icon={ReportIcon} 
              color={theme.palette.error.main}
              formatter={formatNumber}
              trend={currentTrends?.claimsReportedYTD}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <TopClaimCategories data={dashboardData?.TopClaimCategories || []} />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default Dashboard;