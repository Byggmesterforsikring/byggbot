const { app, BrowserWindow } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'
const { autoUpdater } = require('electron-updater')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  if (isDev) {
    win.loadFile('index.html')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, 'index.html'))
  }

  // Sjekk for oppdateringer
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify()
  }

  // Håndter oppdateringsevents
  autoUpdater.on('update-available', () => {
    win.webContents.send('update_available')
  })

  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update_downloaded')
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
}) 