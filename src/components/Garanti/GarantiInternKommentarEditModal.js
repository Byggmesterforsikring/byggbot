import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '~/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from '~/components/ui/dialog';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import { Loader2 } from 'lucide-react';
import authManager from '../../auth/AuthManager';
import { useToast } from '~/hooks/use-toast';

function GarantiInternKommentarEditModal({ isOpen, setIsOpen, currentSakData, onUpdate }) {
    const [internKommentar, setInternKommentar] = useState('');
    const [allUsersV2, setAllUsersV2] = useState([]); // For getCurrentUserV2Id
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    useEffect(() => {
        if (currentSakData && isOpen) {
            setInternKommentar(currentSakData.kommentarIntern || '');
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
                    console.error("InternKommentarEditModal: Kunne ikke hente V2-brukere:", result);
                }
            } catch (e) {
                console.error("InternKommentarEditModal: Feil ved henting av V2-brukere:", e);
            }
        };
        fetchAllV2Users();
    }, [isOpen, allUsersV2.length]);

    const getCurrentUserV2Id = useCallback(() => {
        const userDetails = authManager.getCurrentUserDetails();
        if (userDetails && userDetails.id) {
            return userDetails.id;
        }
        console.warn('[GarantiInternKommentarEditModal] Kunne ikke finne UserV2 ID. Fallback til 1.');
        return 1; // Fallback
    }, []);

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        const endretAvId = getCurrentUserV2Id();

        const dataToUpdate = { kommentarIntern: internKommentar };

        if (internKommentar === (currentSakData.kommentarIntern || '')) {
            setIsLoading(false);
            setIsOpen(false);
            toast({ title: "Ingen Endring", description: "Intern kommentar er uendret." });
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
                toast({ title: "Intern Kommentar Oppdatert", description: "Endringen er lagret." });
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
            <DialogContent className="sm:max-w-lg"> {/* Kan være litt bredere for textarea */}
                <DialogHeader>
                    <DialogTitle>Rediger Intern Kommentar</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="internKommentar">Kommentar</Label>
                        <Textarea
                            id="internKommentar"
                            name="internKommentar"
                            value={internKommentar}
                            onChange={(e) => setInternKommentar(e.target.value)}
                            placeholder="Skriv intern kommentar her..."
                            rows={6}
                            disabled={isLoading} />
                    </div>
                    {error && <p className="text-sm text-destructive mt-3 p-2 bg-destructive/10 rounded-md text-center">{error}</p>}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline" disabled={isLoading}>Avbryt</Button></DialogClose>
                    <Button type="button" onClick={handleSave} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Lagre Kommentar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default GarantiInternKommentarEditModal; 