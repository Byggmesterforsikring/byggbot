// Hvis NODE_ENV ikke er definert (noe som ofte skjer når appen startes fra Finder),
// sett den til 'production'
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Last inn miljøvariabler før vi importerer andre moduler
require('dotenv').config({
  path: isDev ? path.join(__dirname, '../../.env') : path.join(__dirname, '../../.env.production')
});

// Legg til tidlig logging av hele miljøvariablene for debugging
console.info("HELT ENV:", JSON.stringify(process.env, null, 2));

const electronLog = require('electron-log');

// Konfigurer logging
electronLog.initialize({
  preload: true,
  level: 'info' //isDev ? 'info' : 'error' // Bare logg feil i produksjon
});

// Sett loggfilsti eksplisitt til en mappe i brukerdata slik at vi vet hvor loggen skrives
const logFilePath = path.join(app.getPath('userData'), 'logs', 'main.log');
electronLog.transports.file.resolvePath = () => logFilePath;
electronLog.info("Oppdatert log file path:", logFilePath);

electronLog.catchErrors({
  showDialog: false,
  onError(error) {
    electronLog.error('Application Error:', error);
  }
});

// Bestem riktig sti til services basert på miljø
const servicesPath = isDev
  ? '../services/userRoleService'
  : path.join(process.resourcesPath, 'services/userRoleService');

let userRoleService;
try {
  userRoleService = require(servicesPath);
  electronLog.info('Lastet userRoleService fra:', servicesPath);
} catch (error) {
  electronLog.error('Failed to load userRoleService:', error);
  try {
    const altPath = path.join(app.getAppPath(), '../services/userRoleService');
    userRoleService = require(altPath);
    electronLog.info('Lastet userRoleService fra alternativ sti:', altPath);
  } catch (altError) {
    electronLog.error('Failed to load userRoleService from alternative path:', altError);
  }
}

const { setupSecurityPolicy } = require('./security-config');

let mainWindow = null;

// Sett opp custom protokoll
const msalProtocol = `msal${process.env.REACT_APP_AZURE_CLIENT_ID}`;

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
ipcMain.on('device-code', (event, response) => {
  // Vis device code til brukeren
  if (mainWindow) {
    mainWindow.webContents.send('show-device-code', response);
  }
});

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

// Logg NODE_ENV med electronLog slik at vi også fanger opp info-nivåmeldinger
electronLog.info("Applikasjonen starter med NODE_ENV:", process.env.NODE_ENV);
// Logg filplasseringen til loggfila
electronLog.info("Log file path:", electronLog.transports.file.file);

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
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      sandbox: true
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

app.whenReady().then(createWindow);

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