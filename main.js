const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js'),
      allowRunningInsecureContent: true,
      webviewTag: true,
      sandbox: false
    },
    backgroundColor: '#fff',
    titleBarStyle: 'default',
    vibrancy: 'under-window',
    icon: path.join(__dirname, 'assets/icons/byggbot@3x.icns')
  });

  if (process.platform === 'darwin') {
    app.dock.show();
    app.focus({ steal: true });
  }

  if (isDev) {
    console.log('Starting in development mode...');
    const loadURL = 'http://127.0.0.1:3000';
    console.log(`Attempting to load URL: ${loadURL}`);
    setTimeout(() => {
      mainWindow.loadURL(loadURL)
        .then(() => {
          console.log('Development URL loaded successfully');
          mainWindow.webContents.openDevTools();
        })
        .catch(err => {
          console.error('Failed to load development URL:', err);
          console.log('Retrying in 3 seconds...');
          setTimeout(() => {
            mainWindow.loadURL(loadURL)
              .catch(retryErr => {
                console.error('Retry failed:', retryErr);
              });
          }, 3000);
        });
    }, 2000);
  } else {
    const isPacked = app.isPackaged;
    let indexPath;
    
    if (isPacked) {
        indexPath = path.join(app.getAppPath(), 'build', 'index.html');
    } else {
        indexPath = path.join(__dirname, 'build', 'index.html');
    }
    
    console.log('Is Packed:', isPacked);
    console.log('App Path:', app.getAppPath());
    console.log('Index Path:', indexPath);
    console.log('File exists:', require('fs').existsSync(indexPath));
    
    mainWindow.loadFile(indexPath)
        .then(() => {
            console.log('File loaded successfully');
        })
        .catch(err => {
            console.error('Failed to load file:', err);
            console.error('Error details:', err.stack);
        });
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('dom-ready', () => {
    console.log('DOM is ready');
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
  app.focus({ steal: true });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
}); 

console.log('App path:', app.getAppPath());
console.log('__dirname:', __dirname);
console.log('Process cwd:', process.cwd());