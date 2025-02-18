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

// Eksponerer sikre API-er til renderer process
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  env: {
    NODE_ENV: process.env.NODE_ENV,
    AZURE_CLIENT_ID: config.AZURE_CLIENT_ID,
    AZURE_TENANT_ID: config.AZURE_TENANT_ID
  },
  auth: auth,
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