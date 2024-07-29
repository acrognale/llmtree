/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcRenderer } from 'electron'
import { StartCompletionParams } from 'electron/main/completions'

import { State } from '@/state/state'

declare global {
  interface Window {
    ipcRenderer: {
      loadState: () => Promise<State | null>
      saveState: (state: Omit<State, 'actions'>) => Promise<void>
      startCompletion: (params: StartCompletionParams) => Promise<void>
      on: (
        event: string,
        listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
      ) => void
      once: (
        event: string,
        listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
      ) => void
      removeAllListeners: (event: string) => void
      ackCompletion: (id: number) => void

      updater: {
        checkForUpdates: () => Promise<void>
        downloadUpdate: () => Promise<void>
        installUpdate: () => Promise<void>
        mockUpdate: () => Promise<void>
      }
    }
  }
}

window.ipcRenderer = {
  loadState: () => ipcRenderer.invoke('load-state'),
  saveState: (state: Omit<State, 'actions'>) =>
    ipcRenderer.invoke('save-state', state),
  startCompletion: (params: StartCompletionParams) =>
    ipcRenderer.invoke('start-completion', params),
  on: (
    event: string,
    listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ) => ipcRenderer.on(event, listener),
  once: (
    event: string,
    listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ) => ipcRenderer.once(event, listener),
  removeAllListeners: (event: string) => ipcRenderer.removeAllListeners(event),
  ackCompletion: (id: number) => ipcRenderer.send(`completion-ack-${id}`),

  updater: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    mockUpdate: () => ipcRenderer.invoke('mock-update'),
  },
}

// --------- Preload scripts loading ---------
function domReady(
  condition: DocumentReadyState[] = ['complete', 'interactive'],
) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find((e) => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find((e) => e === child)) {
      return parent.removeChild(child)
    }
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function loading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = loading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)
