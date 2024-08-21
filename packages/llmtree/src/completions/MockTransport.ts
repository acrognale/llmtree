import { EventName, EventPayload } from '@/completions/EventTypes'
import { Transport } from '@/completions/Transport'

export class MockTransport implements Transport {
  private listeners: {
    [K in EventName]?: ((message: EventPayload<K>) => void)[]
  } = {}
  private handlers: {
    [K in EventName]?: (message: EventPayload<K>) => Promise<unknown>
  } = {}

  send<T extends EventName>(channel: T, message: EventPayload<T>): void {
    const listeners = this.listeners[channel] || []
    listeners.forEach((listener) => listener(message))
  }

  on<T extends EventName>(
    channel: T,
    listener: (message: EventPayload<T>) => void,
  ): void {
    if (!this.listeners[channel]) {
      this.listeners[channel] = []
    }
    this.listeners[channel]!.push(listener as any)
  }

  off<T extends EventName>(
    channel: T,
    listener: (message: EventPayload<T>) => void,
  ): void {
    if (this.listeners[channel]) {
      this.listeners[channel] = this.listeners[channel]!.filter(
        (l) => l !== listener,
      )
    }
  }

  invoke<T extends EventName>(
    channel: T,
    message: EventPayload<T>,
  ): Promise<unknown> {
    const handler = this.handlers[channel]
    if (handler) {
      return handler(message)
    }
    return Promise.reject(new Error(`No handler for channel: ${channel}`))
  }

  handle<T extends EventName>(
    channel: T,
    handler: (message: EventPayload<T>) => Promise<unknown>,
  ): void {
    this.handlers[channel] = handler as any
  }
}

export function createMockTransport(): Transport {
  return new MockTransport()
}
