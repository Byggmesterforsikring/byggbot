import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { Button } from '~/components/ui/button';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableCaption,
} from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import { PlusCircle, Edit, Trash2, UserCog } from 'lucide-react';
import { Skeleton } from "~/components/ui/skeleton";
import { useToast } from "~/hooks/use-toast";
import UserEditModalV3 from './UserEditModalV3';

// Bruker UserEditModalV3 med forbedret fane-basert grensesnitt

function UserManagementV2() {
    const [users, setUsers] = useState([]);
    // const [roles, setRoles] = useState([]); // Kan hentes hvis man skal redigere/opprette direkte her
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { toast } = useToast();

    // State for modalen
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null); // null for ny bruker, ID for redigering

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (window.electron && window.electron.userV2 && window.electron.userV2.getAllUsers) {
                const result = await window.electron.userV2.getAllUsers();
                if (result.success) {
                    setUsers(result.data || []);
                } else {
                    throw new Error(result.error || 'Ukjent feil ved henting av brukere (V2)');
                }
            } else {
                throw new Error('User API V2 (getAllUsers) er ikke tilgjengelig.');
            }
        } catch (err) {
            console.error("Feil ved henting av UserV2 brukere:", err);
            setError(err.message);
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Hent alle roller (kan være nyttig for en fremtidig redigeringsmodal)
    // const fetchRoles = useCallback(async () => {
    //     try {
    //         if (window.electron && window.electron.userV2 && window.electron.userV2.getAllRoles) {
    //             const result = await window.electron.userV2.getAllRoles();
    //             if (result.success) {
    //                 setRoles(result.data || []);
    //             } else {
    //                 throw new Error(result.error || 'Ukjent feil ved henting av roller (V2)');
    //             }
    //         } else {
    //             throw new Error('User API V2 (getAllRoles) er ikke tilgjengelig.');
    //         }
    //     } catch (err) {
    //         console.error("Feil ved henting av Roller V2:", err);
    //         // Håndter feil for roller separat hvis nødvendig
    //     }
    // }, []);

    useEffect(() => {
        fetchUsers();
        // fetchRoles(); // Kan kalles her hvis roller trengs umiddelbart
    }, [fetchUsers]); // fetchRoles kan legges til her hvis den aktiveres

    const handleOpprettNyBruker = () => {
        setEditingUserId(null); // Sikrer at det er "opprett ny" modus
        setIsModalOpen(true);
    };

    const handleRedigerBruker = (userId) => {
        setEditingUserId(userId);
        setIsModalOpen(true);
    };

    const handleUserSaved = () => {
        fetchUsers(); // Hent brukerlisten på nytt etter lagring
    };

    if (isLoading) {
        return (
            <Box sx={{ p: 3 }} className="w-full">
                <Box className="flex justify-between items-center mb-6">
                    <Typography variant="h4" component="h1" className="text-2xl font-semibold">Brukeradministrasjon (V2)</Typography>
                    <Skeleton className="h-10 w-40" /> {/* Placeholder for knapp */}
                </Box>
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-4 border rounded-md bg-card"><Skeleton className="h-4 w-full" /></div>
                    ))}
                </div>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3, color: 'red' }}>
                <Typography variant="h6">Feil ved lasting av brukere</Typography>
                <Typography>{error}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }} className="w-full">
            <Box className="flex justify-between items-center mb-6">
                <Typography variant="h4" component="h1" className="text-2xl font-semibold">
                    Brukeradministrasjon (V2)
                </Typography>
                <Button onClick={handleOpprettNyBruker}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Opprett Ny Bruker
                </Button>
            </Box>

            {users.length === 0 && !isLoading ? (
                <Typography>Ingen brukere (V2) funnet.</Typography>
            ) : (
                <Table>
                    <TableCaption>En liste over systembrukere (V2).</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[250px]">Navn</TableHead>
                            <TableHead>E-post</TableHead>
                            <TableHead>Roller</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Handlinger</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.navn || 'N/A'}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    {user.roller && user.roller.length > 0 ? (
                                        user.roller.map(rolle => (
                                            <Badge key={rolle.id} variant="secondary" className="mr-1 mb-1">{rolle.role_name}</Badge>
                                        ))
                                    ) : (
                                        <span className="text-xs text-muted-foreground">Ingen roller</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.is_active ? "default" : "outline"} className={user.is_active ? "bg-green-500 hover:bg-green-600" : ""}>
                                        {user.is_active ? 'Aktiv' : 'Inaktiv'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleRedigerBruker(user.id)} title="Rediger bruker">
                                        <UserCog className="h-4 w-4" />
                                    </Button>
                                    {/* TODO: Sletteknapp her hvis det implementeres */}
                                    {/* <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)} title="Slett bruker" className="text-destructive hover:text-destructive/80">
                                        <Trash2 className="h-4 w-4" />
                                    </Button> */}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
            <UserEditModalV3
                isOpen={isModalOpen}
                setIsOpen={setIsModalOpen}
                userIdToEdit={editingUserId}
                onUserSaved={handleUserSaved}
            />
        </Box>
    );
}

export default UserManagementV2; 