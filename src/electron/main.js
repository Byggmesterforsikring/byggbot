// Hvis NODE_ENV ikke er definert (noe som ofte skjer når appen startes fra Finder),
// sett den til 'production'
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const { app, BrowserWindow, ipcMain, protocol, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const { PublicClientApplication, LogLevel, CryptoProvider } = require('@azure/msal-node');
const electronLog = require('electron-log');

// Konfigurer logging for autoUpdater
autoUpdater.logger = electronLog;
autoUpdater.logger.transports.file.level = 'info';

// Last inn config
const config = require('./config');

// Verifiser at vi har nødvendige konfigurasjonsverdier
if (!config.AZURE_CLIENT_ID || !config.AZURE_TENANT_ID) {
  console.error('Mangler nødvendig konfigurasjon. Sjekk at config.js inneholder AZURE_CLIENT_ID og AZURE_TENANT_ID');
  app.quit();
}

const msalProtocol = `msal${config.AZURE_CLIENT_ID}`;
const REDIRECT_URI = `${msalProtocol}://auth`;
const cryptoProvider = new CryptoProvider();

// MSAL konfigurasjon
const msalConfig = {
  auth: {
    clientId: config.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${config.AZURE_TENANT_ID}`,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message) => {
        electronLog.info(message);
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Verbose,
    }
  }
};

// Initialiser MSAL
const pca = new PublicClientApplication(msalConfig);

// Last inn miljøvariabler før vi importerer andre moduler
const dotenv = require('dotenv');
const envPath = isDev
  ? path.join(__dirname, '../../.env')
  : path.join(app.getAppPath(), '.env.production');

console.log('Forsøker å laste miljøvariabler fra:', envPath);
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.error('Feil ved lasting av miljøvariabler:', envResult.error);
} else {
  console.log('Miljøvariabler lastet. Tilgjengelige variabler:', Object.keys(envResult.parsed));
}

// Legg til tidlig logging av relevante miljøvariabler
console.info("Miljøvariabler:", {
  NODE_ENV: process.env.NODE_ENV,
  AZURE_CLIENT_ID: process.env.REACT_APP_AZURE_CLIENT_ID,
  AZURE_TENANT_ID: process.env.REACT_APP_AZURE_TENANT_ID,
  REDIRECT_URI: process.env.REACT_APP_REDIRECT_URI,
  ENV_PATH: envPath
});

// Konfigurer logging
electronLog.initialize({ preload: true });
const logFilePath = path.join(app.getPath('userData'), 'logs', 'main.log');
electronLog.transports.file.resolvePath = () => logFilePath;
electronLog.info("Oppdatert log file path:", logFilePath);

electronLog.catchErrors({
  showDialog: false,
  onError(error) {
    electronLog.error('Application Error:', error);
  }
});

// Last inn userRoleService
let userRoleService;
try {
  userRoleService = require('./services/userRoleService');
  electronLog.info('Lastet userRoleService');
} catch (error) {
  electronLog.error('Failed to load userRoleService:', error);
  app.quit();
}

const { setupSecurityPolicy } = require('./security-config');

let mainWindow = null;
let authWindow = null;

// Registrer custom protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(msalProtocol, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(msalProtocol)
}

// Legg til en open-url event listener for å fange opp deep linking-hendelser
app.on('open-url', (event, url) => {
  event.preventDefault();
  electronLog.info("open-url event trigget med URL:", url);

  if (mainWindow) {
    // Send URLen til renderer-prosessen
    mainWindow.webContents.send("auth-response", url);
  } else {
    electronLog.warn("Hovedvinduet er ikke opprettet ennå. Auth response vil bli lagret for senere håndtering.");
    // Lagre URLen for senere
    global.authResponse = url;
  }
});

// Håndter device-code events fra renderer
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
        domain_hint: 'byggmesterforsikring.no'
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
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
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
    electronLog.error('Login error:', error);
    throw error;
  }
});

ipcMain.handle('logout', async () => {
  try {
    const accounts = await pca.getTokenCache().getAllAccounts();
    if (accounts.length > 0) {
      await pca.getTokenCache().removeAccount(accounts[0]);
    }
    return true;
  } catch (error) {
    electronLog.error('Logout error:', error);
    throw error;
  }
});

ipcMain.handle('get-account', async () => {
  try {
    const accounts = await pca.getTokenCache().getAllAccounts();
    return accounts[0] || null;
  } catch (error) {
    electronLog.error('Get account error:', error);
    throw error;
  }
});

// Last inn IPC handlers
const setupDrawingRulesHandlers = require('./ipc/drawingRulesHandler');
const setupAiChatHandlers = require('./ipc/aiChatHandler');
const { setupDashboardHandlers } = require('./ipc/dashboardHandler');

// Sett opp IPC handlers
ipcMain.handle('user-role:get', async (event, email) => {
  try {
    return await userRoleService.getUserRole(email);
  } catch (error) {
    electronLog.error('Feil ved henting av brukerrolle:', error);
    return 'USER';
  }
});

ipcMain.handle('user-role:set', async (event, email, role) => {
  try {
    return await userRoleService.upsertUserRole(email, role);
  } catch (error) {
    electronLog.error('Feil ved setting av brukerrolle:', error);
    return null;
  }
});

ipcMain.handle('user-role:getAll', async () => {
  try {
    return await userRoleService.getAllUserRoles();
  } catch (error) {
    electronLog.error('Feil ved henting av alle brukerroller:', error);
    return [];
  }
});

ipcMain.handle('user-role:delete', async (event, email) => {
  try {
    return await userRoleService.deleteUserRole(email);
  } catch (error) {
    electronLog.error('Feil ved sletting av brukerrolle:', error);
    return null;
  }
});

// Sett opp tegningsregler handlers
setupDrawingRulesHandlers();

// Sett opp AI chat handlers
setupAiChatHandlers();

// Sett opp dashboard handlers
setupDashboardHandlers();

// Logg NODE_ENV med electronLog slik at vi også fanger opp info-nivåmeldinger
electronLog.info("Applikasjonen starter med NODE_ENV:", process.env.NODE_ENV);
// Logg filplasseringen til loggfila
electronLog.info("Log file path:", electronLog.transports.file.file);

// Last inn migrasjoner
const runMigrations = require('./db/runMigrations');

function createWindow() {
  setupSecurityPolicy();

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(app.getAppPath(), 'src/electron/preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      sandbox: false
    },
    backgroundColor: '#fff',
    titleBarStyle: 'default',
    vibrancy: 'under-window',
    icon: path.join(__dirname, 'assets/icons/byggbot@3x.icns')
  });

  // Sjekk om vi har en lagret auth response
  if (global.authResponse) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send("auth-response", global.authResponse);
      global.authResponse = null;
    });
  }

  // Legg til protokoll-håndtering for login.microsoftonline.com
  mainWindow.webContents.session.webRequest.onBeforeRequest(
    { urls: ['*://*.microsoftonline.com/*', '*://*.microsoft.com/*', '*://*.intility.com/*'] },
    (details, callback) => callback({})
  );

  // Håndter alle navigasjonsforespørsler
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('https://login.microsoftonline.com') &&
      !url.startsWith('https://login.microsoft.com') &&
      !url.startsWith('https://adfs.intility.com')) {
      event.preventDefault();
      electronLog.error('Uventet navigasjon blokkert:', url);
    }
  });

  // Logg kun kritiske feil for failed requests
  mainWindow.webContents.session.webRequest.onErrorOccurred(
    { urls: ['<all_urls>'] },
    (details) => {
      if (details.error !== 'net::ERR_ABORTED' &&
        !details.url.includes('login.live.com') &&
        !details.url.includes('OneCollector')) {
        electronLog.error('Kritisk forespørselsfeil:', {
          url: details.url,
          error: details.error
        });
      }
    }
  );

  // Logg kun kritiske feil for failed requests
  mainWindow.webContents.session.webRequest.onCompleted(
    { urls: ['*://*.microsoftonline.com/*', '*://*.microsoft.com/*', '*://*.intility.com/*'] },
    (details) => {
      if (details.statusCode >= 500) {
        electronLog.error('Kritisk serverfeil:', {
          url: details.url,
          statusCode: details.statusCode
        });
      }
    }
  );

  if (isDev) {
    mainWindow.loadURL('http://localhost:3002');
    mainWindow.webContents.openDevTools();
    console.log('Loading development URL:', 'http://localhost:3002');
  } else {
    const isPacked = app.isPackaged;
    let indexPath = isPacked
      ? path.join(process.resourcesPath, 'build', 'index.html')
      : path.join(__dirname, '../..', 'build', 'index.html');

    if (isPacked && !require('fs').existsSync(indexPath)) {
      indexPath = path.join(app.getAppPath(), 'build', 'index.html');
    }

    try {
      if (!require('fs').existsSync(indexPath)) {
        throw new Error(`index.html not found at ${indexPath}`);
      }

      mainWindow.loadFile(indexPath)
        .catch(err => {
          electronLog.error('Failed to load application:', err);
          const altPath = path.join(process.resourcesPath, 'build', 'index.html');
          return mainWindow.loadFile(altPath);
        })
        .catch(err => {
          electronLog.error('Failed to load application from all paths:', err);
          app.quit();
        });
    } catch (error) {
      electronLog.error('Critical application error:', error);
      app.quit();
    }
  }
}

// Funksjoner for håndtering av automatiske oppdateringer
function setupAutoUpdater() {
  // Sjekk for oppdateringer ved oppstart (i produksjonsmodus)
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
    
    // Sjekk for oppdateringer hver time (i millisekunder)
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 60 * 60 * 1000);
  }

  // Håndter update-available event
  autoUpdater.on('update-available', (info) => {
    electronLog.info('Oppdatering tilgjengelig:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  // Håndter update-downloaded event
  autoUpdater.on('update-downloaded', (info) => {
    electronLog.info('Oppdatering lastet ned:', info);
    
    if (mainWindow) {
      // Send beskjed til brukergrensesnittet om nedlastet oppdatering
      mainWindow.webContents.send('update-downloaded', info);
      
      // Spør brukeren om å installere oppdateringen
      dialog.showMessageBox({
        type: 'info',
        title: 'Oppdatering klar',
        message: `En ny versjon (${info.version}) er klar til å installeres. Vil du installere nå? Applikasjonen vil starte på nytt.`,
        buttons: ['Installer nå', 'Installer senere']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
    }
  });

  // Logg autoUpdater events for debugging
  autoUpdater.on('checking-for-update', () => {
    electronLog.info('Sjekker for oppdateringer...');
  });

  autoUpdater.on('update-not-available', (info) => {
    electronLog.info('Ingen oppdatering tilgjengelig:', info);
  });

  autoUpdater.on('error', (err) => {
    electronLog.error('Feil ved automatisk oppdatering:', err);
  });
}

app.whenReady().then(async () => {
  try {
    // Kjør migrasjoner
    await runMigrations();
    electronLog.info('Migrasjoner fullført');
  } catch (error) {
    electronLog.error('Feil ved kjøring av migrasjoner:', error);
  }

  createWindow();
  
  // Sett opp auto-updater
  setupAutoUpdater();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 