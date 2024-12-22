const { app, BrowserWindow } = require('electron');
const path = require('path');
const { setupSecurityPolicy } = require('./security-config');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Disable Node.js integration
      contextIsolation: true, // Enable context isolation
      enableRemoteModule: false, // Disable remote module
      preload: path.join(__dirname, 'preload.js') // Add preload script if needed
    }
  });

  // Load your app
  const isPacked = app.isPackaged;
  let indexPath;
  
  if (isPacked) {
    indexPath = path.join(app.getAppPath(), 'build', 'index.html');
  } else {
    indexPath = path.join(__dirname, '../../build/index.html');
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

app.whenReady().then(() => {
  setupSecurityPolicy();
  createWindow();
});

// Handle window behavior on macOS
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