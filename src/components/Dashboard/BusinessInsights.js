import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Alert, IconButton, Tooltip,
    LinearProgress, Skeleton
} from '@mui/material';
import { Button } from '../ui/button';
import {
    TrendingUp,
    TrendingDown,
    CheckCircle,
    Clock,
    Banknote,
    Building2,
    MapPin,
    RefreshCw,
    BarChart3,
    Users,
    Calendar,
    Activity
} from 'lucide-react';
import { useTheme } from '@mui/material/styles';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend
} from 'recharts';


function BusinessInsights() {
    const theme = useTheme();
    const [skadeData, setSkadeData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [activeChart, setActiveChart] = useState('monthly');

    // Hent siste 3 måneder
    const getLast3Months = () => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 3);

        const formatDate = (date) => {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        return {
            startDate: formatDate(startDate),
            endDate: formatDate(endDate)
        };
    };

    const fetchBusinessData = async () => {
        setLoading(true);
        setError(null);

        try {
            const { startDate, endDate } = getLast3Months();

            const result = await window.electron.dashboard.fetchStats({
                reportName: 'API_Byggbot_skaderapport',
                StartDate: startDate,
                EndDate: endDate
            });

            if (result.error) {
                throw new Error(result.error);
            }

            setSkadeData(result);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Feil ved henting av business data:', err);
            setError('Kunne ikke hente skadedata');

            // Mock data for development
            const mockData = {
                TotaltAntallSkader: 387,
                TotalUtbetalt: 12450000,
                TotalReservert: 3200000,
                MånedsStatistikk: [
                    { År: 2024, Måned: 12, AntallSkader: 145, TotalUtbetalt: 4200000, TotalReservert: 1100000 },
                    { År: 2025, Måned: 1, AntallSkader: 128, TotalUtbetalt: 3800000, TotalReservert: 1200000 },
                    { År: 2025, Måned: 2, AntallSkader: 114, TotalUtbetalt: 4450000, TotalReservert: 900000 }
                ],
                SkadetypeStatistikk: [
                    { ClaimType: "Autoskade", AntallSkader: 215, TotalUtbetalt: 7234156, TotalReservert: 1200000 },
                    { ClaimType: "Tingskade", AntallSkader: 98, TotalUtbetalt: 3100000, TotalReservert: 890000 },
                    { ClaimType: "Personskade", AntallSkader: 74, TotalUtbetalt: 2115844, TotalReservert: 1110000 }
                ],
                SkadeDetaljer: [
                    {
                        Skadenummer: 12345,
                        Hendelsesdato: "2024-12-15",
                        Skademeldtdato: "2024-12-20",
                        Skadeavsluttetdato: null,
                        Regressstatus: "Ikke vurdert",
                        Poststed: "OSLO"
                    },
                    {
                        Skadenummer: 12346,
                        Hendelsesdato: "2024-11-10",
                        Skademeldtdato: "2024-11-25",
                        Skadeavsluttetdato: "2024-12-01",
                        Regressstatus: "Vurdert",
                        Poststed: "BERGEN"
                    }
                ]
            };
            setSkadeData(mockData);
            setLastUpdated(new Date());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBusinessData();
    }, []);

    // Business calculations
    const calculateBusinessMetrics = () => {
        if (!skadeData?.SkadeDetaljer) return {};

        // Filtrer ut feilregistrerte saker
        const gyldigeSkader = skadeData.SkadeDetaljer.filter(s =>
            s.Skadestatus !== "Feilregistrert"
        );
        const måneder = skadeData.MånedsStatistikk || [];

        // Sakesstatus analyse
        const lukkede = gyldigeSkader.filter(s => s.Skadeavsluttetdato).length;
        const åpne = gyldigeSkader.filter(s => !s.Skadeavsluttetdato).length;
        const feilregistrerte = skadeData.SkadeDetaljer.filter(s => s.Skadestatus === "Feilregistrert").length;
        const behandlingsrate = gyldigeSkader.length > 0 ? ((lukkede / gyldigeSkader.length) * 100).toFixed(1) : 0;

        // Rapporteringstid analyse (kun gyldige saker)
        const rapporteringstider = gyldigeSkader
            .filter(s => s.Hendelsesdato && s.Skademeldtdato)
            .map(s => {
                const hendelse = new Date(s.Hendelsesdato);
                const meldt = new Date(s.Skademeldtdato);
                return Math.ceil((meldt - hendelse) / (1000 * 60 * 60 * 24));
            });

        const avgRapporteringstid = rapporteringstider.length > 0
            ? (rapporteringstider.reduce((a, b) => a + b, 0) / rapporteringstider.length).toFixed(1)
            : 0;

        const forsinket14 = rapporteringstider.filter(t => t > 14).length;

        // Regress performance (kun gyldige saker)
        const ikkevurdertRegress = gyldigeSkader.filter(s => s.Regressstatus === "Ikke vurdert").length;

        // Geografisk analyse (kun gyldige saker)
        const geografisk = {};
        gyldigeSkader.forEach(s => {
            if (s.Poststed) {
                geografisk[s.Poststed] = (geografisk[s.Poststed] || 0) + 1;
            }
        });
        const toppSteder = Object.entries(geografisk)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        // Månedlige trends - smart beregning som unngår "inneværende måned"-problemet
        const sorterteMåneder = måneder.sort((a, b) => (a.År - b.År) || (a.Måned - b.Måned));
        let skaderTrend = null;
        let utbetaltTrend = null;

        if (sorterteMåneder.length >= 2) {
            const iDag = new Date();
            const inneværendeMåned = iDag.getMonth() + 1; // 1-12
            const inneværendeÅr = iDag.getFullYear();
            const dagIkkeværendeMåned = iDag.getDate();

            // Finn siste HELE måned og forrige hele måned
            let sisteMåned = null;
            let forrigeMåned = null;

            // Hvis vi er tidlig i måneden (første 5 dager), sammenlign de to forrige hele månedene
            if (dagIkkeværendeMåned <= 5) {
                // Sammenlign forrige måned vs måned før det
                const fulleMåneder = sorterteMåneder.filter(m =>
                    !(m.År === inneværendeÅr && m.Måned === inneværendeMåned)
                );

                if (fulleMåneder.length >= 2) {
                    sisteMåned = fulleMåneder[fulleMåneder.length - 1];
                    forrigeMåned = fulleMåneder[fulleMåneder.length - 2];
                }
            } else {
                // Etter dag 5 i måneden, bruk inneværende vs forrige
                sisteMåned = sorterteMåneder.find(m => m.År === inneværendeÅr && m.Måned === inneværendeMåned);
                forrigeMåned = sorterteMåneder[sorterteMåneder.length - 2];

                // Prorata-justér inneværende måned til hele måned
                if (sisteMåned) {
                    const dagerIMåned = new Date(inneværendeÅr, inneværendeMåned, 0).getDate();
                    const justeringsFaktor = dagerIMåned / dagIkkeværendeMåned;

                    sisteMåned = {
                        ...sisteMåned,
                        AntallSkader: Math.round(sisteMåned.AntallSkader * justeringsFaktor),
                        TotalUtbetalt: sisteMåned.TotalUtbetalt * justeringsFaktor
                    };
                }
            }

            if (sisteMåned && forrigeMåned) {
                // Trend for antall skader
                const skaderEndring = sisteMåned.AntallSkader - forrigeMåned.AntallSkader;
                skaderTrend = {
                    percent: forrigeMåned.AntallSkader > 0 ?
                        Math.round((skaderEndring / forrigeMåned.AntallSkader) * 100) : 0,
                    value: skaderEndring
                };

                // Trend for utbetalt
                const utbetaltEndring = sisteMåned.TotalUtbetalt - forrigeMåned.TotalUtbetalt;
                utbetaltTrend = {
                    percent: forrigeMåned.TotalUtbetalt > 0 ?
                        Math.round((utbetaltEndring / forrigeMåned.TotalUtbetalt) * 100) : 0,
                    value: utbetaltEndring
                };
            }
        }

        // Beregn trend for Total Reservert fra månedlig data
        let reservertTrend = null;
        if (sorterteMåneder.length >= 2) {
            let sisteMånedRes = null;
            let forrigeMånedRes = null;

            if (new Date().getDate() <= 5) {
                // Sammenlign to hele måneder
                const fulleMåneder = sorterteMåneder.filter(m =>
                    !(m.År === new Date().getFullYear() && m.Måned === (new Date().getMonth() + 1))
                );
                if (fulleMåneder.length >= 2) {
                    sisteMånedRes = fulleMåneder[fulleMåneder.length - 1];
                    forrigeMånedRes = fulleMåneder[fulleMåneder.length - 2];
                }
            } else {
                // Bruk justert inneværende måned
                const inneværende = sorterteMåneder.find(m =>
                    m.År === new Date().getFullYear() && m.Måned === (new Date().getMonth() + 1)
                );
                if (inneværende) {
                    const dagerIMåned = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
                    const justeringsFaktor = dagerIMåned / new Date().getDate();

                    sisteMånedRes = {
                        ...inneværende,
                        TotalReservert: inneværende.TotalReservert * justeringsFaktor
                    };
                    forrigeMånedRes = sorterteMåneder[sorterteMåneder.length - 2];
                }
            }

            if (sisteMånedRes && forrigeMånedRes) {
                const reservertEndring = sisteMånedRes.TotalReservert - forrigeMånedRes.TotalReservert;
                reservertTrend = {
                    percent: forrigeMånedRes.TotalReservert > 0 ?
                        Math.round((reservertEndring / forrigeMånedRes.TotalReservert) * 100) : 0,
                    value: reservertEndring
                };
            }
        }

        return {
            behandlingsrate,
            lukkede,
            åpne,
            feilregistrerte,
            avgRapporteringstid,
            forsinket14,
            ikkevurdertRegress,
            toppSteder,
            totaleSkader: gyldigeSkader.length,
            skaderTrend,
            utbetaltTrend,
            reservertTrend
        };
    };

    const metrics = calculateBusinessMetrics();

    // Chart options - samme som TidsserieAnalyse + produkter
    const chartOptions = [
        { key: 'monthly', label: 'Månedlig trend', icon: Activity, color: '#7c3aed' },
        { key: 'damage_types', label: 'Skadetyper', icon: BarChart3, color: '#ef4444' },
        { key: 'products', label: 'Produkter', icon: Building2, color: '#10b981' },
        { key: 'combined', label: 'Kombinert', icon: TrendingUp, color: '#f59e0b' }
    ];

    // Helper functions
    const getMonthName = (monthNum) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
        return months[monthNum - 1] || monthNum;
    };

    const formatCurrency = (num) => {
        return new Intl.NumberFormat('nb-NO', {
            style: 'currency',
            currency: 'NOK',
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        }).format(num);
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('nb-NO').format(num);
    };

    // StatCard komponent - samme som Dashboard
    const StatCard = ({ title, value, icon: Icon, color, formatter = (val) => val, suffix = "", trend, trendValue, subtitle }) => {
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
                            <Icon size={20} />
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
                                {trend > 0 ? (
                                    <TrendingUp style={{ color: '#10B981', width: 14, height: 14 }} />
                                ) : (
                                    <TrendingDown style={{ color: '#EF4444', width: 14, height: 14 }} />
                                )}
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

                                {trendValue !== null && (
                                    <>
                                        <Typography variant="caption" color="text.secondary" sx={{ mx: 0.5 }}>•</Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                            {(trendValue > 0 ? '+' : '')}{formatter(Math.abs(trendValue))}{suffix}
                                        </Typography>
                                    </>
                                )}

                                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, fontSize: '0.7rem' }}>
                                    {new Date().getDate() <= 5 ? 'vs tidligere måneder' : 'vs forrige måned (justert)'}
                                </Typography>
                            </Box>
                        </Box>
                    ) : subtitle ? (
                        <Typography variant="caption" color="text.secondary">
                            {subtitle}
                        </Typography>
                    ) : (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontStyle: 'italic', display: 'block', mt: 1 }}
                        >
                            {new Date().getDate() <= 5
                                ? 'Trend: sammenligner hele måneder'
                                : 'Trend: pro-rata justert for inneværende måned'
                            }
                        </Typography>
                    )}
                </Box>
            </Paper>
        );
    };

    // Chart render functions - med smart pro-rata justering
    const renderMonthlyChart = () => {
        if (!skadeData?.MånedsStatistikk || skadeData.MånedsStatistikk.length === 0) return null;

        const iDag = new Date();
        const inneværendeMåned = iDag.getMonth() + 1;
        const inneværendeÅr = iDag.getFullYear();
        const dagIkkeværendeMåned = iDag.getDate();

        const chartData = skadeData.MånedsStatistikk.map(m => {
            const erInneværendeMåned = m.År === inneværendeÅr && m.Måned === inneværendeMåned;
            let justert = false;
            let skader = m.AntallSkader;

            // Pro-rata justér hvis vi er etter dag 5 i måneden
            if (erInneværendeMåned && dagIkkeværendeMåned > 5) {
                const dagerIMåned = new Date(inneværendeÅr, inneværendeMåned, 0).getDate();
                const justeringsFaktor = dagerIMåned / dagIkkeværendeMåned;
                skader = Math.round(m.AntallSkader * justeringsFaktor);
                justert = true;
            }

            // Fjern inneværende måned helt hvis vi er i første 5 dager
            if (erInneværendeMåned && dagIkkeværendeMåned <= 5) {
                return null;
            }

            return {
                navn: `${getMonthName(m.Måned)} ${m.År}${justert ? ' (est)' : ''}`,
                skader: skader,
                erJustert: justert
            };
        }).filter(Boolean); // Fjern null-verdier

        return (
            <ResponsiveContainer width="100%" height={400}>
                <AreaChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="navn"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                    />
                    <YAxis
                        label={{ value: 'Antall skader', angle: -90, position: 'insideLeft' }}
                    />
                    <RechartsTooltip
                        formatter={(value, name, props) => {
                            const erJustert = props.payload?.erJustert;
                            return [`${formatNumber(value)} skader${erJustert ? ' (estimert)' : ''}`, 'Antall skader'];
                        }}
                        labelFormatter={(label) => `Periode: ${label}`}
                    />
                    <Area
                        type="monotone"
                        dataKey="skader"
                        stroke="#7c3aed"
                        fill="#7c3aed"
                        fillOpacity={0.3}
                        strokeDasharray={chartData.some(d => d.erJustert) ? "5 5" : "0"}
                    />
                </AreaChart>
            </ResponsiveContainer>
        );
    };

    const renderDamageTypesChart = () => {
        if (!skadeData?.SkadetypeStatistikk || skadeData.SkadetypeStatistikk.length === 0) return null;

        return (
            <ResponsiveContainer width="100%" height={400}>
                <BarChart
                    data={skadeData.SkadetypeStatistikk.map(s => ({
                        navn: s.ClaimType,
                        antall: s.AntallSkader
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="navn"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                    />
                    <YAxis
                        label={{ value: 'Antall skader', angle: -90, position: 'insideLeft' }}
                    />
                    <RechartsTooltip
                        formatter={(value) => [`${formatNumber(value)} skader`, 'Antall skader']}
                        labelFormatter={(label) => `Skadetype: ${label}`}
                    />
                    <Bar
                        dataKey="antall"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        );
    };

    const renderProductsChart = () => {
        if (!skadeData?.SkadeDetaljer || skadeData.SkadeDetaljer.length === 0) return null;

        // Filtrer ut feilregistrerte og grupper på produktnavn
        const gyldigeSkader = skadeData.SkadeDetaljer.filter(s =>
            s.Skadestatus !== "Feilregistrert" && s.Produktnavn
        );

        // Grupper på produktnavn og summer utbetalinger
        const produkter = {};
        gyldigeSkader.forEach(s => {
            const produktNavn = s.Produktnavn || 'Ukjent produkt';
            if (!produkter[produktNavn]) {
                produkter[produktNavn] = {
                    navn: produktNavn,
                    antallSkader: 0,
                    totalUtbetalt: 0
                };
            }
            produkter[produktNavn].antallSkader++;
            produkter[produktNavn].totalUtbetalt += parseFloat(s.Utbetalt) || 0;
        });

        // Sorter etter total utbetalt og ta topp 10
        const sortedProdukter = Object.values(produkter)
            .sort((a, b) => b.totalUtbetalt - a.totalUtbetalt)
            .slice(0, 10);

        if (sortedProdukter.length === 0) return null;

        return (
            <ResponsiveContainer width="100%" height={400}>
                <BarChart
                    data={sortedProdukter.map(p => ({
                        navn: p.navn.length > 25 ? p.navn.substring(0, 25) + '...' : p.navn,
                        utbetalt: p.totalUtbetalt / 1000000, // Mill. NOK
                        antall: p.antallSkader,
                        fullNavn: p.navn
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="navn"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={11}
                    />
                    <YAxis
                        label={{ value: 'Mill. NOK utbetalt', angle: -90, position: 'insideLeft' }}
                    />
                    <RechartsTooltip
                        formatter={(value, name, props) => {
                            if (name === 'utbetalt') {
                                return [`${formatNumber(value)} mill. NOK`, 'Total utbetalt'];
                            }
                            return [formatNumber(value), name];
                        }}
                        labelFormatter={(label, payload) => {
                            if (payload && payload[0] && payload[0].payload) {
                                const data = payload[0].payload;
                                return `Produkt: ${data.fullNavn} (${data.antall} skader)`;
                            }
                            return `Produkt: ${label}`;
                        }}
                    />
                    <Bar
                        dataKey="utbetalt"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        );
    };



    const renderCombinedChart = () => {
        if (!skadeData?.MånedsStatistikk || skadeData.MånedsStatistikk.length === 0) return null;

        const iDag = new Date();
        const inneværendeMåned = iDag.getMonth() + 1;
        const inneværendeÅr = iDag.getFullYear();
        const dagIkkeværendeMåned = iDag.getDate();

        const chartData = skadeData.MånedsStatistikk.map(m => {
            const erInneværendeMåned = m.År === inneværendeÅr && m.Måned === inneværendeMåned;
            let justert = false;
            let premie = m.TotalUtbetalt / 1000000;
            let skadebeløp = m.TotalReservert / 1000000;
            let skadeProsent = m.AntallSkader;

            // Pro-rata justér hvis vi er etter dag 5 i måneden
            if (erInneværendeMåned && dagIkkeværendeMåned > 5) {
                const dagerIMåned = new Date(inneværendeÅr, inneværendeMåned, 0).getDate();
                const justeringsFaktor = dagerIMåned / dagIkkeværendeMåned;

                premie = premie * justeringsFaktor;
                skadebeløp = skadebeløp * justeringsFaktor;
                skadeProsent = Math.round(skadeProsent * justeringsFaktor);
                justert = true;
            }

            // Fjern inneværende måned helt hvis vi er i første 5 dager
            if (erInneværendeMåned && dagIkkeværendeMåned <= 5) {
                return null;
            }

            return {
                navn: `${getMonthName(m.Måned)} ${m.År}${justert ? ' (est)' : ''}`,
                premie: premie,
                skadebeløp: skadebeløp,
                skadeProsent: skadeProsent,
                erJustert: justert
            };
        }).filter(Boolean);

        return (
            <ResponsiveContainer width="100%" height={400}>
                <ComposedChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="navn"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                    />
                    <YAxis
                        yAxisId="left"
                        label={{ value: 'Mill. NOK', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{ value: 'Antall skader', angle: 90, position: 'insideRight' }}
                    />
                    <RechartsTooltip
                        formatter={(value, name, props) => {
                            const erJustert = props.payload?.erJustert;
                            if (name === 'Premie') return [`${formatNumber(value)} mill. NOK${erJustert ? ' (est)' : ''}`, name];
                            if (name === 'Skadeutbetalinger') return [`${formatNumber(value)} mill. NOK${erJustert ? ' (est)' : ''}`, name];
                            if (name === 'Antall skader') return [`${formatNumber(value)} skader${erJustert ? ' (est)' : ''}`, name];
                            return [formatNumber(value), name];
                        }}
                        labelFormatter={(label) => `Måned: ${label}`}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="premie" fill="#10b981" name="Premie" />
                    <Bar yAxisId="left" dataKey="skadebeløp" fill="#ef4444" name="Skadeutbetalinger" />
                    <Line yAxisId="right" type="monotone" dataKey="skadeProsent" stroke="#7c3aed" strokeWidth={3} name="Antall skader" />
                </ComposedChart>
            </ResponsiveContainer>
        );
    };

    const renderActiveChart = () => {
        switch (activeChart) {
            case 'monthly':
                return renderMonthlyChart();
            case 'damage_types':
                return renderDamageTypesChart();
            case 'products':
                return renderProductsChart();
            case 'combined':
                return renderCombinedChart();
            default:
                return renderMonthlyChart();
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h6" fontWeight={600}>
                        Skadestatistikk siste 3 måneder
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {lastUpdated && `Oppdatert ${lastUpdated.toLocaleDateString('nb-NO')}`}
                    </Typography>
                </Box>

                <Tooltip title="Oppdater data">
                    <IconButton onClick={fetchBusinessData} disabled={loading} size="small">
                        <RefreshCw />
                    </IconButton>
                </Tooltip>
            </Box>

            {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            {error && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {error} (viser demo-data)
                </Alert>
            )}

            {skadeData && (
                <>
                    {/* Core Business KPIer */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                        <StatCard
                            title="Totale skader (3 mnd)"
                            value={metrics.totaleSkader}
                            icon={BarChart3}
                            color="#7c3aed"
                            formatter={formatNumber}
                            trend={metrics.skaderTrend?.percent}
                            trendValue={metrics.skaderTrend?.value}
                            subtitle={`${metrics.feilregistrerte} feilregistrerte ekskludert`}
                        />

                        <StatCard
                            title="Utbetalt totalt"
                            value={skadeData.TotalUtbetalt || 0}
                            icon={Banknote}
                            color="#10b981"
                            formatter={formatCurrency}
                            trend={metrics.utbetaltTrend?.percent}
                            trendValue={metrics.utbetaltTrend?.value}
                        />

                        <StatCard
                            title="Gj.snitt rapporteringstid"
                            value={`${metrics.avgRapporteringstid} dager`}
                            icon={Clock}
                            color="#f59e0b"
                            subtitle={`${metrics.forsinket14} saker over 14 dager`}
                        />

                        <StatCard
                            title="Regress ikke vurdert"
                            value={metrics.ikkevurdertRegress}
                            icon={Users}
                            color="#ef4444"
                            subtitle="Saker uten regress-vurdering"
                        />
                    </Box>

                    {/* Sekundær info */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
                        <StatCard
                            title="Åpne saker"
                            value={metrics.åpne}
                            icon={Clock}
                            color="#f59e0b"
                            formatter={formatNumber}
                            subtitle={`${metrics.lukkede} lukkede, ${metrics.totaleSkader > 0 ? ((metrics.lukkede / metrics.totaleSkader) * 100).toFixed(1) : 0}% behandlingsrate`}
                        />

                        <StatCard
                            title="Total reservert"
                            value={skadeData.TotalReservert || 0}
                            icon={Building2}
                            color="#06b6d4"
                            formatter={formatCurrency}
                            trend={metrics.reservertTrend?.percent}
                            trendValue={metrics.reservertTrend?.value}
                        />
                    </Box>

                    {/* Tidsserieanalyse - eksakt samme stil som Kundeanalyse */}
                    <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Calendar className="h-5 w-5" />
                                Tidsserieanalyse
                            </Typography>

                            {/* Pro-rata forklaring */}
                            <Tooltip
                                title={
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                                            Pro-rata beregning
                                        </Typography>
                                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                                            🗓️ <strong>Dag 1-5:</strong> Sammenligner kun hele måneder
                                        </Typography>
                                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                                            📊 <strong>Dag 6+:</strong> Justerer inneværende måned til hel måned
                                        </Typography>
                                        <Typography variant="caption" sx={{ display: 'block' }}>
                                            📈 F.eks: 2 dager × (30 dager / 2) = estimert hele måned
                                        </Typography>
                                    </Box>
                                }
                                arrow
                            >
                                <Box sx={{
                                    bgcolor: 'rgba(124, 58, 237, 0.1)',
                                    borderRadius: '50%',
                                    width: 28,
                                    height: 28,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'help'
                                }}>
                                    <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 600 }}>
                                        ?
                                    </Typography>
                                </Box>
                            </Tooltip>
                        </Box>

                        {/* Chart selection buttons */}
                        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                            {chartOptions.map((option) => {
                                const Icon = option.icon;
                                const isActive = activeChart === option.key;
                                return (
                                    <Button
                                        key={option.key}
                                        variant={isActive ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setActiveChart(option.key)}
                                        className="flex items-center gap-2"
                                        style={isActive ? {
                                            backgroundColor: option.color,
                                            borderColor: option.color,
                                            color: '#fff',
                                        } : {}}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {option.label}
                                    </Button>
                                );
                            })}
                        </Box>

                        {/* Render active chart */}
                        <Box sx={{ width: '100%', height: 400 }}>
                            {renderActiveChart()}
                        </Box>
                    </Paper>
                </>
            )}
        </Box>
    );
}

export default BusinessInsights;