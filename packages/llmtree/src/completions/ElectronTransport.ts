import { IpcRenderer, IpcMain } from 'electron'

import { Message, Transport } from '@/completions/Transport'

// Implement the ElectronTransport class
export class ElectronTransport implements Transport {
  private ipc: IpcRenderer | IpcMain

  constructor(ipc: IpcRenderer | IpcMain) {
    this.ipc = ipc
  }

  send(channel: string, message: Message): void {
    if ('send' in this.ipc) {
      // IpcRenderer
      this.ipc.send(channel, message)
    } else {
      // IpcMain
      // In IpcMain, we need a specific window to send to.
      // This might need to be adjusted based on your application structure.
      throw new Error('Send not implemented for IpcMain')
    }
  }

  on(channel: string, listener: (message: Message) => void): void {
    if ('on' in this.ipc) {
      // IpcRenderer
      this.ipc.on(channel, (_, message) => listener(message))
    } else {
      // IpcMain
      this.ipc.on(channel, (event, message) => listener(message))
    }
  }

  off(channel: string, listener: (message: Message) => void): void {
    if ('off' in this.ipc) {
      // IpcRenderer
      this.ipc.off(channel, (_, message) => listener(message))
    } else {
      // IpcMain
      this.ipc.off(channel, (event, message) => listener(message))
    }
  }

  invoke(channel: string, message: Message): Promise<any> {
    if ('invoke' in this.ipc) {
      // IpcRenderer
      return this.ipc.invoke(channel, message)
    } else {
      // IpcMain
      throw new Error('Invoke not implemented for IpcMain')
    }
  }

  handle(channel: string, handler: (message: Message) => Promise<any>): void {
    if ('handle' in this.ipc) {
      // IpcMain
      this.ipc.handle(channel, (_, message) => handler(message))
    } else {
      // IpcRenderer
      throw new Error('Handle not implemented for IpcRenderer')
    }
  }
}

// Factory function to create the appropriate transport
export function createElectronTransport(ipc: IpcRenderer | IpcMain): Transport {
  return new ElectronTransport(ipc)
}
