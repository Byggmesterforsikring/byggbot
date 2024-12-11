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
  mainWindow.loadURL(
    process.env.NODE_ENV === 'development'
      ? 'http://127.0.0.1:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );
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