require('dotenv').config();
const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const { PublicClientApplication, LogLevel, CryptoProvider } = require('@azure/msal-node');
const path = require('path');
const Store = require('electron-store');
const store = new Store();
const config = require('./config');

const REDIRECT_URI = `msal${config.AZURE_CLIENT_ID}://auth`;
const cryptoProvider = new CryptoProvider();

// Registrer custom protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(`msal${config.AZURE_CLIENT_ID}`, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(`msal${config.AZURE_CLIENT_ID}`)
}

// MSAL konfigurasjon basert på offisiell dokumentasjon
const msalConfig = {
  auth: {
    clientId: config.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${config.AZURE_TENANT_ID}`,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message) => {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Verbose,
    }
  }
};

// Verifiser at vi har nødvendige konfigurasjonsverdier
if (!config.AZURE_CLIENT_ID || !config.AZURE_TENANT_ID) {
  console.error('Mangler nødvendig konfigurasjon. Sjekk at config.js inneholder AZURE_CLIENT_ID og AZURE_TENANT_ID');
  app.quit();
}

// Initialiser MSAL
const pca = new PublicClientApplication(msalConfig);

let mainWindow;
let authWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
}

// Håndter deep linking på macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleRedirectUrl(url);
});

app.whenReady().then(() => {
  createWindow();
  
  // Registrer MSAL protocol
  protocol.registerHttpProtocol(`msal${config.AZURE_CLIENT_ID}`, (request, callback) => {
    const url = request.url;
    handleRedirectUrl(url);
  });
});

function handleRedirectUrl(url) {
  if (authWindow && url.startsWith(REDIRECT_URI)) {
    const urlParams = new URL(url);
    const code = urlParams.searchParams.get('code');
    if (code) {
      authWindow.webContents.send('auth-code', code);
    }
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('login', async () => {
  try {
    // Generer PKCE koder
    const { verifier, challenge } = await cryptoProvider.generatePkceCodes();

    const authCodeUrlParams = {
      scopes: ['User.Read'],
      redirectUri: REDIRECT_URI,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      extraQueryParameters: {
        domain_hint: 'byggmesterforsikring.no'  // Sikrer at vi kun tillater pålogging fra deres domene
      }
    };

    const authCodeRequest = {
      ...authCodeUrlParams,
      codeVerifier: verifier,
      code: '',
    };

    const authUrl = await pca.getAuthCodeUrl(authCodeUrlParams);

    authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
    });

    authWindow.loadURL(authUrl);
    authWindow.show();

    return new Promise((resolve, reject) => {
      authWindow.webContents.on('will-redirect', async (event, url) => {
        try {
          if (url.startsWith(REDIRECT_URI)) {
            event.preventDefault();
            const urlParams = new URL(url);
            const code = urlParams.searchParams.get('code');
            authCodeRequest.code = code;
            
            const response = await pca.acquireTokenByCode(authCodeRequest);
            authWindow.close();
            resolve(response);
          }
        } catch (error) {
          reject(error);
        }
      });

      authWindow.on('closed', () => {
        authWindow = null;
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}); 