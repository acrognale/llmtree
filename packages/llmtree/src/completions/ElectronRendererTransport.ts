/* eslint-disable @typescript-eslint/no-unused-vars */
import { IpcRenderer } from 'electron'

import { EventName, EventPayload } from '@/completions/EventTypes'
import { Transport } from '@/completions/Transport'

export class ElectronRendererTransport implements Transport {
  constructor(private ipc: IpcRenderer) {}

  send<T extends EventName>(channel: T, message: EventPayload<T>): void {
    this.ipc.send(channel, message)
  }

  on<T extends EventName>(
    channel: T,
    listener: (message: EventPayload<T>) => void,
  ): void {
    this.ipc.on(channel, (_, message: EventPayload<T>) => listener(message))
  }

  off<T extends EventName>(
    channel: T,
    listener: (message: EventPayload<T>) => void,
  ): void {
    this.ipc.removeListener(channel, (_, message: EventPayload<T>) =>
      listener(message),
    )
  }

  invoke<T extends EventName>(
    channel: T,
    message: EventPayload<T>,
  ): Promise<unknown> {
    return this.ipc.invoke(channel, message)
  }

  handle<T extends EventName>(
    channel: T,
    handler: (message: EventPayload<T>) => Promise<unknown>,
  ): void {
    throw new Error('Handle not implemented for IpcRenderer')
  }
}
