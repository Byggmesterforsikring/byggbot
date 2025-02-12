const { contextBridge, ipcRenderer } = require('electron');

// Valider miljøvariabler
const safeEnv = {
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_AZURE_CLIENT_ID: process.env.REACT_APP_AZURE_CLIENT_ID,
  REACT_APP_AZURE_TENANT_ID: process.env.REACT_APP_AZURE_TENANT_ID
};

// Eksponerer sikre API-er til renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Miljøvariabler
  env: safeEnv,
  // Brukerrolle-funksjoner
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

// Eksponerer grunnleggende Electron-informasjon
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  env: safeEnv
});

// DOMContentLoaded event listener
contextBridge.exposeInMainWorld('domReady', new Promise((resolve) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', resolve);
  } else {
    resolve();
  }
}));

window.addEventListener('DOMContentLoaded', () => {
  // Legg til eventuelle DOMContentLoaded-relaterte operasjoner her
  console.log('DOM er lastet');
});

console.log("Preload: NODE_ENV:", process.env.NODE_ENV);

// Eksponer en funksjon for å lytte på deep links
contextBridge.exposeInMainWorld('electronDeepLink', {
  onDeepLink: (callback) => ipcRenderer.on('deep-link', callback),
  removeDeepLinkListener: (callback) => ipcRenderer.removeListener('deep-link', callback)
}); 