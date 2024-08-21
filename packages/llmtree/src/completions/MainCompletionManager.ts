import { CompletionStatus } from '@/completions/Completion'
import {
  CompletionProvider,
  CompletionParams,
  CompletionResult,
} from '@/completions/CompletionProvider'
import { CompletionId } from '@/completions/EventTypes'
import { Transport } from '@/completions/Transport'

export class MainCompletionManager {
  private transport: Transport
  private provider: CompletionProvider
  private activeCompletions: Map<
    CompletionId,
    { status: CompletionStatus; controller: AbortController }
  > = new Map()

  constructor(transport: Transport, provider: CompletionProvider) {
    this.transport = transport
    this.provider = provider
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.transport.handle('start-completion', async (params) => {
      console.log('[main] Starting completion...')
      return this.startCompletion({
        ...params.payload,
        id: params.id,
      })
    })

    this.transport.on('cancel-completion', ({ id }) => {
      console.log('[main] Recevied cancel request...')
      this.cancelCompletion(id)
    })
  }

  private async startCompletion(
    params: CompletionParams & { id: CompletionId },
  ): Promise<void> {
    const controller = new AbortController()
    console.log('[main] Starting completion', params.id)
    this.activeCompletions.set(params.id, {
      status: {
        chunks: [],
        isDone: false,
        error: null,
      },
      controller,
    })

    try {
      const iterator = this.provider.startCompletion(params)
      for await (const chunk of iterator) {
        if (controller.signal.aborted) {
          console.log('[main] Completion was cancelled')
          return
        }
        this.processChunk(params.id, chunk)
      }
      this.completeCompletion(params.id)
    } catch (error) {
      this.handleCompletionError(params.id, error as Error)
    }
  }

  private processChunk(id: CompletionId, chunk: CompletionResult): void {
    const { status } = this.activeCompletions.get(id)!
    const content = chunk.choices[0]?.delta?.content
    const toolCalls = chunk.choices[0]?.delta?.tool_calls

    if (content) {
      status.chunks.push(content)
      this.transport.send('completion-chunk', { id, payload: chunk })
    }

    if (toolCalls) {
      this.handleToolCalls(id, toolCalls)
    }

    if (chunk.usage) {
      status.usage = {
        totalInputTokens: 0, // This should be calculated based on input
        totalOutputTokens:
          (status.usage?.totalOutputTokens || 0) +
          chunk.usage.completion_tokens,
      }
    }
  }

  private async handleToolCalls(
    id: CompletionId,
    toolCalls: Array<{ function: { name: string; arguments: string } }>,
  ): Promise<void> {
    for (const toolCall of toolCalls) {
      const { name, arguments: args } = toolCall.function
      this.transport.send('function-call-request', {
        id,
        payload: { name, arguments: args },
      })

      // Wait for the response from the renderer process
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result = await this.transport.invoke('function-call-response', {
        id,
        payload: { name, result: 'result' },
      })

      // Send the result back to the completion provider (this part depends on how your provider handles function results)
      // This is a placeholder and might need to be adjusted based on your specific implementation
      // this.provider.sendFunctionResult(id, name, result);
    }
  }

  private completeCompletion(id: CompletionId): void {
    console.log('[main] Completion done')
    const completion = this.activeCompletions.get(id)
    if (!completion) {
      console.log('[main] Completion not found for done', id)
      return
    }
    const { status } = completion
    status.isDone = true
    this.transport.send('completion-done', { id, payload: status.usage })
    this.activeCompletions.delete(id)
  }

  private handleCompletionError(id: CompletionId, error: Error): void {
    console.log('[main] Completion error', error)
    const completion = this.activeCompletions.get(id)
    if (!completion) {
      console.log('[main] Completion not found for error', id)
      return
    }
    const { status } = completion
    status.error = error
    this.transport.send('completion-error', { id, payload: error.message })
    this.activeCompletions.delete(id)
  }

  private cancelCompletion(id: CompletionId): void {
    console.log('[main] Cancelling completion', id)
    const completion = this.activeCompletions.get(id)
    if (!completion) {
      console.log('[main] Completion not found for cancellation')
      return
    }
    completion.controller.abort()
    this.activeCompletions.delete(id)
    this.transport.send('completion-cancelled', { id })
  }
}

export function createMainCompletionManager(
  transport: Transport,
  provider: CompletionProvider,
): MainCompletionManager {
  return new MainCompletionManager(transport, provider)
}
