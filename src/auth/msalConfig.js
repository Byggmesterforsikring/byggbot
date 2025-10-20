import { PublicClientApplication, LogLevel } from '@azure/msal-browser';

const isDev = process.env.NODE_ENV === 'development';

// Hent konfigurasjon fra miljøvariabler
const clientId = process.env.REACT_APP_AZURE_CLIENT_ID;
const tenantId = process.env.REACT_APP_AZURE_TENANT_ID;
const redirectUri = isDev ? 'http://localhost:3002' : 'http://localhost:3002'; // Samme for dev og prod

if (!clientId || !tenantId) {
    console.error('MSAL Config: Mangler REACT_APP_AZURE_CLIENT_ID eller REACT_APP_AZURE_TENANT_ID');
}

// MSAL konfigurasjon
const msalConfig = {
    auth: {
        clientId: clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: redirectUri,
        navigateToLoginRequestUrl: false
    },
    cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false
    },
    system: {
        allowNativeBroker: false,
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        break;
                    case LogLevel.Info:
                        console.info(message);
                        break;
                    case LogLevel.Verbose:
                        console.debug(message);
                        break;
                    case LogLevel.Warning:
                        console.warn(message);
                        break;
                }
            },
            logLevel: LogLevel.Verbose
        }
    }
};

// Singleton MSAL-instans
let msalInstance = null;
let initializePromise = null;

export const getMsalInstance = async () => {
    if (!msalInstance) {
        if (!initializePromise) {
            console.log('Starter MSAL-initialisering');
            initializePromise = (async () => {
                msalInstance = new PublicClientApplication(msalConfig);
                await msalInstance.initialize();

                // Håndter eventuelle eksisterende tokens
                const accounts = msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    msalInstance.setActiveAccount(accounts[0]);
                }

                console.log('MSAL-instans initialisert');
                return msalInstance;
            })();
        }
        await initializePromise;
    }
    return msalInstance;
};

export const loginRequest = {
    scopes: ['user.read'],
    prompt: 'select_account'
};

export default msalConfig; 