const electronLog = require('electron-log');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { app } = require('electron');
const config = require('../config');
const ExcelJS = require('exceljs');
// Bruk enkel pdf-parse for PDF-filer
const pdfParse = require('pdf-parse');

// Max file size: 30MB in bytes
const MAX_FILE_SIZE = 30 * 1024 * 1024;

// Create uploads directory if it doesn't exist
const createUploadsDirIfNeeded = () => {
  const uploadsDir = path.join(app.getPath('userData'), 'ai_uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

// Save uploaded file to disk
const saveUploadedFile = (fileBuffer, fileName) => {
  const uploadsDir = createUploadsDirIfNeeded();
  const uniqueFileName = `${uuidv4()}-${fileName}`;
  const filePath = path.join(uploadsDir, uniqueFileName);

  fs.writeFileSync(filePath, fileBuffer);

  return {
    fileName: uniqueFileName,
    filePath,
    originalName: fileName
  };
};

// These functions have been deprecated in favor of azureAiService.js
// Keeping these function signatures for compatibility, but they will log a warning
const getAvailableModels = async () => {
  electronLog.warn('aiChatService.getAvailableModels is deprecated. Please use azureAiService.getAvailableModels instead.');
  return [{ id: 'gpt-4o', name: 'GPT-4o', provider: 'azure' }];
};

const sendMessage = async (model, messages, apiKey = null) => {
  electronLog.warn('aiChatService.sendMessage is deprecated. Please use azureAiService.sendMessage instead.');
  throw new Error('This service has been deprecated. Please use azureAiService instead.');
};

const sendMessageStream = async (model, messages, apiKey = null) => {
  electronLog.warn('aiChatService.sendMessageStream is deprecated. Please use azureAiService.sendMessageStream instead.');
  throw new Error('This service has been deprecated. Please use azureAiService instead.');
};

// Estimerer tokens fra tekst (grov estimering: ca 4 chars = 1 token)
const estimateTokens = (text) => {
  return Math.ceil(text.length / 4);
};

// Parse PDF file to readable text using pdf-parse
const parsePdfFile = async (filePath) => {
  try {
    electronLog.info(`Parsing PDF file: ${filePath}`);
    const dataBuffer = fs.readFileSync(filePath);
    
    // Max tokens grense for AI-modellen
    const MAX_TOKENS = 2000;
    let estimatedTokens = 0;
    
    // Parse PDF document
    const pdfData = await pdfParse(dataBuffer);
    
    // Extract useful metadata
    const numPages = pdfData.numpages;
    const info = pdfData.info || {};
    const pdfText = pdfData.text || '';
    
    // Split the text into lines for processing
    const lines = pdfText.split('\n').filter(line => line.trim().length > 0);
    
    let pdfContent = "PDF FILE CONTENT:\n\n";
    
    // Add metadata
    pdfContent += `Title: ${info.Title || 'Unknown'}\n`;
    pdfContent += `Pages: ${numPages}\n`;
    // Legg til et format som matcher regex i AiChatHandler.js og AiChatPage.js
    pdfContent += `## Page 1 of ${numPages}\n\n`;
    
    estimatedTokens = estimateTokens(pdfContent);
    
    // Add the content with token limitation
    let linesAdded = 0;
    const maxLines = Math.min(lines.length, 500);  // Limit lines to avoid too much content
    
    for (let i = 0; i < maxLines; i++) {
      const line = lines[i];
      const lineTokens = estimateTokens(line + '\n');
      
      // Check if we'd exceed token limit
      if (estimatedTokens + lineTokens > MAX_TOKENS) {
        pdfContent += `\n... Resten av innholdet vises ikke for å begrense datamengden ...\n`;
        break;
      }
      
      pdfContent += line + '\n';
      estimatedTokens += lineTokens;
      linesAdded++;
      
      // Add visual separation between paragraphs
      if (line.trim().length === 0) {
        pdfContent += '\n';
      }
    }
    
    // Add note if there is more content
    if (linesAdded < lines.length) {
      pdfContent += `\n... Document has ${lines.length - linesAdded} more lines not shown ...\n`;
    }
    
    electronLog.info(`PDF parsed, estimated tokens: ${estimatedTokens}, lines processed: ${linesAdded}`);
    return pdfContent;
    
  } catch (error) {
    electronLog.error('Error parsing PDF file:', error);
    return `Error parsing PDF file: ${error.message}`;
  }
};

// Parse Excel file to readable text
const parseExcelFile = async (filePath) => {
  try {
    electronLog.info(`Parsing Excel file: ${filePath}`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    let excelContent = "EXCEL FILE CONTENT:\n\n";
    
    // Max tokens grense for AI-modellen
    const MAX_TOKENS = 2000;
    let estimatedTokens = estimateTokens(excelContent);
    let shouldBreak = false;
    
    // Process each worksheet
    for (let sheetIndex = 0; sheetIndex < workbook.worksheets.length && !shouldBreak; sheetIndex++) {
        const worksheet = workbook.worksheets[sheetIndex];
        
        // Legg til arknavnet og oppdater token-estimat
        const sheetHeader = `## Sheet: ${worksheet.name}\n\n`;
        excelContent += sheetHeader;
        estimatedTokens += estimateTokens(sheetHeader);
        
        // Get column headers (first row)
        const headerRow = worksheet.getRow(1);
        const headers = [];
        headerRow.eachCell((cell, colNumber) => {
            headers[colNumber] = cell.value?.toString() || `Column ${colNumber}`;
        });
        
        // Process rows (limit based on tokens og max 200 rows)
        const maxRows = Math.min(worksheet.rowCount, 200);
        const maxCols = Math.min(worksheet.columnCount, 20); // Begrens antall kolonner også
        
        // Create a text representation of the data
        for (let rowNumber = 1; rowNumber <= maxRows && !shouldBreak; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            let rowText = "";
            
            // Process cells in this row
            for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
                const cell = row.getCell(colNumber);
                const value = cell.value !== null && cell.value !== undefined ? cell.value.toString() : "";
                // Trim cell value to max 30 chars to prevent extremely long cells
                const trimmedValue = value.length > 30 ? value.substring(0, 27) + "..." : value;
                rowText += trimmedValue.padEnd(20, ' ') + " | ";
            }
            
            // Beregn tokens for denne raden og sjekk om vi nærmer oss grensen
            const tokensForRow = estimateTokens(rowText + "\n");
            if (estimatedTokens + tokensForRow > MAX_TOKENS) {
                excelContent += `\n... Resten av innholdet vises ikke for å begrense datamengden ...\n`;
                shouldBreak = true;
                break;
            }
            
            excelContent += rowText + "\n";
            estimatedTokens += tokensForRow;
            
            // Add separator after header row
            if (rowNumber === 1) {
                const separator = "-".repeat(rowText.length) + "\n";
                excelContent += separator;
                estimatedTokens += estimateTokens(separator);
            }
        }
        
        // Add note if there are more rows and we didn't break due to token limit
        if (worksheet.rowCount > maxRows && !shouldBreak) {
            const moreRowsNote = `\n... and ${worksheet.rowCount - maxRows} more rows not shown ...\n`;
            excelContent += moreRowsNote;
            estimatedTokens += estimateTokens(moreRowsNote);
        }
        
        if (!shouldBreak) {
            excelContent += "\n\n";
            estimatedTokens += 2; // for newlines
        }
    }
    
    electronLog.info(`Excel parsed, estimated tokens: ${estimatedTokens}`);
    return excelContent;
  } catch (error) {
    electronLog.error('Error parsing Excel file:', error);
    return `Error parsing Excel file: ${error.message}`;
  }
};

// Parse CSV file to readable text
const parseCsvFile = async (filePath) => {
  try {
    electronLog.info(`Parsing CSV file: ${filePath}`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    
    // Skip empty lines
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    if (nonEmptyLines.length === 0) {
      return "CSV FILE CONTENT:\n\nEmpty file or no valid data found.";
    }
    
    let csvContent = "CSV FILE CONTENT:\n\n";
    
    // Max tokens grense for AI-modellen
    const MAX_TOKENS = 2000;
    let estimatedTokens = estimateTokens(csvContent);
    
    // Get headers from first line
    const headers = nonEmptyLines[0].split(',').map(header => header.trim());
    
    // Begrens antall kolonner for å redusere tokenmengden
    const maxCols = Math.min(headers.length, 20);
    const limitedHeaders = headers.slice(0, maxCols);
    
    // Calculate column widths for better formatting
    const columnWidths = limitedHeaders.map(header => Math.max(header.length, 10));
    
    // Add headers
    let headerRow = "";
    limitedHeaders.forEach((header, index) => {
      // Trim header to max 20 chars to prevent extremely long headers
      const trimmedHeader = header.length > 20 ? header.substring(0, 17) + "..." : header;
      headerRow += trimmedHeader.padEnd(columnWidths[index] + 2, ' ') + " | ";
    });
    csvContent += headerRow + "\n";
    
    const separator = "-".repeat(headerRow.length) + "\n";
    csvContent += separator;
    
    // Oppdater token-estimat for header og separator
    estimatedTokens += estimateTokens(headerRow + "\n" + separator);
    
    // Process up to 200 data rows, men stopp hvis vi når token-grensen
    const maxRows = Math.min(nonEmptyLines.length, 200);
    let finalRow = maxRows;
    
    // Add data rows
    for (let i = 1; i < maxRows; i++) {
      const values = nonEmptyLines[i].split(',').map(value => value.trim());
      let rowText = "";
      
      // Process only up to maxCols
      for (let j = 0; j < maxCols; j++) {
        const value = j < values.length ? values[j] : "";
        // Trim cell value to max 30 chars to prevent extremely long cells
        const trimmedValue = value.length > 30 ? value.substring(0, 27) + "..." : value;
        
        // Use the same width as the header
        const width = j < columnWidths.length ? columnWidths[j] : 10;
        rowText += trimmedValue.padEnd(width + 2, ' ') + " | ";
      }
      
      // Beregn tokens for denne raden og sjekk om vi nærmer oss grensen
      const tokensForRow = estimateTokens(rowText + "\n");
      if (estimatedTokens + tokensForRow > MAX_TOKENS) {
        csvContent += `\n... Resten av innholdet vises ikke for å begrense datamengden ...\n`;
        finalRow = i;
        break;
      }
      
      csvContent += rowText + "\n";
      estimatedTokens += tokensForRow;
    }
    
    // Add note if there are more rows
    if (nonEmptyLines.length > finalRow) {
      const moreRowsNote = `\n... and ${nonEmptyLines.length - finalRow} more rows not shown ...\n`;
      csvContent += moreRowsNote;
      estimatedTokens += estimateTokens(moreRowsNote);
    }
    
    // Add note if there are more columns
    if (headers.length > maxCols) {
      const moreColsNote = `\n... and ${headers.length - maxCols} more columns not shown ...\n`;
      csvContent += moreColsNote;
      estimatedTokens += estimateTokens(moreColsNote);
    }
    
    electronLog.info(`CSV parsed, estimated tokens: ${estimatedTokens}`);
    return csvContent;
  } catch (error) {
    electronLog.error('Error parsing CSV file:', error);
    return `Error parsing CSV file: ${error.message}`;
  }
};

// Process file for message
const processFileForMessage = async (filePath, fileType) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);

    // Check file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(`File is too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Handle Excel files
    const isExcel = fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                    fileType === 'application/vnd.ms-excel' || 
                    path.extname(filePath).toLowerCase() === '.xlsx' || 
                    path.extname(filePath).toLowerCase() === '.xls';
                    
    // Handle CSV files
    const isCsv = fileType === 'text/csv' || 
                  path.extname(filePath).toLowerCase() === '.csv';
                  
    // Process Excel files
    if (isExcel) {
      electronLog.info(`Processing Excel file: ${filePath}`);
      
      // Parse Excel file
      const excelContent = await parseExcelFile(filePath);
      
      // Return as text content
      return {
        type: "text",
        text: excelContent
      };
    }
    
    // Process CSV files
    if (isCsv) {
      electronLog.info(`Processing CSV file: ${filePath}`);
      
      // Parse CSV file
      const csvContent = await parseCsvFile(filePath);
      
      // Return as text content
      return {
        type: "text",
        text: csvContent
      };
    }
    
    // Fra dette punktet håndterer vi bare bildefiler
    electronLog.info(`Processing image file: ${filePath}`);
    
    // Convert file to base64
    const base64Content = fileBuffer.toString('base64');

    // Handle PDF files
    const isPdf = fileType === 'application/pdf' || 
                  path.extname(filePath).toLowerCase() === '.pdf';
    
    if (isPdf) {
      electronLog.info(`Processing PDF file: ${filePath}`);
      
      // Parse PDF file
      const pdfContent = await parsePdfFile(filePath);
      
      // Return as text content
      return {
        type: "text",
        text: pdfContent
      };
    }

    // Ensure fileType is one of the supported image types
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!supportedTypes.includes(fileType)) {
      throw new Error('Unsupported file type. Only JPEG, PNG, GIF, and WebP images are supported.');
    }

    return {
      type: "image",
      source: {
        type: "base64",
        media_type: fileType,
        data: base64Content
      }
    };
  } catch (error) {
    electronLog.error('Error processing file for message:', error);
    throw error;
  }
};

// Clean up old uploads
const cleanupOldUploads = () => {
  try {
    const uploadsDir = path.join(app.getPath('userData'), 'ai_uploads');
    if (!fs.existsSync(uploadsDir)) return;

    const files = fs.readdirSync(uploadsDir);
    const now = Date.now();

    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);

      // Remove files older than 24 hours
      if (now - stats.mtimeMs > 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    electronLog.error('Error cleaning up old uploads:', error);
  }
};

module.exports = {
  saveUploadedFile,
  getAvailableModels,
  sendMessage,
  sendMessageStream,
  processFileForMessage,
  cleanupOldUploads,
  parseExcelFile,
  parseCsvFile,
  parsePdfFile,
  MAX_FILE_SIZE
};