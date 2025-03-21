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
  ListAlt as ListAltIcon,
  Warning as WarningIcon,
  LocalHospital as LocalHospitalIcon,
  MonetizationOn as MonetizationOnIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatNumber, getMonthName, formatDate } from '../../../utils/formatUtils';

const ModernSkadeReport = ({ data }) => {
  const theme = useTheme();
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

  // Modern chip for status
  const StatusChip = ({ status }) => {
    let color = theme.palette.info.main;
    let bgColor = alpha(theme.palette.info.main, 0.1);
    
    if (status === 'Oppgjort') {
      color = theme.palette.success.main;
      bgColor = alpha(theme.palette.success.main, 0.1);
    } else if (status === 'Registrert') {
      color = theme.palette.warning.main;
      bgColor = alpha(theme.palette.warning.main, 0.1);
    } else if (status === 'Under behandling') {
      color = theme.palette.primary.main;
      bgColor = alpha(theme.palette.primary.main, 0.1);
    }
    
    return (
      <Chip 
        label={status}
        size="small"
        sx={{
          bgcolor: bgColor,
          color: color,
          fontWeight: 600,
          border: 'none'
        }}
      />
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
          Skaderapport
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
          <Tooltip title="Last ned skadedetaljer (CSV)">
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
          title="Totalt antall skader" 
          value={formatNumber(data.TotaltAntallSkader)}
          icon={WarningIcon}
          color={theme.palette.primary.main}
        />
        <ModernStatCard 
          title="Total utbetalt" 
          value={formatCurrency(data.TotalUtbetalt)}
          icon={MonetizationOnIcon}
          color={theme.palette.error.main}
        />
        <ModernStatCard 
          title="Total reservert" 
          value={formatCurrency(data.TotalReservert)}
          icon={LocalHospitalIcon}
          color={theme.palette.success.main}
        />
        <ModernStatCard 
          title="Total regress" 
          value={formatCurrency(data.TotalRegress)}
          icon={ReceiptIcon}
          color={theme.palette.warning.main}
        />
      </Box>

      {/* Additional Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <ModernStatCard 
          title="Bedriftskunder / Privatkunder" 
          value={`${formatNumber(data.AntallBedriftskunder)} / ${formatNumber(data.AntallPrivatkunder)}`}
          icon={BusinessIcon}
          color={theme.palette.secondary.main}
          description={`${(data.AntallBedriftskunder / data.TotaltAntallSkader * 100).toFixed(1)}% bedriftskunder`}
        />
        <ModernStatCard 
          title="Åpne saker / Avsluttede saker" 
          value={`${formatNumber(åpneSaker)} / ${formatNumber(avsluttedeSaker)}`}
          icon={ScheduleIcon}
          color={theme.palette.info.main}
          description={`${(åpneSaker / data.TotaltAntallSkader * 100).toFixed(1)}% åpne saker`}
        />
        <ModernStatCard 
          title="Gjennomsnittlig erstatning" 
          value={formatCurrency(data.TotalUtbetalt / avsluttedeSaker || 0)}
          icon={AssessmentIcon}
          color="#ff5722"
          description={`Basert på ${formatNumber(avsluttedeSaker)} avsluttede saker`}
        />
      </Box>

      {/* Distribution Charts */}
      <SectionContainer title="Fordeling av skader" icon={PieChartIcon}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" align="center" gutterBottom fontWeight={500}>
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
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value) => `${formatNumber(value)} skader`}
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
            <Typography variant="subtitle1" align="center" gutterBottom fontWeight={500}>
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
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value) => `${formatNumber(value)} skader`}
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
                  if (name === 'skader') {
                    return [`${formatNumber(value)} skader`, 'Antall skader'];
                  } else if (name === 'utbetalt') {
                    return [formatCurrency(value), 'Utbetalt'];
                  } else if (name === 'reservert') {
                    return [formatCurrency(value), 'Reservert'];
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
                dataKey="skader" 
                name="Antall skader" 
                fill={theme.palette.primary.main} 
                barSize={30} 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="right" 
                dataKey="utbetalt" 
                name="Utbetalt" 
                fill={theme.palette.success.main} 
                barSize={30}
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="right" 
                dataKey="reservert" 
                name="Reservert" 
                fill={theme.palette.warning.main} 
                barSize={30}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </SectionContainer>

      {/* Kundetype Statistics Table */}
      <SectionContainer title="Statistikk per kundetype" icon={BusinessIcon}>
        <ModernTable
          headers={[
            { label: 'Kundetype' },
            { label: 'Antall skader', align: 'right' },
            { label: 'Total utbetalt', align: 'right' },
            { label: 'Total reservert', align: 'right' },
            { label: 'Total regress', align: 'right' },
            { label: 'Gj.snitt per skade', align: 'right' }
          ]}
          data={[...data.KundetypeStatistikk, {
            Kundetype: 'Total',
            AntallSkader: data.TotaltAntallSkader,
            TotalUtbetalt: data.TotalUtbetalt,
            TotalReservert: data.TotalReservert,
            TotalRegress: data.TotalRegress,
            isTotal: true
          }]}
          renderRow={(row) => (
            <TableRow 
              key={row.Kundetype} 
              sx={{ 
                backgroundColor: row.isTotal ? alpha(theme.palette.primary.main, 0.05) : 'inherit',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                }
              }}
            >
              <TableCell 
                component="th" 
                scope="row" 
                sx={{ 
                  fontWeight: row.isTotal ? 700 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5
                }}
              >
                {!row.isTotal && (
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32,
                      bgcolor: `${theme.palette.primary.main}15`,
                      color: theme.palette.primary.main,
                      fontSize: '0.8rem'
                    }}
                  >
                    {row.Kundetype.substring(0, 1)}
                  </Avatar>
                )}
                {row.Kundetype}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: row.isTotal ? 700 : 400 }}>
                {formatNumber(row.AntallSkader)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: row.isTotal ? 700 : 400 }}>
                {formatCurrency(row.TotalUtbetalt)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: row.isTotal ? 700 : 400 }}>
                {formatCurrency(row.TotalReservert)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: row.isTotal ? 700 : 400 }}>
                {formatCurrency(row.TotalRegress || 0)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: row.isTotal ? 700 : 400 }}>
                {row.isTotal ? (
                  formatCurrency((row.TotalUtbetalt + row.TotalReservert) / row.AntallSkader)
                ) : (
                  <Chip 
                    label={formatCurrency((row.TotalUtbetalt + row.TotalReservert) / row.AntallSkader)}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.dark,
                      fontWeight: 500
                    }}
                  />
                )}
              </TableCell>
            </TableRow>
          )}
        />
      </SectionContainer>

      {/* Skadetype Statistics Table */}
      <SectionContainer title="Statistikk per skadetype" icon={InfoIcon}>
        <ModernTable
          headers={[
            { label: 'Skadetype' },
            { label: 'Antall skader', align: 'right' },
            { label: 'Total utbetalt', align: 'right' },
            { label: 'Total reservert', align: 'right' },
            { label: 'Gj.snitt per skade', align: 'right' }
          ]}
          data={data.SkadetypeStatistikk}
          renderRow={(row) => (
            <TableRow key={row.ClaimType}>
              <TableCell 
                component="th" 
                scope="row"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32,
                    bgcolor: `${theme.palette.warning.main}15`,
                    color: theme.palette.warning.main,
                    fontSize: '0.8rem'
                  }}
                >
                  {row.ClaimType.substring(0, 1)}
                </Avatar>
                {row.ClaimType}
              </TableCell>
              <TableCell align="right">{formatNumber(row.AntallSkader)}</TableCell>
              <TableCell align="right">{formatCurrency(row.TotalUtbetalt)}</TableCell>
              <TableCell align="right">{formatCurrency(row.TotalReservert)}</TableCell>
              <TableCell align="right">
                <Chip 
                  label={formatCurrency((row.TotalUtbetalt + row.TotalReservert) / row.AntallSkader)}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.dark,
                    fontWeight: 500
                  }}
                />
              </TableCell>
            </TableRow>
          )}
        />
      </SectionContainer>

      {/* Skade Details */}
      <SectionContainer title="Skadedetaljer" icon={ListAltIcon}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={detailsTab} 
            onChange={handleDetailsTabChange}
            sx={{
              '.MuiTabs-indicator': {
                backgroundColor: theme.palette.primary.main,
                height: 3,
                borderRadius: '3px 3px 0 0'
              },
              '.MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.9rem',
                minWidth: 100,
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                  fontWeight: 600
                }
              }
            }}
          >
            <Tab 
              label={`Åpne saker (${formatNumber(åpneSaker)})`} 
              icon={<ScheduleIcon fontSize="small" />} 
              iconPosition="start"
            />
            <Tab 
              label={`Avsluttede saker (${formatNumber(avsluttedeSaker)})`} 
              icon={<MonetizationOnIcon fontSize="small" />} 
              iconPosition="start"
            />
            <Tab 
              label={`Alle saker (${formatNumber(data.TotaltAntallSkader)})`} 
              icon={<ListAltIcon fontSize="small" />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>
        <ModernTable
          headers={[
            { label: 'Skadenr.' },
            { label: 'Navn' },
            { label: 'Type' },
            { label: 'Polise' },
            { label: 'Skadetype' },
            { label: 'Meldt dato' },
            { label: 'Reservert', align: 'right' },
            { label: 'Utbetalt', align: 'right' },
            { label: 'Status' }
          ]}
          data={skadeDetaljerData.filter(skade => {
            if (detailsTab === 0) return !skade.Skadeavsluttetdato; // Åpne saker
            if (detailsTab === 1) return skade.Skadeavsluttetdato; // Avsluttede saker
            return true; // Alle saker
          })}
          maxHeight={500}
          renderRow={(skade) => (
            <TableRow 
              key={skade.Skadenummer}
              sx={{
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                }
              }}
            >
              <TableCell>{skade.Skadenummer}</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32,
                      bgcolor: skade.ErBedriftskunde 
                        ? `${theme.palette.primary.main}15` 
                        : `${theme.palette.success.main}15`,
                      color: skade.ErBedriftskunde 
                        ? theme.palette.primary.main
                        : theme.palette.success.main,
                      fontSize: '0.8rem'
                    }}
                  >
                    {skade.ErBedriftskunde 
                      ? (skade.Bedriftsnavn?.substring(0, 1) || 'B') 
                      : (skade.Fornavn?.substring(0, 1) || 'P')}
                  </Avatar>
                  {skade.ErBedriftskunde 
                    ? skade.Bedriftsnavn 
                    : `${skade.Fornavn || ''} ${skade.Etternavn || ''}`}
                </Box>
              </TableCell>
              <TableCell>
                <Chip 
                  label={skade.ErBedriftskunde ? 'Bedrift' : 'Privat'}
                  size="small"
                  sx={{
                    bgcolor: skade.ErBedriftskunde 
                      ? alpha(theme.palette.primary.main, 0.1)
                      : alpha(theme.palette.success.main, 0.1),
                    color: skade.ErBedriftskunde 
                      ? theme.palette.primary.main
                      : theme.palette.success.main,
                    fontWeight: 500
                  }}
                />
              </TableCell>
              <TableCell>{skade.Polisenummer || 'N/A'}</TableCell>
              <TableCell>{skade.Skadetype}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TodayIcon sx={{ fontSize: 16, mr: 0.5, color: theme.palette.primary.main }} />
                  {skade.Skademeldtdato ? new Date(skade.Skademeldtdato).toLocaleDateString('nb-NO') : 'N/A'}
                </Box>
              </TableCell>
              <TableCell align="right">
                <Chip 
                  label={formatCurrency(skade.Skadereserve || 0)}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.dark,
                    fontWeight: 500
                  }}
                />
              </TableCell>
              <TableCell align="right">
                <Chip 
                  label={formatCurrency(skade.Utbetalt || 0)}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.dark,
                    fontWeight: 500
                  }}
                />
              </TableCell>
              <TableCell>
                <StatusChip status={skade.Skadestatus || 'Ukjent'} />
              </TableCell>
            </TableRow>
          )}
        />
      </SectionContainer>
    </Box>
  );
};

export default ModernSkadeReport;