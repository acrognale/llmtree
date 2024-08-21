import { CompletionStatus } from '@/completions/Completion'
import {
  CompletionParams,
  CompletionResult,
} from '@/completions/CompletionProvider'
import { Transport } from '@/completions/Transport'

// RendererCompletionManager
export class RendererCompletionManager {
  private transport: Transport
  private completionStatus: Map<number, CompletionStatus> = new Map()

  constructor(transport: Transport) {
    this.transport = transport
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.transport.on('completion-chunk', ({ id, payload }) => {
      this.handleCompletionChunk(id, payload)
    })

    this.transport.on('completion-done', ({ id, payload }) => {
      this.handleCompletionDone(id, payload)
    })

    this.transport.on('completion-error', ({ id, payload }) => {
      this.handleCompletionError(id, new Error(payload))
    })

    this.transport.on('function-call-request', ({ id, payload }) => {
      this.handleFunctionCall(id, payload)
    })

    this.transport.on('completion-cancelled', ({ id }) => {
      this.handleCompletionCancelled(id)
    })
  }

  async *getCompletion(
    params: CompletionParams,
  ): AsyncGenerator<string, void, unknown> {
    const id = Date.now()
    yield id as unknown as string // Return the ID first

    await this.transport.invoke('start-completion', {
      id,
      payload: params,
    })

    try {
      yield* this.streamCompletion(id)
    } finally {
      this.completionStatus.delete(id)
    }
  }

  private async *streamCompletion(
    id: number,
  ): AsyncGenerator<string, void, unknown> {
    while (true) {
      const status = this.completionStatus.get(id)
      if (!status) {
        break // Exit if the status is removed (due to cancellation)
      }

      if (status.error) {
        throw status.error
      }

      if (status.chunks.length > 0) {
        yield status.chunks.shift()!
      } else if (status.isDone) {
        break
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }
  }

  private handleCompletionChunk(id: number, chunk: CompletionResult): void {
    console.log('[renderer] Received chunk:', chunk)
    let status = this.completionStatus.get(id)
    if (!status) {
      status = { chunks: [], isDone: false, error: null }
      this.completionStatus.set(id, status)
    }

    const content = chunk.choices[0]?.delta?.content
    if (content) {
      status.chunks.push(content)
    }
  }

  private handleCompletionDone(
    id: number,
    usage: CompletionStatus['usage'],
  ): void {
    console.log('[renderer] Completion done')
    const status = this.completionStatus.get(id)!
    status.isDone = true
    status.usage = usage
  }

  private handleCompletionError(id: number, error: Error): void {
    console.log('[renderer] Completion error')
    const status = this.completionStatus.get(id)!
    status.error = error
  }

  private async handleFunctionCall(
    id: number,
    functionCall: { name: string; arguments: string },
  ): Promise<void> {
    // This is a placeholder. In a real implementation, you would handle the function call here,
    // possibly by calling a predefined function or by notifying the application to handle it.
    console.log(`Function call received for completion ${id}:`, functionCall)

    // Send a dummy result back to the main process
    await this.transport.invoke('function-call-response', {
      id,
      payload: {
        name: functionCall.name,
        result: null,
      },
    })
  }

  private handleCompletionCancelled(id: number): void {
    console.log('[renderer] Completion cancelled')
    const status = this.completionStatus.get(id)
    if (status) {
      status.isDone = true
      status.error = new Error('Completion cancelled')
    }
  }

  cancelCompletion(id: number): void {
    console.log('[renderer] Cancelling completion...')
    this.transport.send('cancel-completion', { id })
    const status = this.completionStatus.get(id)
    if (status) {
      status.isDone = true
      status.error = new Error('Completion cancelled')
    }
  }
}

export function createRendererCompletionManager(
  transport: Transport,
): RendererCompletionManager {
  return new RendererCompletionManager(transport)
}
