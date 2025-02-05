const { session } = require('electron');
const isDev = process.env.NODE_ENV === 'development';

const setupSecurityPolicy = () => {
  // Define CSP (Content Security Policy)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          // Tillater unsafe-eval bare i development mode
          isDev 
            ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.msauth.net https://*.msftauth.net"
            : "script-src 'self' 'unsafe-inline' https://*.msauth.net https://*.msftauth.net",
          "style-src 'self' 'unsafe-inline' https://*.msauth.net https://*.msftauth.net https://aadcdn.msauth.net https://aadcdn.msftauth.net",
          "img-src 'self' data: https: blob:",
          "connect-src 'self' https://login.microsoftonline.com https://*.microsoft.com https://graph.microsoft.com ws://localhost:* http://localhost:* https://localhost:* https://*.msauth.net https://*.msftauth.net",
          "frame-src 'self' https://login.microsoftonline.com https://*.microsoft.com https://*.msauth.net https://*.msftauth.net",
          "font-src 'self' data: https://*.msauth.net https://*.msftauth.net",
          "media-src 'self'"
        ].join('; ')
      }
    });
  });

  // Sett opp ekstra sikkerhetsinnstillinger
  session.defaultSession.webRequest.onBeforeRequest({
    urls: ['*://*/*']
  }, (details, callback) => {
    callback({cancel: false});
  });
};

module.exports = { setupSecurityPolicy }; 