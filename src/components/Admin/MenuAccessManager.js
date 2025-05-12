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
    Box,
    FormControl,
    InputLabel,
    Alert,
    Collapse,
    IconButton,
    Tooltip,
    Dialog,
    DialogContent,
    DialogActions,
    DialogTitle
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import { MENU_ITEMS } from '../../constants/menuStructure';

const ROLE_OPTIONS = [
    { value: null, label: 'Alle' },
    { value: 'USER', label: 'Bruker' },
    { value: 'EDITOR', label: 'Redaktør' },
    { value: 'ADMIN', label: 'Administrator' }
];

function flattenMenuItems(items, parentId = null) {
    let result = [];
    items.forEach(item => {
        const flatItem = {
            id: item.id,
            label: item.label,
            parentId,
            path: item.path,
            defaultRequiredRole: item.defaultRequiredRole,
            currentRequiredRole: item.defaultRequiredRole, // Vi setter dette som utgangspunkt
            isModified: false
        };
        result.push(flatItem);

        if (item.subItems && item.subItems.length > 0) {
            const children = flattenMenuItems(item.subItems, item.id);
            result = [...result, ...children];
        }
    });
    return result;
}

function MenuAccessManager() {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [openHelpDialog, setOpenHelpDialog] = useState(false);

    useEffect(() => {
        const loadMenuItems = async () => {
            try {
                // Start med de hardkodede standardverdiene
                const flattened = flattenMenuItems(MENU_ITEMS);

                // Last inn lagrede override-verdier fra databasen (hvis de finnes)
                const savedMenuAccess = await window.electron.getMenuAccessSettings();

                if (savedMenuAccess && savedMenuAccess.length > 0) {
                    // Oppdater currentRequiredRole basert på lagrede verdier
                    const updatedItems = flattened.map(item => {
                        const savedItem = savedMenuAccess.find(s => s.id === item.id);
                        if (savedItem) {
                            return {
                                ...item,
                                currentRequiredRole: savedItem.requiredRole,
                                isModified: item.defaultRequiredRole !== savedItem.requiredRole
                            };
                        }
                        return item;
                    });
                    setMenuItems(updatedItems);
                } else {
                    setMenuItems(flattened);
                }

                setError(null);
            } catch (err) {
                console.error('Feil ved lasting av menytilganger:', err);
                setError('Kunne ikke laste menytilganger');
                // Fyll inn standard menyelementer selv om det er en feil
                setMenuItems(flattenMenuItems(MENU_ITEMS));
            } finally {
                setLoading(false);
            }
        };

        loadMenuItems();
    }, []);

    const handleRoleChange = (itemId, newRole) => {
        setMenuItems(prevItems =>
            prevItems.map(item => {
                if (item.id === itemId) {
                    return {
                        ...item,
                        currentRequiredRole: newRole,
                        isModified: item.defaultRequiredRole !== newRole
                    };
                }
                return item;
            })
        );

        // Skjul suksessmelding hvis vi gjør endringer
        if (success) {
            setSuccess(false);
        }
    };

    const handleSaveChanges = async () => {
        try {
            setLoading(true);

            // Finn bare de elementene som er modifisert
            const modifiedItems = menuItems
                .filter(item => item.isModified)
                .map(item => ({
                    id: item.id,
                    requiredRole: item.currentRequiredRole
                }));

            await window.electron.saveMenuAccessSettings(modifiedItems);

            // Oppdater isModified etter lagring
            setMenuItems(prevItems =>
                prevItems.map(item => ({
                    ...item,
                    isModified: false
                }))
            );

            setSuccess(true);
            setError(null);
        } catch (err) {
            console.error('Feil ved lagring av menytilganger:', err);
            setError('Kunne ikke lagre menytilganger');
            setSuccess(false);
        } finally {
            setLoading(false);
        }
    };

    const handleResetToDefaults = async () => {
        try {
            setLoading(true);
            await window.electron.resetMenuAccessSettings();

            // Oppdater lokale menyelementer tilbake til standardverdiene
            setMenuItems(
                flattenMenuItems(MENU_ITEMS).map(item => ({
                    ...item,
                    currentRequiredRole: item.defaultRequiredRole,
                    isModified: false
                }))
            );

            setSuccess(true);
            setError(null);
        } catch (err) {
            console.error('Feil ved tilbakestilling av menytilganger:', err);
            setError('Kunne ikke tilbakestille menytilganger');
            setSuccess(false);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Typography>Laster...</Typography>;

    const hasModifiedItems = menuItems.some(item => item.isModified);

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Menytilgangsstyring</Typography>
                <Tooltip title="Mer informasjon">
                    <IconButton onClick={() => setOpenHelpDialog(true)}>
                        <InfoIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <Collapse in={success}>
                <Alert
                    severity="success"
                    action={
                        <IconButton
                            aria-label="close"
                            color="inherit"
                            size="small"
                            onClick={() => setSuccess(false)}
                        >
                            <CloseIcon fontSize="inherit" />
                        </IconButton>
                    }
                    sx={{ mb: 2 }}
                >
                    Menytilgangene ble lagret
                </Alert>
            </Collapse>

            <Collapse in={!!error}>
                <Alert
                    severity="error"
                    action={
                        <IconButton
                            aria-label="close"
                            color="inherit"
                            size="small"
                            onClick={() => setError(null)}
                        >
                            <CloseIcon fontSize="inherit" />
                        </IconButton>
                    }
                    sx={{ mb: 2 }}
                >
                    {error}
                </Alert>
            </Collapse>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Menyelement</TableCell>
                            <TableCell>Sti</TableCell>
                            <TableCell>Standardtilgang</TableCell>
                            <TableCell>Tilgangskrav</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {menuItems.map((item) => (
                            <TableRow
                                key={item.id}
                                sx={item.isModified ? { backgroundColor: 'rgba(255, 244, 229, 0.5)' } : {}}
                            >
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        {item.parentId && <Box sx={{ width: 20 }} />}
                                        <Typography
                                            variant={item.parentId ? 'body2' : 'body1'}
                                            sx={item.parentId ? { fontWeight: 'normal' } : { fontWeight: 'bold' }}
                                        >
                                            {item.label}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>{item.path || '-'}</TableCell>
                                <TableCell>
                                    {item.defaultRequiredRole === null ? 'Alle' : item.defaultRequiredRole}
                                </TableCell>
                                <TableCell>
                                    <FormControl size="small" fullWidth>
                                        <Select
                                            value={item.currentRequiredRole === null ? 'null' : item.currentRequiredRole}
                                            onChange={(e) => handleRoleChange(
                                                item.id,
                                                e.target.value === 'null' ? null : e.target.value
                                            )}
                                        >
                                            {ROLE_OPTIONS.map(option => (
                                                <MenuItem
                                                    key={option.value === null ? 'null' : option.value}
                                                    value={option.value === null ? 'null' : option.value}
                                                >
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                <Button
                    variant="outlined"
                    color="warning"
                    onClick={handleResetToDefaults}
                    disabled={loading}
                >
                    Tilbakestill til standard
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSaveChanges}
                    disabled={loading || !hasModifiedItems}
                >
                    Lagre endringer
                </Button>
            </Box>

            <Dialog open={openHelpDialog} onClose={() => setOpenHelpDialog(false)}>
                <DialogTitle>Om menytilgangsstyring</DialogTitle>
                <DialogContent>
                    <Typography paragraph>
                        Her kan du styre hvilke brukerroller som har tilgang til de ulike menyelementene i appen.
                    </Typography>
                    <Typography paragraph>
                        <strong>Standardtilgang</strong> viser den opprinnelige tilgangskonfigurasjonen.
                    </Typography>
                    <Typography paragraph>
                        <strong>Tilgangskrav</strong> lar deg endre hvilken rolle som kreves for å se menyelementet:
                    </Typography>
                    <Typography component="ul" sx={{ pl: 2 }}>
                        <li><strong>Alle</strong>: Alle innloggede brukere kan se elementet</li>
                        <li><strong>Bruker</strong>: Kun brukere med USER-rolle eller høyere</li>
                        <li><strong>Redaktør</strong>: Kun brukere med EDITOR-rolle eller høyere</li>
                        <li><strong>Administrator</strong>: Kun brukere med ADMIN-rolle</li>
                    </Typography>
                    <Typography paragraph>
                        Merk at endringer ikke trer i kraft før neste innlogging for aktive brukere.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenHelpDialog(false)}>Lukk</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default MenuAccessManager; 