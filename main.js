const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'
const { autoUpdater } = require('electron-updater')

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  if (isDev) {
    mainWindow.loadFile('index.html')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'))
  }

  // Sjekk for oppdateringer
  if (!isDev) {
    autoUpdater.checkForUpdates()
  }
}

// Auto-oppdaterings events
autoUpdater.on('checking-for-update', () => {
  mainWindow.webContents.send('update-message', 'Sjekker for oppdateringer...');
});

autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Oppdatering tilgjengelig',
    message: `En ny versjon (${info.version}) er tilgjengelig. Vil du oppdatere nå?`,
    buttons: ['Ja', 'Nei']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate()
      mainWindow.webContents.send('update-message', 'Laster ned oppdatering...');
    }
  })
});

autoUpdater.on('update-not-available', () => {
  mainWindow.webContents.send('update-message', 'Ingen oppdateringer tilgjengelig.');
});

autoUpdater.on('download-progress', (progressObj) => {
  mainWindow.webContents.send('update-message', `Laster ned... ${Math.round(progressObj.percent)}%`);
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Oppdatering klar',
    message: 'Oppdateringen er lastet ned. Appen vil starte på nytt for å installere oppdateringen.',
    buttons: ['Restart']
  }).then(() => {
    autoUpdater.quitAndInstall(false, true);
  })
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
  mainWindow.webContents.send('update-message', 'Feil ved oppdatering: ' + err);
});

// IPC handlers
ipcMain.on('check-for-updates', () => {
  if (!isDev) {
    autoUpdater.checkForUpdates();
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
}); 