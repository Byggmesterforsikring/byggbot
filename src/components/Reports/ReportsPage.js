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

import SkadeReport from './components/SkadeReport';
import ModernSkadeReport from './components/ModernSkadeReport';
import MaanedsRapport from './components/MaanedsRapport';
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
    if (typeParam === 'skade') return 1;
    if (typeParam === 'maanedsrapport') return 2;
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

  // Filter states for skade report
  const [skadeFilters, setSkadeFilters] = useState({
    saksbehandler: 'alle',
    status: 'alle',
    skadetype: 'alle',
    kundetype: 'alle'
  });
  const [filteredReportData, setFilteredReportData] = useState(null);

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

  // Apply filters when data changes or tab switches
  useEffect(() => {
    if (reportData && activeTab === 1) {
      const filtered = applySkadeFilters(reportData, skadeFilters);
      setFilteredReportData(filtered);
    } else {
      setFilteredReportData(reportData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportData, activeTab, skadeFilters]); // applySkadeFilters is stable

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setReportData(null); // Clear previous report data

    // Update URL based on selected tab
    const typeMap = ['nysalg', 'skade', 'maanedsrapport'];
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
        StartDate: startDate,
        EndDate: endDate
      });

      if (result.error) {
        setError(result.error);
      } else {
        setReportData(result);
        setFilteredReportData(result); // Initialize filtered data with full dataset
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

  // Filter function for skade report
  const applySkadeFilters = (data, filters) => {
    if (!data || !data.SkadeDetaljer) return data;

    const filteredSkadeDetaljer = data.SkadeDetaljer.filter(skade => {
      // Saksbehandler filter
      if (filters.saksbehandler !== 'alle' && skade.Skadesaksbehandler !== filters.saksbehandler) {
        return false;
      }

      // Status filter
      if (filters.status !== 'alle') {
        if (filters.status === 'åpen' && skade.Skadeavsluttetdato) return false;
        if (filters.status === 'avsluttet' && !skade.Skadeavsluttetdato) return false;
        if (filters.status !== 'åpen' && filters.status !== 'avsluttet' && skade.Skadestatus !== filters.status) return false;
      }

      // Skadetype filter
      if (filters.skadetype !== 'alle' && skade.Skadetype !== filters.skadetype) {
        return false;
      }

      // Kundetype filter
      if (filters.kundetype !== 'alle') {
        if (filters.kundetype === 'bedrift' && !skade.ErBedriftskunde) return false;
        if (filters.kundetype === 'privat' && skade.ErBedriftskunde) return false;
      }

      return true;
    });

    // Recalculate statistics based on filtered data
    const filteredData = { ...data };
    filteredData.SkadeDetaljer = filteredSkadeDetaljer;

    // Recalculate monthly statistics
    const monthlyStats = {};
    filteredSkadeDetaljer.forEach(skade => {
      if (skade.Skademeldtdato) {
        const date = new Date(skade.Skademeldtdato);
        const key = `${date.getFullYear()}-${date.getMonth()}`;

        if (!monthlyStats[key]) {
          monthlyStats[key] = {
            År: date.getFullYear(),
            Måned: date.getMonth() + 1,
            AntallSkader: 0,
            TotalUtbetalt: 0,
            TotalReservert: 0
          };
        }

        monthlyStats[key].AntallSkader++;
        monthlyStats[key].TotalUtbetalt += parseFloat(skade.Utbetalt || 0);
        monthlyStats[key].TotalReservert += parseFloat(skade.Skadereserve || 0);
      }
    });

    filteredData.MånedsStatistikk = Object.values(monthlyStats);

    // Recalculate customer type statistics
    const kundetypeStats = { bedrift: 0, privat: 0 };
    filteredSkadeDetaljer.forEach(skade => {
      if (skade.ErBedriftskunde) {
        kundetypeStats.bedrift++;
      } else {
        kundetypeStats.privat++;
      }
    });

    filteredData.KundetypeStatistikk = [
      { Kundetype: 'Bedriftskunde', AntallSkader: kundetypeStats.bedrift },
      { Kundetype: 'Privatkunde', AntallSkader: kundetypeStats.privat }
    ];

    // Recalculate damage type statistics
    const skadetypeStats = {};
    filteredSkadeDetaljer.forEach(skade => {
      const type = skade.Skadetype || 'Ukjent';
      skadetypeStats[type] = (skadetypeStats[type] || 0) + 1;
    });

    filteredData.SkadetypeStatistikk = Object.keys(skadetypeStats).map(type => ({
      ClaimType: type,
      AntallSkader: skadetypeStats[type]
    }));

    return filteredData;
  };

  // Handle filter changes
  const handleSkadeFilterChange = (filterType, value) => {
    const newFilters = { ...skadeFilters, [filterType]: value };
    setSkadeFilters(newFilters);

    if (reportData && activeTab === 1) { // Only apply if skade report is active
      const filtered = applySkadeFilters(reportData, newFilters);
      setFilteredReportData(filtered);
    }
  };

  // Get unique values for filter dropdowns
  const getUniqueSkadeValues = (field) => {
    if (!reportData || !reportData.SkadeDetaljer) return [];

    const values = reportData.SkadeDetaljer.map(skade => {
      if (field === 'saksbehandler') return skade.Skadesaksbehandler;
      if (field === 'status') return skade.Skadestatus;
      if (field === 'skadetype') return skade.Skadetype;
      return null;
    }).filter(Boolean);

    return [...new Set(values)].sort();
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

    // Handle monthly report separately (it has its own data management)
    if (activeTab === 2) {
      return (
        <Box>
          <MaanedsRapport />
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
      case 1: // Skaderapport
        return (
          <Box>
            {/* Filter Panel for Skade Report */}
            <StyledPaper sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
                🔍 Filtrer skadedata
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Saksbehandler</InputLabel>
                    <Select
                      value={skadeFilters.saksbehandler}
                      label="Saksbehandler"
                      onChange={(e) => handleSkadeFilterChange('saksbehandler', e.target.value)}
                    >
                      <MenuItem value="alle">Alle saksbehandlere</MenuItem>
                      {getUniqueSkadeValues('saksbehandler').map(saksbehandler => (
                        <MenuItem key={saksbehandler} value={saksbehandler}>
                          {saksbehandler || 'Ikke angitt'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={skadeFilters.status}
                      label="Status"
                      onChange={(e) => handleSkadeFilterChange('status', e.target.value)}
                    >
                      <MenuItem value="alle">Alle statuser</MenuItem>
                      <MenuItem value="åpen">Åpne saker</MenuItem>
                      <MenuItem value="avsluttet">Avsluttede saker</MenuItem>
                      {getUniqueSkadeValues('status').map(status => (
                        <MenuItem key={status} value={status}>
                          {status || 'Ikke angitt'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Skadetype</InputLabel>
                    <Select
                      value={skadeFilters.skadetype}
                      label="Skadetype"
                      onChange={(e) => handleSkadeFilterChange('skadetype', e.target.value)}
                    >
                      <MenuItem value="alle">Alle skadetyper</MenuItem>
                      {getUniqueSkadeValues('skadetype').map(type => (
                        <MenuItem key={type} value={type}>
                          {type || 'Ikke angitt'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Kundetype</InputLabel>
                    <Select
                      value={skadeFilters.kundetype}
                      label="Kundetype"
                      onChange={(e) => handleSkadeFilterChange('kundetype', e.target.value)}
                    >
                      <MenuItem value="alle">Alle kundetyper</MenuItem>
                      <MenuItem value="bedrift">Bedriftskunder</MenuItem>
                      <MenuItem value="privat">Privatkunder</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Filter Summary and Reset */}
              {filteredReportData && reportData && (
                <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                  <Box p={2} sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.08), borderRadius: 1, flex: 1 }}>
                    <Typography variant="body2" color="primary">
                      📊 Viser {filteredReportData.SkadeDetaljer?.length || 0} av {reportData.SkadeDetaljer?.length || 0} skader
                      {(skadeFilters.saksbehandler !== 'alle' || skadeFilters.status !== 'alle' ||
                        skadeFilters.skadetype !== 'alle' || skadeFilters.kundetype !== 'alle') && (
                          <span> (filtrert)</span>
                        )}
                    </Typography>
                  </Box>

                  {(skadeFilters.saksbehandler !== 'alle' || skadeFilters.status !== 'alle' ||
                    skadeFilters.skadetype !== 'alle' || skadeFilters.kundetype !== 'alle') && (
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ ml: 2 }}
                        onClick={() => setSkadeFilters({
                          saksbehandler: 'alle',
                          status: 'alle',
                          skadetype: 'alle',
                          kundetype: 'alle'
                        })}
                      >
                        🔄 Nullstill filtre
                      </Button>
                    )}
                </Box>
              )}
            </StyledPaper>

            {/* Render filtered report */}
            <ModernSkadeReport
              data={filteredReportData || reportData}
              appliedFilters={skadeFilters}
            />
          </Box>
        );
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
        return "Skaderapport";
      case 2:
        return "Månedsrapport";
      default:
        return "Rapport";
    }
  };

  return (
    <Box p={3}>
      {/* Show header for other reports, but not monthly report */}
      {activeTab !== 2 && (
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
      )}

      {/* Hide time period controls for monthly report */}
      {activeTab !== 2 && (
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
      )}

      {renderReportContent()}
    </Box>
  );
};

export default ReportsPage;