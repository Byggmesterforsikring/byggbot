import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '~/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Loader2, SaveIcon } from 'lucide-react';
import authManager from '../../auth/AuthManager';
import { useToast } from '~/hooks/use-toast';

// Funksjon for å initialisere form data (hjelpefunksjon)
const initializeFormData = (sakData) => ({
    ansvarligRaadgiverId: sakData?.ansvarligRaadgiverId?.toString() || '',
    uwAnsvarligId: sakData?.uwAnsvarligId?.toString() || '',
    produksjonsansvarligId: sakData?.produksjonsansvarligId?.toString() || '',
    ramme: sakData?.ramme || '',
    produkt: sakData?.produkt || '',
    kundenummerWims: sakData?.kundenummerWims || '',
    kontaktpersonNavn: sakData?.kontaktpersonNavn || '',
    kontaktpersonTelefon: sakData?.kontaktpersonTelefon || '',
    kommentarIntern: sakData?.kommentarIntern || '',
});

function GarantiSakEditModal({ isOpen, setIsOpen, currentSakData, onSakOppdatert }) {
    const [editedData, setEditedData] = useState(() => initializeFormData(currentSakData));
    const [allUsersV2, setAllUsersV2] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    useEffect(() => {
        if (currentSakData && isOpen) {
            setEditedData(initializeFormData(currentSakData));
        } else if (!isOpen) {
            setError(null);
        }
    }, [isOpen, currentSakData]);

    useEffect(() => {
        const fetchAllV2Users = async () => {
            if (!isOpen) return;
            setIsLoadingUsers(true);
            try {
                const result = await window.electron.garanti.getUsersV2();
                if (result.success && Array.isArray(result.data)) {
                    setAllUsersV2(result.data);
                } else {
                    console.error("EditModal: Kunne ikke hente V2-brukere:", result);
                    setError("Kunne ikke laste brukerlisten.");
                }
            } catch (e) {
                console.error("EditModal: Feil ved henting av V2-brukere:", e);
                setError("Feil ved lasting av brukerliste.");
            } finally {
                setIsLoadingUsers(false);
            }
        };
        fetchAllV2Users();
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setEditedData(prev => ({ ...prev, [name]: value === 'null' ? null : (value === '' ? null : value) }));
    };

    const getCurrentUserV2Id = useCallback(() => {
        const currentUserAccount = authManager.getCurrentAccount();
        if (currentUserAccount?.username && allUsersV2.length > 0) {
            const loggedInUserEmail = currentUserAccount.username.toLowerCase();
            const matchedUser = allUsersV2.find(u => u.email?.toLowerCase() === loggedInUserEmail);
            if (matchedUser) return matchedUser.id;
        }
        return 1;
    }, [allUsersV2]);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        const endretAvId = getCurrentUserV2Id();

        const dataToSubmit = { // Start med en tom base, legg kun til endrede felter
            ansvarligRaadgiverId: editedData.ansvarligRaadgiverId ? parseInt(editedData.ansvarligRaadgiverId) : null,
            uwAnsvarligId: editedData.uwAnsvarligId ? parseInt(editedData.uwAnsvarligId) : null,
            produksjonsansvarligId: editedData.produksjonsansvarligId ? parseInt(editedData.produksjonsansvarligId) : null,
            ramme: editedData.ramme,
            produkt: editedData.produkt,
            kundenummerWims: editedData.kundenummerWims,
            kontaktpersonNavn: editedData.kontaktpersonNavn,
            kontaktpersonTelefon: editedData.kontaktpersonTelefon,
            kommentarIntern: editedData.kommentarIntern,
        };

        const changedData = {};
        let hasChanges = false;
        for (const key in dataToSubmit) {
            let originalValue = currentSakData[key];
            let newValueInForm = editedData[key]; // Bruk verdien fra skjemaet for sammenligning

            // Konverter ID-er til streng for korrekt sammenligning med Select-verdier (som er strenger eller tom streng)
            if (key.endsWith("Id")) {
                originalValue = originalValue?.toString() || '';
                newValueInForm = newValueInForm?.toString() || '';
            }

            if (newValueInForm !== originalValue) {
                changedData[key] = dataToSubmit[key]; // Send den konverterte verdien (f.eks. parset int for IDer)
                hasChanges = true;
            }
        }

        if (!hasChanges) {
            setIsSaving(false);
            setIsOpen(false);
            toast({ title: "Ingen Endringer", description: "Ingen endringer ble detektert." });
            return;
        }

        try {
            const result = await window.electron.garanti.updateSak({
                saksId: currentSakData.id,
                dataToUpdate: changedData,
                endretAvBrukerId_UserV2: endretAvId
            });
            if (result.success) {
                onSakOppdatert(result.data);
                setIsOpen(false);
                toast({ title: "Sak Oppdatert", description: "Endringene er lagret." });
            } else {
                throw new Error(result.error || "Ukjent feil ved oppdatering av sak.");
            }
        } catch (err) {
            setError(err.message);
            toast({ title: "Feil ved Lagring", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const raadgivere = allUsersV2.filter(u => u.roller?.includes('Garantisaksbehandler') || u.roller?.includes('Systemadministrator'));
    const uwAnsvarlige = allUsersV2.filter(u => u.roller?.includes('Garantileder_UW') || u.roller?.includes('Systemadministrator'));
    const produksjonsAnsvarlige = allUsersV2;

    const renderUserSelect = (fieldId, label, userList, currentValue) => (
        <div className="grid w-full items-center gap-1.5 mb-3">
            <Label htmlFor={fieldId} className="text-sm font-medium">{label}</Label>
            <Select value={currentValue || ''} onValueChange={(value) => handleSelectChange(fieldId, value)} disabled={isLoadingUsers || isSaving}>
                <SelectTrigger id={fieldId} className={!currentValue ? "text-muted-foreground" : ""}><SelectValue placeholder="Velg..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="null"><em>Fjern valg / Ikke tildelt</em></SelectItem>
                    {userList.map((user) => (<SelectItem key={user.id} value={user.id.toString()}>{user.navn || user.email}</SelectItem>))}
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-lg max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle>Rediger Saksinformasjon</DialogTitle>
                    <DialogDescription>Oppdater felter for garantisaken. Kun endrede felter vil bli lagret.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 overflow-y-auto pr-2 scrollbar-thin">
                    {isLoadingUsers && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> <span className="ml-2 text-muted-foreground">Laster brukerdata...</span></div>}
                    {!isLoadingUsers && (
                        <>
                            <h4 className="font-medium text-sm text-muted-foreground border-b pb-1 mb-3">Ansvarlige</h4>
                            {renderUserSelect("ansvarligRaadgiverId", "Ansvarlig Rådgiver", raadgivere, editedData.ansvarligRaadgiverId)}
                            {renderUserSelect("uwAnsvarligId", "UW Ansvarlig", uwAnsvarlige, editedData.uwAnsvarligId)}
                            {renderUserSelect("produksjonsansvarligId", "Produksjonsansvarlig", produksjonsAnsvarlige, editedData.produksjonsansvarligId)}

                            <h4 className="font-medium text-sm text-muted-foreground border-b pb-1 mb-3 pt-2">Økonomi og Produkt</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5"><Label htmlFor="ramme">Ramme</Label><Input id="ramme" name="ramme" value={editedData.ramme || ''} onChange={handleChange} placeholder="Økonomisk ramme" disabled={isSaving} /></div>
                                <div className="space-y-1.5"><Label htmlFor="produkt">Produkt</Label><Input id="produkt" name="produkt" value={editedData.produkt || ''} onChange={handleChange} placeholder="Type garanti/produkt" disabled={isSaving} /></div>
                            </div>
                            <div className="space-y-1.5 mt-3"><Label htmlFor="kundenummerWims">Kundenummer Wims</Label><Input id="kundenummerWims" name="kundenummerWims" value={editedData.kundenummerWims || ''} onChange={handleChange} disabled={isSaving} /></div>

                            <h4 className="font-medium text-sm text-muted-foreground border-b pb-1 mb-3 pt-2">Kontaktperson</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5"><Label htmlFor="kontaktpersonNavn">Navn kontaktperson</Label><Input id="kontaktpersonNavn" name="kontaktpersonNavn" value={editedData.kontaktpersonNavn || ''} onChange={handleChange} disabled={isSaving} /></div>
                                <div className="space-y-1.5"><Label htmlFor="kontaktpersonTelefon">Telefon kontaktperson</Label><Input id="kontaktpersonTelefon" name="kontaktpersonTelefon" value={editedData.kontaktpersonTelefon || ''} onChange={handleChange} disabled={isSaving} /></div>
                            </div>

                            <h4 className="font-medium text-sm text-muted-foreground border-b pb-1 mb-3 pt-2">Intern Kommentar</h4>
                            <div className="space-y-1.5">
                                <Label htmlFor="kommentarIntern">Intern Kommentar</Label>
                                <Textarea id="kommentarIntern" name="kommentarIntern" value={editedData.kommentarIntern || ''} onChange={handleChange} placeholder="Skriv intern kommentar..." rows={4} disabled={isSaving} />
                            </div>
                        </>
                    )}
                    {error && <p className="text-sm text-destructive mt-3 p-2 bg-destructive/10 rounded-md text-center">{error}</p>}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Avbryt</Button></DialogClose>
                    <Button type="button" onClick={handleSave} disabled={isSaving || isLoadingUsers}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} <SaveIcon className="mr-2 h-4 w-4" />
                        Lagre Endringer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default GarantiSakEditModal; 