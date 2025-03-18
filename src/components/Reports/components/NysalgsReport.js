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
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Print as PrintIcon, GetApp as DownloadIcon } from '@mui/icons-material';
import { formatCurrency, formatNumber, getMonthName } from '../../../utils/formatUtils';

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#45B39D'];

const NysalgsReport = ({ data }) => {
  const [detailsTab, setDetailsTab] = useState(0);

  if (!data || !data.KundetypeStatistikk || !data.MånedsStatistikk || !data.SalgsStatistikk || !data.ToppProdukter || !data.KundeDetaljer) {
    return <Typography>Ingen data tilgjengelig. Vennligst prøv en annen tidsperiode.</Typography>;
  }

  const handleDetailsTabChange = (event, newValue) => {
    setDetailsTab(newValue);
  };

  // Prepare data for pie chart (kundetyper)
  const customerTypeData = data.KundetypeStatistikk.map(item => ({
    name: item.KundeType,
    value: item.AntallNyeKunder
  }));

  // Prepare data for monthly bar chart
  const monthlyData = data.MånedsStatistikk.map(item => ({
    name: `${getMonthName(item.Måned)} ${item.År}`,
    kunder: item.AntallNyeKunder,
    premie: item.TotalPremieVolum
  }));

  // Prepare data for sales statistics table
  const salesData = [...data.SalgsStatistikk].sort((a, b) => b.TotalPremieVolum - a.TotalPremieVolum);

  // Prepare data for top products
  const topProductsData = data.ToppProdukter;

  // Prepare data for customer details
  const customerDetailsData = data.KundeDetaljer;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    // Create CSV for customer details
    const headers = ["KundeNr", "KundeNavn", "OrgPersonNr", "KundeType", "FørstePoliseDato", "SalgsMedarbeider", "AntallPoliser", "TotalPremie", "Produkter"];
    
    let csvContent = headers.join(',') + '\n';
    
    customerDetailsData.forEach(customer => {
      const row = [
        customer.KundeNr,
        `"${customer.KundeNavn.replace(/"/g, '""')}"`, // Escape quotes for CSV
        `"${customer.OrgPersonNr}"`,
        customer.KundeType,
        customer.FørstePoliseDato,
        `"${customer.SalgsMedarbeider}"`,
        customer.AntallPoliser,
        customer.TotalPremie,
        `"${customer.Produkter}"`
      ];
      csvContent += row.join(',') + '\n';
    });
    
    // Create a blob and download it
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'nysalgsrapport_kundedetaljer.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" gutterBottom>
          Nysalgsrapport
        </Typography>
        <Box>
          <Tooltip title="Skriv ut rapport">
            <IconButton onClick={handlePrint}>
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Last ned kundedetaljer (CSV)">
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
              <CardTitle variant="subtitle2">Totalt antall nye kunder</CardTitle>
              <CardValue variant="h4">{formatNumber(data.TotaltAntallNyeKunder)}</CardValue>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard color="#f44336">
            <CardContent>
              <CardTitle variant="subtitle2">Total premie nysalg</CardTitle>
              <CardValue variant="h4">{formatCurrency(data.TotalPremieNysalg)}</CardValue>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard color="#4caf50">
            <CardContent>
              <CardTitle variant="subtitle2">Antall nye bedriftskunder</CardTitle>
              <CardValue variant="h4">{formatNumber(data.AntallNyeBedriftskunder)}</CardValue>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard color="#ff9800">
            <CardContent>
              <CardTitle variant="subtitle2">Antall nye privatkunder</CardTitle>
              <CardValue variant="h4">{formatNumber(data.AntallNyePrivatkunder)}</CardValue>
            </CardContent>
          </StatsCard>
        </Grid>
      </Grid>

      {/* Additional Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <StatsCard color="#9c27b0">
            <CardContent>
              <CardTitle variant="subtitle2">Premie nye bedriftskunder</CardTitle>
              <CardValue variant="h4">{formatCurrency(data.PremieNyeBedriftskunder)}</CardValue>
              <Typography variant="body2" color="textSecondary">
                {(data.PremieNyeBedriftskunder / data.TotalPremieNysalg * 100).toFixed(1)}% av total premie
              </Typography>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatsCard color="#2196f3">
            <CardContent>
              <CardTitle variant="subtitle2">Premie nye privatkunder</CardTitle>
              <CardValue variant="h4">{formatCurrency(data.PremieNyePrivatkunder)}</CardValue>
              <Typography variant="body2" color="textSecondary">
                {(data.PremieNyePrivatkunder / data.TotalPremieNysalg * 100).toFixed(1)}% av total premie
              </Typography>
            </CardContent>
          </StatsCard>
        </Grid>
      </Grid>

      {/* Customer Type Distribution - Pie Chart */}
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Fordeling av nye kunder
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
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
                  <RechartsTooltip formatter={(value) => `${formatNumber(value)} kunder`} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <TableContainer component={Paper} variant="outlined" style={{ maxHeight: 400, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow style={{ backgroundColor: '#e0e7ff' }}>
                    <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Kundetype</TableCell>
                    <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Antall kunder</TableCell>
                    <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Antall poliser</TableCell>
                    <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Total premie</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.KundetypeStatistikk.map((row) => (
                    <TableRow key={row.KundeType}>
                      <TableCell component="th" scope="row">{row.KundeType}</TableCell>
                      <TableCell align="right">{formatNumber(row.AntallNyeKunder)}</TableCell>
                      <TableCell align="right">{formatNumber(row.TotaltAntallPoliser)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.TotalPremieVolum)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell component="th" scope="row" style={{ fontWeight: 'bold' }}>Total</TableCell>
                    <TableCell align="right" style={{ fontWeight: 'bold' }}>{formatNumber(data.TotaltAntallNyeKunder)}</TableCell>
                    <TableCell align="right" style={{ fontWeight: 'bold' }}>
                      {formatNumber(data.KundetypeStatistikk.reduce((sum, item) => sum + item.TotaltAntallPoliser, 0))}
                    </TableCell>
                    <TableCell align="right" style={{ fontWeight: 'bold' }}>{formatCurrency(data.TotalPremieNysalg)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
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
                  if (name === 'kunder') {
                    return [`${formatNumber(value)} kunder`, 'Antall nye kunder'];
                  } else if (name === 'premie') {
                    return [formatCurrency(value), 'Premie'];
                  }
                  return [value, name];
                }} 
              />
              <Legend verticalAlign="top" height={36} />
              <Bar yAxisId="left" dataKey="kunder" name="Antall nye kunder" fill="#8884d8" barSize={40} />
              <Bar yAxisId="right" dataKey="premie" name="Premie" fill="#82ca9d" barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </StyledPaper>

      {/* Top Products */}
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Topp 5 produkter
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TableContainer component={Paper} variant="outlined" style={{ maxHeight: 400, overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow style={{ backgroundColor: '#e0e7ff' }}>
                    <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Produkt</TableCell>
                    <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Antall kunder</TableCell>
                    <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Total premie</TableCell>
                    <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Gjennomsnitt per kunde</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topProductsData.map((row) => (
                    <TableRow key={row.ProduktNavn}>
                      <TableCell component="th" scope="row">{row.ProduktNavn}</TableCell>
                      <TableCell align="right">{formatNumber(row.AntallKunder)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.TotalPremie)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.TotalPremie / row.AntallKunder)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </StyledPaper>

      {/* Sales Statistics */}
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Salgsstatistikk
        </Typography>
        <TableContainer component={Paper} variant="outlined" style={{ maxHeight: 400, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow style={{ backgroundColor: '#e0e7ff' }}>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Produsert av</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Antall nye kunder</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Antall poliser</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Total premie</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Gjennomsnitt per kunde</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {salesData.map((row) => (
                <TableRow key={row.SalgsMedarbeider}>
                  <TableCell component="th" scope="row">{row.SalgsMedarbeider}</TableCell>
                  <TableCell align="right">{formatNumber(row.AntallNyeKunder)}</TableCell>
                  <TableCell align="right">{formatNumber(row.TotaltAntallPoliser)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.TotalPremieVolum)}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(row.TotalPremieVolum / row.AntallNyeKunder)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </StyledPaper>

      {/* Customer Details */}
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Kundedetaljer
        </Typography>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={detailsTab} onChange={handleDetailsTabChange}>
            <Tab label="Bedriftskunder" />
            <Tab label="Privatkunder" />
            <Tab label="Alle kunder" />
          </Tabs>
        </Box>
        <TableContainer component={Paper} variant="outlined" style={{ maxHeight: 400, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow style={{ backgroundColor: '#e0e7ff' }}>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>KundeNr</TableCell>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Navn</TableCell>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Type</TableCell>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Produsert dato</TableCell>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Produsert av</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Antall poliser</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Total premie</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customerDetailsData
                .filter(customer => {
                  if (detailsTab === 0) return customer.KundeType === 'Bedriftskunde';
                  if (detailsTab === 1) return customer.KundeType === 'Privatkunde';
                  return true; // All customers
                })
                .map((customer) => (
                  <TableRow key={customer.KundeNr}>
                    <TableCell>{customer.KundeNr}</TableCell>
                    <TableCell>{customer.KundeNavn}</TableCell>
                    <TableCell>{customer.KundeType}</TableCell>
                    <TableCell>{customer.PolicyDate ? new Date(customer.PolicyDate).toLocaleDateString('nb-NO') : 'N/A'}</TableCell>
                    <TableCell>{customer.SalgsMedarbeider}</TableCell>
                    <TableCell align="right">{formatNumber(customer.AntallPoliser)}</TableCell>
                    <TableCell align="right">{formatCurrency(customer.TotalPremie)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </StyledPaper>
    </Box>
  );
};

export default NysalgsReport;