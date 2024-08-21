import { EventName, EventPayload } from '@/completions/EventTypes'

export interface Transport {
  send<T extends EventName>(channel: T, message: EventPayload<T>): void
  on<T extends EventName>(
    channel: T,
    listener: (message: EventPayload<T>) => void,
  ): void
  off<T extends EventName>(
    channel: T,
    listener: (message: EventPayload<T>) => void,
  ): void
  invoke<T extends EventName>(
    channel: T,
    message: EventPayload<T>,
  ): Promise<unknown>
  handle<T extends EventName>(
    channel: T,
    handler: (message: EventPayload<T>) => Promise<unknown>,
  ): void
}
