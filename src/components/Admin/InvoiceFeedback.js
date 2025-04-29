import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Button,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText,
    TextField,
    Box,
    Chip,
    FormControl,
    InputLabel,
    Alert,
    CircularProgress,
    IconButton,
    Grid,
    Card,
    CardContent,
    useTheme,
    Tooltip
} from '@mui/material';
import { format } from 'date-fns';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpIcon from '@mui/icons-material/Help';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PercentIcon from '@mui/icons-material/Percent';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import DescriptionIcon from '@mui/icons-material/Description';
import FeedbackIcon from '@mui/icons-material/Feedback';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import authManager from '../../auth/AuthManager';
import { useTheme as useMuiTheme } from '@mui/material/styles';

// Definer en enkel erstatning for useWindowSize hook
function useWindowSizeHook() {
    const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        const handleResize = () => {
            setSize({ width: window.innerWidth, height: window.innerHeight });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return [size, setSize];
}

function InvoiceFeedback() {
    const theme = useTheme();
    const muiTheme = useMuiTheme();
    const [userRole, setUserRole] = useState('USER');
    const [invoices, setInvoices] = useState([]);
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [openFeedbackDialog, setOpenFeedbackDialog] = useState(false);
    const [feedbackStatus, setFeedbackStatus] = useState('');
    const [feedbackDetails, setFeedbackDetails] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'success', 'error'
    const [buttonText, setButtonText] = useState('Lagre tilbakemelding');
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [deleteStatus, setDeleteStatus] = useState('idle'); // 'idle', 'deleting', 'success', 'error'
    const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
    const [deleteAllStatus, setDeleteAllStatus] = useState('idle'); // 'idle', 'deleting', 'success', 'error'
    const [windowSize, setWindowSize] = useWindowSizeHook();

    // Sjekk om brukeren er admin
    const isAdmin = userRole === 'ADMIN';

    // Hent brukerrollen fra authManager
    const fetchUserRole = async () => {
        try {
            const role = await authManager.getUserRole();
            setUserRole(role || 'USER');
        } catch (error) {
            console.error('Feil ved henting av brukerrolle:', error);
            setUserRole('USER');
        }
    };

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const response = await window.electron.invoice.getAllInvoices();
            if (response.success) {
                setInvoices(response.data);
                setFilteredInvoices(response.data);
                setError(null);
            } else {
                throw new Error(response.error || 'Kunne ikke hente fakturaer');
            }
        } catch (err) {
            console.error('Feil ved henting av fakturaer:', err);
            setError('Kunne ikke hente fakturaene: ' + (err.message || 'Ukjent feil'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Hent brukerens rolle ved oppstart
        fetchUserRole();
    }, []);

    // Hent fakturaer når brukerrollen er klar
    useEffect(() => {
        // Kun last fakturaer hvis brukeren er admin
        if (isAdmin) {
            fetchInvoices();
        }
    }, [isAdmin]);

    // Effekt som kjøres når saveStatus endres for å oppdatere UI
    useEffect(() => {
        console.log('saveStatus endret til:', saveStatus);

        if (saveStatus === 'idle') {
            setButtonText('Lagre tilbakemelding');
        } else if (saveStatus === 'saving') {
            setButtonText('Lagrer...');
        } else if (saveStatus === 'success') {
            setButtonText('Lagret!');
        } else if (saveStatus === 'error') {
            setButtonText('Prøv igjen');
        }
    }, [saveStatus]);

    const handleOpenFeedbackDialog = (invoice) => {
        setSelectedInvoice(invoice);
        setFeedbackStatus(invoice.feedback_status || '');
        setFeedbackDetails(invoice.feedback_details || '');
        setOpenFeedbackDialog(true);
    };

    const handleCloseFeedbackDialog = () => {
        // Ikke tillat lukking under lagring
        if (saveStatus === 'saving') {
            return;
        }

        setOpenFeedbackDialog(false);
        setSelectedInvoice(null);
        setFeedbackStatus('');
        setFeedbackDetails('');
        // Tilbakestill lagringsstatus når dialogen lukkes
        setSaveStatus('idle');
        // Fjern eventuelle feilmeldinger
        setError(null);
    };

    const handleSaveFeedback = async () => {
        console.log('handleSaveFeedback startet');
        if (!selectedInvoice) return;

        // Vis at vi jobber med lagringen
        setButtonText('Lagrer...');
        setSaveStatus('saving');
        setLoading(true);

        // Rens evt tidligere feilmelding
        setError(null);

        // Avklar hva som sendes til backend
        console.log('Sender tilbakemelding:', {
            invoiceId: selectedInvoice.id,
            feedbackStatus,
            feedbackDetails
        });

        // Sperre i tilfelle vi allerede har satt en status (skulle ikke skje, men sikkerhet først)
        if (saveStatus === 'success') {
            console.log('Lagringen har allerede lyktes, returnerer');
            return;
        }

        // Sjekk om invoice-objektet eksisterer
        if (!window.electron.invoice) {
            console.error('window.electron.invoice er ikke definert!');
            setError('Teknisk feil: invoice-API mangler');
            setSaveStatus('error');
            setButtonText('API mangler!');
            setLoading(false);
            return;
        }

        // Sjekk om saveFeedbackForInvoice-metoden eksisterer
        if (typeof window.electron.invoice.saveFeedbackForInvoice !== 'function') {
            console.error('window.electron.invoice.saveFeedbackForInvoice er ikke en funksjon!');
            setError('Teknisk feil: saveFeedbackForInvoice-metoden mangler');
            setSaveStatus('error');
            setButtonText('Funksjon mangler!');
            setLoading(false);
            return;
        }

        try {
            // Bruk timeout for å sikre at forespørselen ikke henger
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tidsavbrudd - ingen respons fra serveren')), 10000)
            );

            // Race mellom den faktiske forespørselen og timeout
            const response = await Promise.race([
                window.electron.invoice.saveFeedbackForInvoice(
                    selectedInvoice.id,
                    feedbackStatus,
                    feedbackDetails
                ),
                timeoutPromise
            ]);

            console.log('Respons fra backend:', response);

            if (response && response.success) {
                // UMIDDELBAR SYNLIG BEKREFTELSE - endre UI før noe annet
                setButtonText('Lagret!');
                setSaveStatus('success');
                setSuccessMessage(`Tilbakemelding lagret for faktura ${selectedInvoice.id}`);

                // Vis det heldekkende overlay med en gang
                setShowSuccessOverlay(true);

                // Oppdater listen med fakturaer i bakgrunnen
                fetchInvoices();

                // Hold overlayvisningen i 2 sekunder før lukking
                setTimeout(() => {
                    // Lukk dialogen
                    setOpenFeedbackDialog(false);
                    setSelectedInvoice(null);
                    setFeedbackStatus('');
                    setFeedbackDetails('');
                    setShowSuccessOverlay(false);

                    // Tilbakestill etter at dialogen er lukket
                    setTimeout(() => {
                        setSaveStatus('idle');
                        setButtonText('Lagre tilbakemelding');
                    }, 500);
                }, 2000);
            } else {
                // UMIDDELBAR SYNLIG FEILMELDING
                setButtonText('Feilet!');
                setSaveStatus('error');
                throw new Error((response && response.error) || 'Kunne ikke lagre tilbakemelding');
            }
        } catch (innerError) {
            console.error('Indre feil ved lagring:', innerError);
            setButtonText('Feilet!');
            setSaveStatus('error');
            setError(innerError.message || 'Ukjent feil ved lagring');
        } finally {
            setLoading(false);
        }
    };

    const getFeedbackStatusChip = (status, details) => {
        if (!status) return <Chip icon={<HelpIcon />} label="Ingen" size="small" />;

        if (status === 'correct') {
            return <Chip icon={<CheckCircleIcon />} label="Korrekt" color="success" size="small" />;
        } else if (status === 'incorrect') {
            return (
                <Tooltip
                    title={details ? `Feil: ${details}` : "Markert som feil"}
                    arrow
                    placement="top"
                >
                    <Chip icon={<ErrorIcon />} label="Feil" color="error" size="small" />
                </Tooltip>
            );
        }

        return <Chip label={status} size="small" />;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return format(new Date(dateString), 'dd.MM.yyyy HH:mm');
    };

    // Funksjon for å åpne og vise PDF
    const handleViewPdf = async (invoiceId, fileName) => {
        setPdfLoading(true);
        setError(null);

        try {
            console.log(`Henter PDF for faktura ID: ${invoiceId}`);

            if (!window.electron?.invoice?.getPdfForInvoice) {
                throw new Error('API for PDF-henting er ikke tilgjengelig');
            }

            const response = await window.electron.invoice.getPdfForInvoice(invoiceId);

            if (response.success && response.data) {
                console.log(`PDF hentet for faktura ID: ${invoiceId}, størrelse: ${response.data.length} bytes`);

                // Konverter base64 til blob
                const byteCharacters = atob(response.data);
                const byteArrays = [];

                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                    const slice = byteCharacters.slice(offset, offset + 512);

                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }

                    const byteArray = new Uint8Array(byteNumbers);
                    byteArrays.push(byteArray);
                }

                const blob = new Blob(byteArrays, { type: 'application/pdf' });

                // Åpne PDF-filen lokalt med system-applikasjonen
                if (window.electron?.pdf?.openPdf) {
                    const arrayBuffer = await blob.arrayBuffer();
                    console.log('Sender PDF-data til main process for å åpne i ekstern leser...');

                    const result = await window.electron.pdf.openPdf({
                        arrayBuffer,
                        fileName: fileName || `faktura-${invoiceId}.pdf`
                    });

                    if (result.success) {
                        console.log('PDF åpnet i ekstern leser via Electron');
                    } else {
                        throw new Error(`Kunne ikke åpne PDF: ${result.error}`);
                    }
                } else {
                    throw new Error('PDF åpner API er ikke tilgjengelig');
                }
            } else {
                throw new Error(response.error || 'Kunne ikke hente PDF-filen');
            }
        } catch (err) {
            console.error('Feil ved henting av PDF:', err);
            setError(`Kunne ikke hente PDF: ${err.message}`);
        } finally {
            setPdfLoading(false);
        }
    };

    // Beregn statistikk basert på invoice-data
    const calculateStatistics = () => {
        if (!invoices || invoices.length === 0) return null;

        const totalInvoices = invoices.length;
        const processedInvoices = invoices.filter(inv => inv.status === 'processed').length;
        const errorInvoices = invoices.filter(inv => inv.status === 'error').length;

        const withFeedback = invoices.filter(inv => inv.feedback_status).length;
        const correctFeedback = invoices.filter(inv => inv.feedback_status === 'correct').length;
        const incorrectFeedback = invoices.filter(inv => inv.feedback_status === 'incorrect').length;

        const withSkadeNummer = invoices.filter(inv => inv.skadenummer).length;
        const withRegNummer = invoices.filter(inv => inv.registreringsnummer).length;

        return {
            total: totalInvoices,
            processed: {
                count: processedInvoices,
                percent: totalInvoices ? Math.round((processedInvoices / totalInvoices) * 100) : 0
            },
            error: {
                count: errorInvoices,
                percent: totalInvoices ? Math.round((errorInvoices / totalInvoices) * 100) : 0
            },
            feedback: {
                total: withFeedback,
                percent: totalInvoices ? Math.round((withFeedback / totalInvoices) * 100) : 0,
                correct: {
                    count: correctFeedback,
                    percent: withFeedback ? Math.round((correctFeedback / withFeedback) * 100) : 0
                },
                incorrect: {
                    count: incorrectFeedback,
                    percent: withFeedback ? Math.round((incorrectFeedback / withFeedback) * 100) : 0
                }
            },
            fields: {
                skadeNummer: {
                    count: withSkadeNummer,
                    percent: processedInvoices ? Math.round((withSkadeNummer / processedInvoices) * 100) : 0
                },
                regNummer: {
                    count: withRegNummer,
                    percent: processedInvoices ? Math.round((withRegNummer / processedInvoices) * 100) : 0
                }
            }
        };
    };

    // StatCard komponent - inspirert av ShadcnDashboard
    const StatCard = ({ title, value, icon: Icon, color, percent, secondaryValue, secondaryLabel }) => {
        return (
            <Paper
                elevation={1}
                sx={{
                    height: '100%',
                    borderLeft: `4px solid ${color}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    '&:hover': {
                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
                        transform: 'translateY(-2px)'
                    }
                }}
            >
                <Box sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                            {title}
                        </Typography>
                        <Box
                            sx={{
                                bgcolor: `${color}15`,
                                color: color,
                                width: 36,
                                height: 36,
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
                        variant="h4"
                        sx={{
                            fontSize: '1.8rem',
                            fontWeight: 'bold',
                            mb: 1,
                            lineHeight: 1.2
                        }}
                    >
                        {value}
                    </Typography>

                    {percent !== undefined && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    bgcolor: 'rgba(16, 185, 129, 0.1)',
                                    mr: 1
                                }}
                            >
                                <ArrowUpwardIcon
                                    sx={{
                                        color: '#10B981',
                                        fontSize: 14
                                    }}
                                />
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.secondary }}>
                                {percent}%
                            </Typography>

                            {secondaryValue && (
                                <>
                                    <Typography variant="caption" color="text.secondary" sx={{ mx: 0.5 }}>•</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                        {secondaryLabel}: {secondaryValue}
                                    </Typography>
                                </>
                            )}
                        </Box>
                    )}
                </Box>
            </Paper>
        );
    };

    // Progress bar komponent
    const ProgressBar = ({ value, max, color }) => {
        const percentage = Math.min(100, Math.round((value / max) * 100));

        return (
            <Box sx={{ mt: 1, mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                        {percentage}%
                    </Typography>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary">
                        {value} / {max}
                    </Typography>
                </Box>
                <Box
                    sx={{
                        width: '100%',
                        bgcolor: 'rgba(0, 0, 0, 0.05)',
                        height: 8,
                        borderRadius: 1,
                        overflow: 'hidden'
                    }}
                >
                    <Box
                        sx={{
                            width: `${percentage}%`,
                            bgcolor: color,
                            height: '100%',
                            transition: 'width 0.8s ease-in-out'
                        }}
                    />
                </Box>
            </Box>
        );
    };

    // Statistikkkomponent
    const StatisticsOverview = () => {
        const stats = calculateStatistics();

        if (!stats) return null;

        return (
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AssessmentIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                        <Typography variant="h6" fontWeight={600}>
                            Fakturahåndtering - Statistikk og ytelse
                        </Typography>
                    </Box>

                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={fetchInvoices}
                        sx={{
                            borderRadius: '6px',
                            textTransform: 'none',
                            '&:hover': {
                                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)'
                            }
                        }}
                    >
                        Oppdater data
                    </Button>
                </Box>

                {/* First row - Summary cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={4}>
                        <StatCard
                            title="Totalt antall fakturaer"
                            value={stats.total}
                            icon={DescriptionIcon}
                            color={theme.palette.primary.main}
                            percent={100}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <StatCard
                            title="Med tilbakemelding"
                            value={stats.feedback.total}
                            icon={FeedbackIcon}
                            color={theme.palette.info.main}
                            percent={stats.feedback.percent}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <StatCard
                            title="Fakturafeil"
                            value={stats.error.count > 0 ? stats.error.count : stats.feedback.incorrect.count}
                            icon={ErrorIcon}
                            color={theme.palette.error.main}
                            percent={stats.error.count > 0 ? stats.error.percent : stats.feedback.incorrect.percent}
                        />
                    </Grid>
                </Grid>

                {/* Second row - Detailed analysis */}
                <Grid container spacing={2}>
                    {/* Feltgjenkjenning */}
                    <Grid item xs={12} md={6}>
                        <Paper
                            elevation={1}
                            sx={{
                                borderRadius: '8px',
                                p: 2.5,
                                height: '100%',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)'
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <DataUsageIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                                <Typography variant="h6" fontSize="1rem" fontWeight={600}>
                                    Feltgjenkjenning
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2">Skadenummer</Typography>
                                    <Chip
                                        label={`${stats.fields.skadeNummer.percent}%`}
                                        size="small"
                                        color={stats.fields.skadeNummer.percent > 70 ? "success" : "warning"}
                                    />
                                </Box>
                                <ProgressBar
                                    value={stats.fields.skadeNummer.count}
                                    max={stats.processed.count}
                                    color={theme.palette.success.main}
                                />
                            </Box>

                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2">Registreringsnummer</Typography>
                                    <Chip
                                        label={`${stats.fields.regNummer.percent}%`}
                                        size="small"
                                        color={stats.fields.regNummer.percent > 70 ? "success" : "warning"}
                                    />
                                </Box>
                                <ProgressBar
                                    value={stats.fields.regNummer.count}
                                    max={stats.processed.count}
                                    color={theme.palette.info.main}
                                />
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Tilbakemeldingsstatistikk */}
                    <Grid item xs={12} md={6}>
                        <Paper
                            elevation={1}
                            sx={{
                                borderRadius: '8px',
                                p: 2.5,
                                height: '100%',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)'
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <TrendingUpIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
                                <Typography variant="h6" fontSize="1rem" fontWeight={600}>
                                    Tilbakemeldingskvalitet
                                </Typography>
                            </Box>

                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                <Typography variant="h3" fontWeight="bold" color={theme.palette.success.main}>
                                    {stats.feedback.correct.percent}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    av tilbakemeldinger er korrekte
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Box sx={{ textAlign: 'center', flex: 1 }}>
                                    <Box sx={{
                                        bgcolor: `${theme.palette.success.main}20`,
                                        color: theme.palette.success.main,
                                        borderRadius: '50%',
                                        width: 36,
                                        height: 36,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto',
                                        mb: 1
                                    }}>
                                        <CheckCircleIcon />
                                    </Box>
                                    <Typography variant="h6">{stats.feedback.correct.count}</Typography>
                                    <Typography variant="caption" color="text.secondary">Korrekte</Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center', flex: 1 }}>
                                    <Box sx={{
                                        bgcolor: `${theme.palette.error.main}20`,
                                        color: theme.palette.error.main,
                                        borderRadius: '50%',
                                        width: 36,
                                        height: 36,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto',
                                        mb: 1
                                    }}>
                                        <ErrorIcon />
                                    </Box>
                                    <Typography variant="h6">{stats.feedback.incorrect.count}</Typography>
                                    <Typography variant="caption" color="text.secondary">Feilaktige</Typography>
                                </Box>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        );
    };

    // Funksjoner for sletting av faktura
    const handleDeleteClick = (invoice, e) => {
        e?.stopPropagation(); // Prevent row click
        setInvoiceToDelete(invoice);
        setDeleteDialogOpen(true);
        setError(null);
    };

    const closeDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setDeleteStatus('idle');
        // We'll clear the invoice to delete after a short delay to avoid UI flicker
        setTimeout(() => {
            setInvoiceToDelete(null);
            setError(null);
        }, 300);
    };

    const confirmDelete = async () => {
        if (!invoiceToDelete) return;

        try {
            setDeleteStatus('deleting');
            setError(null);

            // Make API call to delete the invoice
            const response = await window.electron.invoice.delete(invoiceToDelete.id);

            if (response.success) {
                // Remove the invoice from the state
                setInvoices(prevInvoices => prevInvoices.filter(inv => inv.id !== invoiceToDelete.id));
                setFilteredInvoices(prevInvoices => prevInvoices.filter(inv => inv.id !== invoiceToDelete.id));

                setDeleteStatus('success');
                closeDeleteDialog();
            } else {
                throw new Error(response.error || 'Kunne ikke slette fakturaen');
            }
        } catch (err) {
            console.error('Error deleting invoice:', err);
            setError(err.message || 'En feil oppstod under sletting av fakturaen');
            setDeleteStatus('error');
        }
    };

    const handleDeleteAllClick = () => {
        setDeleteAllDialogOpen(true);
        setError(null);
    };

    const closeDeleteAllDialog = () => {
        setDeleteAllDialogOpen(false);
        setDeleteAllStatus('idle');
        // Nullstill eventuelle feilmeldinger
        setError(null);
    };

    const confirmDeleteAll = async () => {
        try {
            setDeleteAllStatus('deleting');
            setError(null);

            // Lag en fiktiv API for å slette alle fakturaer
            if (!window.electron?.invoice?.deleteAll) {
                throw new Error('Sletting av alle fakturaer er ikke støttet i denne versjonen.');
            }

            // Gjør API-kall for å slette alle fakturaer
            const response = await window.electron.invoice.deleteAll();

            if (response.success) {
                // Tøm fakturalister
                setInvoices([]);
                setFilteredInvoices([]);

                setDeleteAllStatus('success');
                closeDeleteAllDialog();

                // Vis en suksessmelding
                setSuccessMessage('Alle fakturaer er slettet');

                // Fjern suksessmeldingen etter 3 sekunder
                setTimeout(() => {
                    setSuccessMessage('');
                }, 3000);
            } else {
                throw new Error(response.error || 'Kunne ikke slette fakturaene');
            }
        } catch (err) {
            console.error('Error deleting all invoices:', err);
            setError(err.message || 'En feil oppstod under sletting av fakturaene');
            setDeleteAllStatus('error');
        }
    };

    // Hvis ikke admin, vis ingenting
    if (!isAdmin) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Alert severity="warning">
                    Du har ikke tilgang til denne siden. Kun administratorer kan se fakturabehandling.
                </Alert>
            </Container>
        );
    }

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>Laster fakturaer...</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5">Fakturabehandling (Admin)</Typography>
                <Typography variant="body2" color="textSecondary">
                    Administrer fakturaer og gi tilbakemelding på data som er ekstrahert
                </Typography>
            </Box>

            {successMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}

            {/* Statistikkoversikt */}
            <StatisticsOverview />

            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Fakturaer</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button variant="outlined" onClick={fetchInvoices}>
                            Oppdater
                        </Button>
                        {isAdmin && invoices.length > 0 && (
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={handleDeleteAllClick}
                            >
                                Slett alle
                            </Button>
                        )}
                    </Box>
                </Box>

                {invoices.length === 0 ? (
                    <Alert severity="info">Ingen fakturaer funnet</Alert>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{
                                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                    '& th': { fontWeight: 'bold' }
                                }}>
                                    <TableCell>ID</TableCell>
                                    <TableCell>Filnavn</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Skadenummer</TableCell>
                                    <TableCell>Opplastet</TableCell>
                                    <TableCell>Tilbakemelding</TableCell>
                                    <TableCell>Handling</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {invoices.map((invoice) => (
                                    <TableRow
                                        key={invoice.id}
                                        sx={{
                                            '&:nth-of-type(odd)': {
                                                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'
                                            },
                                            '&:hover': {
                                                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                                                transition: 'background-color 0.2s'
                                            },
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => handleOpenFeedbackDialog(invoice)}
                                    >
                                        <TableCell>{invoice.id}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <DescriptionIcon sx={{ fontSize: 16, mr: 1, color: theme.palette.text.secondary }} />
                                                {invoice.file_name}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={invoice.status}
                                                color={invoice.status === 'processed' ? 'primary' :
                                                    invoice.status === 'error' ? 'error' : 'default'}
                                                size="small"
                                                sx={{ borderRadius: '4px', textTransform: 'capitalize' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {invoice.skadenummer ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <CheckCircleIcon sx={{ fontSize: 14, mr: 0.5, color: theme.palette.success.main }} />
                                                    {invoice.skadenummer}
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                    Ikke funnet
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>{formatDate(invoice.uploaded_at)}</TableCell>
                                        <TableCell>{getFeedbackStatusChip(invoice.feedback_status, invoice.feedback_details)}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Tooltip title="Åpne PDF">
                                                    <IconButton
                                                        color="primary"
                                                        size="small"
                                                        onClick={(e) => handleViewPdf(invoice.id, invoice.file_name)}
                                                        disabled={pdfLoading}
                                                    >
                                                        <PictureAsPdfIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Gi tilbakemelding">
                                                    <IconButton
                                                        color="secondary"
                                                        size="small"
                                                        onClick={() => handleOpenFeedbackDialog(invoice)}
                                                    >
                                                        <FeedbackIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                {isAdmin && (
                                                    <Tooltip title="Slett faktura">
                                                        <IconButton
                                                            color="error"
                                                            size="small"
                                                            onClick={(e) => handleDeleteClick(invoice, e)}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Dialog for å gi tilbakemelding */}
            <Dialog
                open={openFeedbackDialog}
                onClose={handleCloseFeedbackDialog}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    style: {
                        backgroundColor: 'white',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                        borderRadius: '12px',
                        overflow: 'hidden'
                    }
                }}
                BackdropProps={{
                    style: {
                        backgroundColor: 'rgba(0, 0, 0, 0.3)'
                    }
                }}
            >
                {/* Overlay for suksess-animasjon */}
                {showSuccessOverlay && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            zIndex: 9999,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 4,
                            animation: 'fadeIn 0.25s ease-in-out',
                            '@keyframes fadeIn': {
                                '0%': { opacity: 0 },
                                '100%': { opacity: 1 }
                            }
                        }}
                    >
                        <Box
                            sx={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                                width: '300px',
                                overflow: 'hidden',
                                animation: 'slideIn 0.4s ease-out',
                                '@keyframes slideIn': {
                                    '0%': { transform: 'translateY(30px)', opacity: 0 },
                                    '100%': { transform: 'translateY(0)', opacity: 1 }
                                }
                            }}
                        >
                            <Box
                                sx={{
                                    backgroundColor: theme.palette.success.main,
                                    py: 3,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: theme.palette.success.light,
                                        opacity: 0.3,
                                        zIndex: 0
                                    }}
                                />
                                <Box
                                    sx={{
                                        height: 60,
                                        width: 60,
                                        borderRadius: '50%',
                                        backgroundColor: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        zIndex: 1,
                                        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1)',
                                        animation: 'pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.1s both',
                                        '@keyframes pop': {
                                            '0%': { transform: 'scale(0)' },
                                            '80%': { transform: 'scale(1.1)' },
                                            '100%': { transform: 'scale(1)' }
                                        }
                                    }}
                                >
                                    <CheckCircleIcon
                                        sx={{
                                            fontSize: 34,
                                            color: theme.palette.success.main,
                                            animation: 'checkmark 0.3s ease-in-out 0.4s both',
                                            '@keyframes checkmark': {
                                                '0%': { transform: 'scale(0)', opacity: 0 },
                                                '100%': { transform: 'scale(1)', opacity: 1 }
                                            }
                                        }}
                                    />
                                </Box>
                            </Box>
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        mb: 1,
                                        fontWeight: 600,
                                        color: theme.palette.text.primary,
                                        animation: 'fadeUp 0.4s ease-out 0.2s both',
                                        '@keyframes fadeUp': {
                                            '0%': { transform: 'translateY(10px)', opacity: 0 },
                                            '100%': { transform: 'translateY(0)', opacity: 1 }
                                        }
                                    }}
                                >
                                    Lagret!
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                        animation: 'fadeUp 0.4s ease-out 0.3s both',
                                    }}
                                >
                                    Tilbakemeldingen ble lagret i systemet.
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                )}

                <DialogTitle>
                    Tilbakemelding på faktura
                    {selectedInvoice && <Typography variant="subtitle1" color="textSecondary">
                        {selectedInvoice.file_name} (ID: {selectedInvoice.id})
                    </Typography>}
                </DialogTitle>
                <DialogContent>
                    {selectedInvoice && (
                        <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
                                <Box>
                                    <Typography variant="subtitle2">Ekstraherte data:</Typography>
                                    <Typography><strong>Skadenummer:</strong> {selectedInvoice.skadenummer || '-'}</Typography>
                                    <Typography><strong>Registreringsnummer:</strong> {selectedInvoice.registreringsnummer || '-'}</Typography>
                                    <Typography><strong>KID:</strong> {selectedInvoice.kid || '-'}</Typography>
                                    <Typography><strong>Kontonummer:</strong> {selectedInvoice.kontonummer || '-'}</Typography>
                                </Box>
                                <Box>
                                    <Typography><strong>Beløp:</strong> {selectedInvoice.beloep ? `${selectedInvoice.beloep} kr` : '-'}</Typography>
                                    <Typography><strong>Mottaker:</strong> {selectedInvoice.mottaker_navn || '-'}</Typography>
                                    <Typography><strong>Adresse:</strong> {selectedInvoice.mottaker_adresse || '-'}</Typography>
                                </Box>
                            </Box>

                            {/* Vis eksisterende tilbakemeldingsdetaljer hvis de finnes */}
                            {selectedInvoice.feedback_status === 'incorrect' && selectedInvoice.feedback_details && (
                                <Box sx={{ mb: 3, mt: 1 }}>
                                    <Typography variant="subtitle2" color="error.main" gutterBottom>
                                        Eksisterende tilbakemelding om feil:
                                    </Typography>
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            backgroundColor: 'rgba(211, 47, 47, 0.05)',
                                            borderColor: 'rgba(211, 47, 47, 0.2)'
                                        }}
                                    >
                                        <Typography variant="body2">
                                            {selectedInvoice.feedback_details}
                                        </Typography>
                                    </Paper>
                                </Box>
                            )}

                            <FormControl fullWidth sx={{ mb: 3 }}>
                                <InputLabel>Tilbakemeldingsstatus</InputLabel>
                                <Select
                                    value={feedbackStatus}
                                    onChange={(e) => setFeedbackStatus(e.target.value)}
                                    label="Tilbakemeldingsstatus"
                                >
                                    <MenuItem value="">Velg status</MenuItem>
                                    <MenuItem value="correct">Korrekt</MenuItem>
                                    <MenuItem value="incorrect">Feil</MenuItem>
                                </Select>
                            </FormControl>

                            {feedbackStatus === 'incorrect' && (
                                <TextField
                                    label="Tilbakemeldingsdetaljer"
                                    multiline
                                    rows={4}
                                    value={feedbackDetails}
                                    onChange={(e) => setFeedbackDetails(e.target.value)}
                                    fullWidth
                                    helperText="Beskriv hvilke data som er feil og hva som er korrekt."
                                />
                            )}
                        </Box>
                    )}
                </DialogContent>
                <Box sx={{ mx: 3, mb: 2 }}>
                    {saveStatus === 'saving' && (
                        <Alert
                            severity="info"
                            variant="outlined"
                        >
                            <Typography variant="body2">Vennligst vent mens vi behandler forespørselen</Typography>
                        </Alert>
                    )}

                    {saveStatus === 'error' && (
                        <Alert
                            severity="error"
                            variant="outlined"
                        >
                            <Typography variant="body2">{error || 'En ukjent feil oppstod. Vennligst prøv igjen.'}</Typography>
                        </Alert>
                    )}
                </Box>
                <DialogActions>
                    <Button
                        onClick={handleCloseFeedbackDialog}
                        disabled={saveStatus === 'saving'}
                    >
                        {saveStatus === 'success' ? 'Lukk' : 'Avbryt'}
                    </Button>
                    <Button
                        onClick={handleSaveFeedback}
                        variant="contained"
                        disabled={
                            !feedbackStatus ||
                            (feedbackStatus === 'incorrect' && !feedbackDetails) ||
                            saveStatus === 'saving' ||
                            saveStatus === 'success'
                        }
                        style={{ backgroundColor: '#1976d2', color: 'white', fontWeight: 'bold' }}
                    >
                        {buttonText}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bekreftelsesdialog for sletting */}
            <Dialog
                open={deleteDialogOpen}
                onClose={closeDeleteDialog}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    Bekreft sletting
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Er du sikker på at du vil slette fakturaen
                        {invoiceToDelete ? ` "${invoiceToDelete.file_name}"` : ''}?
                        Dette kan ikke angres.
                    </DialogContentText>
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={closeDeleteDialog}
                        disabled={deleteStatus === 'deleting'}
                    >
                        Avbryt
                    </Button>
                    <Button
                        onClick={confirmDelete}
                        color="error"
                        autoFocus
                        disabled={deleteStatus === 'deleting'}
                        startIcon={deleteStatus === 'deleting' ? <CircularProgress size={20} /> : <DeleteIcon />}
                    >
                        {deleteStatus === 'deleting' ? 'Sletter...' : 'Slett faktura'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bekreftelsesdialog for sletting av alle fakturaer */}
            <Dialog
                open={deleteAllDialogOpen}
                onClose={closeDeleteAllDialog}
                aria-labelledby="alert-dialog-title-delete-all"
                aria-describedby="alert-dialog-description-delete-all"
            >
                <DialogTitle id="alert-dialog-title-delete-all">
                    Bekreft sletting av alle fakturaer
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description-delete-all">
                        Er du sikker på at du vil slette ALLE fakturaer fra systemet?
                        Dette vil fjerne {invoices.length} faktura{invoices.length !== 1 ? 'er' : ''} og kan ikke angres.
                    </DialogContentText>
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={closeDeleteAllDialog}
                        disabled={deleteAllStatus === 'deleting'}
                    >
                        Avbryt
                    </Button>
                    <Button
                        onClick={confirmDeleteAll}
                        color="error"
                        autoFocus
                        disabled={deleteAllStatus === 'deleting'}
                        startIcon={deleteAllStatus === 'deleting' ? <CircularProgress size={20} /> : <DeleteIcon />}
                    >
                        {deleteAllStatus === 'deleting' ? 'Sletter...' : 'Ja, slett alle fakturaer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default InvoiceFeedback; 