import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import MsgReader from '@kenjiuno/msgreader';
import { Button } from "../../ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card.jsx";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert.jsx";
import { UploadCloud, FileText, XCircle } from 'lucide-react'; // Icons
import InvoiceResultDialog from './InvoiceResultDialog'; // <-- Import the dialog component

// Enkel PDF-tekst for testing
const MINIMAL_PDF = "%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n3 0 obj\n<</Type/Page/MediaBox[0 0 100 100]/Parent 2 0 R/Resources<<>>>>\nendobj\ntrailer\n<</Size 4/Root 1 0 R>>\n%%EOF"

function FakturaUploader() {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [error, setError] = useState(null);
    const [selectedInvoiceData, setSelectedInvoiceData] = useState(null); // State for dialog data
    const [selectedPdfFile, setSelectedPdfFile] = useState(null); // State for PDF file to show in dialog

    const onDrop = useCallback(acceptedFiles => {
        setError(null); // Clear previous errors
        console.log('Accepted files:', acceptedFiles);

        const processedFiles = acceptedFiles.map(file => {
            if (file.type === 'application/pdf') {
                return { file, type: 'pdf', status: 'ready' };
            } else if (file.name.toLowerCase().endsWith('.msg')) {
                return { file, type: 'msg', status: 'ready' };
                // MSG processing logic will be added later
            } else {
                return { file, type: 'unsupported', status: 'error', message: 'Filtypen støttes ikke.' };
            }
        });

        setUploadedFiles(prevFiles => [...prevFiles, ...processedFiles.filter(f => f.status !== 'error')]);

        const unsupportedFiles = processedFiles.filter(f => f.status === 'error');
        if (unsupportedFiles.length > 0) {
            setError(`Filtypen(e) ${unsupportedFiles.map(f => f.file.name).join(', ')} støttes ikke. Kun PDF og MSG er tillatt.`);
        }

        // TODO: Handle file processing (extract PDF from MSG, send to backend)
        processFiles(processedFiles.filter(f => f.status === 'ready'));

    }, []);

    const processFiles = (filesToProcess) => {
        filesToProcess.forEach(item => {
            if (item.type === 'msg') {
                handleMsgFile(item.file);
            } else if (item.type === 'pdf') {
                handlePdfFile(item.file);
            }
        });
    }

    const handleMsgFile = (file) => {
        console.log('Handling MSG file:', file.name, 'Size:', file.size);
        setUploadedFiles(prev => prev.map(f =>
            f.file === file ? { ...f, status: 'pending_process' } : f
        ));

        // Bruk den nye tilnærmingen for å lese MSG-filer
        extractAndProcessMsgAttachments(file).catch(error => {
            console.error(`Feil ved behandling av MSG-fil ${file.name}:`, error);
            setError(`Feil ved behandling av MSG-fil ${file.name}: ${error.message}`);
            setUploadedFiles(prev => prev.map(f =>
                f.file === file ? { ...f, status: 'error', message: error.message } : f
            ));
        });
    };

    // Ny implementasjon for MSG-filhåndtering
    const extractAndProcessMsgAttachments = async (msgFile) => {
        try {
            console.log(`Starter ekstrahering av vedlegg fra MSG-fil ${msgFile.name}...`);

            // Les MSG-filen som ArrayBuffer
            const msgArrayBuffer = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.onerror = (event) => reject(new Error(`Feil ved lesing av MSG-fil: ${reader.error?.message || 'Ukjent feil'}`));
                reader.readAsArrayBuffer(msgFile);
            });

            console.log(`MSG-fil lest som ArrayBuffer: ${msgArrayBuffer.byteLength} bytes`);

            // Bruk MsgReader for å hente ut vedlegg
            const msgReader = new MsgReader(msgArrayBuffer);
            const fileData = msgReader.getFileData();
            console.log('MSG File Data extracted:', fileData);

            if (!fileData.attachments || fileData.attachments.length === 0) {
                throw new Error('Ingen vedlegg funnet i MSG-filen');
            }

            let processedAnyPdf = false;

            // Prosesser hvert vedlegg (vi antar at alle vedlegg er PDF-er for enkelhets skyld)
            for (const attachment of fileData.attachments) {
                const uint8Array = attachment.content;
                if (!uint8Array || uint8Array.length === 0) {
                    console.warn(`Vedlegg ${attachment.fileName || 'ukjent'} er tomt, hopper over`);
                    continue;
                }

                const fileName = attachment.fileName || `vedlegg_${Date.now()}.pdf`;
                console.log(`Undersøker vedlegg: ${fileName} (${uint8Array.length} bytes)`);

                // Sjekk om vedlegget er en PDF (vi kunne ha implementert bedre filtype-deteksjon her)
                const isPdfAttachment = fileName.toLowerCase().endsWith('.pdf') ||
                    (uint8Array.length > 4 &&
                        uint8Array[0] === 0x25 && // %
                        uint8Array[1] === 0x50 && // P
                        uint8Array[2] === 0x44 && // D
                        uint8Array[3] === 0x46);  // F

                if (!isPdfAttachment) {
                    console.warn(`Vedlegg ${fileName} ser ikke ut til å være en PDF, hopper over`);
                    continue;
                }

                // Vis de første bytene for debugging
                console.log(`Første bytes av vedlegget: ${Array.from(uint8Array.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

                // Opprett File-objekt fra vedlegget
                const blob = new Blob([uint8Array], { type: 'application/pdf' });
                const extractedFile = new File([blob], fileName, { type: 'application/pdf' });
                console.log(`Ekstrahert PDF fra MSG: ${fileName} (${extractedFile.size} bytes)`);

                // Oppdater UI for å vise at vi har ekstrahert vedlegget
                setUploadedFiles(prev => prev.map(f =>
                    f.file === msgFile
                        ? { ...f, status: 'extracted', extractedFile, originalFile: msgFile }
                        : f
                ));

                // Send vedleggets arraybuffer direkte til backend
                try {
                    console.log(`Sender vedlegg ${fileName} direkte til backend...`);

                    if (!window.electron?.invoice?.upload) {
                        throw new Error('Electron invoice API ikke tilgjengelig');
                    }

                    // Konverter Uint8Array til ArrayBuffer for sending
                    const pdfArrayBuffer = uint8Array.buffer.slice(
                        uint8Array.byteOffset,
                        uint8Array.byteOffset + uint8Array.byteLength
                    );

                    // Logg sending
                    console.log(`Sender vedlegg-buffer på ${pdfArrayBuffer.byteLength} bytes til backend`);

                    const result = await window.electron.invoice.upload(fileName, pdfArrayBuffer);

                    if (result.success) {
                        console.log(`Vedlegg ${fileName} ble behandlet vellykket:`, result);
                        setUploadedFiles(prev => prev.map(f =>
                            f.file === msgFile
                                ? { ...f, status: 'processed', resultData: result.data, pdfToShow: extractedFile }
                                : f
                        ));
                        setError(null);
                        processedAnyPdf = true;
                    } else {
                        console.error(`Feil ved prosessering av vedlegg ${fileName}:`, result.error);
                        setError(`Feil ved prosessering av vedlegg ${fileName}: ${result.error}`);
                        setUploadedFiles(prev => prev.map(f =>
                            f.file === msgFile
                                ? { ...f, status: 'error', message: result.error }
                                : f
                        ));
                    }
                } catch (uploadError) {
                    console.error(`Feil ved opplasting av vedlegg ${fileName}:`, uploadError);
                    setError(`Feil ved opplasting av vedlegg ${fileName}: ${uploadError.message}`);
                }
            }

            if (!processedAnyPdf) {
                throw new Error('Ingen PDF-vedlegg funnet i MSG-filen');
            }

        } catch (error) {
            console.error(`Feil ved ekstrahering av MSG-vedlegg: ${error.message}`);
            throw error;
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
                        ? { ...f, status: 'processed', resultData: result.data, pdfToShow: pdfFile }
                        : f
                ));
                setError(null);
            } else {
                console.error(`Feil ved prosessering av ${pdfFile.name}:`, result.error);
                setError(`Feil ved opplasting av ${pdfFile.name}: ${result.error}`);
                setUploadedFiles(prev => prev.map(f =>
                    (f.file === pdfFile || f.file === originalMsgFileRef)
                        ? { ...f, status: 'error', message: result.error }
                        : f
                ));
            }
        } catch (error) {
            console.error(`Uventet feil ved prosessering av ${pdfFile.name}:`, error);
            setError(`