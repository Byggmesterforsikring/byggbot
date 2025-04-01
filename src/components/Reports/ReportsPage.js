import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { formatCurrency } from '../../utils/formatUtils';
import { useSearchParams, useNavigate } from 'react-router-dom';
import NysalgsReport from './components/NysalgsReport';
import ModernNysalgsReport from './components/ModernNysalgsReport';
import GarantiReport from './components/GarantiReport';
import ModernGarantiReport from './components/ModernGarantiReport';
import SkadeReport from './components/SkadeReport';
import ModernSkadeReport from './components/ModernSkadeReport';
import { Button } from "~/components/ui/button";

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2, 0),
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  borderRadius: theme.shape.borderRadius || 12,
  border: `1px solid ${theme.palette.divider}`
}));

const REPORT_TYPES = {
  NYSALG: 'API_Byggbot_nysalgsrapport',
  GARANTI: 'API_Byggbot_garantirapport',
  SKADE: 'API_Byggbot_skaderapport'
};

const TIME_PERIODS = [
  { label: 'Siste 7 dager', value: 7 },
  { label: 'Siste 14 dager', value: 14 },
  { label: 'Siste 30 dager', value: 30 },
  { label: 'Siste kvartal', value: 90 },
  { label: 'Siste 6 måneder', value: 180 },
  { label: 'Siste 12 måneder', value: 365 },
  { label: 'Egendefinert periode', value: 'custom' }
];


const ReportsPage = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Determine active tab based on URL parameter
  const typeParam = searchParams.get('type');
  const getInitialTabIndex = () => {
    if (typeParam === 'nysalg') return 0;
    if (typeParam === 'garanti') return 1;
    if (typeParam === 'skade') return 2;
    return 0; // Default to nysalg
  };

  const [activeTab, setActiveTab] = useState(getInitialTabIndex());
  const [timePeriod, setTimePeriod] = useState(7);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set default dates based on selected time period
    const setDefaultDates = () => {
      const today = new Date();
      const end = today.toISOString().split('T')[0];

      let start;
      if (timePeriod === 'custom') {
        return; // Don't update dates for custom period
      } else {
        const startDate = new Date();
        startDate.setDate(today.getDate() - timePeriod);
        start = startDate.toISOString().split('T')[0];
      }

      setStartDate(start);
      setEndDate(end);
    };

    setDefaultDates();
  }, [timePeriod]);

  // Update active tab when URL parameters change
  useEffect(() => {
    const newTabIndex = getInitialTabIndex();
    if (newTabIndex !== activeTab) {
      setActiveTab(newTabIndex);
      setReportData(null); // Clear previous report data when tab changes via URL
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeParam]); // Use typeParam to avoid circular dependencies

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setReportData(null); // Clear previous report data

    // Update URL based on selected tab
    const typeMap = ['nysalg', 'garanti', 'skade'];
    setSearchParams({ type: typeMap[newValue] });
  };

  const handleTimePeriodChange = (event) => {
    const selectedPeriod = event.target.value;
    setTimePeriod(selectedPeriod);
    setIsCustomPeriod(selectedPeriod === 'custom');
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
  };

  const fetchReport = async () => {
    if (!startDate || !endDate) {
      setError('Velg start- og sluttdato');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get report name based on active tab
      const reportName = Object.values(REPORT_TYPES)[activeTab];

      // Gi brukeren informasjon om at vi henter data
      console.log(`Henter ${reportName} for perioden ${startDate} til ${endDate}`);

      // Use the dashboard.fetchStats function from the preload script
      const result = await window.electron.dashboard.fetchStats({
        reportName,
        startDate,
        endDate
      });

      if (result.error) {
        setError(result.error);
      } else {
        setReportData(result);
      }
    } catch (err) {
      // Håndterer ulike feilmeldinger
      if (err.message.includes('Exception callig query')) {
        setError('Feil i SQL-spørringen på serveren. Dette kan skyldes at det ikke finnes data for valgt tidsperiode, eller at API-et ikke er korrekt konfigurert. Prøv en annen tidsperiode eller kontakt systemadministrator.');
      } else if (err.message.includes('parameter')) {
        setError('Parameterfeil: API-et aksepterer ikke parametrene som sendes. Kontroller at datoformatet er riktig (YYYY-MM-DD) og prøv igjen.');
      } else {
        setError('Feil ved henting av rapport: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box mt={2}>
          <Typography color="error" variant="h6" gutterBottom>
            Feil ved henting av rapport
          </Typography>
          <Typography color="error">
            {error}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Mulige løsninger:
          </Typography>
          <ul>
            <li>Sjekk at dato-perioden er gyldig</li>
            <li>Kontroller nettverksforbindelsen</li>
            <li>Kontakt systemadministrator hvis problemet vedvarer</li>
          </ul>
        </Box>
      );
    }

    if (!reportData) {
      return (
        <Box mt={4} textAlign="center">
          <Typography variant="body1">
            Velg tidsperiode og klikk på "Generer rapport" for å se resultater.
          </Typography>
        </Box>
      );
    }

    // Render appropriate report based on active tab
    switch (activeTab) {
      case 0: // Nysalgsrapport
        return <ModernNysalgsReport data={reportData} />;
      case 1: // Garantirapport
        return <ModernGarantiReport data={reportData} />;
      case 2: // Skaderapport
        return <ModernSkadeReport data={reportData} />;
      default:
        return <Typography>Rapport ikke tilgjengelig</Typography>;
    }
  };

  // Get current report title
  const getReportTitle = () => {
    switch (activeTab) {
      case 0:
        return "Nysalgsrapport";
      case 1:
        return "Garantirapport";
      case 2:
        return "Skaderapport";
      default:
        return "Rapport";
    }
  };

  return (
    <Box p={3}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: 600,
          mb: 3,
          fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
        }}
      >
        {getReportTitle()}
      </Typography>

      <StyledPaper>
        <Grid container spacing={3} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  transition: 'all 0.2s',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: '1px'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: '1px'
                  }
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.9rem',
                  fontWeight: 500
                }
              }}
            >
              <InputLabel id="time-period-label">Tidsperiode</InputLabel>
              <Select
                labelId="time-period-label"
                value={timePeriod}
                label="Tidsperiode"
                onChange={handleTimePeriodChange}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      borderRadius: '10px',
                      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
                      '& .MuiMenuItem-root': {
                        fontSize: '0.9rem',
                        padding: '10px 16px'
                      },
                      '& .MuiMenuItem-root:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08)
                      }
                    }
                  }
                }}
              >
                {TIME_PERIODS.map((period) => (
                  <MenuItem key={period.value} value={period.value}>
                    {period.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel
                shrink
                htmlFor="start-date"
                sx={{
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'text.primary'
                }}
              >
                Fra dato
              </InputLabel>
              <Box
                sx={{
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-30%)',
                    pointerEvents: 'none',
                    width: '20px',
                    height: '20px',
                    backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>\')',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'contain',
                    opacity: isCustomPeriod ? 1 : 0.5
                  }
                }}
              >
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  disabled={!isCustomPeriod}
                  style={{
                    marginTop: '16px',
                    padding: '12px 14px',
                    border: `1px solid ${isCustomPeriod ? theme.palette.divider : '#e0e0e0'}`,
                    borderRadius: '10px',
                    width: '100%',
                    height: '54px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    backgroundColor: isCustomPeriod ? 'transparent' : '#f5f5f5',
                    cursor: isCustomPeriod ? 'pointer' : 'not-allowed',
                    color: isCustomPeriod ? 'inherit' : theme.palette.text.disabled
                  }}
                />
              </Box>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel
                shrink
                htmlFor="end-date"
                sx={{
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'text.primary'
                }}
              >
                Til dato
              </InputLabel>
              <Box
                sx={{
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-30%)',
                    pointerEvents: 'none',
                    width: '20px',
                    height: '20px',
                    backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>\')',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'contain',
                    opacity: isCustomPeriod ? 1 : 0.5
                  }
                }}
              >
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  disabled={!isCustomPeriod}
                  style={{
                    marginTop: '16px',
                    padding: '12px 14px',
                    border: `1px solid ${isCustomPeriod ? theme.palette.divider : '#e0e0e0'}`,
                    borderRadius: '10px',
                    width: '100%',
                    height: '54px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    backgroundColor: isCustomPeriod ? 'transparent' : '#f5f5f5',
                    cursor: isCustomPeriod ? 'pointer' : 'not-allowed',
                    color: isCustomPeriod ? 'inherit' : theme.palette.text.disabled
                  }}
                />
              </Box>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3} sx={{ marginTop: '16px' }}>
            <Button
              className="w-full h-[54px] rounded-[10px] text-sm font-semibold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
              onClick={fetchReport}
              disabled={loading}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                  Laster...
                </>
              ) : (
                'Generer rapport'
              )}
            </Button>
          </Grid>
        </Grid>
      </StyledPaper>

      {renderReportContent()}
    </Box>
  );
};

export default ReportsPage;