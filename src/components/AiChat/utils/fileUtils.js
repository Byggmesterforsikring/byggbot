// Maximum size for attachments in bytes (30MB)
export const MAX_FILE_SIZE = 30 * 1024 * 1024;

export const fileCategories = {
  imageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documentTypes: ['application/pdf'],
  dataTypes: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/vnd.oasis.opendocument.spreadsheet'
  ],
  textTypes: [
    'text/plain',
    'application/rtf',
    'text/markdown'
  ],
  emailTypes: [
    'message/rfc822',
    'application/vnd.ms-outlook'
  ],
};

export const getSupportedTypes = () => {
  const { imageTypes, documentTypes, dataTypes, textTypes, emailTypes } = fileCategories;
  return [...imageTypes, ...documentTypes, ...dataTypes, ...textTypes, ...emailTypes];
};

export const getDropzoneAcceptConfig = () => {
  return {
    // Bilder
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    // Dokumenter
    'application/pdf': ['.pdf'],
    // Excel/Data filer
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/csv': ['.csv'],
    'text/comma-separated-values': ['.csv'], // Alternative MIME type for CSV
    'application/csv': ['.csv'], // Another alternative MIME type for CSV
    'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
    // Tekstfiler
    'text/plain': ['.txt'],
    'application/rtf': ['.rtf'],
    'text/markdown': ['.md', '.markdown'],
    // E-post filer
    'message/rfc822': ['.eml'],
    'application/vnd.ms-outlook': ['.msg']
  };
};

// Hjelpemetoder for å sjekke filtyper
export const isImageFile = (file) => 
  fileCategories.imageTypes.includes(file.type);

export const isPdfFile = (file) => 
  file.type === 'application/pdf' || file.name.endsWith('.pdf');

export const isExcelFile = (file) => 
  file.type.includes('sheet') || 
  file.name.endsWith('.xlsx') || 
  file.name.endsWith('.xls');

export const isCsvFile = (file) => 
  file.type === 'text/csv' || file.name.endsWith('.csv');

export const isDataFile = (file) => 
  fileCategories.dataTypes.includes(file.type) || 
  file.name.endsWith('.xlsx') || 
  file.name.endsWith('.xls') || 
  file.name.endsWith('.csv') || 
  file.name.endsWith('.ods');

export const isEmailFile = (file) => 
  fileCategories.emailTypes.includes(file.type) ||
  file.name.endsWith('.eml') || 
  file.name.endsWith('.msg');

// Funksjon for å lese filopplasting
export const readFileAsPromise = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    // For bilder
    if (isImageFile(file)) {
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    } 
    // For PDF filer
    else if (isPdfFile(file)) {
      reader.onload = () => resolve({
        name: file.name,
        size: file.size,
        type: 'application/pdf',
        rawData: reader.result, 
        isPdf: true
      });
      reader.onerror = error => reject(error);
      reader.readAsArrayBuffer(file);
    } 
    // For Excel filer
    else if (isExcelFile(file)) {
      reader.onload = () => resolve({
        name: file.name,
        size: file.size,
        type: file.type.includes('sheet') ? file.type : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        rawData: reader.result,
        isExcel: true
      });
      reader.onerror = error => reject(error);
      reader.readAsArrayBuffer(file);
    } 
    // For CSV filer
    else if (isCsvFile(file)) {
      if (file.size > 5 * 1024 * 1024) { // Store CSV-filer
        reader.onload = () => resolve({
          name: file.name,
          size: file.size,
          type: 'text/csv',
          rawData: reader.result,
          isCsv: true
        });
        reader.onerror = error => reject(error);
        reader.readAsArrayBuffer(file);
      } else { // Mindre CSV-filer
        reader.onload = () => resolve({
          name: file.name,
          size: file.size,
          type: 'text/csv',
          rawData: reader.result,
          isCsv: true,
          isText: true
        });
        reader.onerror = error => reject(error);
        reader.readAsText(file);
      }
    } 
    // For e-post filer
    else if (isEmailFile(file)) {
      // For e-postfiler, bruk ArrayBuffer
      reader.onload = () => resolve({
        name: file.name,
        size: file.size,
        type: file.name.toLowerCase().endsWith('.eml') ? 'message/rfc822' : 'application/vnd.ms-outlook',
        rawData: reader.result,
        isEmail: true
      });
      reader.onerror = error => reject(error);
      reader.readAsArrayBuffer(file);
    }
    // For andre filer
    else {
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsText(file);
    }
  });
};