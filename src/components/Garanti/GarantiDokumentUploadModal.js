import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '~/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { UploadCloud, FileText, XCircle, Loader2 } from 'lucide-react';
import authManager from '../../auth/AuthManager';
import { useToast } from '~/hooks/use-toast';

const DOKUMENT_TYPER = [
    "Kontrakt", "Regnskap", "Midlertidig regnskap", "Balanserapport",
    "Budsjett", "Likviditetsbudsjett", "Plantegninger", "E-post", "Annet"
];

function GarantiDokumentUploadModal({ isOpen, setIsOpen, entityContext, onUploadSuccess }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [dokumentType, setDokumentType] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    const onDrop = useCallback(acceptedFiles => {
        setError(null);
        if (acceptedFiles && acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            setSelectedFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => setFilePreview(e.target.result);
                reader.readAsDataURL(file);
            } else {
                setFilePreview(null);
            }
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
    });

    const getOpplastetAvId = () => {
        const userDetails = authManager.getCurrentUserDetails();
        if (userDetails && userDetails.id) return userDetails.id;
        console.warn('UploadModal: Kunne ikke finne ID for innlogget bruker. Fallback til 1.');
        return 1;
    };

    const handleUpload = async () => {
        if (!selectedFile || !dokumentType || !entityContext || !entityContext.id || !entityContext.type) {
            setError("Vennligst velg en fil, en dokumenttype og sørg for at kontekst er satt.");
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            const opplastetAvBrukerId = getOpplastetAvId();
            if (!opplastetAvBrukerId) {
                throw new Error("Kunne ikke identifisere bruker for opplasting.");
            }

            const reader = new FileReader();
            reader.readAsArrayBuffer(selectedFile);
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const params = {
                        entityContext,
                        filData: {
                            buffer: arrayBuffer,
                            originaltFilnavn: selectedFile.name
                        },
                        dokumentType,
                        opplastetAvBrukerId,
                    };

                    if (window.electron && window.electron.garanti && window.electron.garanti.uploadDokument) {
                        const result = await window.electron.garanti.uploadDokument(params);
                        if (result.success) {
                            onUploadSuccess(result.data);
                            setIsOpen(false);
                            toast({
                                title: "Dokument Lastet Opp",
                                description: `${params.filData.originaltFilnavn} er lastet opp til ${entityContext.type} ID: ${entityContext.id}.`
                            });
                        } else {
                            throw new Error(result.error || "Ukjent feil ved opplasting av dokument.");
                        }
                    } else {
                        throw new Error("API for dokumentopplasting er ikke tilgjengelig.");
                    }
                } catch (uploadError) {
                    console.error("Feil under selve opplastingen:", uploadError);
                    toast({ title: "Opplastingsfeil", description: uploadError.message, variant: "destructive" });
                    setError(uploadError.message);
                    setIsUploading(false);
                }
            };
            reader.onerror = (fileError) => {
                console.error("Feil ved lesing av fil:", fileError);
                setError("Kunne ikke lese filen som ble valgt.");
                setIsUploading(false);
            }

        } catch (err) {
            console.error("Feil før opplasting kunne starte:", err);
            toast({ title: "Opplastingsfeil", description: err.message, variant: "destructive" });
            setError(err.message);
            setIsUploading(false);
        }
    };

    const resetForm = () => {
        setSelectedFile(null);
        setFilePreview(null);
        setDokumentType('');
        setIsUploading(false);
        setError(null);
    }

    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsOpen(open); }}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Last opp nytt dokument</DialogTitle>
                    <DialogDescription>
                        Velg en fil og spesifiser dokumenttypen.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div
                        {...getRootProps()}
                        className={`p-6 border-2 border-dashed rounded-md text-center cursor-pointer transition-colors
                        ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-input'}`}
                    >
                        <input {...getInputProps()} />
                        <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                        {isDragActive ? (
                            <p className="text-sm text-muted-foreground">Slipp filen her...</p>
                        ) : (
                            <p className="text-sm text-muted-foreground">Dra og slipp en fil her, eller klikk for å velge</p>
                        )}
                    </div>

                    {selectedFile && (
                        <div className="border p-3 rounded-md bg-muted/10">
                            <div className="flex items-center justify-between">
                                <div className='flex items-center space-x-2 overflow-hidden'>
                                    {filePreview ? (
                                        <img src={filePreview} alt="Preview" className="h-10 w-10 object-cover rounded flex-shrink-0" />
                                    ) : (
                                        <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <div className="truncate">
                                        <p className="text-sm font-medium truncate" title={selectedFile.name}>{selectedFile.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {(selectedFile.size / 1024).toFixed(1)} KB - {selectedFile.type || 'Ukjent filtype'}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => { setSelectedFile(null); setFilePreview(null); }} className="text-destructive hover:bg-destructive/10 h-7 w-7 flex-shrink-0">
                                    <XCircle size={18} />
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="grid items-center gap-1.5">
                        <Label htmlFor="dokumentType">Dokumenttype *</Label>
                        <Select value={dokumentType} onValueChange={setDokumentType} disabled={isUploading}>
                            <SelectTrigger id="dokumentType" className={!dokumentType ? "text-muted-foreground" : ""}>
                                <SelectValue placeholder="Velg type..." />
                            </SelectTrigger>
                            <SelectContent>
                                {DOKUMENT_TYPER.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive text-center py-1 px-2 bg-destructive/10 rounded-md">{error}</p>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isUploading}>Avbryt</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleUpload} disabled={isUploading || !selectedFile || !dokumentType}>
                        {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isUploading ? 'Laster opp...' : 'Last opp'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default GarantiDokumentUploadModal; 