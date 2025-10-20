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

function GarantiNyInternKommentarModal({ isOpen, setIsOpen, entityContext, onKommentarLagtTil }) {
    const [kommentarTekst, setKommentarTekst] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    const getCurrentUserV2Id = useCallback(() => {
        const userDetails = authManager.getCurrentUserDetails();
        if (userDetails && userDetails.id) {
            return userDetails.id;
        }
        console.warn("[GarantiNyInternKommentarModal] Kunne ikke finne UserV2 ID. Fallback til 1.");
        return 1; // Fallback
    }, []);

    const handleSave = async () => {
        if (!kommentarTekst.trim()) {
            setError("Kommentaren kan ikke være tom.");
            return;
        }
        if (!entityContext || !entityContext.id || !entityContext.type) {
            setError("Mangler nødvendig kontekst for å lagre kommentar.");
            toast({ title: "Feil", description: "Mangler kontekst for kommentaren.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        setError(null);
        const brukerId = getCurrentUserV2Id();

        try {
            const result = await window.electron.garanti.addInternKommentar({
                entityContext: entityContext,
                kommentarTekst,
                brukerId_UserV2: brukerId
            });
            if (result.success) {
                onKommentarLagtTil(result.data);
                setKommentarTekst('');
                setIsOpen(false);
                toast({ title: "Ny Intern Kommentar Lagret", description: `Kommentar lagt til ${entityContext.type} ID: ${entityContext.id}.` });
            } else {
                throw new Error(result.error || "Ukjent feil ved lagring av kommentar.");
            }
        } catch (err) {
            setError(err.message);
            toast({ title: "Feil ved Lagring", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setKommentarTekst('');
            setError(null);
            setIsSaving(false);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Legg til Ny Intern Kommentar</DialogTitle>
                    <DialogDescription>
                        Skriv din interne kommentar for denne saken.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="nyInternKommentar">Kommentar</Label>
                        <Textarea
                            id="nyInternKommentar"
                            value={kommentarTekst}
                            onChange={(e) => setKommentarTekst(e.target.value)}
                            placeholder="Skriv din kommentar her..."
                            rows={5}
                            disabled={isSaving} />
                    </div>
                    {error && <p className="text-sm text-destructive mt-3 p-2 bg-destructive/10 rounded-md text-center">{error}</p>}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Avbryt</Button></DialogClose>
                    <Button type="button" onClick={handleSave} disabled={isSaving || !kommentarTekst.trim()}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Lagre Kommentar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default GarantiNyInternKommentarModal; 