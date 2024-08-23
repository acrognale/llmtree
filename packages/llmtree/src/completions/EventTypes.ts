import { CompletionStatus } from '@/completions/Completion'
import {
  CompletionParams,
  CompletionResult,
} from '@/completions/CompletionProvider'

export type CompletionId = string

export interface EventMap {
  // Main to Renderer events
  'completion-chunk': { id: CompletionId; payload: CompletionResult }
  'completion-done': { id: CompletionId; payload: CompletionStatus['usage'] }
  'completion-error': { id: CompletionId; payload: string }
  'function-call-request': {
    id: CompletionId
    payload: { name: string; arguments: string }
  }
  'completion-cancelled': { id: CompletionId }
  'completion-continued': { id: CompletionId }

  // Renderer to Main events
  'start-completion': {
    id: CompletionId
    payload: CompletionParams
    isContinuation?: boolean
  }
  'cancel-completion': { id: CompletionId }

  // Bidirectional events
  'function-call-request:response': {
    id: CompletionId
    payload: { name: string; result: unknown }
  }
}

export type EventName = keyof EventMap
export type EventPayload<T extends EventName> = EventMap[T]
