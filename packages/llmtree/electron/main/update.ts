import { createRequire } from 'node:module'

import { app, ipcMain } from 'electron'
import type {
  ProgressInfo,
  UpdateDownloadedEvent,
  UpdateInfo,
} from 'electron-updater'

const { autoUpdater } = createRequire(import.meta.url)('electron-updater')

export function update(win: Electron.BrowserWindow) {
  autoUpdater.autoDownload = false
  autoUpdater.disableWebInstaller = false
  autoUpdater.allowDowngrade = false

  autoUpdater.on('checking-for-update', function () {})

  autoUpdater.on('update-available', (arg: UpdateInfo) => {
    win.webContents.send('update-can-available', {
      update: true,
      version: app.getVersion(),
      newVersion: arg?.version,
    })
  })

  autoUpdater.on('update-not-available', (arg: UpdateInfo) => {
    win.webContents.send('update-can-available', {
      update: false,
      version: app.getVersion(),
      newVersion: arg?.version,
    })
  })

  ipcMain.handle('mock-update', () => {
    autoUpdater.emit('update-available', {
      update: true,
      version: '1.0.0',
      newVersion: '1.0.1',
    })
  })

  ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) {
      const error = new Error(
        'The update feature is only available after the package.',
      )
      return { message: error.message, error }
    }

    try {
      return await autoUpdater.checkForUpdatesAndNotify()
    } catch (error) {
      return { message: 'Network error', error }
    }
  })

  ipcMain.handle('download-update', (event: Electron.IpcMainInvokeEvent) => {
    startDownload(
      (error, progressInfo) => {
        if (error) {
          event.sender.send('update-error', { message: error.message, error })
        } else {
          event.sender.send('download-progress', progressInfo)
        }
      },
      () => {
        event.sender.send('update-downloaded')
      },
    )
  })

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

function startDownload(
  callback: (error: Error | null, info: ProgressInfo | null) => void,
  complete: (event: UpdateDownloadedEvent) => void,
) {
  autoUpdater.on('download-progress', (info: ProgressInfo) =>
    callback(null, info),
  )
  autoUpdater.on('error', (error: Error) => callback(error, null))
  autoUpdater.on('update-downloaded', complete)
  autoUpdater.downloadUpdate()
}
