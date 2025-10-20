const { session } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Betinget import av sikkerhetsoppsett basert på miljø
let setupSecurity;
try {
  if (isDev) {
    const { setupDevSecurity } = require('./dev');
    setupSecurity = setupDevSecurity;
  } else {
    const { setupProdSecurity } = require('./prod');
    setupSecurity = setupProdSecurity;
  }
} catch (error) {
  console.error('Feil ved lasting av sikkerhetskonfigurasjon:', error);
  // Bruk en enkel fallback-konfigurasjon
  setupSecurity = () => {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https: blob:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' https://*.microsoft.com https://*.microsoftonline.com; " +
            "frame-src 'self' https://*.microsoft.com https://*.microsoftonline.com;"
          ]
        }
      });
    });
  };
}

const setupSecurityPolicy = () => {
  try {
    setupSecurity();
  } catch (error) {
    console.error('Feil ved oppsett av sikkerhetspolicy:', error);
  }
};

module.exports = { setupSecurityPolicy }; 