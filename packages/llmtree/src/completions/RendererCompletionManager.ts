import { CompletionStatus } from '@/completions/Completion'
import {
  CompletionParams,
  CompletionResult,
} from '@/completions/CompletionProvider'
import { CompletionId } from '@/completions/EventTypes'
import { Transport } from '@/completions/Transport'

interface CompletionStream {
  id: CompletionId
  stream: AsyncGenerator<string, void, unknown>
}

export class RendererCompletionManager {
  private transport: Transport
  private completionStatus: Map<CompletionId, CompletionStatus> = new Map()

  private static instance: RendererCompletionManager

  public static getInstance(transport: Transport): RendererCompletionManager {
    if (!RendererCompletionManager.instance) {
      RendererCompletionManager.instance = new RendererCompletionManager(
        transport,
      )
    }
    return new RendererCompletionManager(transport)
  }

  private constructor(transport: Transport) {
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

    this.transport.on('completion-continued', ({ id }) => {
      this.handleCompletionContinued(id)
    })
  }

  getCompletion(params: CompletionParams): CompletionStream {
    const id = Date.now().toString()
    this.completionStatus.set(id, { chunks: [], isDone: false, error: null })
    const stream = this.streamCompletion(id, params)
    return {
      id,
      stream,
    }
  }

  private async *streamCompletion(
    id: CompletionId,
    params: CompletionParams,
  ): AsyncGenerator<string, void, unknown> {
    this.transport.invoke('start-completion', { id, payload: params })
    try {
      yield* this.streamCompletionContent(id)
    } finally {
      this.completionStatus.delete(id)
    }
  }

  private async *streamCompletionContent(
    id: CompletionId,
  ): AsyncGenerator<string, void, unknown> {
    const status = this.completionStatus.get(id)
    if (!status) {
      console.log('[renderer::streamCompletionContent] Status not found')
      return
    }

    while (!status.isDone) {
      if (status.error) {
        throw status.error
      }

      if (status.chunks.length > 0) {
        yield status.chunks.shift()!
      }

      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  private handleCompletionChunk(
    id: CompletionId,
    chunk: CompletionResult,
  ): void {
    if (chunk.choices[0]?.delta.content) {
      console.log(
        '[renderer] Received chunk:',
        chunk.choices[0].delta.content,
        id,
      )
    }
    let status = this.completionStatus.get(id)
    if (!status) {
      console.log(
        '[renderer::handleCompletionChunk] Status not found for completion',
        id,
      )
      status = { chunks: [], isDone: false, error: null }
      this.completionStatus.set(id, status)
    }

    const content = chunk.choices[0]?.delta?.content
    if (content) {
      status.chunks.push(content)
    }
  }

  private handleCompletionDone(
    id: CompletionId,
    usage: CompletionStatus['usage'],
  ): void {
    console.log('[renderer] Completion done')
    const status = this.completionStatus.get(id)
    if (!status) {
      console.log(
        '[renderer::handleCompletionDone] Status not found for completion',
        id,
      )
      return
    }
    status.isDone = true
    status.usage = usage
  }

  private handleCompletionError(id: CompletionId, error: Error): void {
    console.log('[renderer] Completion error')
    const status = this.completionStatus.get(id)!
    status.error = error
  }

  private async handleFunctionCall(
    id: CompletionId,
    functionCall: { name: string; arguments: string },
  ): Promise<void> {
    // This is a placeholder. In a real implementation, you would handle the function call here,
    // possibly by calling a predefined function or by notifying the application to handle it.
    console.log(
      `[renderer] Function call received for completion ${id}:`,
      functionCall,
    )

    // Send a dummy result back to the main process
    await this.transport.invoke('function-call-response', {
      id,
      payload: {
        name: functionCall.name,
        result: null,
      },
    })
  }

  private handleCompletionCancelled(id: CompletionId): void {
    console.log('[renderer] Completion cancelled')
    const status = this.completionStatus.get(id)
    if (status) {
      status.isDone = true
      status.error = new Error('Completion cancelled')
    }
  }

  private handleCompletionContinued(id: CompletionId): void {
    console.log('[renderer] Completion continued')
    const status = this.completionStatus.get(id)
    if (status) {
      status.isDone = false
      status.chunks = []
      status.error = null
    }
  }

  cancelCompletion(id: CompletionId): void {
    console.log('[renderer] Cancelling completion...')
    this.transport.send('cancel-completion', { id })
    const status = this.completionStatus.get(id)
    if (status) {
      status.isDone = true
      status.error = new Error('Completion cancelled')
    }
  }
}
