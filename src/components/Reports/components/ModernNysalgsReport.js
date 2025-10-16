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
  useTheme
} from '@mui/material';
import {
  Print as PrintIcon,
  GetApp as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Payments as PaymentsIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatNumber, getMonthName } from '../../../utils/formatUtils';

const ModernNysalgsReport = ({ data: rawData }) => {
  const theme = useTheme();
  const [detailsTab, setDetailsTab] = useState(0);

  // Data processing logic
  const processReportData = (rawData) => {
    if (!rawData || rawData.length === 0) {
      return null;
    }

    const customerDetailsMap = new Map();
    rawData.forEach(row => {
      if (!customerDetailsMap.has(row.CustomerNumber)) {
        customerDetailsMap.set(row.CustomerNumber, {
          KundeNr: row.CustomerNumber,
          KundeNavn: row.CustomerName,
          KundeType: row.IsBusiness ? 'Bedriftskunde' : 'Privatkunde',
          FørstePoliseDato: row.ProductionDate,
          SalgsMedarbeider: row.ProducedBy,
          AntallPoliser: 0,
          TotalPremie: 0,
          Produkter: new Set(),
          policies: new Set()
        });
      }
      const customer = customerDetailsMap.get(row.CustomerNumber);
      customer.TotalPremie += row.PeriodPremium;
      customer.Produkter.add(row.ProductName);
      if (!customer.policies.has(row.PolicyNumber)) {
        customer.policies.add(row.PolicyNumber);
        customer.AntallPoliser += 1;
      }
    });

    const KundeDetaljer = Array.from(customerDetailsMap.values()).map(c => ({ ...c, Produkter: Array.from(c.Produkter).join(', ') }));

    const TotalPremieNysalg = rawData.reduce((sum, row) => sum + row.PeriodPremium, 0);

    let AntallNyeBedriftskunder = 0;
    let PremieNyeBedriftskunder = 0;
    KundeDetaljer.filter(c => c.KundeType === 'Bedriftskunde').forEach(c => {
      AntallNyeBedriftskunder++;
      PremieNyeBedriftskunder += c.TotalPremie;
    });

    let AntallNyePrivatkunder = 0;
    let PremieNyePrivatkunder = 0;
    KundeDetaljer.filter(c => c.KundeType === 'Privatkunde').forEach(c => {
      AntallNyePrivatkunder++;
      PremieNyePrivatkunder += c.TotalPremie;
    });

    const monthlyStats = {};
    rawData.forEach(row => {
      const date = new Date(row.ProductionDate);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;
      if (!monthlyStats[key]) {
        monthlyStats[key] = { År: year, Måned: month, AntallNyeKunder: new Set(), TotalPremieVolum: 0 };
      }
      monthlyStats[key].AntallNyeKunder.add(row.CustomerNumber);
      monthlyStats[key].TotalPremieVolum += row.PeriodPremium;
    });
    const MånedsStatistikk = Object.values(monthlyStats).map(s => ({ ...s, AntallNyeKunder: s.AntallNyeKunder.size })).sort((a, b) => a.År - b.År || a.Måned - b.Måned);

    const salesRepStats = new Map();
    KundeDetaljer.forEach(customer => {
      if (!salesRepStats.has(customer.SalgsMedarbeider)) {
        salesRepStats.set(customer.SalgsMedarbeider, {
          SalgsMedarbeider: customer.SalgsMedarbeider,
          AntallNyeKunder: 0,
          TotaltAntallPoliser: 0,
          TotalPremieVolum: 0
        });
      }
      const stat = salesRepStats.get(customer.SalgsMedarbeider);
      stat.AntallNyeKunder++;
      stat.TotaltAntallPoliser += customer.AntallPoliser;
      stat.TotalPremieVolum += customer.TotalPremie;
    });
    const SalgsStatistikk = Array.from(salesRepStats.values());

    const customerTypeStatsMap = new Map();
    KundeDetaljer.forEach(customer => {
      if (!customerTypeStatsMap.has(customer.KundeType)) {
        customerTypeStatsMap.set(customer.KundeType, {
          KundeType: customer.KundeType,
          AntallNyeKunder: 0,
          TotaltAntallPoliser: 0,
          TotalPremieVolum: 0,
        });
      }
      const stat = customerTypeStatsMap.get(customer.KundeType);
      stat.AntallNyeKunder++;
      stat.TotaltAntallPoliser += customer.AntallPoliser;
      stat.TotalPremieVolum += customer.TotalPremie;
    });
    const KundetypeStatistikk = Array.from(customerTypeStatsMap.values());

    const productStatsMap = new Map();
    rawData.forEach(row => {
      if (!productStatsMap.has(row.ProductName)) {
        productStatsMap.set(row.ProductName, { ProduktNavn: row.ProductName, AntallKunder: new Set(), TotalPremie: 0 });
      }
      const stat = productStatsMap.get(row.ProductName);
      stat.AntallKunder.add(row.CustomerNumber);
      stat.TotalPremie += row.PeriodPremium;
    });
    const ToppProdukter = Array.from(productStatsMap.values()).map(p => ({ ...p, AntallKunder: p.AntallKunder.size })).sort((a, b) => b.TotalPremie - a.TotalPremie).slice(0, 5);

    return {
      TotaltAntallNyeKunder: customerDetailsMap.size,
      TotalPremieNysalg,
      AntallNyeBedriftskunder,
      AntallNyePrivatkunder,
      PremieNyeBedriftskunder,
      PremieNyePrivatkunder,
      KundetypeStatistikk,
      MånedsStatistikk,
      SalgsStatistikk,
      ToppProdukter,
      KundeDetaljer
    };
  };

  const data = processReportData(rawData);

  if (!data) {
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
  const SectionContainer = ({ title, children }) => {
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
          border: 'none'
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
          Nysalgsrapport
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
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <ModernStatCard
          title="Totalt antall nye kunder"
          value={formatNumber(data.TotaltAntallNyeKunder)}
          icon={TrendingUpIcon}
          color={theme.palette.primary.main}
        />
        <ModernStatCard
          title="Total premie nysalg"
          value={formatCurrency(data.TotalPremieNysalg)}
          icon={PaymentsIcon}
          color={theme.palette.error.main}
        />
        <ModernStatCard
          title="Antall nye bedriftskunder"
          value={formatNumber(data.AntallNyeBedriftskunder)}
          icon={BusinessIcon}
          color={theme.palette.success.main}
        />
        <ModernStatCard
          title="Antall nye privatkunder"
          value={formatNumber(data.AntallNyePrivatkunder)}
          icon={PersonIcon}
          color={theme.palette.warning.main}
        />
      </Box>

      {/* Additional Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
        <ModernStatCard
          title="Premie nye bedriftskunder"
          value={formatCurrency(data.PremieNyeBedriftskunder)}
          icon={BusinessIcon}
          color={theme.palette.secondary.main}
          description={`${(data.PremieNyeBedriftskunder / data.TotalPremieNysalg * 100).toFixed(1)}% av total premie`}
        />
        <ModernStatCard
          title="Premie nye privatkunder"
          value={formatCurrency(data.PremieNyePrivatkunder)}
          icon={PersonIcon}
          color={theme.palette.info.main}
          description={`${(data.PremieNyePrivatkunder / data.TotalPremieNysalg * 100).toFixed(1)}% av total premie`}
        />
      </Box>

      {/* Customer Type Distribution - Pie Chart */}
      <SectionContainer title="Fordeling av nye kunder">
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
            <ModernTable
              headers={[
                { label: 'Kundetype' },
                { label: 'Antall kunder', align: 'right' },
                { label: 'Antall poliser', align: 'right' },
                { label: 'Total premie', align: 'right' }
              ]}
              data={[
                ...data.KundetypeStatistikk,
                {
                  KundeType: 'Total',
                  AntallNyeKunder: data.TotaltAntallNyeKunder,
                  TotaltAntallPoliser: data.KundetypeStatistikk.reduce((sum, item) => sum + item.TotaltAntallPoliser, 0),
                  TotalPremieVolum: data.TotalPremieNysalg,
                  isTotal: true
                }
              ]}
              renderRow={(row) => (
                <TableRow
                  key={row.KundeType}
                  sx={row.isTotal ? { bgcolor: alpha(theme.palette.primary.main, 0.05) } : {}}
                >
                  <TableCell
                    component="th"
                    scope="row"
                    sx={row.isTotal ? { fontWeight: 600 } : {}}
                  >
                    {row.KundeType}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={row.isTotal ? { fontWeight: 600 } : {}}
                  >
                    {formatNumber(row.AntallNyeKunder)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={row.isTotal ? { fontWeight: 600 } : {}}
                  >
                    {formatNumber(row.TotaltAntallPoliser)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={row.isTotal ? { fontWeight: 600 } : {}}
                  >
                    {formatCurrency(row.TotalPremieVolum)}
                  </TableCell>
                </TableRow>
              )}
            />
          </Grid>
        </Grid>
      </SectionContainer>

      {/* Monthly Statistics - Bar Chart */}
      <SectionContainer title="Månedlig statistikk">
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
                    return [`${formatNumber(value)} kunder`, 'Antall nye kunder'];
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
                name="Antall nye kunder"
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

      {/* Top Products */}
      <SectionContainer title="Topp 5 produkter">
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
      <SectionContainer title="Salgsstatistikk">
        <ModernTable
          headers={[
            { label: 'Produsert av' },
            { label: 'Antall nye kunder', align: 'right' },
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
              <TableCell align="right">{formatNumber(row.AntallNyeKunder)}</TableCell>
              <TableCell align="right">{formatNumber(row.TotaltAntallPoliser)}</TableCell>
              <TableCell align="right">{formatCurrency(row.TotalPremieVolum)}</TableCell>
              <TableCell align="right">
                {formatCurrency(row.TotalPremieVolum / row.AntallNyeKunder)}
              </TableCell>
            </TableRow>
          )}
        />
      </SectionContainer>

      {/* Customer Details */}
      <SectionContainer title="Kundedetaljer">
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={detailsTab}
            onChange={handleDetailsTabChange}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                minWidth: 'auto',
                '&.Mui-selected': {
                  fontWeight: 600
                }
              }
            }}
          >
            <Tab label="Bedriftskunder" />
            <Tab label="Privatkunder" />
            <Tab label="Alle kunder" />
          </Tabs>
        </Box>
        <ModernTable
          headers={[
            { label: 'KundeNr' },
            { label: 'Navn' },
            { label: 'Type' },
            { label: 'Produsert dato' },
            { label: 'Produsert av' },
            { label: 'Antall poliser', align: 'right' },
            { label: 'Total premie', align: 'right' }
          ]}
          data={customerDetailsData.filter(customer => {
            if (detailsTab === 0) return customer.KundeType === 'Bedriftskunde';
            if (detailsTab === 1) return customer.KundeType === 'Privatkunde';
            return true; // All customers
          })}
          renderRow={(customer) => (
            <TableRow key={customer.KundeNr}>
              <TableCell>{customer.KundeNr}</TableCell>
              <TableCell>{customer.KundeNavn}</TableCell>
              <TableCell>
                <Box
                  sx={{
                    display: 'inline-block',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: customer.KundeType === 'Bedriftskunde'
                      ? alpha(theme.palette.success.main, 0.1)
                      : alpha(theme.palette.info.main, 0.1),
                    color: customer.KundeType === 'Bedriftskunde'
                      ? theme.palette.success.dark
                      : theme.palette.info.dark,
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  {customer.KundeType}
                </Box>
              </TableCell>
              <TableCell>{customer.FørstePoliseDato ? new Date(customer.FørstePoliseDato).toLocaleDateString('nb-NO') : 'N/A'}</TableCell>
              <TableCell>{customer.SalgsMedarbeider}</TableCell>
              <TableCell align="right">{formatNumber(customer.AntallPoliser)}</TableCell>
              <TableCell align="right">{formatCurrency(customer.TotalPremie)}</TableCell>
            </TableRow>
          )}
        />
      </SectionContainer>
    </Box>
  );
};

export default ModernNysalgsReport;