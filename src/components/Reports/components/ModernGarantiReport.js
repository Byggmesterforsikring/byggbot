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
  Avatar,
  alpha,
  useTheme,
  Chip
} from '@mui/material';
import { 
  Print as PrintIcon, 
  GetApp as DownloadIcon,
  Home as HomeIcon,
  Business as BusinessIcon, 
  Receipt as ReceiptIcon,
  Info as InfoIcon,
  Today as TodayIcon,
  PieChart as PieChartIcon,
  Assessment as AssessmentIcon,
  ListAlt as ListAltIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatNumber, getMonthName, formatDate } from '../../../utils/formatUtils';

const ModernGarantiReport = ({ data }) => {
  const theme = useTheme();
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

  // Modern stat card component
  const ModernStatCard = ({ title, value, icon: Icon, color, suffix = "", description }) => {
    return (
      <Paper
        elevation={1}
        sx={{
          height: '100%',
          borderLeft: `4px solid ${color}`,
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
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
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
          
          <Typography
            sx={{
              fontSize: '1.8rem',
              fontWeight: 'bold',
              mb: description ? 1 : 0,
              lineHeight: 1.2
            }}
          >
            {value}{suffix}
          </Typography>
          
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
      </Paper>
    );
  };

  // Modern section container
  const SectionContainer = ({ title, icon: Icon, children }) => {
    return (
      <Paper
        elevation={1}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 3, 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {Icon && (
            <Box
              component="span"
              sx={{ 
                mr: 1.5,
                display: 'flex',
                alignItems: 'center',
                color: theme.palette.primary.main
              }}
            >
              <Icon fontSize="small" />
            </Box>
          )}
          {title}
        </Typography>
        {children}
      </Paper>
    );
  };

  // Modern table style
  const ModernTable = ({ headers, data, renderRow, maxHeight = 400 }) => {
    return (
      <TableContainer 
        component={Paper} 
        variant="outlined" 
        sx={{ 
          maxHeight, 
          overflow: 'auto',
          borderRadius: 2,
          border: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
              {headers.map((header, index) => (
                <TableCell 
                  key={index}
                  align={header.align || 'left'}
                  sx={{ 
                    color: 'text.primary', 
                    fontWeight: 600, 
                    fontSize: '0.9rem' 
                  }}
                >
                  {header.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(renderRow)}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Colors palette
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
    theme.palette.secondary.main,
    '#A569BD'
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Garantirapport
        </Typography>
        <Box>
          <Tooltip title="Skriv ut rapport">
            <IconButton 
              onClick={handlePrint}
              sx={{
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1)
                }
              }}
            >
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Last ned kundedetaljer (CSV)">
            <IconButton 
              onClick={handleExportCSV}
              sx={{
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1)
                }
              }}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <ModernStatCard 
          title="Totalt antall kunder" 
          value={formatNumber(data.TotaltAntallKunder)}
          icon={BusinessIcon}
          color={theme.palette.primary.main}
        />
        <ModernStatCard 
          title="Total premie garanti" 
          value={formatCurrency(data.TotalPremieGaranti)}
          icon={ReceiptIcon}
          color={theme.palette.error.main}
        />
        <ModernStatCard 
          title="Totalt antall poliser" 
          value={formatNumber(data.KundetypeStatistikk.reduce((sum, item) => sum + item.TotaltAntallPoliser, 0))}
          icon={ListAltIcon}
          color={theme.palette.success.main}
        />
      </Box>

      {/* Additional Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <ModernStatCard 
          title="Gjennomsnittlig premie per kunde" 
          value={formatCurrency(data.TotalPremieGaranti / data.TotaltAntallKunder)}
          icon={AssessmentIcon}
          color={theme.palette.secondary.main}
          description={`Basert på ${formatNumber(data.TotaltAntallKunder)} kunder`}
        />
        <ModernStatCard 
          title="Gjennomsnittlig kontraktssum" 
          value={formatCurrency(
            data.KundeDetaljer
              .filter(customer => customer.Kontraktssum)
              .reduce((sum, customer) => sum + customer.Kontraktssum, 0) /
            data.KundeDetaljer.filter(customer => customer.Kontraktssum).length || 0
          )}
          icon={InfoIcon}
          color={theme.palette.info.main}
        />
        <ModernStatCard 
          title="Antall overlevering neste 6 mnd" 
          value={formatNumber(
            data.KundeDetaljer.filter(customer => {
              if (!customer.Overleveringsdato) return false;
              const overlevering = new Date(customer.Overleveringsdato);
              const now = new Date();
              const sixMonthsLater = new Date();
              sixMonthsLater.setMonth(now.getMonth() + 6);
              return overlevering >= now && overlevering <= sixMonthsLater;
            }).length
          )}
          icon={TodayIcon}
          color={theme.palette.warning.main}
        />
      </Box>

      {/* Kontraktssum Statistics */}
      <SectionContainer title="Kontraktssum statistikk" icon={PieChartIcon}>
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
                  <RechartsTooltip 
                    formatter={(value) => `${formatNumber(value)} kunder`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <ModernTable
              headers={[
                { label: 'Oversikt' },
                { label: 'Verdi', align: 'right' }
              ]}
              data={[
                { label: 'Total kontraktssum', value: data.KundeDetaljer.reduce((sum, customer) => sum + (customer.Kontraktssum || 0), 0) },
                { 
                  label: 'Gjennomsnittlig kontraktssum', 
                  value: data.KundeDetaljer.filter(c => c.Kontraktssum).reduce((sum, c) => sum + c.Kontraktssum, 0) /
                      data.KundeDetaljer.filter(c => c.Kontraktssum).length || 0 
                },
                { 
                  label: 'Median kontraktssum', 
                  value: (() => {
                    const values = data.KundeDetaljer
                      .filter(c => c.Kontraktssum)
                      .map(c => c.Kontraktssum)
                      .sort((a, b) => a - b);
                    const mid = Math.floor(values.length / 2);
                    return values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
                  })() 
                },
                { 
                  label: 'Høyeste kontraktssum', 
                  value: Math.max(...data.KundeDetaljer.filter(c => c.Kontraktssum).map(c => c.Kontraktssum)) 
                },
                { 
                  label: 'Laveste kontraktssum', 
                  value: Math.min(...data.KundeDetaljer.filter(c => c.Kontraktssum).map(c => c.Kontraktssum)) 
                }
              ]}
              renderRow={(row, index) => (
                <TableRow key={index}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>{row.label}</TableCell>
                  <TableCell align="right">{formatCurrency(row.value)}</TableCell>
                </TableRow>
              )}
            />
          </Grid>
        </Grid>
      </SectionContainer>

      {/* Monthly Statistics - Bar Chart */}
      <SectionContainer title="Månedlig statistikk" icon={AssessmentIcon}>
        <Box height={400}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 20, right: 50, left: 20, bottom: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
              <YAxis yAxisId="left" orientation="left" stroke={theme.palette.primary.main} />
              <YAxis yAxisId="right" orientation="right" stroke={theme.palette.success.main} />
              <RechartsTooltip
                formatter={(value, name, entry) => {
                  if (name === 'kunder') {
                    return [`${formatNumber(value)} kunder`, 'Antall kunder'];
                  } else if (name === 'premie') {
                    return [formatCurrency(value), 'Premie'];
                  }
                  return [value, name];
                }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar 
                yAxisId="left" 
                dataKey="kunder" 
                name="Antall kunder" 
                fill={theme.palette.primary.main} 
                barSize={40} 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="right" 
                dataKey="premie" 
                name="Premie" 
                fill={theme.palette.success.main} 
                barSize={40}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </SectionContainer>

      {/* Project Type Analysis */}
      <SectionContainer title="Prosjekttype analyse" icon={HomeIcon}>
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
                  <RechartsTooltip 
                    formatter={(value) => `${formatNumber(value)} prosjekter`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <ModernTable
              headers={[
                { label: 'Kvartal' },
                { label: 'Overleveringer', align: 'right' }
              ]}
              data={(() => {
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
                  .map(([quarter, count]) => ({ quarter, count }));
              })()}
              renderRow={(row, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}>
                    <Avatar 
                      sx={{ 
                        width: 28, 
                        height: 28, 
                        bgcolor: `${theme.palette.primary.main}15`,
                        color: theme.palette.primary.main,
                        fontSize: '0.8rem'
                      }}
                    >
                      {row.quarter.split(' ')[1]}
                    </Avatar>
                    {row.quarter}
                  </TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={`${formatNumber(row.count)} overleveringer`}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        color: theme.palette.success.dark,
                        fontWeight: 500
                      }}
                    />
                  </TableCell>
                </TableRow>
              )}
            />
          </Grid>
        </Grid>
      </SectionContainer>

      {/* Top Products */}
      <SectionContainer title="Topp produkter" icon={ReceiptIcon}>
        <ModernTable
          headers={[
            { label: 'Produkt' },
            { label: 'Antall kunder', align: 'right' },
            { label: 'Total premie', align: 'right' },
            { label: 'Gjennomsnitt per kunde', align: 'right' }
          ]}
          data={topProductsData}
          renderRow={(row) => (
            <TableRow key={row.ProduktNavn}>
              <TableCell component="th" scope="row">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      mr: 1.5, 
                      bgcolor: `${theme.palette.primary.main}15`,
                      color: theme.palette.primary.main
                    }}
                  >
                    <ReceiptIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  {row.ProduktNavn}
                </Box>
              </TableCell>
              <TableCell align="right">{formatNumber(row.AntallKunder)}</TableCell>
              <TableCell align="right">{formatCurrency(row.TotalPremie)}</TableCell>
              <TableCell align="right">{formatCurrency(row.TotalPremie / row.AntallKunder)}</TableCell>
            </TableRow>
          )}
        />
      </SectionContainer>

      {/* Sales Statistics */}
      <SectionContainer title="Salgsstatistikk" icon={AssessmentIcon}>
        <ModernTable
          headers={[
            { label: 'Produsert av' },
            { label: 'Antall kunder', align: 'right' },
            { label: 'Antall poliser', align: 'right' },
            { label: 'Total premie', align: 'right' },
            { label: 'Gjennomsnitt per kunde', align: 'right' }
          ]}
          data={salesData}
          renderRow={(row) => (
            <TableRow key={row.SalgsMedarbeider}>
              <TableCell component="th" scope="row">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      mr: 1.5, 
                      bgcolor: `${theme.palette.primary.main}15`, 
                      color: theme.palette.primary.main
                    }}
                  >
                    {row.SalgsMedarbeider.substring(0, 1)}
                  </Avatar>
                  {row.SalgsMedarbeider}
                </Box>
              </TableCell>
              <TableCell align="right">{formatNumber(row.AntallKunder)}</TableCell>
              <TableCell align="right">{formatNumber(row.TotaltAntallPoliser)}</TableCell>
              <TableCell align="right">{formatCurrency(row.TotalPremieVolum || 0)}</TableCell>
              <TableCell align="right">
                {formatCurrency((row.TotalPremieVolum || 0) / row.AntallKunder)}
              </TableCell>
            </TableRow>
          )}
        />
      </SectionContainer>

      {/* Customer Details */}
      <SectionContainer title="Kundedetaljer" icon={BusinessIcon}>
        <ModernTable
          headers={[
            { label: 'KundeNr' },
            { label: 'Navn' },
            { label: 'Produsert dato' },
            { label: 'Produsert av' },
            { label: 'Antall poliser', align: 'right' },
            { label: 'Total premie', align: 'right' },
            { label: 'Kontraktssum', align: 'right' },
            { label: 'Overleveringsdato' }
          ]}
          data={customerDetailsData}
          renderRow={(customer) => (
            <TableRow key={`${customer.KundeNr}-${customer.ProduksjonsDato}-${customer.TotalPremie}-${Math.random().toString(36).substr(2, 9)}`}>
              <TableCell>{customer.KundeNr}</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>{customer.KundeNavn}</TableCell>
              <TableCell>{customer.ProduksjonsDato ? new Date(customer.ProduksjonsDato).toLocaleDateString('nb-NO') : 'N/A'}</TableCell>
              <TableCell>{customer.SalgsMedarbeider}</TableCell>
              <TableCell align="right">{formatNumber(customer.AntallPoliser)}</TableCell>
              <TableCell align="right">{formatCurrency(customer.TotalPremie || 0)}</TableCell>
              <TableCell align="right">
                <Chip 
                  label={formatCurrency(customer.Kontraktssum || 0)}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.dark,
                    fontWeight: 500
                  }}
                />
              </TableCell>
              <TableCell>
                {customer.Overleveringsdato ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TodayIcon sx={{ fontSize: 16, mr: 0.5, color: theme.palette.primary.main }} />
                    {new Date(customer.Overleveringsdato).toLocaleDateString('nb-NO')}
                  </Box>
                ) : 'N/A'}
              </TableCell>
            </TableRow>
          )}
        />
      </SectionContainer>
    </Box>
  );
};

export default ModernGarantiReport;