import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Button,
    Container,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Tooltip,
    Paper,
    Divider,
    Grid,
} from '@mui/material';
import {
    Description as DescriptionIcon,
    Add as AddIcon,
    Edit as EditIcon,
    History as HistoryIcon,
    ArrowBack as ArrowBackIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Clear as ClearIcon
} from '@mui/icons-material';
import DrawingRuleEditor from './editor/DrawingRuleEditor';
import RuleViewer from './viewer/RuleViewer';
import authManager from '../../auth/AuthManager';

const DrawingRulesPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [rules, setRules] = useState([]);
    const [currentRule, setCurrentRule] = useState(null);
    const [title, setTitle] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [versions, setVersions] = useState([]);
    const [userRole, setUserRole] = useState('USER');
    const isAdmin = userRole === 'ADMIN';
    const isEditor = userRole === 'EDITOR';
    const canEdit = isAdmin || isEditor;
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [ruleToDelete, setRuleToDelete] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredRules, setFilteredRules] = useState([]);

    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const role = await authManager.getUserRole();
                setUserRole(role || 'USER');
            } catch (error) {
                console.error('Feil ved henting av brukerrolle:', error);
                setUserRole('USER');
            }
        };
        fetchUserRole();
        loadRules();
    }, []);

    useEffect(() => {
        if (slug) {
            loadRule(slug);
        }
    }, [slug]);

    useEffect(() => {
        if (rules.length > 0) {
            const filtered = rules.filter(rule => {
                const searchLower = searchQuery.toLowerCase();
                const titleMatch = rule.title.toLowerCase().includes(searchLower);
                const contentMatch = rule.content?.toLowerCase().includes(searchLower);
                return titleMatch || contentMatch;
            });
            setFilteredRules(filtered);
        } else {
            setFilteredRules([]);
        }
    }, [searchQuery, rules]);

    const loadRules = async () => {
        try {
            const rulesData = await window.electron.drawingRules.getAllRules();
            setRules(rulesData);
        } catch (error) {
            console.error('Feil ved lasting av tegningsregler:', error);
        }
    };

    const loadRule = async (ruleSlug, versionNumber = null) => {
        try {
            const rule = await window.electron.drawingRules.getRule({
                slug: ruleSlug,
                version: versionNumber
            });
            if (rule) {
                console.log('Lastet regel:', {
                    title: rule.title,
                    content: rule.content,
                    hasContent: !!rule.content
                });
                setCurrentRule(rule);
                setTitle(rule.title);
            }
        } catch (error) {
            console.error('Feil ved lasting av tegningsregel:', error);
        }
    };

    const handleNewRule = () => {
        setCurrentRule(null);
        setTitle('');
        setIsEditing(true);
    };

    const handleSave = async (title, content) => {
        try {
            const account = authManager.getCurrentAccount();
            const userEmail = account?.username || account?.email;

            if (!userEmail) {
                console.error('Ingen bruker funnet');
                return;
            }

            console.log('Lagrer innhold:', {
                isNew: !currentRule,
                title,
                content: content.substring(0, 100) + '...' // Logg bare starten av innholdet
            });

            let savedRule;
            if (currentRule) {
                savedRule = await window.electron.drawingRules.updateRule({
                    slug: currentRule.slug,
                    title,
                    content,
                    userEmail
                });
            } else {
                savedRule = await window.electron.drawingRules.createRule({
                    title,
                    content,
                    userEmail
                });
            }

            // Oppdater states i riktig rekkefølge
            setCurrentRule(savedRule);
            await loadRules(); // Last inn alle regler på nytt
            setIsEditing(false);

            // Naviger til den nye regelen hvis vi nettopp opprettet den
            if (!currentRule) {
                navigate(`/tegningsregler/${savedRule.slug}`);
            }
        } catch (error) {
            console.error('Feil ved lagring:', error);
        }
    };

    const loadVersionHistory = async () => {
        if (!currentRule) return;
        try {
            const versionData = await window.electron.drawingRules.getRuleVersions({
                slug: currentRule.slug
            });
            setVersions(versionData);
            setShowVersionHistory(true);
        } catch (error) {
            console.error('Feil ved lasting av versjonshistorikk:', error);
        }
    };

    const handleVersionSelect = async (version) => {
        try {
            await loadRule(currentRule.slug, version.version_number);
            setShowVersionHistory(false);
        } catch (error) {
            console.error('Feil ved lasting av versjon:', error);
        }
    };

    const handleEditClick = async () => {
        // Last regelen på nytt for å sikre at vi har siste versjon
        await loadRule(currentRule.slug);
        console.log('Starter redigering med innhold:', currentRule?.content);
        setIsEditing(true);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('nb-NO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDeleteClick = (rule, event) => {
        event.stopPropagation();
        setRuleToDelete(rule);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            await window.electron.drawingRules.deleteRule({ slug: ruleToDelete.slug });
            setDeleteDialogOpen(false);
            setRuleToDelete(null);
            await loadRules();
            if (currentRule?.slug === ruleToDelete.slug) {
                navigate('/tegningsregler');
            }
        } catch (error) {
            console.error('Feil ved sletting av tegningsregel:', error);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        if (!currentRule) {
            navigate('/tegningsregler');
        }
    };

    const handleBackClick = () => {
        if (isEditing) {
            handleCancel();
        } else {
            navigate('/tegningsregler');
        }
    };

    if (!slug && !isEditing) {
        return (
            <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
                {/* Header */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        mb: 3,
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                    }}
                >
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 2
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                                sx={{
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    p: 1,
                                    borderRadius: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <DescriptionIcon fontSize="large" />
                            </Box>
                            <Box>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 600,
                                        color: 'text.primary',
                                    }}
                                >
                                    Tegningsregler
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: 'text.secondary',
                                        mt: 0.5,
                                    }}
                                >
                                    Administrer tegningsregler for forsikringer
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: 300,
                                    p: '2px 4px',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                    },
                                    bgcolor: 'background.default'
                                }}
                            >
                                <SearchIcon sx={{ p: 1, color: 'text.secondary', fontSize: 36 }} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Søk i tegningsregler..."
                                    style={{
                                        border: 'none',
                                        outline: 'none',
                                        padding: '12px',
                                        width: '100%',
                                        background: 'none',
                                        fontSize: '1rem'
                                    }}
                                />
                                {searchQuery && (
                                    <IconButton
                                        size="medium"
                                        onClick={() => setSearchQuery('')}
                                        sx={{ mr: 0.5 }}
                                    >
                                        <ClearIcon sx={{ fontSize: 24 }} />
                                    </IconButton>
                                )}
                            </Paper>

                            {canEdit && (
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={handleNewRule}
                                    sx={{
                                        bgcolor: 'primary.main',
                                        '&:hover': {
                                            bgcolor: 'primary.dark',
                                        },
                                        textTransform: 'none',
                                    }}
                                >
                                    Ny tegningsregel
                                </Button>
                            )}
                        </Box>
                    </Box>

                    {/* Search Results Info */}
                    {searchQuery && (
                        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Fant {filteredRules.length} {filteredRules.length === 1 ? 'resultat' : 'resultater'}
                                {rules.length > 0 ? ` av ${rules.length}` : ''}
                            </Typography>
                            <Button
                                size="small"
                                onClick={() => setSearchQuery('')}
                                sx={{
                                    textTransform: 'none',
                                    color: 'text.secondary'
                                }}
                            >
                                Nullstill søk
                            </Button>
                        </Box>
                    )}
                </Paper>

                {/* Rules Grid */}
                <Box sx={{ display: 'grid', gap: 2 }}>
                    {(searchQuery ? filteredRules : rules).map((rule) => (
                        <Paper
                            key={`${rule.id}-${rule.last_updated_at}`}
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                                transition: 'all 0.2s ease-in-out',
                                cursor: 'pointer',
                                border: '1px solid',
                                borderColor: 'divider',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: 1,
                                    borderColor: 'primary.main',
                                }
                            }}
                            onClick={() => navigate(`/tegningsregler/${rule.slug}`)}
                        >
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start'
                            }}>
                                <Box sx={{ flex: 1, pr: 3 }}>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 500,
                                            color: 'text.primary',
                                            mb: 1
                                        }}
                                    >
                                        {rule.title}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            mb: 2
                                        }}
                                    >
                                        {rule.content ?
                                            rule.content
                                                .replace(/<[^>]*>/g, '') // Fjern HTML-tags
                                                .split(/\n+/) // Del opp i linjer
                                                .map(line => line.trim()) // Trim hver linje
                                                .filter(line => line.length > 0) // Fjern tomme linjer
                                                .join(' ') // Slå sammen med mellomrom
                                                .replace(/\s+/g, ' ') // Erstatt multiple mellomrom med ett mellomrom
                                                .trim() // Fjern whitespace i start og slutt
                                                .substring(0, 200) + '...'
                                            : 'Ingen beskrivelse'}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Sist oppdatert
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {formatDate(rule.last_updated_at)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            av {rule.last_updated_by_email || 'Ukjent'}
                                        </Typography>
                                    </Box>

                                    {isAdmin && (
                                        <IconButton
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClick(rule, e);
                                            }}
                                            sx={{
                                                color: 'error.main',
                                                '&:hover': {
                                                    bgcolor: 'error.lighter',
                                                }
                                            }}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>
                        </Paper>
                    ))}
                </Box>

                {/* Show message when no results */}
                {searchQuery && filteredRules.length === 0 && (
                    <Box
                        sx={{
                            textAlign: 'center',
                            py: 4,
                            color: 'text.secondary'
                        }}
                    >
                        <Typography variant="body1">
                            Ingen tegningsregler matcher søket "{searchQuery}"
                        </Typography>
                        <Button
                            onClick={() => setSearchQuery('')}
                            sx={{
                                mt: 2,
                                textTransform: 'none'
                            }}
                        >
                            Vis alle tegningsregler
                        </Button>
                    </Box>
                )}

                <Dialog
                    open={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                    PaperProps={{
                        sx: {
                            borderRadius: 2,
                            width: '100%',
                            maxWidth: 400
                        }
                    }}
                >
                    <DialogTitle sx={{ pb: 1 }}>Bekreft sletting</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Er du sikker på at du vil slette tegningsregelen "{ruleToDelete?.title}"?
                            Dette kan ikke angres.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, pt: 0 }}>
                        <Button
                            onClick={() => setDeleteDialogOpen(false)}
                            sx={{ textTransform: 'none' }}
                        >
                            Avbryt
                        </Button>
                        <Button
                            onClick={handleDeleteConfirm}
                            color="error"
                            variant="contained"
                            sx={{
                                textTransform: 'none',
                                borderRadius: 1
                            }}
                        >
                            Slett
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <IconButton
                        onClick={handleBackClick}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
                        {isEditing ? (currentRule ? 'Rediger' : 'Ny') + ' tegningsregel' : currentRule?.title}
                    </Typography>
                    {currentRule && !isEditing && (
                        <Box>
                            {canEdit && (
                                <Tooltip title="Rediger">
                                    <IconButton onClick={handleEditClick} sx={{ mr: 1 }}>
                                        <EditIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <Tooltip title="Versjonshistorikk">
                                <IconButton onClick={loadVersionHistory}>
                                    <HistoryIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}
                </Box>

                {isEditing ? (
                    <DrawingRuleEditor
                        initialContent={currentRule?.content}
                        onSave={handleSave}
                        title={title}
                        setTitle={setTitle}
                        key={currentRule?.id}
                        onCancel={handleCancel}
                    />
                ) : (
                    currentRule && (
                        <RuleViewer rule={currentRule} />
                    )
                )}

                <Dialog
                    open={showVersionHistory}
                    onClose={() => setShowVersionHistory(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>Versjonshistorikk</DialogTitle>
                    <DialogContent>
                        <List>
                            {versions.map((version) => (
                                <React.Fragment key={version.id}>
                                    <ListItem
                                        button
                                        onClick={() => handleVersionSelect(version)}
                                    >
                                        <ListItemText
                                            primary={`Versjon ${version.version_number}`}
                                            secondary={`Opprettet: ${formatDate(version.created_at)} av ${version.created_by_email}`}
                                        />
                                        {version.is_current && (
                                            <Typography variant="caption" color="primary">
                                                Gjeldende versjon
                                            </Typography>
                                        )}
                                    </ListItem>
                                    <Divider />
                                </React.Fragment>
                            ))}
                        </List>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowVersionHistory(false)}>Lukk</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Container>
    );
};

export default DrawingRulesPage; 