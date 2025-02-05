const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  env: {
    NODE_ENV: process.env.NODE_ENV,
    REACT_APP_AZURE_CLIENT_ID: process.env.REACT_APP_AZURE_CLIENT_ID,
    REACT_APP_AZURE_TENANT_ID: process.env.REACT_APP_AZURE_TENANT_ID,
  },
});

window.addEventListener('DOMContentLoaded', () => {
  // Legg til eventuelle DOMContentLoaded-relaterte operasjoner her
  console.log('DOM er lastet');
}); 