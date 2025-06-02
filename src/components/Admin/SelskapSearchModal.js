import React, { useState, useCallback } from 'react';
import { Button } from '~/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Loader2, Search, XCircle } from 'lucide-react';
import { useToast } from '~/hooks/use-toast';

function SelskapSearchModal({ isOpen, setIsOpen, onSelskapSelected }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    const handleSearch = useCallback(async () => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const result = await window.electron.garanti.findSelskap(searchTerm);
            if (result.success) {
                setSearchResults(result.data || []);
                if ((result.data || []).length === 0) {
                    toast({ title: "Ingen treff", description: `Fant ingen selskaper for "${searchTerm}".`, variant: "default" });
                }
            } else {
                throw new Error(result.error || 'Ukjent feil ved selskapsøk.');
            }
        } catch (err) {
            console.error("Feil ved selskapsøk i modal:", err);
            setError(err.message);
            toast({ title: "Søkefeil", description: err.message, variant: "destructive" });
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, toast]);

    const handleSelectSelskap = (selskap) => {
        onSelskapSelected(selskap); // Sender hele selskapsobjektet tilbake
        // setIsOpen(false); // Lukkes av onOpenChange i Dialog
    };

    // Lukk og reset når modalen lukkes
    const handleOpenChange = (open) => {
        if (!open) {
            setSearchTerm('');
            setSearchResults([]);
            setError(null);
        }
        setIsOpen(open);
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Søk og Velg Selskap</DialogTitle>
                    <DialogDescription>
                        Søk etter organisasjonsnummer, selskapsnavn eller kundenummer.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3">
                    <div className="flex items-center space-x-2">
                        <Input
                            type="text"
                            placeholder="Søk..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button type="button" onClick={handleSearch} disabled={isLoading || !searchTerm.trim()}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </div>

                    {error && <p className="text-sm text-destructive">Søkefeil: {error}</p>}

                    {searchResults.length > 0 && (
                        <ScrollArea className="h-[200px] border rounded-md p-2">
                            <div className="space-y-1">
                                {searchResults.map(selskap => (
                                    <div
                                        key={selskap.id}
                                        className="p-2 hover:bg-muted rounded-md cursor-pointer text-sm"
                                        onClick={() => handleSelectSelskap(selskap)}
                                    >
                                        <p className="font-medium">{selskap.selskapsnavn}</p>
                                        <p className="text-xs text-muted-foreground">Org.nr: {selskap.organisasjonsnummer} {selskap.kundenummerWims ? `| WIMS: ${selskap.kundenummerWims}` : ''}</p>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                    {!isLoading && searchResults.length === 0 && searchTerm.trim() !== '' && !error && (
                        <p className="text-sm text-center text-muted-foreground py-4">Ingen selskaper funnet for "{searchTerm}".</p>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Lukk</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default SelskapSearchModal; 