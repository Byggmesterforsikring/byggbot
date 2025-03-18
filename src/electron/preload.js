const { contextBridge, ipcRenderer } = require('electron');
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
  getUserRole: async (email) => {
    try {
      return await ipcRenderer.invoke('user-role:get', email);
    } catch (error) {
      console.error('Error in getUserRole:', error);
      return null;
    }
  },
  setUserRole: async (email, role) => {
    try {
      return await ipcRenderer.invoke('user-role:set', email, role);
    } catch (error) {
      console.error('Error in setUserRole:', error);
      return null;
    }
  },
  getAllUserRoles: async () => {
    try {
      return await ipcRenderer.invoke('user-role:getAll');
    } catch (error) {
      console.error('Error in getAllUserRoles:', error);
      return [];
    }
  },
  deleteUserRole: async (email) => {
    try {
      return await ipcRenderer.invoke('user-role:delete', email);
    } catch (error) {
      console.error('Error in deleteUserRole:', error);
      return null;
    }
  }
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