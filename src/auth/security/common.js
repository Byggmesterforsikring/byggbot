const baseCSPDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://*.msauth.net",
        "https://*.msftauth.net",
        "https://*.microsoft.com"
    ],
    styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://*.msauth.net",
        "https://*.msftauth.net"
    ],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    fontSrc: ["'self'", "data:", "https://*.msauth.net", "https://*.msftauth.net"],
    connectSrc: [
        "'self'",
        "https://*.microsoft.com",
        "https://*.microsoftonline.com",
        "https://*.msauth.net",
        "https://*.msftauth.net"
    ],
    frameSrc: ["'self'", "https://*.microsoft.com", "https://*.microsoftonline.com"],
    mediaSrc: ["'self'"],
    childSrc: ["'self'", "https://*.microsoft.com", "https://*.microsoftonline.com"]
};

module.exports = { baseCSPDirectives }; 