const { session } = require('electron');

const setupDevSecurity = () => {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self' http://localhost:* https://localhost:* https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net https://*.intility.com; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* https://localhost:* https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net; " +
                    "style-src 'self' 'unsafe-inline' https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net https://aadcdn.msauth.net https://aadcdn.msftauth.net; " +
                    "img-src 'self' data: https: blob:; " +
                    "font-src 'self' data: https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net; " +
                    "connect-src 'self' http://localhost:* https://localhost:* https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net; " +
                    "frame-src 'self' https://*.microsoft.com https://*.microsoftonline.com; " +
                    "form-action *;"
                ]
            }
        });
    });

    // Dev-spesifikk CORS-konfigurasjon
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        const { requestHeaders } = details;

        // Tillat alle CORS i development
        requestHeaders['Access-Control-Allow-Origin'] = '*';
        requestHeaders['Access-Control-Allow-Methods'] = '*';
        requestHeaders['Access-Control-Allow-Headers'] = '*';

        callback({ requestHeaders });
    });
};

module.exports = { setupDevSecurity }; 