import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from "../../ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card.jsx";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert.jsx";
import { UploadCloud, FileText, XCircle, Copy, AlertTriangle, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'; // La til ChevronDown, ChevronUp og HelpCircle icons
import InvoiceResultDialog from './InvoiceResultDialog'; // <-- Import the dialog component

// Ekspanderbar guide-komponent
function ProsessGuide() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mb-6 border rounded-md">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-t-md font-medium"
            >
                <div className="flex items-center">
                    <HelpCircle className="h-5 w-5 mr-2" />
                    <span>Slik bruker du faktura-opplasteren (klikk for å se)</span>
                </div>
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>

            {isExpanded && (
                <div className="p-4 border-t">
                    <h3 className="font-bold text-lg mb-3">Trinn-for-trinn guide</h3>

                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-md mb-1 flex items-center">
                                <span className="bg-blue-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">1</span>
                                Last opp faktura
                            </h4>
                            <p className="ml-8 text-gray-700">
                                Dra og slipp PDF-filen i opplastingsområdet, eller klikk for å velge fil fra datamaskinen.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-md mb-1 flex items-center">
                                <span className="bg-blue-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">2</span>
                                Vent på behandling
                            </h4>
                            <p className="ml-8 text-gray-700">
                                Systemet leser automatisk fakturainformasjonen ved hjelp av OCR-teknologi. Dette tar kun noen sekunder.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-md mb-1 flex items-center">
                                <span className="bg-blue-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">3</span>
                                Kontroller dataen
                            </h4>
                            <p className="ml-8 text-gray-700">
                                Klikk på "Se detaljer" for å åpne fakturaen og kontrollere at all informasjon er riktig lest.
                                <strong className="block mt-1">VIKTIG: Du MÅ kontrollere alle feltene nøye!</strong>
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-md mb-1 flex items-center">
                                <span className="bg-blue-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">4</span>
                                Kopier til fagsystem
                            </h4>
                            <p className="ml-8 text-gray-700">
                                Klikk på <Copy className="h-4 w-4 inline" />-ikonet ved siden av feltene for å kopiere verdiene direkte til utklippstavlen.
                                Du kan så lime inn i ditt fagsystem.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-md mb-1 flex items-center">
                                <span className="bg-blue-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">5</span>
                                Gi tilbakemelding
                            </h4>
                            <p className="ml-8 text-gray-700">
                                Hvis det er feil i utlesningen, korriger feilene i dialogen. Dine korrigeringer blir automatisk registrert og
                                brukt til å forbedre systemet.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FakturaUploader() {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [error, setError] = useState(null);
    const [selectedInvoiceData, setSelectedInvoiceData] = useState(null); // State for dialog data
    const [selectedPdfFile, setSelectedPdfFile] = useState(null); // State for PDF file to show in dialog

    const onDrop = useCallback(acceptedFiles => {
        setError(null); // Clear previous errors
        console.log('[onDrop] Accepted files:', acceptedFiles);

        const processedFiles = acceptedFiles.map(file => {
            console.log(`[onDrop] Processing file: ${file.name}, Type: ${file.type}`);
            if (file.type === 'application/pdf') {
                return { file, type: 'pdf', status: 'ready' };
            } else {
                console.warn(`[onDrop] Unsupported file type: ${file.name}`);
                return { file, type: 'unsupported', status: 'error', message: 'Filtypen støttes ikke.' };
            }
        });

        const filesToProcess = processedFiles.filter(f => f.status === 'ready');
        console.log('[onDrop] Files marked as ready for processing:', filesToProcess.map(f => f.file.name));

        setUploadedFiles(prevFiles => [...prevFiles, ...processedFiles.filter(f => f.status !== 'error')]);

        const unsupportedFiles = processedFiles.filter(f => f.status === 'error');
        if (unsupportedFiles.length > 0) {
            setError(`Filtypen(e) ${unsupportedFiles.map(f => f.file.name).join(', ')} støttes ikke. Kun PDF er tillatt.`);
        }

        if (filesToProcess.length > 0) {
            console.log('[onDrop] Calling processFiles...');
            processFiles(filesToProcess);
        } else {
            console.log('[onDrop] No files to process.');
        }

    }, []);

    const processFiles = (filesToProcess) => {
        console.log('[processFiles] Starting processing for:', filesToProcess.map(f => f.file.name));
        filesToProcess.forEach(item => {
            console.log(`[processFiles] Routing file: ${item.file.name}, Type: ${item.type}`);
            if (item.type === 'pdf') {
                handlePdfFile(item.file);
            }
        });
    }

    const handlePdfFile = (pdfFile) => {
        console.log('Handling PDF file:', pdfFile.name, 'Size:', pdfFile.size, 'Type:', pdfFile.type);

        // Validering av file-objektet
        if (!pdfFile || !pdfFile.size) {
            console.error(`Ugyldig PDF-fil: ${pdfFile ? pdfFile.name : 'ukjent'}`);
            setError(`Ugyldig PDF-fil: ${pdfFile ? pdfFile.name : 'ukjent'}`);
            return;
        }

        setUploadedFiles(prev => prev.map(f =>
            (f.file === pdfFile)
                ? { ...f, status: 'pending_upload' }
                : f
        ));

        processAndSendFile(pdfFile);
    };

    // Ny implementasjon som leser filen på en mer robust måte
    const processAndSendFile = async (pdfFile) => {
        try {
            console.log(`Starter prosessering av ${pdfFile.name} (${pdfFile.size} bytes)...`);

            // Les filen som en ArrayBuffer
            const fileArrayBuffer = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.onerror = (event) => {
                    console.error('FileReader error:', event);
                    reject(new Error(`Feil ved lesing av fil: ${reader.error?.message || 'Ukjent feil'}`));
                };
                reader.readAsArrayBuffer(pdfFile);
            });

            console.log(`Fil lest som ArrayBuffer: ${fileArrayBuffer.byteLength} bytes`);

            // Sjekk PDF-header
            const headerView = new Uint8Array(fileArrayBuffer, 0, 5);
            const isPdfHeader = headerView[0] === 0x25 && // %
                headerView[1] === 0x50 && // P
                headerView[2] === 0x44 && // D
                headerView[3] === 0x46;   // F

            if (!isPdfHeader) {
                console.warn(`Filen ${pdfFile.name} ser ikke ut til å være en PDF. Første bytes:`,
                    Array.from(headerView).map(b => b.toString(16)).join(' '));
            }

            // Send til backend
            if (!window.electron?.invoice?.upload) {
                throw new Error('Electron invoice API ikke tilgjengelig');
            }

            // Konverter ArrayBuffer til Base64 for lagring i DB
            const base64Data = arrayBufferToBase64(fileArrayBuffer);
            console.log(`ArrayBuffer konvertert til Base64: ${base64Data.substring(0, 50)}... (${base64Data.length} tegn)`);

            console.log(`Sender ${pdfFile.name} (${fileArrayBuffer.byteLength} bytes) til backend via IPC...`);
            // Oppdatert for å inkludere base64Data i kallet, slik at PDF-filen kan lagres i databasen
            const result = await window.electron.invoice.upload(pdfFile.name, fileArrayBuffer, base64Data);

            // Håndter resultatet
            if (result.success) {
                console.log(`Fil ${pdfFile.name} ble behandlet vellykket:`, result);
                setUploadedFiles(prev => prev.map(f =>
                    (f.file === pdfFile)
                        ? { ...f, status: 'processed', resultData: result.data, pdfToShow: pdfFile }
                        : f
                ));
                setError(null);
            } else {
                console.error(`Feil ved prosessering av ${pdfFile.name}:`, result.error);
                setError(`Feil under prosessering av ${pdfFile.name}: ${result.error}`);
                setUploadedFiles(prev => prev.map(f =>
                    (f.file === pdfFile)
                        ? { ...f, status: 'error', message: result.error }
                        : f
                ));
            }
        } catch (error) {
            console.error(`Uventet feil ved prosessering av ${pdfFile.name}:`, error);
            setError(`Feil ved opplasting av ${pdfFile.name}: ${error.message}`);
            setUploadedFiles(prev => prev.map(f =>
                (f.file === pdfFile)
                    ? { ...f, status: 'error', message: error.message }
                    : f
            ));
        }
    };

    // Hjelpefunksjon for å konvertere ArrayBuffer til Base64
    const arrayBufferToBase64 = (buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf']
        },
        multiple: true
    });

    const removeFile = (fileToRemove) => {
        setUploadedFiles(prevFiles => prevFiles.filter(item => item.file !== fileToRemove));
    };

    // Function to open the dialog with processed data and the PDF file
    const viewProcessedData = (invoiceData, pdfFile) => {
        // Logg hvilket filobjekt som sendes
        console.log('[viewProcessedData] Åpner dialog for:', invoiceData?.file_name);
        console.log('[viewProcessedData] Sender pdfFile objekt:', {
            name: pdfFile?.name,
            size: pdfFile?.size,
            type: pdfFile?.type,
            instance: pdfFile instanceof File ? 'File' : (pdfFile instanceof Blob ? 'Blob' : typeof pdfFile)
        });

        setSelectedInvoiceData(invoiceData);
        setSelectedPdfFile(pdfFile); // Her settes state som brukes som prop
    }

    const closeDialog = () => {
        setSelectedInvoiceData(null);
        setSelectedPdfFile(null);
    }

    return (
        <Card className="w-full max-w-2xl mx-auto mt-8">
            <CardHeader>
                <CardTitle>Last opp faktura (PDF)</CardTitle>
            </CardHeader>
            <CardContent>
                {/* BETA-advarsel */}
                <Alert variant="warning" className="mb-6 border-2 border-amber-500 bg-amber-50">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="text-amber-800 font-bold text-lg">BETA-VERSJON</AlertTitle>
                    <AlertDescription className="text-amber-800">
                        <p className="mb-2">Dette er en testversjon av vår automatiske fakturalesesystem. Slik fungerer det:</p>
                        <ul className="list-disc pl-5 space-y-1 mb-2">
                            <li><strong>VIKTIG:</strong> Du MÅ kontrollere alle opplysninger som hentes ut fra fakturaen.</li>
                            <li>Systemet vil forsøke å lese fakturadata med OCR-teknologi.</li>
                            <li>Dine tilbakemeldinger blir registrert og analysert automatisk.</li>
                            <li>Du kan kopiere data til fagsystemet ved å klikke på <Copy className="h-4 w-4 inline" /> -ikonet.</li>
                        </ul>
                        <p>Når brukere har gjort noen hundre kvalitetskontroller, vil vi vurdere hvor høy treffprosenten er for automatisering.</p>
                    </AlertDescription>
                </Alert>

                {/* Prosess guide */}
                <ProsessGuide />

                <div
                    {...getRootProps()}
                    className={`p-10 border-2 border-dashed rounded-md text-center cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                >
                    <input {...getInputProps()} />
                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                    {isDragActive ? (
                        <p className="mt-2 text-sm text-gray-600">Slipp filene her...</p>
                    ) : (
                        <p className="mt-2 text-sm text-gray-600">Dra og slipp PDF-filer her, eller klikk for å velge filer</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Kun .pdf filer aksepteres</p>
                </div>

                {error && (
                    <Alert variant="destructive" className="mt-4">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Feil</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {uploadedFiles.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-lg font-medium mb-2">Valgte filer:</h3>
                        <ul className="space-y-2">
                            {uploadedFiles.map((item, index) => (
                                <li key={index} className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                                    <div className="flex items-center space-x-2 overflow-hidden">
                                        <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                                        <span className="text-sm font-medium truncate" title={item.file.name}>
                                            {item.file.name}
                                        </span>
                                        <span className="text-xs text-gray-500 flex-shrink-0">({(item.file.size / 1024).toFixed(1)} KB)</span>
                                        {/* Status indicators */}
                                        {item.status === 'pending_upload' && <span className="text-xs text-blue-600">(Prosesseres...)</span>}
                                        {item.status === 'processed' && <span className="text-xs text-green-600">(Prosessert)</span>}
                                        {item.status === 'error' && <span className="text-xs text-red-600 truncate" title={item.message || 'Feil'}>({item.message || 'Feil'})</span>}
                                    </div>
                                    <div className="flex items-center flex-shrink-0 pl-2">
                                        {item.status === 'processed' && item.resultData && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const fileForDialog = item.pdfToShow || item.file;
                                                    console.log(`[Button onClick] For ${item.file.name}:`);
                                                    console.log(` - item.pdfToShow:`, item.pdfToShow ? { name: item.pdfToShow.name, size: item.pdfToShow.size, type: item.pdfToShow.type } : null);
                                                    console.log(` - item.file:`, item.file ? { name: item.file.name, size: item.file.size, type: item.file.type } : null);
                                                    console.log(` - Selected fileForDialog:`, fileForDialog ? { name: fileForDialog.name, size: fileForDialog.size, type: fileForDialog.type } : null);

                                                    if (!fileForDialog) {
                                                        console.error("INGEN FIL Å VISE I DIALOGEN!");
                                                        setError("Kunne ikke finne filen som skal vises i dialogen.");
                                                        return;
                                                    }
                                                    viewProcessedData(item.resultData, fileForDialog);
                                                }}
                                                className="mr-2 h-7 px-2 text-xs"
                                            >
                                                Se detaljer
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFile(item.file)}
                                            className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                                            aria-label="Fjern fil"
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Render the dialog */}
                <InvoiceResultDialog
                    isOpen={!!selectedInvoiceData}
                    onClose={closeDialog}
                    invoiceData={selectedInvoiceData}
                    pdfFile={selectedPdfFile}
                />

            </CardContent>
        </Card>
    );
}

export default FakturaUploader; 