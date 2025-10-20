const { session } = require('electron');

const setupProdSecurity = () => {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self' https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net; " +
                    "style-src 'self' 'unsafe-inline' https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net https://aadcdn.msauth.net https://aadcdn.msftauth.net; " +
                    "img-src 'self' data: https: blob:; " +
                    "font-src 'self' data: https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net; " +
                    "connect-src 'self' https://*.microsoft.com https://*.microsoftonline.com https://*.msauth.net https://*.msftauth.net; " +
                    "frame-src 'self' https://*.microsoft.com https://*.microsoftonline.com; " +
                    "form-action 'self' https://*.microsoft.com https://*.microsoftonline.com;"
                ],
                'Strict-Transport-Security': ['max-age=31536000; includeSubDomains'],
                'X-Content-Type-Options': ['nosniff'],
                'X-Frame-Options': ['DENY'],
                'X-XSS-Protection': ['1; mode=block']
            }
        });
    });

    // Prod-spesifikk CORS-konfigurasjon
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        const { requestHeaders } = details;
        const url = new URL(details.url);

        // Mer restriktiv CORS i produksjon
        if (url.hostname.includes('microsoft.com') ||
            url.hostname.includes('msauth.net') ||
            url.hostname.includes('msftauth.net')) {
            requestHeaders['Access-Control-Allow-Origin'] = url.origin;
            requestHeaders['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
            requestHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        }

        callback({ requestHeaders });
    });

    // Prod-spesifikke cookie-innstillinger
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const { responseHeaders } = details;

        if (responseHeaders['set-cookie']) {
            responseHeaders['set-cookie'] = responseHeaders['set-cookie'].map(cookie => {
                if (!cookie.includes('SameSite=')) {
                    cookie += '; SameSite=Strict';
                }
                if (!cookie.includes('Secure')) {
                    cookie += '; Secure';
                }
                if (!cookie.includes('HttpOnly')) {
                    cookie += '; HttpOnly';
                }
                return cookie;
            });
        }

        callback({ responseHeaders });
    });
};

module.exports = { setupProdSecurity }; 