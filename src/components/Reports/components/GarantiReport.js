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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#45B39D'];

const GarantiReport = ({ data }) => {
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
    value: item.AntallKunder
  }));

  // Prepare data for monthly bar chart
  const monthlyData = data.MånedsStatistikk.map(item => ({
    name: `${getMonthName(item.Måned)} ${item.År}`,
    kunder: item.AntallKunder,
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
    const headers = ["KundeNr", "KundeNavn", "OrgPersonNr", "KundeType", "ProduksjonsDato", "SalgsMedarbeider", "AntallPoliser", "TotalPremie", "Kontraktssum", "Overleveringsdato", "Beskrivelse", "Produkter"];

    let csvContent = headers.join(',') + '\n';

    customerDetailsData.forEach(customer => {
      const row = [
        customer.KundeNr,
        `"${customer.KundeNavn.replace(/"/g, '""')}"`, // Escape quotes for CSV
        `"${customer.OrgPersonNr || ''}"`,
        customer.KundeType,
        customer.ProduksjonsDato,
        `"${customer.SalgsMedarbeider}"`,
        customer.AntallPoliser,
        customer.TotalPremie || '',
        customer.Kontraktssum || '',
        customer.Overleveringsdato || '',
        `"${customer.Beskrivelse?.replace(/"/g, '""') || ''}"`,
        `"${customer.Produkter || ''}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    // Create a blob and download it
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'garantirapport_kundedetaljer.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" gutterBottom>
          Garantirapport
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
        <Grid item xs={12} sm={6} md={4}>
          <StatsCard color="#3f51b5">
            <CardContent>
              <CardTitle variant="subtitle2">Totalt antall kunder</CardTitle>
              <CardValue variant="h4">{formatNumber(data.TotaltAntallKunder)}</CardValue>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatsCard color="#f44336">
            <CardContent>
              <CardTitle variant="subtitle2">Total premie garanti</CardTitle>
              <CardValue variant="h4">{formatCurrency(data.TotalPremieGaranti)}</CardValue>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatsCard color="#4caf50">
            <CardContent>
              <CardTitle variant="subtitle2">Totalt antall poliser</CardTitle>
              <CardValue variant="h4">{formatNumber(data.KundetypeStatistikk.reduce((sum, item) => sum + item.TotaltAntallPoliser, 0))}</CardValue>
            </CardContent>
          </StatsCard>
        </Grid>
      </Grid>

      {/* Additional Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatsCard color="#9c27b0">
            <CardContent>
              <CardTitle variant="subtitle2">Gjennomsnittlig premie per kunde</CardTitle>
              <CardValue variant="h4">{formatCurrency(data.TotalPremieGaranti / data.TotaltAntallKunder)}</CardValue>
              <Typography variant="body2" color="textSecondary">
                Basert på {formatNumber(data.TotaltAntallKunder)} kunder
              </Typography>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatsCard color="#2196f3">
            <CardContent>
              <CardTitle variant="subtitle2">Gjennomsnittlig kontraktssum</CardTitle>
              {/* Calculate average contract sum from KundeDetaljer */}
              <CardValue variant="h4">
                {formatCurrency(
                  data.KundeDetaljer
                    .filter(customer => customer.Kontraktssum)
                    .reduce((sum, customer) => sum + customer.Kontraktssum, 0) /
                  data.KundeDetaljer.filter(customer => customer.Kontraktssum).length || 0
                )}
              </CardValue>
            </CardContent>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatsCard color="#ff9800">
            <CardContent>
              <CardTitle variant="subtitle2">Antall overlevering neste 6 mnd</CardTitle>
              <CardValue variant="h4">
                {formatNumber(
                  data.KundeDetaljer.filter(customer => {
                    if (!customer.Overleveringsdato) return false;
                    const overlevering = new Date(customer.Overleveringsdato);
                    const now = new Date();
                    const sixMonthsLater = new Date();
                    sixMonthsLater.setMonth(now.getMonth() + 6);
                    return overlevering >= now && overlevering <= sixMonthsLater;
                  }).length
                )}
              </CardValue>
            </CardContent>
          </StatsCard>
        </Grid>
      </Grid>

      {/* Kontraktssum Statistics */}
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Kontraktssum statistikk
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box height={300} display="flex" justifyContent="center" alignItems="center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Under 5M', value: data.KundeDetaljer.filter(c => c.Kontraktssum && c.Kontraktssum < 5000000).length },
                      { name: '5M-10M', value: data.KundeDetaljer.filter(c => c.Kontraktssum && c.Kontraktssum >= 5000000 && c.Kontraktssum < 10000000).length },
                      { name: '10M-15M', value: data.KundeDetaljer.filter(c => c.Kontraktssum && c.Kontraktssum >= 10000000 && c.Kontraktssum < 15000000).length },
                      { name: '15M-20M', value: data.KundeDetaljer.filter(c => c.Kontraktssum && c.Kontraktssum >= 15000000 && c.Kontraktssum < 20000000).length },
                      { name: 'Over 20M', value: data.KundeDetaljer.filter(c => c.Kontraktssum && c.Kontraktssum >= 20000000).length }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
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
              <Table stickyHeader>
                <TableHead>
                  <TableRow style={{ backgroundColor: '#e0e7ff' }}>
                    <TableCell colSpan={2} style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>
                      Kontraktssum oversikt
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" style={{ fontWeight: 'bold', width: '50%' }}>Total kontraktssum</TableCell>
                    <TableCell align="right">{formatCurrency(
                      data.KundeDetaljer.reduce((sum, customer) => sum + (customer.Kontraktssum || 0), 0)
                    )}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" style={{ fontWeight: 'bold' }}>Gjennomsnittlig kontraktssum</TableCell>
                    <TableCell align="right">{formatCurrency(
                      data.KundeDetaljer.filter(c => c.Kontraktssum).reduce((sum, c) => sum + c.Kontraktssum, 0) /
                      data.KundeDetaljer.filter(c => c.Kontraktssum).length || 0
                    )}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" style={{ fontWeight: 'bold' }}>Median kontraktssum</TableCell>
                    <TableCell align="right">{formatCurrency(
                      (() => {
                        const values = data.KundeDetaljer
                          .filter(c => c.Kontraktssum)
                          .map(c => c.Kontraktssum)
                          .sort((a, b) => a - b);
                        const mid = Math.floor(values.length / 2);
                        return values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
                      })()
                    )}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" style={{ fontWeight: 'bold' }}>Høyeste kontraktssum</TableCell>
                    <TableCell align="right">{formatCurrency(
                      Math.max(...data.KundeDetaljer.filter(c => c.Kontraktssum).map(c => c.Kontraktssum))
                    )}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" style={{ fontWeight: 'bold' }}>Laveste kontraktssum</TableCell>
                    <TableCell align="right">{formatCurrency(
                      Math.min(...data.KundeDetaljer.filter(c => c.Kontraktssum).map(c => c.Kontraktssum))
                    )}</TableCell>
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
                    return [`${formatNumber(value)} kunder`, 'Antall kunder'];
                  } else if (name === 'premie') {
                    return [formatCurrency(value), 'Premie'];
                  }
                  return [value, name];
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar yAxisId="left" dataKey="kunder" name="Antall kunder" fill="#8884d8" barSize={40} />
              <Bar yAxisId="right" dataKey="premie" name="Premie" fill="#82ca9d" barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </StyledPaper>

      {/* Project Type Analysis */}
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Prosjekttype analyse
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box height={300} display="flex" justifyContent="center" alignItems="center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(() => {
                      // Extract project types from descriptions
                      const projectTypes = {};
                      data.KundeDetaljer.forEach(customer => {
                        if (!customer.Beskrivelse) return;

                        let type = "Annet";
                        const desc = customer.Beskrivelse.toLowerCase();

                        if (desc.includes("oppføring av bolig") || desc.includes("bolig under oppføring")) {
                          type = "Boligoppføring";
                        } else if (desc.includes("rehabilitering")) {
                          type = "Rehabilitering";
                        } else if (desc.includes("kjøp av bolig")) {
                          type = "Boligkjøp";
                        } else if (desc.includes("prosjektering")) {
                          type = "Prosjektering";
                        }

                        projectTypes[type] = (projectTypes[type] || 0) + 1;
                      });

                      return Object.entries(projectTypes).map(([name, value]) => ({ name, value }));
                    })()}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `${formatNumber(value)} prosjekter`} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <TableContainer component={Paper} variant="outlined" style={{ maxHeight: 400, overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow style={{ backgroundColor: '#e0e7ff' }}>
                    <TableCell colSpan={2} style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>
                      Overleveringsdatoer
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    // Group by quarter
                    const quarterData = {};
                    data.KundeDetaljer.forEach(customer => {
                      if (!customer.Overleveringsdato) return;

                      const date = new Date(customer.Overleveringsdato);
                      const year = date.getFullYear();
                      const quarter = Math.floor(date.getMonth() / 3) + 1;
                      const key = `${year} Q${quarter}`;

                      quarterData[key] = (quarterData[key] || 0) + 1;
                    });

                    // Sort by date
                    return Object.entries(quarterData)
                      .sort((a, b) => {
                        const [yearA, qA] = a[0].split(' ');
                        const [yearB, qB] = b[0].split(' ');
                        return yearA === yearB ?
                          qA.localeCompare(qB) :
                          parseInt(yearA) - parseInt(yearB);
                      })
                      .map(([quarter, count], index) => (
                        <TableRow key={index}>
                          <TableCell component="th" scope="row" style={{ fontWeight: 'bold' }}>{quarter}</TableCell>
                          <TableCell align="right">{formatNumber(count)} overleveringer</TableCell>
                        </TableRow>
                      ));
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </StyledPaper>

      {/* Top Products */}
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Topp produkter
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
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Antall kunder</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Antall poliser</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Total premie</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Gjennomsnitt per kunde</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {salesData.map((row) => (
                <TableRow key={row.SalgsMedarbeider}>
                  <TableCell component="th" scope="row">{row.SalgsMedarbeider}</TableCell>
                  <TableCell align="right">{formatNumber(row.AntallKunder)}</TableCell>
                  <TableCell align="right">{formatNumber(row.TotaltAntallPoliser)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.TotalPremieVolum || 0)}</TableCell>
                  <TableCell align="right">
                    {formatCurrency((row.TotalPremieVolum || 0) / row.AntallKunder)}
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
        <TableContainer component={Paper} variant="outlined" style={{ maxHeight: 400, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow style={{ backgroundColor: '#e0e7ff' }}>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>KundeNr</TableCell>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Navn</TableCell>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Produsert dato</TableCell>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Produsert av</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Antall poliser</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Total premie</TableCell>
                <TableCell align="right" style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Kontraktssum</TableCell>
                <TableCell style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1rem' }}>Overleveringsdato</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customerDetailsData
                .map((customer) => (
                  <TableRow key={`${customer.KundeNr}-${customer.ProduksjonsDato}-${customer.TotalPremie}-${Math.random().toString(36).substr(2, 9)}`}>
                    <TableCell>{customer.KundeNr}</TableCell>
                    <TableCell>{customer.KundeNavn}</TableCell>
                    <TableCell>{customer.ProduksjonsDato ? new Date(customer.ProduksjonsDato).toLocaleDateString('nb-NO') : 'N/A'}</TableCell>
                    <TableCell>{customer.SalgsMedarbeider}</TableCell>
                    <TableCell align="right">{formatNumber(customer.AntallPoliser)}</TableCell>
                    <TableCell align="right">{formatCurrency(customer.TotalPremie || 0)}</TableCell>
                    <TableCell align="right">{formatCurrency(customer.Kontraktssum || 0)}</TableCell>
                    <TableCell>{customer.Overleveringsdato ? new Date(customer.Overleveringsdato).toLocaleDateString('nb-NO') : 'N/A'}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </StyledPaper>
    </Box>
  );
};

export default GarantiReport;