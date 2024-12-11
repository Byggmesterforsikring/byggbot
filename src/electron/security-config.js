const { session } = require('electron');

const setupSecurityPolicy = () => {
  // Define CSP (Content Security Policy)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' http://127.0.0.1:3000",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "img-src 'self' data: https:",
        ].join('; ')
      }
    });
  });
};

module.exports = { setupSecurityPolicy }; 