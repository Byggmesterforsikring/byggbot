import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '~/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Checkbox } from '~/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Loader2, ChevronRight } from 'lucide-react';
import { useToast } from '~/hooks/use-toast';
import { Box, Typography } from '@mui/material';

// Importer SelskapSearchModal
import SelskapSearchModal from './SelskapSearchModal';

// Legg til isDev og devlog
const isDev = process.env.NODE_ENV === 'development';

const devlog = (message, data = null) => {
    if (isDev) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] UserEditModalV2: ${message}`;
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }
};

const USER_TYPES = ["INTERN", "EKSTERN"]; // Eksempel på brukertyper

function UserEditModalV2({ isOpen, setIsOpen, userIdToEdit, onUserSaved }) {
    const [formData, setFormData] = useState({
        email: '',
        navn: '',
        user_type: USER_TYPES[0], // Default til første type
        is_active: true,
        entra_id_object_id: '' // Valgfritt
    });
    const [selectedRoleIds, setSelectedRoleIds] = useState(new Set()); // Bruker Set for enklere håndtering av valg
    const [allRoles, setAllRoles] = useState([]);

    const [allModules, setAllModules] = useState([]); // NY state for moduler
    const [selectedModulIds, setSelectedModulIds] = useState(new Set()); // NY state for valgte modul-IDer

    const [selectedTilknyttetSelskap, setSelectedTilknyttetSelskap] = useState(null); // { id, navn }
    const [isSelskapSearchModalOpen, setIsSelskapSearchModalOpen] = useState(false);

    const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);
    const [isLoadingRoles, setIsLoadingRoles] = useState(false);
    const [isLoadingModules, setIsLoadingModules] = useState(false); // NY state
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    const resetForm = useCallback(() => {
        setFormData({
            email: '',
            navn: '',
            user_type: USER_TYPES[0],
            is_active: true,
            entra_id_object_id: ''
        });
        setSelectedRoleIds(new Set());
        setSelectedModulIds(new Set()); // NY: Reset valgte moduler
        setSelectedTilknyttetSelskap(null); // Reset
        setError(null);
    }, []);

    // Hent alle tilgjengelige roller OG moduler når modalen åpnes
    useEffect(() => {
        if (isOpen) {
            const fetchInitialLookups = async () => {
                setIsLoadingRoles(true);
                setIsLoadingModules(true);
                try {
                    const rolesResult = await window.electron.userV2.getAllRoles();
                    if (rolesResult.success) {
                        setAllRoles(rolesResult.data || []);
                    } else {
                        throw new Error(rolesResult.error || 'Kunne ikke hente roller.');
                    }

                    const modulerResult = await window.electron.userV2.getAllModules();
                    if (modulerResult.success) {
                        setAllModules(modulerResult.data || []);
                    } else {
                        throw new Error(modulerResult.error || 'Kunne ikke hente moduler.');
                    }
                } catch (err) {
                    console.error("Feil ved henting av roller/moduler i modal:", err);
                    toast({ title: "Feil", description: `Kunne ikke laste nødvendige data: ${err.message}`, variant: "destructive" });
                } finally {
                    setIsLoadingRoles(false);
                    setIsLoadingModules(false);
                }
            };
            fetchInitialLookups();
        }
    }, [isOpen, toast]);

    // Hent brukerdata hvis vi er i redigeringsmodus
    useEffect(() => {
        if (isOpen && userIdToEdit) {
            const fetchUserData = async () => {
                setIsLoadingUserDetails(true);
                setError(null);
                try {
                    const result = await window.electron.userV2.getUserById(userIdToEdit);
                    if (result.success && result.data) {
                        const user = result.data;
                        setFormData({
                            email: user.email || '',
                            navn: user.navn || '',
                            user_type: user.user_type || USER_TYPES[0],
                            is_active: user.is_active !== undefined ? user.is_active : true,
                            entra_id_object_id: user.entra_id_object_id || ''
                        });
                        setSelectedRoleIds(new Set(user.roller?.map(r => r.id) || []));
                        setSelectedModulIds(new Set(user.modulTilganger?.map(mt => mt.id) || [])); // NY: Sett valgte moduler
                        if (user.user_type === 'EKSTERN' && user.tilknyttetSelskap) {
                            setSelectedTilknyttetSelskap({
                                id: user.tilknyttetSelskap.id,
                                navn: user.tilknyttetSelskap.selskapsnavn
                            });
                        } else {
                            setSelectedTilknyttetSelskap(null);
                        }
                    } else {
                        throw new Error(result.error || `Kunne ikke hente bruker med ID ${userIdToEdit}.`);
                    }
                } catch (err) {
                    console.error(`Feil ved henting av bruker ${userIdToEdit}:`, err);
                    setError(`Kunne ikke laste brukerdata: ${err.message}`);
                    toast({ title: "Feil", description: `Kunne ikke laste brukerdata: ${err.message}`, variant: "destructive" });
                }
                setIsLoadingUserDetails(false);
            };
            fetchUserData();
        } else if (isOpen && !userIdToEdit) {
            // Ny bruker, reset skjema
            resetForm();
        }
    }, [isOpen, userIdToEdit, toast, resetForm]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: type === 'checkbox' ? checked : value };
            if (name === 'user_type' && value === 'INTERN') {
                setSelectedTilknyttetSelskap(null); // Nullstill selskap hvis bruker blir intern
            }
            return newData;
        });
    };

    const handleRoleChange = (roleId) => {
        setSelectedRoleIds(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(roleId)) {
                newSelected.delete(roleId);
            } else {
                newSelected.add(roleId);
            }
            return newSelected;
        });
    };

    // NY handler for modul-checkboxes
    const handleModulChange = (modulId) => {
        setSelectedModulIds(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(modulId)) {
                newSelected.delete(modulId);
            } else {
                newSelected.add(modulId);
            }
            return newSelected;
        });
    };

    const handleSelskapValgt = (selskap) => {
        if (selskap) {
            setSelectedTilknyttetSelskap({ id: selskap.id, navn: selskap.selskapsnavn });
        } else {
            setSelectedTilknyttetSelskap(null); // For å kunne fjerne valg
        }
        setIsSelskapSearchModalOpen(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        const userDataPayload = { ...formData };
        const finalRoleIds = Array.from(selectedRoleIds);
        const finalModulIds = Array.from(selectedModulIds);
        let tilknyttetSelskapIdPayload = null;

        if (userDataPayload.user_type === 'EKSTERN') {
            if (selectedTilknyttetSelskap && selectedTilknyttetSelskap.id) {
                tilknyttetSelskapIdPayload = selectedTilknyttetSelskap.id;
            }
        }

        try {
            let result;
            const apiParamsCreate = { // For createUser
                userData: userDataPayload,
                roleIds: finalRoleIds,
                modulIds: finalModulIds,
                tilknyttetSelskapId: tilknyttetSelskapIdPayload
            };
            const apiParamsUpdate = { // For updateUser, inkluderer userId
                userId: userIdToEdit,
                userData: userDataPayload,
                roleIds: finalRoleIds,
                modulIds: finalModulIds,
                tilknyttetSelskapId: tilknyttetSelskapIdPayload
            };

            if (userIdToEdit) {
                devlog('[UserEditModalV2] Kaller updateUser med payload:', apiParamsUpdate); // LOGG HER
                result = await window.electron.userV2.updateUser(apiParamsUpdate);
            } else {
                if (!userDataPayload.email) throw new Error("E-post er påkrevd.");
                devlog('[UserEditModalV2] Kaller createUser med payload:', apiParamsCreate); // LOGG HER
                result = await window.electron.userV2.createUser(apiParamsCreate);
            }

            if (result.success) {
                toast({ title: "Suksess!", description: `Bruker ${userIdToEdit ? 'oppdatert' : 'opprettet'}.` });
                onUserSaved();
                setIsOpen(false);
            } else {
                throw new Error(result.error || `Lagringsfeil.`);
            }
        } catch (err) {
            console.error("Feil ved lagring av bruker:", err);
            setError(err.message);
            toast({ title: "Feil ved lagring", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const dialogTitle = userIdToEdit ? "Rediger Bruker" : "Opprett Ny Bruker";
    const isLoadingData = isLoadingUserDetails || isLoadingRoles || isLoadingModules; // NY: Inkluderer isLoadingModules

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsOpen(open); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{dialogTitle}</DialogTitle>
                        {userIdToEdit && <DialogDescription>Endre detaljer for bruker ID: {userIdToEdit}</DialogDescription>}
                    </DialogHeader>

                    {isLoadingData && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> <span className="ml-3 text-muted-foreground">Laster data...</span></div>}

                    {!isLoadingData && (
                        <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2"> {/* Økt max-h litt */}
                            <div className="grid gap-1.5">
                                <Label htmlFor="email">E-post</Label>
                                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="bruker@domene.no" required />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="navn">Fullt Navn</Label>
                                <Input id="navn" name="navn" value={formData.navn} onChange={handleChange} placeholder="Ola Nordmann" />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="user_type">Brukertype</Label>
                                <Select name="user_type" value={formData.user_type} onValueChange={(value) => handleChange({ target: { name: 'user_type', value } })}>
                                    <SelectTrigger><SelectValue placeholder="Velg brukertype" /></SelectTrigger>
                                    <SelectContent>
                                        {USER_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="entra_id_object_id">Entra ID Object ID (Valgfritt)</Label>
                                <Input id="entra_id_object_id" name="entra_id_object_id" value={formData.entra_id_object_id} onChange={handleChange} />
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                                <Checkbox id="is_active" name="is_active" checked={formData.is_active} onCheckedChange={(checked) => handleChange({ target: { name: 'is_active', type: 'checkbox', checked } })} />
                                <Label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Aktiv bruker
                                </Label>
                            </div>

                            {formData.user_type === 'EKSTERN' && (
                                <div className="grid gap-1.5 mt-2 pt-2 border-t">
                                    <Label htmlFor="tilknyttetSelskap">Tilknyttet Selskap (for Ekstern)</Label>
                                    <Box className="flex items-center justify-between p-2 border rounded-md min-h-[38px]">
                                        <Typography className={selectedTilknyttetSelskap ? "text-sm" : "text-sm text-muted-foreground"}>
                                            {selectedTilknyttetSelskap ? `${selectedTilknyttetSelskap.navn} (ID: ${selectedTilknyttetSelskap.id})` : 'Ingen selskap valgt'}
                                        </Typography>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setIsSelskapSearchModalOpen(true)} className="h-7 px-2 text-xs">
                                            {selectedTilknyttetSelskap ? 'Endre' : 'Velg'} <ChevronRight className="ml-1 h-3 w-3" />
                                        </Button>
                                    </Box>
                                </div>
                            )}

                            <div className="mt-4">
                                <Label className="text-base font-medium">Roller</Label>
                                {allRoles.length === 0 && !isLoadingRoles && <p className="text-sm text-muted-foreground mt-1">Ingen roller funnet.</p>}
                                <div className="space-y-2 mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                                    {allRoles.map(role => (
                                        <div key={role.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`role-${role.id}`}
                                                checked={selectedRoleIds.has(role.id)}
                                                onCheckedChange={() => handleRoleChange(role.id)}
                                            />
                                            <Label htmlFor={`role-${role.id}`} className="font-normal cursor-pointer">{role.role_name}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4">
                                <Label className="text-base font-medium">Modultilganger</Label>
                                {isLoadingModules && <p className="text-sm text-muted-foreground mt-1">Laster moduler...</p>}
                                {!isLoadingModules && allModules.length === 0 && <p className="text-sm text-muted-foreground mt-1">Ingen moduler funnet.</p>}
                                <div className="space-y-2 mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                                    {allModules.map(modul => (
                                        <div key={modul.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`modul-${modul.id}`}
                                                checked={selectedModulIds.has(modul.id)}
                                                onCheckedChange={() => handleModulChange(modul.id)}
                                            />
                                            <Label htmlFor={`modul-${modul.id}`} className="font-normal cursor-pointer">{modul.navn}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {error && <p className="text-sm text-destructive mt-3 p-2 bg-destructive/10 rounded-md text-center">{error}</p>}
                        </div>
                    )}

                    <DialogFooter className="mt-2">
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving || isLoadingData}>Avbryt</Button></DialogClose>
                        <Button type="button" onClick={handleSave} disabled={isSaving || isLoadingData}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {userIdToEdit ? 'Lagre Endringer' : 'Opprett Bruker'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Render SelskapSearchModal separat, styrt av sin egen state */}
            <SelskapSearchModal
                isOpen={isSelskapSearchModalOpen}
                setIsOpen={setIsSelskapSearchModalOpen}
                onSelskapSelected={handleSelskapValgt}
            />
        </>
    );
}

export default UserEditModalV2; 