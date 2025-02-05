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
    TextField
} from '@mui/material';
import { useMsal } from '@azure/msal-react';

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
            const response = await fetch('http://localhost:3001/api/users');
            if (!response.ok) throw new Error('Kunne ikke hente brukere');
            const data = await response.json();
            setUsers(data);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId, newRole) => {
        try {
            const response = await fetch(`http://localhost:3001/api/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: newRole })
            });
            
            if (!response.ok) throw new Error('Kunne ikke oppdatere rolle');
            
            // Oppdater listen lokalt
            setUsers(users.map(user => 
                user.id === userId ? { ...user, role: newRole } : user
            ));
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAddUser = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: newUserEmail,
                    role: newUserRole
                })
            });
            
            if (!response.ok) throw new Error('Kunne ikke legge til bruker');
            
            // Oppdater listen og lukk dialogen
            await fetchUsers();
            setOpenDialog(false);
            setNewUserEmail('');
            setNewUserRole('USER');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteUser = async (userId) => {
        try {
            const response = await fetch(`http://localhost:3001/api/users/${userId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Kunne ikke slette bruker');
            
            // Oppdater listen
            await fetchUsers();
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <Typography>Laster...</Typography>;
    if (error) return <Typography color="error">{error}</Typography>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>
                Brukeradministrasjon
            </Typography>
            
            <Button 
                variant="contained" 
                color="primary" 
                onClick={() => setOpenDialog(true)}
                sx={{ mb: 2 }}
            >
                Legg til ny bruker
            </Button>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>E-post</TableCell>
                            <TableCell>Rolle</TableCell>
                            <TableCell>Sist oppdatert</TableCell>
                            <TableCell>Handlinger</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Select
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        size="small"
                                    >
                                        <MenuItem value="USER">Bruker</MenuItem>
                                        <MenuItem value="EDITOR">Redaktør</MenuItem>
                                        <MenuItem value="ADMIN">Administrator</MenuItem>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    {new Date(user.updated_at).toLocaleString('nb-NO')}
                                </TableCell>
                                <TableCell>
                                    <Button 
                                        variant="outlined" 
                                        color="error"
                                        size="small"
                                        onClick={() => handleDeleteUser(user.id)}
                                    >
                                        Slett
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Legg til ny bruker</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="E-post"
                        type="email"
                        fullWidth
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                    <Select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        fullWidth
                        sx={{ mt: 2 }}
                    >
                        <MenuItem value="USER">Bruker</MenuItem>
                        <MenuItem value="EDITOR">Redaktør</MenuItem>
                        <MenuItem value="ADMIN">Administrator</MenuItem>
                    </Select>
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