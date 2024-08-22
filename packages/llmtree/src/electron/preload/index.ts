/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcRenderer } from 'electron'

import { State } from '@/state/state'

declare global {
  interface Window {
    ipcRenderer: {
      loadState: () => Promise<State | null>
      saveState: (state: Omit<State, 'actions'>) => Promise<void>
      startCompletion: (params: any) => Promise<number>
      invoke: (channel: string, ...args: any[]) => Promise<any>
      on: (
        event: string,
        listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
      ) => void
      send: (channel: string, ...args: any[]) => void
      once: (
        event: string,
        listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
      ) => void
      removeAllListeners: (event: string) => void
      functionResult: (result: any) => void
      cancelCompletion: (id: number) => void
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
  startCompletion: (params: any) =>
    ipcRenderer.invoke('start-completion', params),
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  on: (
    event: string,
    listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ) => ipcRenderer.on(event, listener),
  once: (
    event: string,
    listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ) => ipcRenderer.once(event, listener),
  removeAllListeners: (event: string) => ipcRenderer.removeAllListeners(event),
  cancelCompletion: (id: number) => ipcRenderer.send(`cancel-completion`, id),
  functionResult: (result: any) =>
    ipcRenderer.send('function-call-response', result),

  updater: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    mockUpdate: () => ipcRenderer.invoke('mock-update'),
  },
}
