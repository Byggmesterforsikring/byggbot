const { session } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Last inn miljøvariabler fra riktig .env fil
require('dotenv').config({
  path: isDev ? path.join(__dirname, '../../.env') : path.join(__dirname, '../../.env.production')
});

const setupSecurityPolicy = () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev ? 
          // Development CSP
          [
            "default-src 'self' https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net http://localhost:*",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.msauth.net https://*.msftauth.net https://*.microsoft.com https://login.microsoftonline.com https://aadcdn.msauth.net https://aadcdn.msftauth.net",
            "style-src 'self' 'unsafe-inline' https://*.msauth.net https://*.msftauth.net https://aadcdn.msauth.net https://aadcdn.msftauth.net",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data: https://*.msauth.net https://*.msftauth.net",
            "connect-src 'self' http://localhost:3001 https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net https://login.live.com",
            "frame-src 'self' https://*.microsoft.com https://*.microsoftonline.com",
            "media-src 'self'"
          ].join('; ') :
          // Production CSP
          [
            "default-src 'self' https://*.microsoft.com https://*.microsoftonline.com",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.msauth.net https://*.msftauth.net https://*.microsoft.com",
            "style-src 'self' 'unsafe-inline' https://*.msauth.net https://*.msftauth.net",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data: https://*.msauth.net https://*.msftauth.net",
            "connect-src 'self' https://*.microsoft.com https://*.microsoftonline.com",
            "frame-src 'self' https://*.microsoft.com https://*.microsoftonline.com",
            "media-src 'self'"
          ].join('; ')
        ]
      }
    });
  });

  // Sett opp CORS-headers for Microsoft-tjenester
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const { requestHeaders } = details;
    const url = new URL(details.url);

    // Legg til CORS-headers for Microsoft-domener
    if (url.hostname.includes('microsoft.com') || 
        url.hostname.includes('msauth.net') || 
        url.hostname.includes('msftauth.net')) {
      requestHeaders['Access-Control-Allow-Origin'] = '*';
      requestHeaders['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
      requestHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    }

    callback({ requestHeaders });
  });

  // Tillat alle forespørsler
  session.defaultSession.webRequest.onBeforeRequest({
    urls: ['*://*/*']
  }, (details, callback) => {
    callback({cancel: false});
  });
};

module.exports = { setupSecurityPolicy }; 