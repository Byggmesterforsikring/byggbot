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
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    History as HistoryIcon,
    ArrowBack as ArrowBackIcon,
    Delete as DeleteIcon,
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
            <Container maxWidth="lg">
                <Box sx={{ my: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Typography variant="h4">Tegningsregler</Typography>
                        {canEdit && (
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<AddIcon />}
                                onClick={handleNewRule}
                            >
                                Ny tegningsregel
                            </Button>
                        )}
                    </Box>
                    <List>
                        {rules.map((rule) => (
                            <ListItem
                                key={`${rule.id}-${rule.last_updated_at}`}
                                button
                                onClick={() => navigate(`/tegningsregler/${rule.slug}`)}
                                secondaryAction={
                                    isAdmin && (
                                        <IconButton
                                            edge="end"
                                            aria-label="slett"
                                            onClick={(e) => handleDeleteClick(rule, e)}
                                            color="error"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    )
                                }
                            >
                                <ListItemText
                                    primary={rule.title}
                                    secondary={
                                        <>
                                            {`Opprettet: ${formatDate(rule.created_at)} av ${rule.created_by_email || 'Ukjent'}`}
                                            <br />
                                            {`Sist oppdatert: ${formatDate(rule.last_updated_at)} av ${rule.last_updated_by_email || 'Ukjent'}`}
                                        </>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>

                    <Dialog
                        open={deleteDialogOpen}
                        onClose={() => setDeleteDialogOpen(false)}
                    >
                        <DialogTitle>Bekreft sletting</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                Er du sikker på at du vil slette tegningsregelen "{ruleToDelete?.title}"?
                                Dette kan ikke angres.
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteDialogOpen(false)}>Avbryt</Button>
                            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                                Slett
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Container>
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