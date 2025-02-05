const { app, BrowserWindow } = require('electron');
const path = require('path');
const { setupSecurityPolicy } = require('./security-config');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  // Sett opp sikkerhetsinnstillinger før vinduet opprettes
  setupSecurityPolicy();

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    console.log('Starting in development mode...');
    // I utviklingsmodus, last fra webpack-dev-server
    mainWindow.loadURL('http://localhost:3002')
      .then(() => {
        console.log('Development URL loaded successfully');
        mainWindow.webContents.openDevTools();
      })
      .catch(err => {
        console.error('Failed to load development URL:', err);
      });
  } else {
    // I produksjonsmodus, last fra bygget fil
    const indexPath = path.join(app.getAppPath(), 'build', 'index.html');
    console.log('Production mode, loading:', indexPath);
    
    mainWindow.loadFile(indexPath)
      .then(() => {
        console.log('Production file loaded successfully');
      })
      .catch(err => {
        console.error('Failed to load production file:', err);
      });
  }

  // Håndter navigasjon for å sikre at eksterne lenker åpnes i nettleseren
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  createWindow();
});

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