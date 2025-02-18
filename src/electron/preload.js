const { contextBridge, ipcRenderer } = require('electron');
const isDev = process.env.NODE_ENV === 'development';

// Valider miljøvariabler
const safeEnv = {
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_AZURE_CLIENT_ID: process.env.REACT_APP_AZURE_CLIENT_ID,
  REACT_APP_AZURE_TENANT_ID: process.env.REACT_APP_AZURE_TENANT_ID,
  REACT_APP_REDIRECT_URI: process.env.REACT_APP_REDIRECT_URI
};

// Auth-relaterte funksjoner
const auth = {
  login: async () => {
    if (isDev) {
      return { status: 'needsRendererAuth' };
    }

    try {
      console.log('Initialiserer MSAL for prod (desktop)');
      const { PublicClientApplication } = require('@azure/msal-node');
      const pca = new PublicClientApplication({
        auth: {
          clientId: process.env.REACT_APP_AZURE_CLIENT_ID,
          authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID}`,
          clientSecret: process.env.REACT_APP_AZURE_CLIENT_SECRET
        }
      });

      const response = await pca.acquireTokenByDeviceCode({
        scopes: ["user.read"],
        deviceCodeCallback: (response) => {
          console.log('Device code callback mottatt');
          ipcRenderer.send('device-code', response);
        }
      });

      console.log('Token mottatt fra device code flow');
      return response;
    } catch (error) {
      console.error('Login error i prod:', error);
      throw error;
    }
  },

  handleRedirect: async (url) => {
    if (isDev) {
      return { status: 'needsRendererAuth' };
    }
    try {
      console.log('Håndterer redirect i prod');
      const { PublicClientApplication } = require('@azure/msal-node');
      const pca = new PublicClientApplication({
        auth: {
          clientId: process.env.REACT_APP_AZURE_CLIENT_ID,
          authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID}`,
          clientSecret: process.env.REACT_APP_AZURE_CLIENT_SECRET
        }
      });

      const result = await pca.acquireTokenByCode({
        code: url,
        scopes: ["user.read"],
        redirectUri: process.env.REACT_APP_REDIRECT_URI
      });
      return result;
    } catch (error) {
      console.error('Handle redirect error i prod:', error);
      throw error;
    }
  },

  logout: async () => {
    if (isDev) {
      return { status: 'needsRendererAuth' };
    }
    try {
      console.log('Logger ut i prod');
      const { PublicClientApplication } = require('@azure/msal-node');
      const pca = new PublicClientApplication({
        auth: {
          clientId: process.env.REACT_APP_AZURE_CLIENT_ID,
          authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID}`,
          clientSecret: process.env.REACT_APP_AZURE_CLIENT_SECRET
        }
      });
      await pca.clearCache();
      return true;
    } catch (error) {
      console.error('Logout error i prod:', error);
      throw error;
    }
  },

  getAccount: async () => {
    if (isDev) {
      return { status: 'needsRendererAuth' };
    }
    try {
      console.log('Henter konto i prod');
      const { PublicClientApplication } = require('@azure/msal-node');
      const pca = new PublicClientApplication({
        auth: {
          clientId: process.env.REACT_APP_AZURE_CLIENT_ID,
          authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID}`,
          clientSecret: process.env.REACT_APP_AZURE_CLIENT_SECRET
        }
      });
      const accounts = await pca.getTokenCache().getAllAccounts();
      return accounts[0] || null;
    } catch (error) {
      console.error('Get account error i prod:', error);
      throw error;
    }
  }
};

// Eksponerer sikre API-er til renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  env: safeEnv
});

// Eksponerer grunnleggende Electron-informasjon og brukerrolle-funksjoner
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  env: safeEnv,
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

// Lytt på device-code events fra main process
ipcRenderer.on('device-code', (event, response) => {
  console.log('Device code event mottatt i preload');
  window.postMessage({ type: 'DEVICE_CODE', payload: response }, '*');
}); 