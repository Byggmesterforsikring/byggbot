const { LogLevel } = require('@azure/msal-node');
const isDev = process.env.NODE_ENV === 'development';

// Hent miljøvariabler fra electronAPI
const clientId = window.electronAPI?.env?.REACT_APP_AZURE_CLIENT_ID;
const tenantId = window.electronAPI?.env?.REACT_APP_AZURE_TENANT_ID;
const redirectUri = isDev ? 'http://localhost:3002' : `msal${clientId}://auth`;

if (!clientId || !tenantId) {
  console.error('Manglende miljøvariabler:', {
    clientId: !!clientId,
    tenantId: !!tenantId,
    env: process.env.NODE_ENV,
    electronAPI: !!window.electronAPI
  });
}

// MSAL konfigurasjon
export const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: isDev ? 'http://localhost:3002' : `msal${clientId}://auth`,
    navigateToLoginRequestUrl: true
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: true
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (!containsPii) {
          console.log(`[MSAL] ${level}: ${message}`);
        }
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Verbose,
    },
    allowNativeBroker: false,
    windowHashTimeout: 60000,
    iframeHashTimeout: 60000,
    loadFrameTimeout: 60000
  }
};

// Login forespørsel konfigurasjon
export const loginRequest = {
  scopes: ['User.Read', 'profile', 'openid'],
  prompt: 'select_account'
};

// Microsoft Graph API konfigurasjon
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me'
};

// Legg til en ny konfigurasjon for ADFS
export const adfsConfig = {
  authority: 'https://adfs.intility.com/adfs',
  validateAuthority: true,
  redirectUri: isDev ? 'http://localhost:3002' : `${msalProtocol}://auth`,
  postLogoutRedirectUri: isDev ? 'http://localhost:3002' : `${msalProtocol}://auth`
}; 