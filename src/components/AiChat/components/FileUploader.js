import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { MAX_FILE_SIZE, getDropzoneAcceptConfig, getSupportedTypes, readFileAsPromise } from '../utils/fileUtils';

const FileUploader = ({ onFilesAdded }) => {
  const handleFiles = useCallback(async (acceptedFiles) => {
    // Filter out files that are too large
    const validFiles = acceptedFiles.filter(file => file.size <= MAX_FILE_SIZE);
    
    if (validFiles.length !== acceptedFiles.length) {
      alert(`Some files were too large. Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
    
    // Filter by supported types
    const supportedTypes = getSupportedTypes();
    const typesValidFiles = validFiles.filter(file => 
      supportedTypes.includes(file.type) || 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls') || 
      file.name.endsWith('.eml') || 
      file.name.endsWith('.msg')
    );
    
    if (typesValidFiles.length !== validFiles.length) {
      const unsupportedFiles = validFiles
        .filter(file => 
          !supportedTypes.includes(file.type) && 
          !file.name.endsWith('.xlsx') && 
          !file.name.endsWith('.xls') &&
          !file.name.endsWith('.eml') && 
          !file.name.endsWith('.msg')
        )
        .map(file => `${file.name} (${file.type})`).join(', ');
      
      alert(`Unsupported file types: ${unsupportedFiles}\n\nSupported file types include:\n- Images (JPEG, PNG, GIF, WebP)\n- Documents (PDF)\n- Data files (Excel, CSV)\n- Email files (EML, MSG)`);
    }
    
    // Process all valid files
    const processedFiles = [];
    
    for (const file of typesValidFiles) {
      try {
        const fileContent = await readFileAsPromise(file);
        
        // Process file content based on type
        let contentBlock;
        let uiContentBlock;
        
        if (isImage(file)) {
          // For images - use base64 data
          contentBlock = {
            type: "image",
            source: {
              type: "base64",
              media_type: file.type,
              data: fileContent.split(',')[1] // Remove data URL prefix
            }
          };
        } else if (isPdfFile(file)) {
          // For PDF files - prepare UI display while server processes
          uiContentBlock = {
            type: "text",
            text: `📑 **PDF-fil:** ${file.name} (${Math.round(file.size / 1024)} KB)\n\n*Analyserer innhold fra PDF-filen...*`
          };
        } else if (isEmailFile(file)) {
          // For e-post files - prepare UI display while server processes
          const fileType = file.name.toLowerCase().endsWith('.eml') ? 'EML-fil' : 'MSG-fil';
          uiContentBlock = {
            type: "text",
            text: `✉️ **${fileType}:** ${file.name} (${Math.round(file.size / 1024)} KB)\n\n*Analyserer innhold fra e-posten...*`
          };
        } else if (isExcelOrCsvFile(file)) {
          // For Excel/CSV files - prepare UI display
          const fileIcon = isExcelFile(file) ? '📊' : '📄';
          const fileType = isExcelFile(file) ? 'Excel-fil' : 'CSV-fil';
          
          uiContentBlock = {
            type: "text",
            text: `${fileIcon} **${fileType}:** ${file.name} (${Math.round(file.size / 1024)} KB)\n\n*Analyserer data fra ${fileType.toLowerCase()}...*`
          };
          
          // Set temporary content block
          if (fileContent && fileContent.rawData) {
            contentBlock = { 
              type: "text",
              text: `[${fileType}: ${file.name}]`,
              is_excel: isExcelFile(file),
              is_csv: isCsvFile(file),
              needs_parsing: true
            };
          } else {
            contentBlock = {
              type: "text",
              text: `${fileType}: ${file.name} kunne ikke leses.`
            };
          }
        } else {
          // For other text/data files
          let textContent = "";
          
          if (isCsvFile(file)) {
            // For CSV, format as table if possible
            textContent = `CSV-fil: ${file.name}\n\n`;
            try {
              const rows = fileContent.split('\n').filter(line => line.trim());
              if (rows.length > 0 && !(/[^\x20-\x7E]/.test(rows[0]))) {
                textContent += fileContent;
              } else {
                textContent += "[CSV-innholdet kan ikke vises direkte, men AI-modellen kan analysere informasjonen. Vennligst still spørsmål om dataene.]";
              }
            } catch (e) {
              textContent += "[CSV-innholdet kan ikke vises direkte, men AI-modellen kan analysere informasjonen. Vennligst still spørsmål om dataene.]";
            }
          } else if (isDataFile(file)) {
            // For other data files - guidance text
            textContent = `📄 Datafil: ${file.name} (${Math.round(file.size / 1024)} KB)\n\n`;
            textContent += "For å gjøre innholdet i denne datafilen tilgjengelig for AI-assistenten, vennligst:\n\n";
            textContent += "1. Beskriv innholdet i filen (hva slags data den inneholder)\n";
            textContent += "2. Kopier relevante deler fra filen hvis mulig\n";
            textContent += "3. Still konkrete spørsmål om dataene du er interessert i";
            
            textContent += "\n\n[DATA_FILE_IDENTIFIER]";
          } else {
            // For regular text files
            textContent = fileContent;
          }
          
          contentBlock = {
            type: "text",
            text: textContent
          };
        }
        
        // Check if file needs server processing (Excel/PDF/CSV/Email)
        if ((isExcelFile(file) || isCsvFile(file) || isPdfFile(file) || isEmailFile(file)) && uiContentBlock) {
          try {
            // Upload file to server for parsing
            if (window.electron && window.electron.aiChat) {
              let fileType;
              if (isExcelFile(file)) fileType = 'Excel';
              else if (isCsvFile(file)) fileType = 'CSV';
              else if (isPdfFile(file)) fileType = 'PDF';
              else if (isEmailFile(file)) fileType = file.name.toLowerCase().endsWith('.eml') ? 'EML' : 'MSG';
              else fileType = 'unknown';
              
              console.log(`Uploading ${fileType} file ${file.name} to backend for parsing...`);
              
              let base64data;
              
              if (fileContent.isText && fileContent.rawData) {
                // For text-based CSV files
                base64data = btoa(unescape(encodeURIComponent(fileContent.rawData)));
              } else {
                // For binary data
                const array = new Uint8Array(fileContent.rawData);
                const chunks = [];
                const chunkSize = 8192;
                
                for (let i = 0; i < array.length; i += chunkSize) {
                  chunks.push(String.fromCharCode.apply(null, array.slice(i, i + chunkSize)));
                }
                
                base64data = btoa(chunks.join(''));
              }
              
              // Upload file to server
              const response = await window.electron.aiChat.uploadFile({ 
                base64data, 
                fileName: file.name,
                mimeType: fileContent.type || 
                        (isExcelFile(file) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
                          isCsvFile(file) ? 'text/csv' : 
                          isPdfFile(file) ? 'application/pdf' : 
                          isEmailFile(file) ? (file.name.toLowerCase().endsWith('.eml') ? 'message/rfc822' : 'application/vnd.ms-outlook') : 
                          'application/octet-stream')
              });
              
              if (response.success) {
                // Add processed file
                processedFiles.push({
                  name: file.name,
                  size: file.size,
                  type: file.type || getMimeType(file),
                  contentBlock: response.contentBlock,   // Actual parsed content for AI
                  uiContentBlock: uiContentBlock         // Simple display version for UI
                });
              } else {
                alert(`Error processing ${fileType} file: ${response.error}`);
              }
            } else {
              // Fallback if not in Electron context
              processedFiles.push({
                name: file.name,
                size: file.size,
                type: file.type,
                contentBlock: uiContentBlock || contentBlock
              });
            }
          } catch (error) {
            console.error("Error uploading file:", error);
            alert(`Failed to process file ${file.name}: ${error.message}`);
          }
        } else {
          // Regular file handling
          processedFiles.push({
            name: file.name,
            size: file.size,
            type: file.type,
            contentBlock: contentBlock
          });
        }
      } catch (error) {
        console.error("Error processing file:", error);
        alert(`Failed to process file ${file.name}: ${error.message}`);
      }
    }
    
    // Callback with processed files
    onFilesAdded(processedFiles);
  }, [onFilesAdded]);
  
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleFiles,
    maxSize: MAX_FILE_SIZE,
    accept: getDropzoneAcceptConfig()
  });
  
  return { getRootProps, getInputProps };
};

// Helper functions
const isImage = (file) => 
  ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);

const isPdfFile = (file) => 
  file.type === 'application/pdf' || file.name.endsWith('.pdf');

const isExcelFile = (file) => 
  file.type.includes('sheet') || 
  file.name.endsWith('.xlsx') || 
  file.name.endsWith('.xls');

const isCsvFile = (file) => 
  file.type === 'text/csv' || file.name.endsWith('.csv');

const isEmailFile = (file) =>
  file.type === 'message/rfc822' || 
  file.type === 'application/vnd.ms-outlook' ||
  file.name.toLowerCase().endsWith('.eml') ||
  file.name.toLowerCase().endsWith('.msg');

const isExcelOrCsvFile = (file) => 
  isExcelFile(file) || isCsvFile(file);

const isDataFile = (file) => 
  [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/vnd.oasis.opendocument.spreadsheet'
  ].includes(file.type) || 
  file.name.endsWith('.xlsx') || 
  file.name.endsWith('.xls') || 
  file.name.endsWith('.csv') || 
  file.name.endsWith('.ods');

const getMimeType = (file) => {
  if (isExcelFile(file)) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (isCsvFile(file)) return 'text/csv';
  if (isPdfFile(file)) return 'application/pdf';
  if (isEmailFile(file)) {
    return file.name.toLowerCase().endsWith('.eml') ? 'message/rfc822' : 'application/vnd.ms-outlook';
  }
  return 'application/octet-stream';
};

export default FileUploader;