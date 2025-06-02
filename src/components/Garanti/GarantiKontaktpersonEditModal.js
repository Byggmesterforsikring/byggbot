import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '~/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Loader2 } from 'lucide-react';
import authManager from '../../auth/AuthManager';
import { useToast } from '~/hooks/use-toast';

function GarantiKontaktpersonEditModal({ isOpen, setIsOpen, currentSakData, onUpdate }) {
    const [editedData, setEditedData] = useState({
        kontaktpersonNavn: '',
        kontaktpersonTelefon: '',
    });
    const [allUsersV2, setAllUsersV2] = useState([]); // For getCurrentUserV2Id
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    useEffect(() => {
        if (currentSakData && isOpen) {
            setEditedData({
                kontaktpersonNavn: currentSakData.kontaktpersonNavn || '',
                kontaktpersonTelefon: currentSakData.kontaktpersonTelefon || '',
            });
        } else if (!isOpen) {
            setError(null);
        }
    }, [isOpen, currentSakData]);

    // Hent brukerliste for getCurrentUserV2Id
    useEffect(() => {
        const fetchAllV2Users = async () => {
            if (!isOpen || allUsersV2.length > 0) return;
            try {
                const result = await window.electron.garanti.getUsersV2();
                if (result.success && Array.isArray(result.data)) {
                    setAllUsersV2(result.data);
                } else {
                    console.error("KontaktpersonEditModal: Kunne ikke hente V2-brukere:", result);
                }
            } catch (e) {
                console.error("KontaktpersonEditModal: Feil ved henting av V2-brukere:", e);
            }
        };
        fetchAllV2Users();
    }, [isOpen, allUsersV2.length]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedData(prev => ({ ...prev, [name]: value }));
    };

    const getCurrentUserV2Id = useCallback(() => {
        const currentUserAccount = authManager.getCurrentAccount();
        if (currentUserAccount?.username && allUsersV2.length > 0) {
            const loggedInUserEmail = currentUserAccount.username.toLowerCase();
            const matchedUser = allUsersV2.find(u => u.email?.toLowerCase() === loggedInUserEmail);
            if (matchedUser) return matchedUser.id;
        }
        return 1; // Fallback
    }, [allUsersV2]);

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        const endretAvId = getCurrentUserV2Id();
        const dataToUpdate = { ...editedData };

        let hasChanges = false;
        if (dataToUpdate.kontaktpersonNavn !== (currentSakData.kontaktpersonNavn || '')) hasChanges = true;
        if (dataToUpdate.kontaktpersonTelefon !== (currentSakData.kontaktpersonTelefon || '')) hasChanges = true;

        if (!hasChanges) {
            setIsLoading(false);
            setIsOpen(false);
            toast({ title: "Ingen Endringer", description: "Ingen endringer på kontaktperson ble detektert." });
            return;
        }

        try {
            const result = await window.electron.garanti.updateSak({
                saksId: currentSakData.id,
                dataToUpdate,
                endretAvBrukerId_UserV2: endretAvId
            });
            if (result.success) {
                onUpdate(result.data);
                setIsOpen(false);
                toast({ title: "Kontaktperson Oppdatert", description: "Endringene er lagret." });
            } else {
                throw new Error(result.error || "Ukjent feil ved oppdatering.");
            }
        } catch (err) {
            setError(err.message);
            toast({ title: "Feil ved Lagring", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Rediger Kontaktperson</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="kontaktpersonNavn">Navn</Label>
                        <Input id="kontaktpersonNavn" name="kontaktpersonNavn" value={editedData.kontaktpersonNavn || ''} onChange={handleChange} placeholder="Navn på kontaktperson" disabled={isLoading} />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="kontaktpersonTelefon">Telefon</Label>
                        <Input id="kontaktpersonTelefon" name="kontaktpersonTelefon" value={editedData.kontaktpersonTelefon || ''} onChange={handleChange} placeholder="Telefonnummer" disabled={isLoading} />
                    </div>
                    {error && <p className="text-sm text-destructive mt-3 p-2 bg-destructive/10 rounded-md text-center">{error}</p>}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline" disabled={isLoading}>Avbryt</Button></DialogClose>
                    <Button type="button" onClick={handleSave} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Lagre Endringer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default GarantiKontaktpersonEditModal; 