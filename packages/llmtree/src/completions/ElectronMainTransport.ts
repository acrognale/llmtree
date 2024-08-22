/* eslint-disable @typescript-eslint/no-unused-vars */
import { IpcMain, webContents } from 'electron'

import { EventName, EventPayload } from '@/completions/EventTypes'
import { Transport } from '@/completions/Transport'

export class ElectronMainTransport implements Transport {
  constructor(private ipc: IpcMain) {}

  send<T extends EventName>(channel: T, message: EventPayload<T>): void {
    const contents = webContents.getFocusedWebContents()
    if (contents) {
      contents.send(channel, message)
    }
  }

  on<T extends EventName>(
    channel: T,
    listener: (message: EventPayload<T>) => void,
  ): void {
    this.ipc.on(channel, (event, message: EventPayload<T>) => listener(message))
  }

  off<T extends EventName>(
    channel: T,
    listener: (message: EventPayload<T>) => void,
  ): void {
    this.ipc.removeListener(channel, (event, message: EventPayload<T>) =>
      listener(message),
    )
  }

  invoke<T extends EventName>(
    channel: T,
    message: EventPayload<T>,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const contents = webContents.getFocusedWebContents()
      if (contents) {
        contents.send(channel, message)
        this.ipc.once(`${channel}:response`, (_, response) => {
          resolve(response)
        })
      } else {
        reject(new Error('No focused WebContents found'))
      }
    })
  }

  handle<T extends EventName>(
    channel: T,
    handler: (message: EventPayload<T>) => Promise<unknown>,
  ): void {
    this.ipc.handle(channel, (_, message: EventPayload<T>) => handler(message))
  }
}
