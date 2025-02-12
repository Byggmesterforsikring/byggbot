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
    TextField,
    Box,
    IconButton,
    FormControl,
    InputLabel
} from '@mui/material';
import { useMsal } from '@azure/msal-react';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const isDev = process.env.NODE_ENV === 'development';

function UserManagement() {
    const { instance } = useMsal();
    const [users, setUsers] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('USER');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUsers = async () => {
        try {
            let userList;
            if (isDev) {
                const response = await fetch('http://localhost:3001/api/users/roles');
                if (!response.ok) throw new Error('Kunne ikke hente brukere');
                userList = await response.json();
            } else {
                userList = await window.electronAPI.getAllUserRoles();
            }
            setUsers(userList);
            setError(null);
        } catch (err) {
            console.error('Feil ved henting av brukere:', err);
            setError('Kunne ikke hente brukerlisten');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddUser = async () => {
        if (!newUserEmail || !newUserRole) {
            setError('Vennligst fyll ut alle felt');
            return;
        }

        try {
            if (isDev) {
                const response = await fetch('http://localhost:3001/api/users/role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: newUserEmail, role: newUserRole })
                });
                if (!response.ok) throw new Error('Kunne ikke legge til bruker');
            } else {
                await window.electronAPI.setUserRole(newUserEmail, newUserRole);
            }
            
            setNewUserEmail('');
            setNewUserRole('USER');
            setOpenDialog(false);
            await fetchUsers();
            setError(null);
        } catch (err) {
            console.error('Feil ved tillegging av bruker:', err);
            setError('Kunne ikke legge til bruker');
        }
    };

    const handleDeleteUser = async (email) => {
        try {
            if (isDev) {
                const response = await fetch(`http://localhost:3001/api/users/role/${email}`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error('Kunne ikke slette bruker');
            } else {
                await window.electronAPI.deleteUserRole(email);
            }
            
            await fetchUsers();
            setError(null);
        } catch (err) {
            console.error('Feil ved sletting av bruker:', err);
            setError('Kunne ikke slette bruker');
        }
    };

    if (loading) return <Typography>Laster...</Typography>;
    if (error) return <Typography color="error">{error}</Typography>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Brukeradministrasjon</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                >
                    Legg til bruker
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>E-post</TableCell>
                            <TableCell>Rolle</TableCell>
                            <TableCell>Handling</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.email}>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.role}</TableCell>
                                <TableCell>
                                    <IconButton
                                        onClick={() => handleDeleteUser(user.email)}
                                        color="error"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Legg til ny bruker</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <TextField
                            label="E-post"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>Rolle</InputLabel>
                            <Select
                                value={newUserRole}
                                onChange={(e) => setNewUserRole(e.target.value)}
                                label="Rolle"
                            >
                                <MenuItem value="USER">Bruker</MenuItem>
                                <MenuItem value="EDITOR">Redaktør</MenuItem>
                                <MenuItem value="ADMIN">Administrator</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Avbryt</Button>
                    <Button onClick={handleAddUser} variant="contained">
                        Legg til
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default UserManagement; 