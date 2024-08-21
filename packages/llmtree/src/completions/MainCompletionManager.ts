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
        this.processChunk(params.id, chunk, params)
      }
      this.completeCompletion(params.id)
    } catch (error) {
      this.handleCompletionError(params.id, error as Error)
    }
  }

  private processChunk(
    id: CompletionId,
    chunk: CompletionResult,
    params: CompletionParams & { id: CompletionId },
  ): void {
    const completion = this.activeCompletions.get(id)
    if (!completion) {
      return
    }
    const { status } = completion
    const content = chunk.choices[0]?.delta?.content
    const toolCalls = chunk.choices[0]?.delta?.tool_calls

    if (content) {
      status.chunks.push(content)
      this.transport.send('completion-chunk', { id, payload: chunk })
    }

    if (toolCalls) {
      this.handleToolCalls(id, toolCalls, params)
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
    params: CompletionParams & { id: CompletionId },
  ): Promise<void> {
    for (const toolCall of toolCalls) {
      const { name, arguments: args } = toolCall.function
      console.log('[main] Requesting renderer to call function')
      this.transport.send('function-call-request', {
        id,
        payload: { name, arguments: args },
      })

      // Wait for the response from the renderer process
      console.log('[main] Waiting for function call response...')
      const result = await this.transport.invoke('function-call-response', {
        id,
        payload: { name, result: 'result' },
      })

      // Add the function call and result to the messages
      const functionCallMessage = {
        role: 'assistant' as const,
        content: null,
        function_call: { name, arguments: args },
      }
      const functionResultMessage = {
        role: 'function' as const,
        content: JSON.stringify(result),
        name,
      }

      // Create a new params object with updated messages
      const newParams: CompletionParams & { id: CompletionId } = {
        ...params,
        messages: [
          ...params.messages,
          functionCallMessage,
          functionResultMessage,
        ],
      }

      // Start a new completion with the updated messages
      console.log('[main] Starting new completion with function result...')
      await this.startCompletion(newParams)
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
