const { contextBridge, ipcRenderer, shell } = require('electron');
const isDev = process.env.NODE_ENV === 'development';
const config = require('./config');

// Debug logging av miljøvariabler
console.log('Miljøvariabler i preload:', {
  NODE_ENV: process.env.NODE_ENV,
  AZURE_CLIENT_ID: config.AZURE_CLIENT_ID,
  AZURE_TENANT_ID: config.AZURE_TENANT_ID
});

// Auth-relaterte funksjoner
const auth = {
  login: async () => {
    if (isDev) {
      return { status: 'needsRendererAuth' };
    }
    return ipcRenderer.invoke('login');
  },
  logout: async () => {
    if (isDev) {
      return { status: 'needsRendererAuth' };
    }
    return ipcRenderer.invoke('logout');
  },
  getAccount: async () => {
    if (isDev) {
      return { status: 'needsRendererAuth' };
    }
    return ipcRenderer.invoke('get-account');
  }
};

// Tegningsregler API
const drawingRules = {
  getAllRules: () => ipcRenderer.invoke('get-drawing-rules'),
  getRule: (params) => ipcRenderer.invoke('get-drawing-rule', params),
  createRule: (params) => ipcRenderer.invoke('create-drawing-rule', params),
  updateRule: (params) => ipcRenderer.invoke('update-drawing-rule', params),
  getRuleVersions: (params) => ipcRenderer.invoke('get-drawing-rule-versions', params),
  saveImage: (params) => ipcRenderer.invoke('save-drawing-rule-image', params),
  getImage: (params) => ipcRenderer.invoke('get-drawing-rule-image', params),
  deleteRule: (params) => ipcRenderer.invoke('delete-drawing-rule', params),
};

// AI Chat API
const aiChat = {
  initClient: (apiKey) => ipcRenderer.invoke('ai:init', apiKey),
  getModels: () => ipcRenderer.invoke('ai:get-models'),
  sendMessage: (params) => ipcRenderer.invoke('ai:send-message', params),
  sendMessageStream: (params) => {
    // Generate unique stream ID to avoid event listener conflicts
    const streamId = Date.now().toString();
    ipcRenderer.send('ai:send-message-stream', params);

    // Return an event emitter interface
    return {
      onStart: (callback) => {
        const startHandler = () => callback();
        ipcRenderer.on('ai:stream-start', startHandler);
        return () => ipcRenderer.removeListener('ai:stream-start', startHandler);
      },
      onDelta: (callback) => {
        const deltaHandler = (event, data) => callback(data);
        ipcRenderer.on('ai:stream-delta', deltaHandler);
        return () => ipcRenderer.removeListener('ai:stream-delta', deltaHandler);
      },
      onComplete: (callback) => {
        const completeHandler = (event, data) => callback(data);
        ipcRenderer.on('ai:stream-complete', completeHandler);
        return () => ipcRenderer.removeListener('ai:stream-complete', completeHandler);
      },
      onError: (callback) => {
        const errorHandler = (event, data) => callback(data);
        ipcRenderer.on('ai:stream-error', errorHandler);
        return () => ipcRenderer.removeListener('ai:stream-error', errorHandler);
      },
      cleanup: () => {
        ipcRenderer.removeAllListeners('ai:stream-start');
        ipcRenderer.removeAllListeners('ai:stream-delta');
        ipcRenderer.removeAllListeners('ai:stream-complete');
        ipcRenderer.removeAllListeners('ai:stream-error');
      }
    };
  },
  uploadFile: async (fileOrData) => {
    try {
      // Check if it's already a data object with base64data
      if (fileOrData && fileOrData.base64data && fileOrData.fileName) {
        console.log(`Starting direct data upload: ${fileOrData.fileName}, type: ${fileOrData.mimeType}`);

        // Data is already prepared, send directly to main process
        return ipcRenderer.invoke('ai:upload-file', {
          base64data: fileOrData.base64data,
          fileName: fileOrData.fileName,
          mimeType: fileOrData.mimeType
        });
      }

      // Otherwise treat as a File object
      if (!fileOrData || typeof fileOrData.arrayBuffer !== 'function') {
        console.error('Invalid file object:', fileOrData);
        throw new Error('Invalid file object received');
      }

      const file = fileOrData;
      console.log(`Starting file upload: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);

      // Read the file as binary string to transport over IPC
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          try {
            // Get the base64 string
            const base64data = reader.result.split(',')[1];

            console.log(`File read successfully: ${file.name}, sending base64 data of length: ${base64data.length}`);

            // Send to main process
            ipcRenderer.invoke('ai:upload-file', {
              base64data,
              fileName: file.name,
              mimeType: file.type
            })
              .then(resolve)
              .catch(reject);
          } catch (err) {
            console.error('Error processing file data:', err);
            reject(err);
          }
        };

        reader.onerror = (error) => {
          console.error('Error reading file:', error);
          reject(error);
        };

        // Read as data URL (base64)
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Error preparing file for upload:', error);
      throw error;
    }
  },
  cleanupUploads: () => ipcRenderer.invoke('ai:cleanup-uploads')
};

// Auto-update API
const autoUpdate = {
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  removeUpdateAvailableListener: () => ipcRenderer.removeAllListeners('update-available'),
  removeUpdateDownloadedListener: () => ipcRenderer.removeAllListeners('update-downloaded')
};

// Dashboard API
const dashboard = {
  getData: (params = {}) => ipcRenderer.invoke('dashboard:getData', params),
  getHistoricalData: (params = {}) => ipcRenderer.invoke('dashboard:getHistoricalData', params),
  fetchStats: (params) => ipcRenderer.invoke('dashboard:fetchStats', params)
};

const garantiApiForPreload = {
  // Nye/endrede funksjoner
  createSak: (params) => ipcRenderer.invoke('garanti:createSak', params),
  getProsjekter: (filterParams) => ipcRenderer.invoke('garanti:getProsjekter', filterParams),
  getSelskaper: (filterParams) => ipcRenderer.invoke('garanti:getSelskaper', filterParams),
  getAnsvarligePersoner: () => ipcRenderer.invoke('garanti:getAnsvarligePersoner'),

  getSelskapById: (selskapId) => ipcRenderer.invoke('garanti:getSelskapById', selskapId),
  findSelskap: (searchTerm) => ipcRenderer.invoke('garanti:findSelskap', searchTerm),
  createSelskap: (params) => ipcRenderer.invoke('garanti:createSelskap', params),
  updateSelskap: (params) => ipcRenderer.invoke('garanti:updateSelskap', params),

  getProsjektById: (prosjektId) => ipcRenderer.invoke('garanti:getProsjektById', prosjektId),
  createProsjekt: (params) => ipcRenderer.invoke('garanti:createProsjekt', params),
  updateProsjekt: (params) => ipcRenderer.invoke('garanti:updateProsjekt', params),

  // Generaliserte funksjoner (beholdes, men frontend må sende riktig params)
  uploadDokument: (params) => ipcRenderer.invoke('garanti:uploadDokument', params), // params = { entityContext, filData, ... }
  addInternKommentar: (params) => ipcRenderer.invoke('garanti:addInternKommentar', params), // params = { entityContext, kommentarTekst, ... }

  // Funksjoner som sannsynligvis beholdes som de er
  getDokumentSasUrl: (params) => ipcRenderer.invoke('garanti:getDokumentSasUrl', params),
  getUsersV2: (filterParams) => ipcRenderer.invoke('garanti:getUsersV2', filterParams),

  // Fjernede funksjoner (hadde ikke lenger korresponderende handler)
  // getSaker: (filter) => ipcRenderer.invoke('garanti:getSaker', filter), // Erstattet av getProsjekter
  // getSakById: (id) => ipcRenderer.invoke('garanti:getSakById', id),       // Ikke lenger relevant for ny struktur
  // updateSak: (params) => ipcRenderer.invoke('garanti:updateSak', params), // Ikke lenger relevant for ny struktur
};

// NYTT OBJEKT for UserV2 API
const userApiV2ForPreload = {
  getAllUsers: () => ipcRenderer.invoke('userV2:getAllUsers'),
  getAllRoles: () => ipcRenderer.invoke('userV2:getAllRoles'),
  getAllModules: () => ipcRenderer.invoke('userV2:getAllModules'),
  getUserById: (userId) => ipcRenderer.invoke('userV2:getUserById', userId),
  getUserByEmail: (email) => ipcRenderer.invoke('userV2:getUserByEmail', email),
  createUser: (params) => ipcRenderer.invoke('userV2:createUser', params), // params: { userData, roleIds?, modulIds?, tilknyttetSelskapId? }
  updateUser: (params) => ipcRenderer.invoke('userV2:updateUser', params), // params: { userId, userData?, roleIds?, modulIds?, tilknyttetSelskapId? }
  // TODO: Legg til deleteUser her når det implementeres
};

// Brreg API (Nytt)
const brregApiForPreload = {
  getEnhetInfo: (orgnr) => ipcRenderer.invoke('brreg:getEnhetInfo', orgnr)
};

console.log('--- PRELOAD SCRIPT RUNNING (Inkluderer UserV2 API, fjerner gamle user-role og menu-access) ---');
Object.keys(garantiApiForPreload).forEach(key => {
  console.log(`  Garanti API - ${key}: ${typeof garantiApiForPreload[key]}`);
});
Object.keys(userApiV2ForPreload).forEach(key => {
  console.log(`  UserV2 API - ${key}: ${typeof userApiV2ForPreload[key]}`);
});
console.log('  Brreg API - getEnhetInfo:', typeof brregApiForPreload.getEnhetInfo);
console.log('--- END PRELOAD SCRIPT LOG ---');

// Eksponerer sikre API-er til renderer process
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  env: {
    NODE_ENV: process.env.NODE_ENV,
    AZURE_CLIENT_ID: config.AZURE_CLIENT_ID,
    AZURE_TENANT_ID: config.AZURE_TENANT_ID
  },
  auth: auth,
  drawingRules: drawingRules,
  aiChat: aiChat,
  dashboard: dashboard,
  autoUpdate: autoUpdate,
  shell: {
    openExternal: (url) => shell.openExternal(url)
  },
  pdf: {
    openPdf: async (pdfData) => {
      if (!pdfData) {
        return { success: false, error: 'Ingen PDF-data mottatt' };
      }
      try {
        return await ipcRenderer.invoke('pdf:open', pdfData);
      } catch (error) {
        console.error('Error in pdf:open:', error);
        return { success: false, error: error.message || 'Kunne ikke åpne PDF' };
      }
    }
  },
  invoice: {
    upload: async (fileName, fileBuffer, base64Data = null) => {
      try {
        // Valider data før sending
        if (!fileName) {
          console.error('invoice:upload: Filnavn mangler');
          return { success: false, error: 'Filnavn mangler' };
        }

        if (!fileBuffer) {
          console.error('invoice:upload: FileBuffer mangler');
          return { success: false, error: 'Filinnhold mangler' };
        }

        // Sjekk at fileBuffer er en ArrayBuffer
        if (!(fileBuffer instanceof ArrayBuffer)) {
          console.error('invoice:upload: FileBuffer er ikke ArrayBuffer', typeof fileBuffer);
          return { success: false, error: 'Filinnhold har feil format' };
        }

        // Konverter ArrayBuffer til Uint8Array for tryggere IPC-overføring
        const uint8Arr = new Uint8Array(fileBuffer);

        // Logg de første bytene før sending
        const firstBytes = Array.from(uint8Arr.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log(`Sender fil ${fileName} via IPC. Sender Uint8Array (${uint8Arr.length} bytes). Første bytes: ${firstBytes}`);

        // Send Uint8Array direkte med base64Data hvis oppgitt
        return await ipcRenderer.invoke('invoice:upload', {
          fileName,
          fileUint8Array: uint8Arr, // Send som Uint8Array
          originalSize: fileBuffer.byteLength,
          base64Data: base64Data // Legg til base64Data hvis det er oppgitt
        });
      } catch (error) {
        console.error('Error in invoice:upload:', error);
        return { success: false, error: error.message || 'IPC call failed' };
      }
    },

    // Nye API-funksjoner for system prompter
    getPrompt: (promptType) => ipcRenderer.invoke('invoice:getPrompt', promptType),
    getPromptHistory: (promptType) => ipcRenderer.invoke('invoice:getPromptHistory', promptType),
    setPrompt: (promptType, promptText) => ipcRenderer.invoke('invoice:setPrompt', promptType, promptText),
    activatePrompt: (promptId) => ipcRenderer.invoke('invoice:activatePrompt', promptId),

    getById: async (id) => {
      try {
        return await ipcRenderer.invoke('invoice:getById', id);
      } catch (error) {
        console.error('Error in invoice:getById:', error);
        return { success: false, error: error.message || 'IPC call failed' };
      }
    },
    getAllInvoices: async () => {
      try {
        return await ipcRenderer.invoke('invoice:getAll');
      } catch (error) {
        console.error('Error in invoice:getAllInvoices:', error);
        return { success: false, error: error.message || 'IPC call failed' };
      }
    },
    getPdfForInvoice: async (invoiceId) => {
      try {
        console.log(`Kaller invoice:getPdfForInvoice for faktura ID: ${invoiceId}`);
        return await ipcRenderer.invoke('invoice:getPdfForInvoice', invoiceId);
      } catch (error) {
        console.error('Error in invoice:getPdfForInvoice:', error);
        return { success: false, error: error.message || 'IPC call failed' };
      }
    },
    saveFeedbackForInvoice: async (invoiceId, feedbackStatus, feedbackDetails) => {
      try {
        return await ipcRenderer.invoke('invoice:saveFeedback', { invoiceId, feedbackStatus, feedbackDetails });
      } catch (error) {
        console.error('Error in invoice:saveFeedback:', error);
        return { success: false, error: error.message || 'IPC call failed' };
      }
    },
    // Alias for saveFeedbackForInvoice med et eget firma format
    saveFeedback: async (params) => {
      try {
        console.log('invoice.saveFeedback kalt med:', params);

        // Utpakk parametrene fra objektet som forventes i InvoiceResultDialog
        const { invoiceId, feedbackStatus, feedbackDetails } = params;

        if (!invoiceId) {
          console.error('invoice:saveFeedback: invoiceId mangler');
          return { success: false, error: 'invoiceId må sendes med.' };
        }

        if (!feedbackStatus) {
          console.error('invoice:saveFeedback: feedbackStatus mangler');
          return { success: false, error: 'feedbackStatus må sendes med.' };
        }

        // Kall den eksisterende funksjonen
        return await ipcRenderer.invoke('invoice:saveFeedback', {
          invoiceId,
          feedbackStatus,
          feedbackDetails
        });
      } catch (error) {
        console.error('Error in invoice:saveFeedback:', error);
        return { success: false, error: error.message || 'IPC call failed' };
      }
    },
    delete: async (invoiceId) => {
      try {
        console.log(`Kaller invoice:delete for faktura ID: ${invoiceId}`);
        if (!invoiceId) {
          console.error('invoice:delete: invoiceId mangler');
          return { success: false, error: 'invoiceId må sendes med.' };
        }
        return await ipcRenderer.invoke('invoice:delete', invoiceId);
      } catch (error) {
        console.error('Error in invoice:delete:', error);
        return { success: false, error: error.message || 'IPC call failed' };
      }
    },
    deleteAll: async () => {
      try {
        console.log('Kaller invoice:deleteAll for å slette alle fakturaer');
        return await ipcRenderer.invoke('invoice:deleteAll');
      } catch (error) {
        console.error('Error in invoice:deleteAll:', error);
        return { success: false, error: error.message || 'IPC call failed' };
      }
    }
  },
  garanti: garantiApiForPreload,
  userV2: userApiV2ForPreload,
  brreg: brregApiForPreload,

  // For generell debug logging
  logDebugMessage: (...args) => ipcRenderer.send('debug-log-from-renderer', ...args),
});

// DOMContentLoaded event listener
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM er lastet');
  console.log('Miljøvariabler ved DOM-lasting:', {
    NODE_ENV: process.env.NODE_ENV,
    AZURE_CLIENT_ID: config.AZURE_CLIENT_ID,
    AZURE_TENANT_ID: config.AZURE_TENANT_ID
  });
});

// Eksponer en funksjon for å lytte på deep links
contextBridge.exposeInMainWorld('electronDeepLink', {
  onDeepLink: (callback) => ipcRenderer.on('deep-link', callback),
  removeDeepLinkListener: (callback) => ipcRenderer.removeListener('deep-link', callback)
});

// Lytt på auth-code events
ipcRenderer.on('auth-code', (event, code) => {
  console.log('Auth code mottatt i preload');
  window.postMessage({ type: 'AUTH_CODE', payload: code }, '*');
}); 