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
  Button,
  CircularProgress,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { formatCurrency } from '../../utils/formatUtils';
import { useSearchParams, useNavigate } from 'react-router-dom';
import NysalgsReport from './components/NysalgsReport';
import GarantiReport from './components/GarantiReport';
import SkadeReport from './components/SkadeReport';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2, 0),
  boxShadow: theme.shadows[2]
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
        return <NysalgsReport data={reportData} />;
      case 1: // Garantirapport
        return <GarantiReport data={reportData} />;
      case 2: // Skaderapport
        return <SkadeReport data={reportData} />;
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
      <Typography variant="h4" gutterBottom>
        {getReportTitle()}
      </Typography>

      <StyledPaper>
        <Grid container spacing={3} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel id="time-period-label">Tidsperiode</InputLabel>
              <Select
                labelId="time-period-label"
                value={timePeriod}
                label="Tidsperiode"
                onChange={handleTimePeriodChange}
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
              <InputLabel shrink htmlFor="start-date">
                Fra dato
              </InputLabel>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                disabled={!isCustomPeriod}
                style={{
                  marginTop: '16px',
                  padding: '8.5px 14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  width: '100%',
                  height: '40px',
                  boxSizing: 'border-box'
                }}
              />
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel shrink htmlFor="end-date">
                Til dato
              </InputLabel>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                disabled={!isCustomPeriod}
                style={{
                  marginTop: '16px',
                  padding: '8.5px 14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  width: '100%',
                  height: '40px',
                  boxSizing: 'border-box'
                }}
              />
            </FormControl>
          </Grid>
          
          
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth
              onClick={fetchReport}
              disabled={loading}
              style={{
                height: '40px',
                marginTop: '16px'
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Generer rapport'}
            </Button>
          </Grid>
        </Grid>
      </StyledPaper>

      {renderReportContent()}
    </Box>
  );
};

export default ReportsPage;