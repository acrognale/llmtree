import {
  AssistantMessage,
  StreamingChunk,
  ToolMessage,
} from '@llmtree/litellm/src/types'
import { nanoid } from 'nanoid'

import { CompletionStatus, CompletionId } from '@/completions/Completion'
import {
  CompletionParams,
  CompletionProvider,
} from '@/completions/CompletionProvider'

export interface StringChunk {
  type: 'string'
  content: string
}

export interface ToolCallChunk {
  type: 'tool_call'
  params: CompletionParams & { id?: CompletionId }
}

export type ProcessedChunk = StringChunk | ToolCallChunk

export class CompletionManager {
  private activeCompletions: Map<CompletionId, CompletionStatus> = new Map()

  private provider: CompletionProvider

  private static instance: CompletionManager

  public static getInstance(provider: CompletionProvider): CompletionManager {
    if (!CompletionManager.instance) {
      CompletionManager.instance = new CompletionManager(provider)
    }
    return CompletionManager.instance
  }

  private constructor(provider: CompletionProvider) {
    this.provider = provider
  }

  async *startCompletion(
    params: CompletionParams & { id?: CompletionId },
  ): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController()
    console.log('[CompletionManager] Starting completion', params.id)

    if (!params.id) {
      params.id = nanoid()
    }

    this.activeCompletions.set(params.id, {
      controller,
      isDone: false,
      error: null,
    })

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = params
      let iterable = await this.provider.startCompletion(rest)
      let shouldContinue = true

      while (shouldContinue) {
        shouldContinue = false // Reset the flag at the start of each iteration

        for await (const chunk of iterable) {
          if (controller.signal.aborted) {
            shouldContinue = false
            break
          }

          console.log(
            '[CompletionManager] Received chunk:',
            JSON.stringify(chunk),
          )

          const chunkResult = await this.processChunk(params.id, chunk, params)

          console.log(
            '[CompletionManager] Processed chunk result:',
            JSON.stringify(chunkResult),
          )

          if (chunkResult?.type === 'tool_call') {
            console.log(
              '[CompletionManager] Starting new completion with function results...',
            )
            iterable = await this.provider.startCompletion(chunkResult.params)
            shouldContinue = true // Set flag to continue with new iterable
            break // Break out of the for...of loop
          } else if (chunkResult?.type === 'string') {
            console.log(
              '[CompletionManager] Yielding chunk',
              chunkResult.content,
            )
            yield chunkResult.content
          } else {
            console.log('[CompletionManager] Skipping undefined chunk')
          }
        }
      }

      this.completeCompletion(params.id)
    } catch (error) {
      console.log('[CompletionManager] Error in completion', error)
      this.handleCompletionError(params.id, error as Error)
    }
  }

  private async processChunk(
    id: CompletionId,
    chunk: StreamingChunk,
    params: CompletionParams & { id?: CompletionId },
  ): Promise<ProcessedChunk | null> {
    const completion = this.activeCompletions.get(id)
    if (!completion) {
      return null
    }
    const content = chunk.choices[0]?.delta?.content
    const toolCalls = chunk.choices[0]?.delta?.tool_calls

    if (content) {
      return { type: 'string', content }
    }

    if (chunk.usage) {
      completion.usage = {
        totalInputTokens: 0, // This should be calculated based on input
        totalOutputTokens:
          (completion.usage?.totalOutputTokens || 0) +
          chunk.usage.completion_tokens,
      }
    }

    if (toolCalls) {
      let newParams: CompletionParams & { id?: CompletionId } = { ...params }
      for (const toolCall of toolCalls) {
        if (!toolCall.function) {
          continue
        }
        const { name, arguments: args } = toolCall.function
        if (!name || !args) {
          continue
        }

        console.log('[CompletionManager] Function call requested:', name)

        // Here you would implement the actual function call logic
        const result = await this.handleFunctionCall(id, {
          name,
          arguments: args,
        })

        // Add the function call and result to the messages
        const functionCallMessage: AssistantMessage = {
          role: 'assistant' as const,
          tool_calls: [
            {
              id: toolCall.id!,
              type: 'function',
              function: {
                name,
                arguments: args,
              },
            },
          ],
        }

        const functionResultMessage: ToolMessage = {
          role: 'tool' as const,
          content: JSON.stringify(result),
          tool_call_id: toolCall.id!,
        }

        // Update the params object with new messages
        newParams = {
          ...newParams,
          messages: [
            ...newParams.messages,
            functionCallMessage,
            functionResultMessage,
          ],
        }
      }
      return {
        type: 'tool_call',
        params: newParams,
      }
    }

    return null
  }

  private completeCompletion(id: CompletionId): void {
    console.log('[CompletionManager] Completion done')
    const status = this.activeCompletions.get(id)
    if (!status) {
      console.log('[CompletionManager] Status not found for completion', id)
      return
    }
    status.isDone = true
  }

  private handleCompletionError(id: CompletionId, error: Error): void {
    console.log('[CompletionManager] Completion error')
    const completion = this.activeCompletions.get(id)
    if (!completion) {
      console.log('[CompletionManager] Status not found for completion', id)
      return
    }
    completion.error = error
  }

  private async handleFunctionCall(
    id: CompletionId,
    functionCall: { name: string; arguments: string },
  ): Promise<unknown> {
    // This is a placeholder. In a real implementation, you would handle the function call here,
    // possibly by calling a predefined function or by notifying the application to handle it.
    console.log(
      `[CompletionManager] Function call received for completion ${id}:`,
      functionCall,
    )

    // Return a dummy result
    return {
      name: functionCall.name,
      result: 'success',
    }
  }

  cancelCompletion(id: CompletionId): void {
    console.log('[CompletionManager] Cancelling completion...')
    const status = this.activeCompletions.get(id)
    if (!status) {
      console.log('[CompletionManager] Status not found for completion', id)
      return
    }
    status.controller.abort()
    status.isDone = true
    status.error = new Error('Completion cancelled')
  }
}
