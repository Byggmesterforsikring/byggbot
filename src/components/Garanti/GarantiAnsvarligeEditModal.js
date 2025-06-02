import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '~/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "~/components/ui/select";
import { Loader2 } from 'lucide-react';
import authManager from '../../auth/AuthManager';
import { useToast } from '~/hooks/use-toast';

function GarantiAnsvarligeEditModal({ isOpen, setIsOpen, currentData, entityType, onUpdate }) {
    const [editedData, setEditedData] = useState({
        ansvarligRaadgiverId: '',
        uwAnsvarligId: '',
        produksjonsansvarligId: '',
    });
    const [allUsersV2, setAllUsersV2] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    useEffect(() => {
        if (currentData && isOpen) {
            setEditedData({
                ansvarligRaadgiverId: currentData.ansvarligRaadgiverId?.toString() || '',
                uwAnsvarligId: currentData.uwAnsvarligId?.toString() || '',
                produksjonsansvarligId: currentData.produksjonsansvarligId?.toString() || '',
            });
        } else if (!isOpen) {
            setError(null);
        }
    }, [isOpen, currentData]);

    useEffect(() => {
        const fetchAllV2Users = async () => {
            if (!isOpen) return;
            if (allUsersV2.length > 0 && !isLoadingUsers) return;
            setIsLoadingUsers(true);
            try {
                let result;
                if (window.electron && window.electron.userV2 && window.electron.userV2.getAllUsers) {
                    result = await window.electron.userV2.getAllUsers();
                } else if (window.electron && window.electron.garanti && window.electron.garanti.getUsersV2) {
                    console.warn("[GarantiAnsvarligeEditModal] Bruker fallback garanti.getUsersV2 for brukerliste.")
                    result = await window.electron.garanti.getUsersV2();
                }

                if (result && result.success && Array.isArray(result.data)) {
                    setAllUsersV2(result.data);
                } else {
                    console.error("AnsvarligeEditModal: Kunne ikke hente V2-brukere:", result);
                    setError("Kunne ikke laste brukerlisten.");
                }
            } catch (e) {
                console.error("AnsvarligeEditModal: Feil ved henting av V2-brukere:", e);
                setError("Feil ved lasting av brukerliste.");
            } finally {
                setIsLoadingUsers(false);
            }
        };
        fetchAllV2Users();
    }, [isOpen, allUsersV2.length, isLoadingUsers]);

    const handleSelectChange = (name, value) => {
        setEditedData(prev => ({ ...prev, [name]: value === 'null' ? null : (value === '' ? null : value) }));
    };

    const getCurrentUserV2Id = useCallback(() => {
        const userDetails = authManager.getCurrentUserDetails();
        if (userDetails && userDetails.id) {
            return userDetails.id;
        }
        console.warn('[GarantiAnsvarligeEditModal] Kunne ikke finne UserV2 ID. Fallback til 1.');
        return 1;
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        const endretAvId = getCurrentUserV2Id();

        const dataToUpdate = {
            ansvarligRaadgiverId: editedData.ansvarligRaadgiverId ? parseInt(editedData.ansvarligRaadgiverId) : null,
            uwAnsvarligId: editedData.uwAnsvarligId ? parseInt(editedData.uwAnsvarligId) : null,
            produksjonsansvarligId: editedData.produksjonsansvarligId ? parseInt(editedData.produksjonsansvarligId) : null,
        };

        let hasChanges = false;
        if ((dataToUpdate.ansvarligRaadgiverId !== currentData.ansvarligRaadgiverId) && !(dataToUpdate.ansvarligRaadgiverId === null && currentData.ansvarligRaadgiverId === null)) hasChanges = true;
        if ((dataToUpdate.uwAnsvarligId !== currentData.uwAnsvarligId) && !(dataToUpdate.uwAnsvarligId === null && currentData.uwAnsvarligId === null)) hasChanges = true;
        if ((dataToUpdate.produksjonsansvarligId !== currentData.produksjonsansvarligId) && !(dataToUpdate.produksjonsansvarligId === null && currentData.produksjonsansvarligId === null)) hasChanges = true;

        if (!hasChanges) {
            setIsSaving(false);
            setIsOpen(false);
            toast({ title: "Ingen Endringer", description: "Ingen endringer på ansvarlige ble detektert." });
            return;
        }

        try {
            let result;
            if (entityType === 'prosjekt') {
                result = await window.electron.garanti.updateProsjekt({
                    prosjektId: currentData.id,
                    dataToUpdate,
                    endretAvBrukerId_UserV2: endretAvId
                });
            } else if (entityType === 'sak') {
                result = await window.electron.garanti.updateSak({
                    saksId: currentData.id,
                    dataToUpdate,
                    endretAvBrukerId_UserV2: endretAvId
                });
            } else {
                throw new Error('Ukjent entityType for oppdatering av ansvarlige.');
            }

            if (result.success) {
                onUpdate(result.data);
                setIsOpen(false);
                toast({ title: "Ansvarlige Oppdatert", description: "Endringene for ansvarlige er lagret." });
            } else {
                throw new Error(result.error || `Ukjent feil ved oppdatering av ansvarlige for ${entityType}.`);
            }
        } catch (err) {
            setError(err.message);
            toast({ title: "Feil ved Lagring", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const raadgivere = allUsersV2.filter(u =>
        u.roller?.some(rolle => rolle.role_name === 'Garantisaksbehandler' || rolle.role_name === 'Systemadministrator')
    );
    const uwAnsvarlige = allUsersV2.filter(u =>
        u.roller?.some(rolle => rolle.role_name === 'Garantileder_UW' || rolle.role_name === 'Systemadministrator')
    );
    const produksjonsAnsvarlige = allUsersV2;

    const renderUserSelect = (fieldId, label, userList, currentValue) => (
        <div className="grid w-full items-center gap-1.5 mb-4">
            <Label htmlFor={fieldId} className="mb-1 text-sm font-medium">{label}</Label>
            <Select
                value={currentValue || ''}
                onValueChange={(value) => handleSelectChange(fieldId, value)}
                disabled={isLoadingUsers || isSaving}
            >
                <SelectTrigger id={fieldId} className={`w-full ${!currentValue ? "text-muted-foreground" : ""}`}>
                    <SelectValue placeholder="Velg..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="null"><em>Fjern valg / Ikke tildelt</em></SelectItem>
                    {userList.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                            {user.navn || user.email}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Endre Ansvarlige</DialogTitle>
                </DialogHeader>
                {isLoadingUsers && <div className="flex justify-center items-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> <span className="ml-2 text-muted-foreground">Laster brukerliste...</span></div>}
                {!isLoadingUsers && (
                    <div className="py-4">
                        {renderUserSelect("ansvarligRaadgiverId", "Ansvarlig Rådgiver", raadgivere, editedData.ansvarligRaadgiverId)}
                        {renderUserSelect("uwAnsvarligId", "UW Ansvarlig", uwAnsvarlige, editedData.uwAnsvarligId)}
                        {renderUserSelect("produksjonsansvarligId", "Produksjonsansvarlig", produksjonsAnsvarlige, editedData.produksjonsansvarligId)}
                        {error && <p className="text-sm text-destructive mt-3 p-2 bg-destructive/10 rounded-md text-center">{error}</p>}
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Avbryt</Button></DialogClose>
                    <Button type="button" onClick={handleSave} disabled={isSaving || isLoadingUsers}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Lagre Ansvarlige
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default GarantiAnsvarligeEditModal; 