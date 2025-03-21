import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Typography, IconButton, LinearProgress, Alert, Tooltip,
  ToggleButtonGroup, ToggleButton, Skeleton, Paper, CircularProgress
} from '@mui/material';
import { 
  Person as PersonIcon,
  Business as BusinessIcon,
  HomeWork as HomeWorkIcon,
  Payments as PaymentsIcon,
  Report as ReportIcon,
  Refresh as RefreshIcon,
  Group as GroupIcon,
  CircleOutlined as CircleOutlinedIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

// Siden vi har problemer med Tailwind, la oss gjøre en MUI-basert versjon
// men med den moderne, minimalistiske designen vi ønsker
function ShadcnDashboard() {
  const theme = useTheme();
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
  
  // Get trends for current period
  const currentTrends = useMemo(() => {
    if (!dashboardData || !dashboardData.trendsForPeriods) {
      return dashboardData?.trends || {};
    }
    
    return dashboardData.trendsForPeriods[`days${trendPeriod}`] || dashboardData.trends;
  }, [dashboardData, trendPeriod]);

  // StatCard component med MUI styling
  const StatCard = ({ title, value, icon: Icon, color, formatter = (val) => val, suffix = "", trend, trendValue, trendPeriod }) => {
    // Beregn faktisk verdiendring hvis den ikke er oppgitt
    const actualTrendValue = trendValue !== undefined ? trendValue : 
                           (trend !== null && trend !== undefined && value !== undefined) ? 
                           (value * trend / 100) : null;
    
    return (
      <Paper
        elevation={1}
        sx={{
          height: '100%',
          borderLeft: `4px solid ${color || theme.palette.primary.main}`,
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'all 0.2s',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)'
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              {title}
            </Typography>
            <Box
              sx={{
                bgcolor: `${color}15`,
                color: color,
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon fontSize="small" />
            </Box>
          </Box>
          
          {loading ? (
            <Skeleton variant="text" height={60} width="80%" sx={{ mb: 1.5 }} />
          ) : (
            <Typography
              variant="h4"
              sx={{
                fontSize: '1.8rem',
                fontWeight: 'bold',
                mb: 1.5,
                lineHeight: 1.2
              }}
            >
              {formatter(value)}{suffix}
            </Typography>
          )}
          
          {trend !== null && trend !== undefined ? (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  bgcolor: trend > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  mr: 1
                }}
              >
                <RefreshIcon
                  sx={{ 
                    color: trend > 0 ? '#10B981' : '#EF4444',
                    fontSize: 14,
                    transform: trend < 0 ? 'rotate(180deg)' : 'none'
                  }} 
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography 
                  variant="caption" 
                  sx={{
                    fontWeight: 600,
                    color: trend > 0 ? '#10B981' : '#EF4444'
                  }}
                >
                  {trend > 0 ? '+' : ''}{trend}%
                </Typography>
                
                {actualTrendValue !== null && (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ mx: 0.5 }}>•</Typography>
                    <Typography 
                      variant="caption" 
                      sx={{
                        fontWeight: 500,
                        color: 'text.secondary'
                      }}
                    >
                      {(actualTrendValue > 0 ? '+' : '')}{formatter(Math.round(actualTrendValue))}{suffix}
                    </Typography>
                  </>
                )}
                
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ ml: 0.5, fontSize: '0.7rem' }}
                >
                  ({trendPeriod}d)
                </Typography>
              </Box>
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
        </Box>
      </Paper>
    );
  };

  // Top claim categories component
  const TopClaimCategories = ({ data }) => {
    const categoryColors = [
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.info.main
    ];
    
    return (
      <Paper
        elevation={1}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          p: 3
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center', 
          mb: 3
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
            <Box 
              key={index} 
              sx={{ 
                mb: index !== data.length - 1 ? 3 : 0,
                p: 2,
                borderRadius: 2,
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.02)'
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1" fontWeight={600} color="text.primary">
                  {category.ClaimCategory}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body1" fontWeight={700} sx={{ color: categoryColors[index] }}>
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
                    height: 8,
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
                <Box sx={{ borderBottom: '1px solid', borderColor: 'rgba(0, 0, 0, 0.06)', mt: 2, mb: 2 }} />
              )}
            </Box>
          ))
        )}
      </Paper>
    );
  };

  return (
    <Box sx={{ px: 2 }}>
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
              sx={{
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'rgba(99, 102, 241, 0.1)'
                }
              }}
            >
              {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Loading progress bar */}
      {loading && (
        <LinearProgress 
          sx={{ 
            mb: 3,
            borderRadius: '4px',
            height: '4px' 
          }} 
        />
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
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard 
          title="Totalt antall kunder" 
          value={dashboardData?.TotalCustomers || 0}
          icon={GroupIcon} 
          color={theme.palette.primary.main}
          formatter={formatNumber}
          trend={currentTrends?.totalCustomers}
          trendValue={currentTrends?.totalCustomersValue}
          trendPeriod={trendPeriod}
        />
        <StatCard 
          title="Bedriftskunder" 
          value={dashboardData?.BusinessCustomers || 0}
          icon={BusinessIcon} 
          color={theme.palette.info.main}
          formatter={formatNumber}
          trend={currentTrends?.businessCustomers}
          trendValue={currentTrends?.businessCustomersValue}
          trendPeriod={trendPeriod}
        />
        <StatCard 
          title="Privatkunder" 
          value={dashboardData?.PrivateCustomers || 0}
          icon={PersonIcon} 
          color={theme.palette.secondary.main}
          formatter={formatNumber}
          trend={currentTrends?.privateCustomers}
          trendValue={currentTrends?.privateCustomersValue}
          trendPeriod={trendPeriod}
        />
        <StatCard 
          title="Rapporterte skader i år" 
          value={dashboardData?.ClaimsReportedYTD || 0}
          icon={ReportIcon} 
          color={theme.palette.error.main}
          formatter={formatNumber}
          trend={currentTrends?.claimsReportedYTD}
          trendValue={currentTrends?.claimsReportedYTDValue}
          trendPeriod={trendPeriod}
        />
      </Box>

      {/* Additional Premium Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard 
          title="Total premieinntekt" 
          value={dashboardData?.TotalPremium || 0}
          icon={PaymentsIcon} 
          color={theme.palette.success.main}
          formatter={formatCurrency}
          trend={currentTrends?.totalPremium}
          trendValue={currentTrends?.totalPremiumValue}
          trendPeriod={trendPeriod}
        />
        <StatCard 
          title="Premieinntekt bedrift" 
          value={dashboardData?.BusinessPremium || 0}
          icon={BusinessIcon} 
          color={theme.palette.info.main}
          formatter={formatCurrency}
          trend={currentTrends?.businessPremium}
          trendValue={currentTrends?.businessPremiumValue}
          trendPeriod={trendPeriod}
        />
        <StatCard 
          title="Premieinntekt privat" 
          value={dashboardData?.PrivatePremium || 0}
          icon={HomeWorkIcon} 
          color={theme.palette.secondary.main}
          formatter={formatCurrency}
          trend={currentTrends?.privatePremium}
          trendValue={currentTrends?.privatePremiumValue}
          trendPeriod={trendPeriod}
        />
      </Box>

      {/* Claims Stats */}
      <TopClaimCategories data={dashboardData?.TopClaimCategories || []} />
    </Box>
  );
}

export default ShadcnDashboard;