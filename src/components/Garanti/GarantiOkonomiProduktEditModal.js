import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '~/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Loader2 } from 'lucide-react';
import authManager from '../../auth/AuthManager';
import { useToast } from '~/hooks/use-toast';

function GarantiOkonomiProduktEditModal({ isOpen, setIsOpen, currentData, entityType, onUpdate }) {
    const [editedData, setEditedData] = useState({
        // ramme: '', // Fjernes for prosjekt, beholdes for evt. sak
        produkt: '',
        // kundenummerWims: '', // Fjernes for prosjekt, beholdes for evt. sak
    });
    const [allUsersV2, setAllUsersV2] = useState([]); // Fortsatt nødvendig for getCurrentUserV2Id
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    useEffect(() => {
        if (currentData && isOpen) {
            if (entityType === 'prosjekt') {
                setEditedData({
                    produkt: currentData.produkt || '',
                });
            } else { // Antar 'sak' for bakoverkompatibilitet, eller generell håndtering
                setEditedData({
                    ramme: currentData.ramme || '',
                    produkt: currentData.produkt || '',
                    kundenummerWims: currentData.kundenummerWims || '',
                });
            }
        } else if (!isOpen) {
            setError(null);
        }
    }, [isOpen, currentData, entityType]);

    // Hent brukerliste for å kunne finne ID til innlogget bruker for endretAvId
    useEffect(() => {
        const fetchAllV2Users = async () => {
            if (!isOpen || allUsersV2.length > 0) return;
            // Ikke sett isLoading her, da det ikke er brukerinput som venter på dette.
            try {
                const result = await window.electron.garanti.getUsersV2();
                if (result.success && Array.isArray(result.data)) {
                    setAllUsersV2(result.data);
                } else {
                    console.error("OkonomiProdEditModal: Kunne ikke hente V2-brukere:", result);
                }
            } catch (e) {
                console.error("OkonomiProdEditModal: Feil ved henting av V2-brukere:", e);
            }
        };
        fetchAllV2Users();
    }, [isOpen, allUsersV2.length]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedData(prev => ({ ...prev, [name]: value }));
    };

    const getCurrentUserV2Id = useCallback(() => {
        // const currentUserAccount = authManager.getCurrentAccount(); // Gammelt kall
        const userDetails = authManager.getCurrentUserDetails(); // Nytt kall
        // if (currentUserAccount?.username && allUsersV2.length > 0) { // Gammel sjekk
        if (userDetails && userDetails.id) { // Ny sjekk og bruk av direkte ID
            // const loggedInUserEmail = currentUserAccount.username.toLowerCase();
            // const matchedUser = allUsersV2.find(u => u.email?.toLowerCase() === loggedInUserEmail);
            // if (matchedUser) return matchedUser.id;
            return userDetails.id;
        }
        console.warn('[GarantiOkonomiProduktEditModal] Kunne ikke finne UserV2 ID for innlogget bruker. Fallback til 1.');
        return 1; // Fallback
    }, [allUsersV2]); // allUsersV2 er kanskje ikke nødvendig som dependency her lenger hvis vi kun stoler på userDetails

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        const endretAvId = getCurrentUserV2Id();

        let dataToUpdate = {};
        let hasChanges = false;

        if (entityType === 'prosjekt') {
            dataToUpdate.produkt = editedData.produkt;
            if (dataToUpdate.produkt !== (currentData.produkt || '')) hasChanges = true;
        } else { // Antar 'sak' for bakoverkompatibilitet
            dataToUpdate = { ...editedData }; // Inkluderer ramme, produkt, kundenummerWims
            if (dataToUpdate.ramme !== (currentData.ramme || '')) hasChanges = true;
            if (dataToUpdate.produkt !== (currentData.produkt || '')) hasChanges = true;
            if (dataToUpdate.kundenummerWims !== (currentData.kundenummerWims || '')) hasChanges = true;
        }

        // Hvis ingen felter er endret for den aktuelle entitetstypen
        if (entityType === 'prosjekt' && !hasChanges && Object.keys(dataToUpdate).length === 1 && dataToUpdate.hasOwnProperty('produkt')) {
            // For prosjekt, hvis bare produkt er i dataToUpdate og det ikke er endret, er det ingen reelle endringer
            if (dataToUpdate.produkt === (currentData.produkt || '')) hasChanges = false;
        }

        if (!hasChanges) {
            setIsLoading(false);
            setIsOpen(false);
            toast({ title: "Ingen Endringer", description: "Ingen endringer ble detektert." });
            return;
        }

        try {
            let result;
            if (entityType === 'prosjekt') {
                result = await window.electron.garanti.updateProsjekt({
                    prosjektId: currentData.id,
                    dataToUpdate: { produkt: dataToUpdate.produkt }, // Send kun produkt for prosjekt
                    endretAvBrukerId_UserV2: endretAvId
                });
            } else { // Antar 'sak' for bakoverkompatibilitet
                result = await window.electron.garanti.updateSak({
                    saksId: currentData.id,
                    dataToUpdate, // Sender ramme, produkt, kundenummerWims for sak
                    endretAvBrukerId_UserV2: endretAvId
                });
            }

            if (result.success) {
                onUpdate(result.data);
                setIsOpen(false);
                toast({ title: entityType === 'prosjekt' ? "Produkt Oppdatert" : "Økonomi/Produkt Oppdatert", description: "Endringene er lagret." });
            } else {
                throw new Error(result.error || `Ukjent feil ved oppdatering for ${entityType}.`);
            }
        } catch (err) {
            setError(err.message);
            toast({ title: "Feil ved Lagring", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const dialogTitle = entityType === 'prosjekt' ? "Rediger Produkt for Prosjekt" : "Rediger Økonomi og Produkt";

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {entityType !== 'prosjekt' && (
                        <>
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="ramme">Ramme</Label>
                                <Input id="ramme" name="ramme" value={editedData.ramme || ''} onChange={handleChange} placeholder="Økonomisk ramme" disabled={isLoading} />
                            </div>
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="kundenummerWims">Kundenummer Wims</Label>
                                <Input id="kundenummerWims" name="kundenummerWims" value={editedData.kundenummerWims || ''} onChange={handleChange} disabled={isLoading} />
                            </div>
                        </>
                    )}
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="produkt">Produkt</Label>
                        <Input id="produkt" name="produkt" value={editedData.produkt || ''} onChange={handleChange} placeholder="Type garanti/produkt" disabled={isLoading} />
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

export default GarantiOkonomiProduktEditModal; 