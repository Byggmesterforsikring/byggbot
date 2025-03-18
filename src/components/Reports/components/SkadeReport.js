import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Print as PrintIcon, GetApp as DownloadIcon } from '@mui/icons-material';
import { formatCurrency, formatNumber, getMonthName, formatDate } from '../../../utils/formatUtils';

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

const StatusChip = styled(Chip)(({ theme, status }) => {
  let color = theme.palette.info.main;
  
  if (status === 'Oppgjort') {
    color = theme.palette.success.main;
  } else if (status === 'Registrert') {
    color = theme.palette.warning.main;
  }
  
  return {
    backgroundColor: color,
    color: theme.palette.getContrastText(color),
    fontWeight: 'bold'
  };
});

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#45B39D'];

const SkadeReport = ({ data }) => {
  const [detailsTab, setDetailsTab] = useState(0);

  if (!data || !data.KundetypeStatistikk || !data.MånedsStatistikk || !data.SkadetypeStatistikk || !data.SkadeDetaljer) {
    return <Typography>Ingen data tilgjengelig. Vennligst prøv en annen tidsperiode.</Typography>;
  }

  const handleDetailsTabChange = (event, newValue) => {
    setDetailsTab(newValue);
  };

  // Beregn antall åpne og avsluttede saker
  const åpneSaker = data.SkadeDetaljer.filter(skade => !skade.Skadeavsluttetdato).length;
  const avsluttedeSaker = data.SkadeDetaljer.filter(skade => skade.Skadeavsluttetdato).length;

  // Prepare data for pie chart (kundetyper)
  const customerTypeData = data.KundetypeStatistikk.map(item => ({
    name: item.Kundetype,
    value: item.AntallSkader
  }));

  // Prepare data for pie chart (skadetyper)
  const skadeTypeData = data.SkadetypeStatistikk.map(item => ({
    name: item.ClaimType,
    value: item.AntallSkader
  }));

  // Prepare data for monthly bar chart
  const monthlyData = data.MånedsStatistikk.map(item => ({
    name: `${getMonthName(item.Måned)} ${item.År}`,
    skader: item.AntallSkader,
    utbetalt: item.TotalUtbetalt,
    reservert: item.TotalReservert
  }));

  // Prepare data for customer details
  const skadeDetaljerData = data.SkadeDetaljer;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    // Create CSV for claims details
    const headers = ["Skadenummer", "Navn", "OrgPersonNr", "ErBedriftskunde", "Polisenummer", "Polisestatus", "Skadereserve", "Utbetalt", "Regress", "Skadetype", "Skadestatus", "Skademeldtdato", "Hendelsesdato", "Skadeavsluttetdato"];
    
    let csvContent = headers.join(',') + '\n';
    
    skadeDetaljerData.forEach(skade => {
      const navn = skade.ErBedriftskunde ? skade.Bedriftsnavn : `${skade.Fornavn || ''} ${skade.Etternavn || ''}`;
      const orgPersonNr = skade.ErBedriftskunde ? skade.Orgnr : skade.Personnummer;
      
      const row = [
        skade.Skadenummer,
        `"${navn.replace(/"/g, '""')}"`, // Escape quotes for CSV
        `"${orgPersonNr || ''}"`,
        skade.ErBedriftskunde ? '1' : '0',
        skade.Polisenummer || '',
        `"${skade.Polisestatus || ''}"`,
        skade.Skadereserve || '0',
        skade.Utbetalt || '0',
        skade.Regress || '0',
        `"${skade.Skadetype || ''}"`,
        `"${skade.Skadestatus || ''}"`,
        skade.Skademeldtdato || '',
        skade.Hendelsesdato || '',
        skade.Skadeavsluttetdato || ''
      ];
      csvContent += row.join(',') + '\n';
    });
    
    // Create a blob and download it
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'skaderapport_detaljer.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" gutterBottom>
          Skaderapport
        </Typography>
        <Box>
          <Tooltip title="Skriv ut rapport">
            <IconButton onClick={handlePrint}>
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Last ned skadedetaljer (CSV)">
            <IconButton onClick={handleExportCSV}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard color="#3f51b5">
            <CardContent>
              <CardTitle variant="subtitle2">Totalt antall skader</CardTitle>
              <CardValue variant="h4">{formatNumber(data.TotaltAntallSkader)}</CardValue>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard color="#f44336">
            <CardContent>
              <CardTitle variant="subtitle2">Total utbetalt</CardTitle>
              <CardValue variant="h4">{formatCurrency(data.TotalUtbetalt)}</CardValue>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard color="#4caf50">
            <CardContent>
              <CardTitle variant="subtitle2">Total reservert</CardTitle>
              <CardValue variant="h4">{formatCurrency(data.TotalReservert)}</CardValue>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard color="#ff9800">
            <CardContent>
              <CardTitle variant="subtitle2">Total regress</CardTitle>
              <CardValue variant="h4">{formatCurrency(data.TotalRegress)}</CardValue>
            </CardContent>
          </StatsCard>
        </Grid>
      </Grid>

      {/* Additional Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatsCard color="#9c27b0">
            <CardContent>
              <CardTitle variant="subtitle2">Bedriftskunder / Privatkunder</CardTitle>
              <CardValue variant="h4">{formatNumber(data.AntallBedriftskunder)} / {formatNumber(data.AntallPrivatkunder)}</CardValue>
              <Typography variant="body2" color="textSecondary">
                {(data.AntallBedriftskunder / data.TotaltAntallSkader * 100).toFixed(1)}% bedriftskunder
              </Typography>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatsCard color="#2196f3">
            <CardContent>
              <CardTitle variant="subtitle2">Åpne saker / Avsluttede saker</CardTitle>
              <CardValue variant="h4">{formatNumber(åpneSaker)} / {formatNumber(avsluttedeSaker)}</CardValue>
              <Typography variant="body2" color="textSecondary">
                {(åpneSaker / data.TotaltAntallSkader * 100).toFixed(1)}% åpne saker
              </Typography>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatsCard color="#ff5722">
            <CardContent>
              <CardTitle variant="subtitle2">Gjennomsnittlig erstatning</CardTitle>
              <CardValue variant="h4">{formatCurrency(data.TotalUtbetalt / avsluttedeSaker || 0)}</CardValue>
              <Typography variant="body2" color="textSecondary">
                Basert på {formatNumber(avsluttedeSaker)} avsluttede saker
              </Typography>
            </CardContent>
          </StatsCard>
        </Grid>
      </Grid>

      {/* Customer Type Distribution - Pie Chart */}
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Fordeling av skader
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" align="center" gutterBottom>
              Fordeling etter kundetype
            </Typography>
            <Box height={300} display="flex" justifyContent="center" alignItems="center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {customerTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `${formatNumber(value)} skader`} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" align="center" gutterBottom>
              Fordeling etter skadetype
            </Typography>
            <Box height={300} display="flex" justifyContent="center" alignItems="center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={skadeTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {skadeTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `${formatNumber(value)} skader`} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>
      </StyledPaper>

      {/* Detailed Statistics - Tables */}
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Statistikk per kundetype
        </Typography>
        <TableContainer component={Paper} variant="outlined" style={{ maxHeight: 400, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow style={{ backgroundColor: '#e0e7ff' }}>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Kundetype</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Antall skader</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Total utbetalt</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Total reservert</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Total regress</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Gj.snitt per skade</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.KundetypeStatistikk.map((row) => (
                <TableRow key={row.Kundetype}>
                  <TableCell component="th" scope="row">{row.Kundetype}</TableCell>
                  <TableCell align="right">{formatNumber(row.AntallSkader)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.TotalUtbetalt)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.TotalReservert)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.TotalRegress)}</TableCell>
                  <TableCell align="right">{formatCurrency((row.TotalUtbetalt + row.TotalReservert) / row.AntallSkader)}</TableCell>
                </TableRow>
              ))}
              <TableRow style={{ backgroundColor: '#f8fafc' }}>
                <TableCell component="th" scope="row" style={{ fontWeight: 'bold' }}>Total</TableCell>
                <TableCell align="right" style={{ fontWeight: 'bold' }}>{formatNumber(data.TotaltAntallSkader)}</TableCell>
                <TableCell align="right" style={{ fontWeight: 'bold' }}>{formatCurrency(data.TotalUtbetalt)}</TableCell>
                <TableCell align="right" style={{ fontWeight: 'bold' }}>{formatCurrency(data.TotalReservert)}</TableCell>
                <TableCell align="right" style={{ fontWeight: 'bold' }}>{formatCurrency(data.TotalRegress)}</TableCell>
                <TableCell align="right" style={{ fontWeight: 'bold' }}>{formatCurrency((data.TotalUtbetalt + data.TotalReservert) / data.TotaltAntallSkader)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </StyledPaper>
      
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Statistikk per skadetype
        </Typography>
        <TableContainer component={Paper} variant="outlined" style={{ maxHeight: 400, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow style={{ backgroundColor: '#e0e7ff' }}>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Skadetype</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Antall skader</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Total utbetalt</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Total reservert</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Gj.snitt per skade</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.SkadetypeStatistikk.map((row) => (
                <TableRow key={row.ClaimType}>
                  <TableCell component="th" scope="row">{row.ClaimType}</TableCell>
                  <TableCell align="right">{formatNumber(row.AntallSkader)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.TotalUtbetalt)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.TotalReservert)}</TableCell>
                  <TableCell align="right">{formatCurrency((row.TotalUtbetalt + row.TotalReservert) / row.AntallSkader)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </StyledPaper>

      {/* Monthly Statistics - Bar Chart */}
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Månedlig statistikk
        </Typography>
        <Box height={400}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 20, right: 50, left: 20, bottom: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <RechartsTooltip 
                formatter={(value, name, entry) => {
                  if (name === 'skader') {
                    return [`${formatNumber(value)} skader`, 'Antall skader'];
                  } else if (name === 'utbetalt') {
                    return [formatCurrency(value), 'Utbetalt'];
                  } else if (name === 'reservert') {
                    return [formatCurrency(value), 'Reservert'];
                  }
                  return [value, name];
                }} 
              />
              <Legend verticalAlign="top" height={36} />
              <Bar yAxisId="left" dataKey="skader" name="Antall skader" fill="#8884d8" barSize={20} />
              <Bar yAxisId="right" dataKey="utbetalt" name="Utbetalt" fill="#82ca9d" barSize={20} />
              <Bar yAxisId="right" dataKey="reservert" name="Reservert" fill="#ff8042" barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </StyledPaper>

      {/* Skade Details */}
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Skadedetaljer
        </Typography>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={detailsTab} onChange={handleDetailsTabChange}>
            <Tab label="Åpne saker" />
            <Tab label="Avsluttede saker" />
            <Tab label="Alle saker" />
          </Tabs>
        </Box>
        <TableContainer component={Paper} variant="outlined" style={{ maxHeight: 500, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow style={{ backgroundColor: '#e0e7ff' }}>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Skadenr.</TableCell>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Navn</TableCell>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Type</TableCell>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Polise</TableCell>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Skadetype</TableCell>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Meldt dato</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Reservert</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Utbetalt</TableCell>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {skadeDetaljerData
                .filter(skade => {
                  if (detailsTab === 0) return !skade.Skadeavsluttetdato; // Åpne saker
                  if (detailsTab === 1) return skade.Skadeavsluttetdato; // Avsluttede saker
                  return true; // Alle saker
                })
                .map((skade) => (
                  <TableRow key={skade.Skadenummer}>
                    <TableCell>{skade.Skadenummer}</TableCell>
                    <TableCell>
                      {skade.ErBedriftskunde ? skade.Bedriftsnavn : `${skade.Fornavn || ''} ${skade.Etternavn || ''}`}
                    </TableCell>
                    <TableCell>{skade.ErBedriftskunde ? 'Bedrift' : 'Privat'}</TableCell>
                    <TableCell>{skade.Polisenummer || 'N/A'}</TableCell>
                    <TableCell>{skade.Skadetype}</TableCell>
                    <TableCell>{skade.Skademeldtdato ? new Date(skade.Skademeldtdato).toLocaleDateString('nb-NO') : 'N/A'}</TableCell>
                    <TableCell align="right">{formatCurrency(skade.Skadereserve || 0)}</TableCell>
                    <TableCell align="right">{formatCurrency(skade.Utbetalt || 0)}</TableCell>
                    <TableCell>
                      {skade.Skadestatus ? (
                        <StatusChip 
                          label={skade.Skadestatus} 
                          status={skade.Skadestatus}
                          size="small"
                        />
                      ) : (
                        <StatusChip 
                          label="Ukjent" 
                          status="Ukjent"
                          size="small"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </StyledPaper>
    </Box>
  );
};

export default SkadeReport;