const isDev = process.env.NODE_ENV === 'development';
const msalProtocol = `msal${process.env.REACT_APP_AZURE_CLIENT_ID}`;

// Definer redirect URI - bruk localhost i dev, MSAL redirect i prod
const redirectUri = isDev 
  ? 'http://localhost:3002'
  : `${msalProtocol}://auth`;

// MSAL konfigurasjon
export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID}`,
    redirectUri: redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: true,
    validateAuthority: true
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: true,
    secureCookies: !isDev
  },
  system: {
    allowNativeBroker: false,
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (!containsPii && level === 'Error') {
          console.error(`[MSAL] ${message}`);
        }
      },
      logLevel: isDev ? "Info" : "Error",
      piiLoggingEnabled: false
    },
    windowHashTimeout: 60000,
    iframeHashTimeout: 60000,
    loadFrameTimeout: 60000,
    navigateFrameWait: 0
  }
};

// Login forespørsel konfigurasjon
export const loginRequest = {
  scopes: ['User.Read', 'profile', 'openid'],
  prompt: 'select_account',
  extraQueryParameters: {
    domain_hint: 'bmf.no'
  }
};

// Microsoft Graph API konfigurasjon
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me'
}; 