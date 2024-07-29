import React, { useEffect, useState } from 'react'

export const UpdateChecker = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [updateInfo, setUpdateInfo] = useState({
    version: '',
    newVersion: '',
    releaseNotes: '',
  })

  useEffect(() => {
    window.ipcRenderer.on('update-can-available', (_, info) => {
      if (info.update) {
        setUpdateAvailable(true)
        setUpdateInfo(info)
      }
    })

    window.ipcRenderer.on('download-progress', (_, info) => {
      setDownloadProgress(info.percent)
    })

    window.ipcRenderer.on('update-downloaded', () => {
      setUpdateDownloaded(true)
    })

    window.ipcRenderer.updater.checkForUpdates()

    return () => {
      window.ipcRenderer.removeAllListeners('update-can-available')
      window.ipcRenderer.removeAllListeners('download-progress')
      window.ipcRenderer.removeAllListeners('update-downloaded')
    }
  }, [])

  const handleDownload = () => {
    window.ipcRenderer.updater.downloadUpdate()
  }

  const handleInstall = () => {
    window.ipcRenderer.updater.installUpdate()
  }

  if (!updateAvailable) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg min-w-[400px] flex flex-col gap-2">
        <h2 className="text-xl font-bold mb-4">Update Available</h2>
        <div className="flex flex-col gap-2">
          <p>Version: {updateInfo.version}</p>
          <p>New Version: {updateInfo.newVersion}</p>
          <p>Release Notes: {updateInfo.releaseNotes}</p>
        </div>
        {!updateDownloaded ? (
          <>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
              onClick={handleDownload}>
              Download Update
            </button>
            {downloadProgress > 0 && (
              <progress
                className="w-full mt-4"
                value={downloadProgress}
                max="100"
              />
            )}
          </>
        ) : (
          <button
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
            onClick={handleInstall}>
            Install and Restart
          </button>
        )}
      </div>
    </div>
  )
}
