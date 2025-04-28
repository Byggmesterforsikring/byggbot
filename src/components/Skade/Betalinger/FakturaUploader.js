import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import MsgReader from '@kenjiuno/msgreader';
import { Button } from "../../ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card.jsx";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert.jsx";
import { UploadCloud, FileText, XCircle } from 'lucide-react'; // Icons
import InvoiceResultDialog from './InvoiceResultDialog'; // <-- Import the dialog component

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
            } else if (file.name.toLowerCase().endsWith('.msg')) {
                return { file, type: 'msg', status: 'ready' };
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
            setError(`Filtypen(e) ${unsupportedFiles.map(f => f.file.name).join(', ')} støttes ikke. Kun PDF og MSG er tillatt.`);
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
            if (item.type === 'msg') {
                handleMsgFile(item.file);
            } else if (item.type === 'pdf') {
                handlePdfFile(item.file);
            }
        });
    }

    const handleMsgFile = (file) => {
        console.log('[handleMsgFile] Starting for:', file.name, 'Size:', file.size);
        setUploadedFiles(prev => prev.map(f =>
            f.file === file ? { ...f, status: 'pending_process' } : f
        ));

        // Bruk den nye tilnærmingen for å lese MSG-filer
        console.log('[handleMsgFile] Calling extractAndProcessMsgAttachments for:', file.name);
        extractAndProcessMsgAttachments(file).catch(error => {
            console.error(`[handleMsgFile] Feil ved behandling av MSG-fil ${file.name}:`, error);
            setError(`Feil ved behandling av MSG-fil ${file.name}: ${error.message}`);
            setUploadedFiles(prev => prev.map(f =>
                f.file === file ? { ...f, status: 'error', message: error.message } : f
            ));
        });
    };

    // Ny implementasjon for MSG-filhåndtering
    const extractAndProcessMsgAttachments = async (msgFile) => {
        try {
            console.log(`[extractAndProcessMsgAttachments] Starter for ${msgFile.name}...`);

            // Les MSG-filen som ArrayBuffer
            console.log(`[extractAndProcessMsgAttachments] Starter FileReader for ${msgFile.name}`);
            const msgArrayBuffer = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    console.log(`[extractAndProcessMsgAttachments] FileReader onload for ${msgFile.name}`);
                    resolve(event.target.result);
                };
                reader.onerror = (event) => {
                    console.error(`[extractAndProcessMsgAttachments] FileReader onerror for ${msgFile.name}`, reader.error);
                    reject(new Error(`Feil ved lesing av MSG-fil: ${reader.error?.message || 'Ukjent feil'}`));
                };
                try {
                    reader.readAsArrayBuffer(msgFile);
                } catch (readStartError) {
                    console.error(`[extractAndProcessMsgAttachments] Feil ved reader.readAsArrayBuffer for ${msgFile.name}`, readStartError);
                    reject(readStartError);
                }
            });

            console.log(`[extractAndProcessMsgAttachments] MSG-fil lest, ${msgArrayBuffer.byteLength} bytes. Starter MsgReader...`);

            // Bruk MsgReader for å hente ut vedlegg
            const msgReader = new MsgReader(msgArrayBuffer);
            const fileData = msgReader.getFileData();
            console.log(`[extractAndProcessMsgAttachments] MsgReader ferdig. Fant ${fileData.attachments?.length || 0} vedlegg.`);

            if (!fileData.attachments || fileData.attachments.length === 0) {
                throw new Error('Ingen vedlegg funnet i MSG-filen');
            }

            // Prosesser hvert vedlegg
            let attachmentsProcessed = 0;
            for (const attachment of fileData.attachments) {
                attachmentsProcessed++;
                const uint8Array = attachment.content;
                const fileName = attachment.fileName || `vedlegg_${attachmentsProcessed}_${Date.now()}.pdf`;

                console.log(`[extractAndProcessMsgAttachments] Behandler vedlegg ${attachmentsProcessed}/${fileData.attachments.length}: ${fileName}, Type: ${typeof uint8Array}, Lengde: ${uint8Array?.length}`);

                if (!(uint8Array instanceof Uint8Array) || uint8Array.length === 0) {
                    console.warn(`[extractAndProcessMsgAttachments] Vedlegg ${fileName} har ugyldig innhold.`);
                    continue; // Hopp over dette vedlegget
                }
                const firstBytesHex = Array.from(uint8Array.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ');
                console.log(`[extractAndProcessMsgAttachments] Vedlegg ${fileName} - Første bytes: ${firstBytesHex}`);

                // Sjekk om vedlegget er en PDF
                const isPdfAttachment = fileName.toLowerCase().endsWith('.pdf') ||
                    (uint8Array.length > 4 && uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46);

                if (!isPdfAttachment) {
                    console.warn(`[extractAndProcessMsgAttachments] Vedlegg ${fileName} er ikke PDF, hopper over.`);
                    continue;
                }

                console.log(`[extractAndProcessMsgAttachments] Vedlegg ${fileName} ER en PDF. Oppretter File-objekt...`);

                // Opprett File-objekt fra vedlegget
                let extractedFile;
                try {
                    const blob = new Blob([uint8Array], { type: 'application/pdf' });
                    extractedFile = new File([blob], fileName, { type: 'application/pdf' });
                    console.log(`[extractAndProcessMsgAttachments] File-objekt opprettet: ${fileName}, Size=${extractedFile.size}, Type=${extractedFile.type}`);

                    // Dobbeltsjekk ved å lese File-objektet *her* (kun for debugging)
                    const checkReader = new FileReader();
                    checkReader.onload = (e) => {
                        const checkBuffer = e.target.result;
                        console.log(`[extractAndProcessMsgAttachments] DEBUG: File-objekt (${fileName}) lest OK, ${checkBuffer.byteLength} bytes. Første: ${Array.from(new Uint8Array(checkBuffer, 0, 5)).map(b => b.toString(16)).join(' ')}`);
                    };
                    checkReader.readAsArrayBuffer(extractedFile);

                } catch (fileCreationError) {
                    console.error(`[extractAndProcessMsgAttachments] Kunne ikke opprette File-objekt for ${fileName}:`, fileCreationError);
                    continue;
                }

                // Oppdater UI
                console.log(`[extractAndProcessMsgAttachments] Oppdaterer UI for ekstrahert fil ${fileName}`);
                setUploadedFiles(prev => prev.map(f =>
                    f.file === msgFile
                        ? { ...f, status: 'extracted', extractedFile, originalFile: msgFile }
                        : f
                ));

                // Send vedlegget til prosessering
                console.log(`[extractAndProcessMsgAttachments] Kaller processAndSendFile for vedlegg ${fileName}`);
                const result = await processAndSendFile(extractedFile, msgFile);
                // Oppdater state ETTER at processAndSendFile er ferdig
                // (Merk: processAndSendFile oppdaterer allerede state, så vi trenger kanskje ikke dette)
                // Vi må sikre at pdfToShow for den opprinnelige MSG-filen blir satt
                if (result?.success) { // Sjekk om processAndSendFile var vellykket
                    console.log(`[extractAndProcessMsgAttachments] processAndSendFile var vellykket for ${extractedFile.name}. Oppdaterer MSG-filens state.`);
                    setUploadedFiles(prev => prev.map(f =>
                        f.file === msgFile
                            ? {
                                ...f,
                                status: 'processed', // Eller behold 'extracted' hvis flere vedlegg finnes?
                                resultData: result.data, // Lagre resultatet
                                pdfToShow: extractedFile // PDFen som skal vises
                            }
                            : f
                    ));
                } else {
                    console.warn(`[extractAndProcessMsgAttachments] processAndSendFile feilet eller returnerte ikke success for ${extractedFile.name}`);
                    // La processAndSendFile håndtere feilstatus for selve vedlegget.
                    // Kanskje sette MSG-filen til en 'partial_error' status?
                }

                console.log(`[extractAndProcessMsgAttachments] processAndSendFile fullført for ${fileName}`);
            }

            console.log(`[extractAndProcessMsgAttachments] Ferdig med alle vedlegg for ${msgFile.name}.`);

        } catch (error) {
            console.error(`[extractAndProcessMsgAttachments] Feil underveis for ${msgFile.name}: ${error.message}`);
            throw error; // Kaster feilen videre til handleMsgFile
        }
    };

    const handlePdfFile = (pdfFile, originalMsgFileRef = null) => {
        console.log('Handling PDF file:', pdfFile.name, 'Size:', pdfFile.size, 'Type:', pdfFile.type);

        // Validering av file-objektet
        if (!pdfFile || !pdfFile.size) {
            console.error(`Ugyldig PDF-fil: ${pdfFile ? pdfFile.name : 'ukjent'}`);
            setError(`Ugyldig PDF-fil: ${pdfFile ? pdfFile.name : 'ukjent'}`);
            return;
        }

        setUploadedFiles(prev => prev.map(f =>
            (f.file === pdfFile || f.extractedFile === pdfFile)
                ? { ...f, status: 'pending_upload' }
                : f
        ));

        // Bruk ny implementasjon basert på test-PDF-metoden
        processAndSendFile(pdfFile, originalMsgFileRef);
    };

    // Ny implementasjon som leser filen på en mer robust måte
    const processAndSendFile = async (pdfFile, originalMsgFileRef = null) => {
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

            console.log(`Sender ${pdfFile.name} (${fileArrayBuffer.byteLength} bytes) til backend via IPC...`);
            const result = await window.electron.invoice.upload(pdfFile.name, fileArrayBuffer);

            // Håndter resultatet
            if (result.success) {
                console.log(`Fil ${pdfFile.name} ble behandlet vellykket:`, result);
                setUploadedFiles(prev => prev.map(f =>
                    (f.file === pdfFile || f.file === originalMsgFileRef)
                        // Explicitly set pdfToShow with the processed File/Blob object
                        ? { ...f, status: 'processed', resultData: result.data, pdfToShow: pdfFile }
                        : f
                ));
                setError(null);
            } else {
                console.error(`Feil ved prosessering av ${pdfFile.name}:`, result.error);
                setError(`Feil under prosessering av ${pdfFile.name}: ${result.error}`);
                setUploadedFiles(prev => prev.map(f =>
                    (f.file === pdfFile || f.file === originalMsgFileRef)
                        ? { ...f, status: 'error', message: result.error }
                        : f
                ));
            }
        } catch (error) {
            console.error(`Uventet feil ved prosessering av ${pdfFile.name}:`, error);
            setError(`Feil ved opplasting av ${pdfFile.name}: ${error.message}`);
            setUploadedFiles(prev => prev.map(f =>
                (f.file === pdfFile || f.file === originalMsgFileRef)
                    ? { ...f, status: 'error', message: error.message }
                    : f
            ));
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.ms-outlook': ['.msg']
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
                <CardTitle>Last opp faktura (PDF eller MSG)</CardTitle>
            </CardHeader>
            <CardContent>
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
                        <p className="mt-2 text-sm text-gray-600">Dra og slipp PDF- eller MSG-filer her, eller klikk for å velge filer</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Kun .pdf og .msg filer aksepteres</p>
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
                                        {item.status === 'extracted' && <span className="text-xs text-green-600">(PDF Hentet ut)</span>}
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
                                                    // Prioritize pdfToShow if it exists
                                                    const fileForDialog = item.pdfToShow || item.extractedFile || item.file;
                                                    console.log(`[Button onClick] For ${item.file.name}:`);
                                                    console.log(` - item.pdfToShow:`, item.pdfToShow ? { name: item.pdfToShow.name, size: item.pdfToShow.size, type: item.pdfToShow.type } : null);
                                                    console.log(` - item.extractedFile:`, item.extractedFile ? { name: item.extractedFile.name, size: item.extractedFile.size, type: item.extractedFile.type } : null);
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