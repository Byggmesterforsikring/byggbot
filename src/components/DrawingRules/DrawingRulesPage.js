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
import ModernRulesList from './components/ModernRulesList';
import ModernRuleDetail from './components/ModernRuleDetail';
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
                contentLength: content.length,
                userEmail
            });

            let savedRule;
            if (currentRule) {
                // Oppdaterer eksisterende regel
                console.log('Oppdaterer eksisterende regel:', currentRule.slug);
                savedRule = await window.electron.drawingRules.updateRule({
                    slug: currentRule.slug,
                    title,
                    content,
                    userEmail
                });

                // Oppdater states i riktig rekkefølge
                setCurrentRule(savedRule);
                await loadRules(); // Last inn alle regler på nytt
                setIsEditing(false);
            } else {
                // Oppretter ny regel
                console.log('Oppretter ny tegningsregel med data:', {
                    title,
                    contentLength: content.length,
                    userEmail
                });

                try {
                    savedRule = await window.electron.drawingRules.createRule({
                        title,
                        content,
                        userEmail
                    });
                    console.log('Ny regel opprettet:', savedRule);

                    // Oppdater states i riktig rekkefølge
                    setCurrentRule(savedRule);
                    await loadRules(); // Last inn alle regler på nytt
                    setIsEditing(false);

                    // Naviger til den nye regelen
                    console.log('Navigerer til ny regel:', savedRule.slug);
                    navigate(`/tegningsregler/${savedRule.slug}`);
                } catch (createError) {
                    console.error('Detaljert feil ved opprettelse:', createError);
                    throw createError;
                }
            }
        } catch (error) {
            console.error('Feil ved lagring:', error);
            // Ikke bruk alert her - siden den kan bli blokkert av sandbox
            console.error('Kunne ikke lagre tegningsregel:', error.message || 'Ukjent feil');
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
            <ModernRulesList
                rules={rules}
                canEdit={canEdit}
                isAdmin={isAdmin}
                handleNewRule={handleNewRule}
                handleDeleteClick={handleDeleteClick}
                formatDate={formatDate}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredRules={filteredRules}
                deleteDialogOpen={deleteDialogOpen}
                setDeleteDialogOpen={setDeleteDialogOpen}
                ruleToDelete={ruleToDelete}
                handleDeleteConfirm={handleDeleteConfirm}
            />
        );
    }

    return (
        <ModernRuleDetail
            currentRule={currentRule}
            isEditing={isEditing}
            title={title}
            setTitle={setTitle}
            handleEditClick={handleEditClick}
            loadVersionHistory={loadVersionHistory}
            canEdit={canEdit}
            handleSave={handleSave}
            handleCancel={handleCancel}
            handleBackClick={handleBackClick}
            showVersionHistory={showVersionHistory}
            setShowVersionHistory={setShowVersionHistory}
            versions={versions}
            handleVersionSelect={handleVersionSelect}
            formatDate={formatDate}
        />
    );
};

export default DrawingRulesPage; 