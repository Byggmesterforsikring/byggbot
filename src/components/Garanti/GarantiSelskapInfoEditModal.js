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

// Hjelpefunksjoner for beløpsformatering
const formatAmountForDisplay = (amount) => {
    if (!amount || amount === '' || amount === '0') return '';
    const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d]/g, '')) : amount;
    if (isNaN(numAmount) || numAmount === 0) return '';
    return `Kr. ${numAmount.toLocaleString('nb-NO')}`;
};

const parseAmountFromInput = (input) => {
    if (!input) return '';
    // Fjern alt som ikke er tall
    const numericValue = input.replace(/[^\d]/g, '');
    return numericValue;
};

// Hjelpefunksjoner for telefonnummer
const validatePhoneNumber = (phoneNumber) => {
    if (!phoneNumber || phoneNumber.trim() === '') return { isValid: true, message: '' }; // Tomt er OK

    const cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // Sjekk for gyldige norske nummer
    if (cleaned.startsWith('+47')) {
        const number = cleaned.substring(3);
        if (number.length === 8 && /^\d{8}$/.test(number)) {
            return { isValid: true, message: '' };
        }
        return { isValid: false, message: 'Norske nummer med +47 må ha 8 siffer' };
    }

    // Norske nummer uten landkode
    if (cleaned.length === 8 && /^\d{8}$/.test(cleaned) && !cleaned.startsWith('+')) {
        return { isValid: true, message: '' };
    }

    // Gamle norske nummer (7 siffer)
    if (cleaned.length === 7 && /^\d{7}$/.test(cleaned) && !cleaned.startsWith('+')) {
        return { isValid: true, message: '' };
    }

    // Utenlandske nummer (må starte med + og ha minst 7 siffer)
    if (cleaned.startsWith('+') && cleaned.length >= 8) {
        const number = cleaned.substring(1);
        if (/^\d{7,15}$/.test(number)) { // 7-15 siffer er rimelig for internasjonale nummer
            return { isValid: true, message: '' };
        }
    }

    return {
        isValid: false,
        message: 'Ugyldig telefonnummer. Bruk 8 siffer (norsk) eller +landkode + nummer'
    };
};

const formatPhoneNumberForInput = (phoneNumber) => {
    if (!phoneNumber || phoneNumber === '') return '';

    const cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // Norske nummer med landkode (+47)
    if (cleaned.startsWith('+47')) {
        const number = cleaned.substring(3);
        if (number.length === 8) {
            return `+47 ${number.substring(0, 2)} ${number.substring(2, 4)} ${number.substring(4, 6)} ${number.substring(6, 8)}`;
        }
        return cleaned;
    }

    // Norske nummer uten landkode
    if (cleaned.length === 8 && !cleaned.startsWith('+')) {
        return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6, 8)}`;
    }

    // Gamle norske nummer (7 siffer)
    if (cleaned.length === 7 && !cleaned.startsWith('+')) {
        return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 5)} ${cleaned.substring(5, 7)}`;
    }

    // For utenlandske nummer, returner som det er
    return phoneNumber;
};

// Hjelpefunksjoner for Kundenummer WIMS
const validateKundenummerWims = (kundenummer) => {
    if (!kundenummer || kundenummer.trim() === '') return { isValid: true, message: '' }; // Tomt er OK

    const cleaned = kundenummer.replace(/\D/g, ''); // Fjern alt som ikke er tall

    if (cleaned.length === 5 && /^\d{5}$/.test(cleaned)) {
        return { isValid: true, message: '' };
    }

    return {
        isValid: false,
        message: 'Kundenummer WIMS må bestå av 5 siffer'
    };
};

const formatKundenummerWims = (kundenummer) => {
    if (!kundenummer) return '';
    // Fjern alt som ikke er tall og begrens til 5 siffer
    return kundenummer.replace(/\D/g, '').substring(0, 5);
};

function GarantiSelskapInfoEditModal({ isOpen, setIsOpen, currentSakData, onUpdate }) {
    const [editedData, setEditedData] = useState({
        kundenummerWims: '',
        ramme: '',
        kontaktpersonNavn: '',
        kontaktpersonTelefon: ''
    });
    const [displayRamme, setDisplayRamme] = useState(''); // For formatert visning av ramme
    const [displayPhone, setDisplayPhone] = useState(''); // For formatert visning av telefon
    const [phoneValidation, setPhoneValidation] = useState({ isValid: true, message: '' });
    const [wimsValidation, setWimsValidation] = useState({ isValid: true, message: '' });
    const [allUsersV2, setAllUsersV2] = useState([]); // For getCurrentUserV2Id
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    useEffect(() => {
        if (currentSakData && isOpen) {
            setEditedData({
                kundenummerWims: currentSakData.kundenummerWims || '',
                ramme: currentSakData.ramme || '',
                kontaktpersonNavn: currentSakData.kontaktpersonNavn || '',
                kontaktpersonTelefon: currentSakData.kontaktpersonTelefon || ''
            });
            // Sett formatert visning av ramme
            setDisplayRamme(formatAmountForDisplay(currentSakData.ramme));
            setDisplayPhone(formatPhoneNumberForInput(currentSakData.kontaktpersonTelefon));

            // Valider eksisterende telefonnummer og kundenummer
            const phoneValidationResult = validatePhoneNumber(currentSakData.kontaktpersonTelefon);
            setPhoneValidation(phoneValidationResult);

            const wimsValidationResult = validateKundenummerWims(currentSakData.kundenummerWims);
            setWimsValidation(wimsValidationResult);
        } else if (!isOpen) {
            setError(null);
            setPhoneValidation({ isValid: true, message: '' });
            setWimsValidation({ isValid: true, message: '' });
        }
    }, [isOpen, currentSakData]);

    useEffect(() => {
        const fetchAllV2Users = async () => {
            if (!isOpen || allUsersV2.length > 0) return;
            try {
                const result = await window.electron.garanti.getUsersV2();
                if (result.success && Array.isArray(result.data)) setAllUsersV2(result.data);
            } catch (e) { console.error("SelskapInfoEditModal: Feil ved henting av V2-brukere:", e); }
        };
        fetchAllV2Users();
    }, [isOpen, allUsersV2.length]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'ramme') {
            // Spesiell håndtering for ramme-feltet - formater direkte mens bruker skriver
            const numericValue = parseAmountFromInput(value);
            setEditedData(prev => ({ ...prev, [name]: numericValue }));
            // Formater direkte for visning
            setDisplayRamme(formatAmountForDisplay(numericValue));
        } else if (name === 'kontaktpersonTelefon') {
            // Spesiell håndtering for telefon-feltet
            const cleanedPhone = value.replace(/[^\d+]/g, ''); // Lagrer ren versjon
            setEditedData(prev => ({ ...prev, [name]: cleanedPhone }));

            // Valider telefonnummer
            const validation = validatePhoneNumber(value);
            setPhoneValidation(validation);

            // Formater for visning
            setDisplayPhone(formatPhoneNumberForInput(value));
        } else if (name === 'kundenummerWims') {
            // Spesiell håndtering for kundenummer WIMS
            const formattedWims = formatKundenummerWims(value);
            setEditedData(prev => ({ ...prev, [name]: formattedWims }));

            // Valider kundenummer
            const validation = validateKundenummerWims(formattedWims);
            setWimsValidation(validation);
        } else {
            setEditedData(prev => ({ ...prev, [name]: value }));
        }
    };

    const getCurrentUserV2Id = useCallback(() => {
        const currentUserDetails = authManager.getCurrentUserDetails();
        if (currentUserDetails?.email && allUsersV2.length > 0) {
            const loggedInUserEmail = currentUserDetails.email.toLowerCase();
            const matchedUser = allUsersV2.find(u => u.email?.toLowerCase() === loggedInUserEmail);
            if (matchedUser) return matchedUser.id;
        }
        console.warn('[GarantiSelskapInfoEditModal] Kunne ikke finne V2 ID for innlogget bruker. Fallback til 1.', { currentUserDetails, allUsersV2 });
        return 1; // Fallback
    }, [allUsersV2]);

    const handleSave = async () => {
        setIsLoading(true); setError(null);

        // Valider telefonnummer og kundenummer før lagring
        if (!phoneValidation.isValid) {
            setError(phoneValidation.message);
            setIsLoading(false);
            return;
        }

        if (!wimsValidation.isValid) {
            setError(wimsValidation.message);
            setIsLoading(false);
            return;
        }

        const endretAvId = getCurrentUserV2Id();
        const dataToUpdate = { ...editedData };

        let hasChanges = false;
        if (dataToUpdate.kundenummerWims !== (currentSakData.kundenummerWims || '')) hasChanges = true;
        if (dataToUpdate.ramme !== (currentSakData.ramme || '')) hasChanges = true;
        if (dataToUpdate.kontaktpersonNavn !== (currentSakData.kontaktpersonNavn || '')) hasChanges = true;
        if (dataToUpdate.kontaktpersonTelefon !== (currentSakData.kontaktpersonTelefon || '')) hasChanges = true;

        if (!hasChanges) {
            setIsLoading(false); setIsOpen(false);
            toast({ title: "Ingen Endringer", description: "Ingen endringer på selskapsinformasjon ble detektert.", duration: 1000 });
            return;
        }

        try {
            const result = await window.electron.garanti.updateSelskap({
                selskapId: currentSakData.id,
                dataToUpdate,
                endretAvBrukerId_UserV2: endretAvId
            });
            if (result.success) {
                onUpdate(result.data); setIsOpen(false);
                toast({ title: "Selskapsinformasjon Oppdatert", description: "Endringene er lagret.", duration: 2000 });
            } else { throw new Error(result.error || "Ukjent feil ved oppdatering."); }
        } catch (err) {
            setError(err.message);
            toast({ title: "Feil ved Lagring", description: err.message, variant: "destructive", duration: 3000 });
        } finally { setIsLoading(false); }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Rediger Selskapsinformasjon</DialogTitle>
                    <DialogDescription>Oppdater kundenummer, ramme og kontaktperson. Org.nr, selskapsnavn og adresseinfo hentes fra Brønnøysund og kan ikke endres her.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="ramme">Ramme</Label>
                        <Input id="ramme" name="ramme" value={displayRamme || ''} onChange={handleChange} disabled={isLoading} placeholder="Eks: 1000000" />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="kontaktpersonNavn">Kontaktperson Navn</Label>
                        <Input id="kontaktpersonNavn" name="kontaktpersonNavn" value={editedData.kontaktpersonNavn || ''} onChange={handleChange} disabled={isLoading} />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="kontaktpersonTelefon">Kontaktperson Telefon</Label>
                        <Input
                            id="kontaktpersonTelefon"
                            name="kontaktpersonTelefon"
                            value={displayPhone || ''}
                            onChange={handleChange}
                            disabled={isLoading}
                            placeholder="Eks: 12 34 56 78 eller +47 12 34 56 78"
                        />
                        {!phoneValidation.isValid && (
                            <p className="text-xs text-destructive mt-1">{phoneValidation.message}</p>
                        )}
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="kundenummerWims">Kundenummer Wims</Label>
                        <Input id="kundenummerWims" name="kundenummerWims" value={editedData.kundenummerWims || ''} onChange={handleChange} disabled={isLoading} placeholder="5 siffer" maxLength="5" />
                        {!wimsValidation.isValid && (
                            <p className="text-xs text-destructive mt-1">{wimsValidation.message}</p>
                        )}
                    </div>
                    {error && <p className="text-sm text-destructive mt-3 p-2 bg-destructive/10 rounded-md text-center">{error}</p>}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline" disabled={isLoading}>Avbryt</Button></DialogClose>
                    <Button type="button" onClick={handleSave} disabled={isLoading || !phoneValidation.isValid || !wimsValidation.isValid}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Lagre Endringer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default GarantiSelskapInfoEditModal; 