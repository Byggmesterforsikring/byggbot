import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../../ui/dialog.jsx";
import { Button } from "../../ui/button.jsx";
import { Input } from "../../ui/input.jsx";
import { Label } from "../../ui/label.jsx";
import { Textarea } from "../../ui/textarea.jsx";
import { RadioGroup, RadioGroupItem } from "../../ui/toggle-group.jsx";
import { Separator } from "../../ui/separator.jsx";
import { Copy, Check, ThumbsUp, ThumbsDown, AlertCircle, ExternalLink, CheckCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "../../ui/alert.jsx";
import { Card } from "../../ui/card.jsx";

const CopyButton = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!textToCopy) return;
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500); // Reset after 1.5 seconds
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Handle error (e.g., show a toast message)
        }
    };

    return (
        <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7 ml-2" aria-label="Kopier">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
        </Button>
    );
};

function InvoiceResultDialog({ isOpen, onClose, invoiceData, pdfFile }) {
    const [feedbackStatus, setFeedbackStatus] = useState(null); // 'correct' or 'incorrect'
    const [feedbackDetails, setFeedbackDetails] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [debugPdfBlob, setDebugPdfBlob] = useState(null);
    const [feedbackSuccess, setFeedbackSuccess] = useState(false); // For å vise bekreftelse inni dialogen
    const [error, setError] = useState(null);

    useEffect(() => {
        // Reset state when dialog opens with new data
        if (isOpen) {
            console.log('[InvoiceResultDialog] useEffect - Mottatt props:', {
                invoiceId: invoiceData?.id,
                pdfFileName: pdfFile?.name,
                pdfFileSize: pdfFile?.size,
                pdfFileType: pdfFile?.type,
                pdfFileInstance: pdfFile instanceof File ? 'File' : (pdfFile instanceof Blob ? 'Blob' : typeof pdfFile)
            });

            // Tilbakestill states
            setFeedbackStatus(invoiceData?.feedback_status || null);
            setFeedbackDetails(invoiceData?.feedback_details || '');
            setIsSubmittingFeedback(false);
            setFeedbackSuccess(false);
            setError(null);

            // Lagre selve Blob/File objektet for nedlasting og åpning
            if (pdfFile && (pdfFile instanceof File || pdfFile instanceof Blob)) {
                setDebugPdfBlob(pdfFile);
            } else if (pdfFile) {
                console.error('[InvoiceResultDialog] Mottatt pdfFile er ikke et File eller Blob objekt:', pdfFile);
                setDebugPdfBlob(null);
            } else {
                console.log('[InvoiceResultDialog] Ingen pdfFile mottatt.');
                setDebugPdfBlob(null);
            }
        }
    }, [isOpen, invoiceData, pdfFile]);

    const handleFeedbackSubmit = async () => {
        if (!invoiceData || !invoiceData.id || !feedbackStatus) {
            console.error("Missing data for feedback submission");
            return;
        }

        setIsSubmittingFeedback(true);
        console.log("Submitting feedback via IPC:", { invoiceId: invoiceData.id, feedbackStatus, feedbackDetails });

        try {
            if (!window.electron || !window.electron.invoice || !window.electron.invoice.saveFeedback) {
                throw new Error('Electron invoice feedback API not available.');
            }

            const result = await window.electron.invoice.saveFeedback({
                invoiceId: invoiceData.id,
                feedbackStatus,
                feedbackDetails: feedbackStatus === 'incorrect' ? feedbackDetails : null
            });

            if (result && result.success) {
                console.log("Feedback submitted successfully:", result.data);

                // Sett tilstand for å vise suksessmelding
                setFeedbackSuccess(true);

                // Vent litt før vi lukker dialogen så brukeren ser bekreftelsen
                setTimeout(() => {
                    // Lukk dialogen etter at brukeren har sett bekreftelsen
                    onClose();

                    // Tilbakestill tilstanden etter at dialogen er lukket
                    setTimeout(() => {
                        setFeedbackSuccess(false);
                    }, 300);
                }, 2000);
            } else {
                console.error("Error submitting feedback:", result?.error || 'Unknown backend error');
                // Vi bruker Alert-komponenten i stedet for alert()
                setIsSubmittingFeedback(false);
                throw new Error(result?.error || 'Ukjent feil ved lagring av tilbakemelding');
            }
        } catch (error) {
            console.error("Error calling feedback IPC handler:", error);

            // Vis feilmelding til brukeren med Alert-komponenten (håndteres i render)
            setError(error.message || 'Ukjent feil ved lagring av tilbakemelding');
            setIsSubmittingFeedback(false);
        }
    };

    // Funksjon for å åpne PDF i ekstern leser
    const handleOpenPdf = useCallback(async () => {
        if (!debugPdfBlob) {
            console.error('Kan ikke åpne: debugPdfBlob er null.');
            alert('Ingen PDF-data tilgjengelig for visning.');
            return;
        }

        try {
            // Hvis vi har electron API tilgjengelig, bruk det
            if (window.electron && window.electron.pdf) {
                // Konverter blob til ArrayBuffer
                const arrayBuffer = await debugPdfBlob.arrayBuffer();

                // Kall IPC-funksjonen for å åpne PDF
                console.log('Sender PDF-data til main process for å åpne i ekstern leser...');
                const result = await window.electron.pdf.openPdf({
                    arrayBuffer,
                    fileName: invoiceData?.file_name || 'invoice.pdf'
                });

                if (result.success) {
                    console.log('PDF åpnet i ekstern leser via Electron');
                } else {
                    console.error('Feil ved åpning av PDF via Electron:', result.error);
                    alert(`Kunne ikke åpne PDF: ${result.error}. Prøver alternativ metode...`);
                    // Fallback til nettleserbasert metode
                    openInBrowser();
                }
            } else {
                // Fallback til nettleserbasert metode
                openInBrowser();
            }
        } catch (error) {
            console.error('Feil ved åpning av PDF:', error);
            alert(`Kunne ikke åpne PDF: ${error.message}. Prøv nedlastingsknappen i stedet.`);
        }
    }, [debugPdfBlob, invoiceData?.file_name]);

    // Hjelpefunksjon for å åpne i nettleser
    const openInBrowser = useCallback(() => {
        try {
            // Lag en midlertidig URL for å åpne filen
            const objectUrl = URL.createObjectURL(debugPdfBlob);
            console.log('Åpner PDF i nettleser med URL:', objectUrl);

            // Åpne i ny fane
            window.open(objectUrl, '_blank');

            // Frigjør URL-en etter en kort forsinkelse
            setTimeout(() => {
                URL.revokeObjectURL(objectUrl);
                console.log('Nettleser URL frigjort');
            }, 1000);
        } catch (browserError) {
            console.error('Feil ved nettleseråpning:', browserError);
            alert('Kunne ikke åpne PDF i nettleser. Prøv nedlastingsknappen i stedet.');
        }
    }, [debugPdfBlob]);

    if (!invoiceData) return null;

    const dataFields = [
        { label: 'Skadenummer', value: invoiceData.skadenummer },
        { label: 'Reg.nr', value: invoiceData.registreringsnummer },
        { label: 'KID', value: invoiceData.kid },
        { label: 'Kontonummer', value: invoiceData.kontonummer },
        { label: 'Beløp', value: invoiceData.beloep ? `${parseFloat(invoiceData.beloep).toFixed(2)} kr` : 'N/A' },
        { label: 'Mottaker Navn', value: invoiceData.mottaker_navn },
        { label: 'Gateadresse', value: invoiceData.mottaker_gateadresse },
        { label: 'Postnummer', value: invoiceData.mottaker_postnummer },
        { label: 'Poststed', value: invoiceData.mottaker_poststed },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
            <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Resultat for {invoiceData.file_name}</DialogTitle>
                    <DialogDescription>
                        Se gjennom data ekstrahert fra fakturaen og gi tilbakemelding.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-row flex-grow overflow-hidden">
                    {/* Success Message */}
                    {feedbackSuccess && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                            <Card className="max-w-md p-6 animate-in fade-in zoom-in duration-300">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                        <CheckCircle className="h-6 w-6 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-green-700">Tilbakemelding lagret!</h3>
                                    <p className="text-gray-600">
                                        Takk for din tilbakemelding. Den er nå registrert i systemet.
                                    </p>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <Alert variant="destructive" className="mb-4 mx-4 mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Feil</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Extracted Data & Feedback */}
                    <div className="w-full flex flex-col overflow-y-auto p-4 space-y-4">
                        <h3 className="text-lg font-semibold">Ekstraherte data</h3>
                        <div className="space-y-3">
                            {dataFields.map(field => (
                                <div key={field.label} className="flex items-center justify-between">
                                    <Label className="font-medium">{field.label}:</Label>
                                    <div className="flex items-center">
                                        <span className="text-sm text-muted-foreground mr-1 truncate" title={field.value || 'Ikke funnet'}>
                                            {field.value || <span className="italic text-xs">Ikke funnet</span>}
                                        </span>
                                        {field.value && <CopyButton textToCopy={field.value} />}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Viser advarsel hvis adresseinformasjon mangler */}
                        {!invoiceData.mottaker_gateadresse && !invoiceData.mottaker_postnummer && !invoiceData.mottaker_poststed && (
                            <Alert className="mt-2">
                                <AlertCircle className="h-4 w-4" />
                                <div>
                                    <h4 className="font-medium text-sm">Adresseinformasjon mangler</h4>
                                    <p className="text-xs">Fakturaen inneholder ikke en tydelig formatert adresse for mottaker.</p>
                                </div>
                            </Alert>
                        )}

                        {/* Knapp for å åpne faktura */}
                        {debugPdfBlob && (
                            <div className="pt-2">
                                <Button variant="secondary" onClick={handleOpenPdf} size="sm">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Åpne PDF i ekstern leser
                                </Button>
                            </div>
                        )}

                        <Separator />

                        <h3 className="text-lg font-semibold">Tilbakemelding</h3>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Input
                                    type="radio"
                                    id="feedback-correct"
                                    name="feedback"
                                    className="h-4 w-4"
                                    checked={feedbackStatus === 'correct'}
                                    onChange={() => setFeedbackStatus('correct')}
                                />
                                <Label htmlFor="feedback-correct" className="flex items-center cursor-pointer">
                                    <ThumbsUp className="h-4 w-4 mr-1 text-green-500" /> Korrekt
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Input
                                    type="radio"
                                    id="feedback-incorrect"
                                    name="feedback"
                                    className="h-4 w-4"
                                    checked={feedbackStatus === 'incorrect'}
                                    onChange={() => setFeedbackStatus('incorrect')}
                                />
                                <Label htmlFor="feedback-incorrect" className="flex items-center cursor-pointer">
                                    <ThumbsDown className="h-4 w-4 mr-1 text-red-500" /> Feil
                                </Label>
                            </div>
                        </div>

                        {feedbackStatus === 'incorrect' && (
                            <div className="space-y-1">
                                <Label htmlFor="feedback-details">Hva var feil?</Label>
                                <Textarea
                                    id="feedback-details"
                                    value={feedbackDetails}
                                    onChange={(e) => setFeedbackDetails(e.target.value)}
                                    placeholder="Beskriv kort hva som var feil med de ekstraherte dataene..."
                                    rows={3}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-4 border-t">
                    <Button variant="outline" onClick={onClose} disabled={isSubmittingFeedback}>Lukk</Button>
                    <Button
                        onClick={handleFeedbackSubmit}
                        disabled={!feedbackStatus || isSubmittingFeedback || (feedbackStatus === 'incorrect' && !feedbackDetails)}
                    >
                        {isSubmittingFeedback ? 'Lagrer...' : 'Lagre tilbakemelding'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default InvoiceResultDialog; 