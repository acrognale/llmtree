import {
  AssistantMessage,
  StreamingChunk,
  StreamingToolCall,
} from '@llmtree/litellm/src/types'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { CompletionManager } from '@/completions/CompletionManager'
import {
  CompletionParams,
  CompletionProvider,
} from '@/completions/CompletionProvider'

interface CompletionStringChunk {
  type: 'string'
  content: string
}

interface CompletionToolCallChunk {
  type: 'tool_call'
  content: StreamingToolCall
}

function createMockAsyncIterable(
  ...chunks: (CompletionStringChunk | CompletionToolCallChunk)[]
): AsyncIterable<StreamingChunk> {
  return {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        if (chunk.type === 'string') {
          yield {
            choices: [
              {
                role: 'assistant' as const,
                finish_reason: 'stop' as const,
                delta: { content: chunk.content },
                index: 0,
              },
            ],
          }
        } else if (chunk.type === 'tool_call') {
          yield {
            choices: [
              {
                role: 'assistant' as const,
                finish_reason: 'tool_call' as const,
                delta: { tool_calls: [chunk.content] },
                index: 0,
              },
            ],
          }
        }
      }
    },
  }
}
describe('CompletionManager', () => {
  let mockProvider: CompletionProvider
  let completionManager: CompletionManager

  beforeEach(() => {
    mockProvider = {
      startCompletion: vi.fn(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(CompletionManager as any)['instance'] = undefined // Reset singleton instance
    completionManager = CompletionManager.getInstance(mockProvider)
  })

  it('should be a singleton', () => {
    const instance1 = CompletionManager.getInstance(mockProvider)
    const instance2 = CompletionManager.getInstance(mockProvider)
    expect(instance1).toBe(instance2)
  })

  it('should handle completion chunks', async () => {
    const mockIterator = createMockAsyncIterable(
      { type: 'string', content: 'Chunk 1' },
      { type: 'string', content: 'Chunk 2' },
    )
    vi.mocked(mockProvider.startCompletion).mockResolvedValue(mockIterator)

    const params: CompletionParams & { id: string } = {
      id: '123',
      messages: [],
      provider: 'test',
      apiKey: 'test',
      model: 'test',
    }
    const stream = completionManager.startCompletion(params)

    const chunks = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual(['Chunk 1', 'Chunk 2'])
  })

  it('should handle completion error', async () => {
    const mockError = new Error('Test error')
    vi.mocked(mockProvider.startCompletion).mockRejectedValue(mockError)

    const params = {
      id: '123',
      messages: [],
      provider: 'test',
      apiKey: 'test',
      model: 'test',
    }
    const stream = completionManager.startCompletion(params)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const chunk of stream) {
      // just wait for the stream to finish
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (completionManager as any).activeCompletions.get('123')
    expect(status.error).toBe(mockError)
  })

  it('should cancel a completion', () => {
    const controller = new AbortController()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(completionManager as any).activeCompletions.set('123', {
      controller,
      isDone: false,
      error: null,
    })

    completionManager.cancelCompletion('123')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (completionManager as any).activeCompletions.get('123')
    expect(status.isDone).toBe(true)
    expect(status.error).toBeInstanceOf(Error)
    expect(status.error.message).toBe('Completion cancelled')
  })

  it('should handle tool calls', async () => {
    const mockToolCall = {
      type: 'tool_call' as const,
      content: {
        function: { name: 'testFunction', arguments: '{}' },
        type: 'function',
        id: '123',
        index: 0,
      },
    }

    const mockResponse = {
      type: 'string' as const,
      content: 'Response after tool call',
    }

    vi.mocked(mockProvider.startCompletion).mockImplementation(
      async (params) => {
        if (params.messages.length === 1) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return createMockAsyncIterable(mockToolCall as any)
        } else {
          return createMockAsyncIterable(mockResponse)
        }
      },
    )

    const params: CompletionParams & { id: string } = {
      id: '123',
      messages: [{ role: 'user', content: 'Initial message' }],
      provider: 'test',
      apiKey: 'test',
      model: 'test',
    }
    const stream = completionManager.startCompletion(params)

    const chunks = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual(['Response after tool call'])

    expect(mockProvider.startCompletion).toHaveBeenCalledTimes(2)
    const lastCall = vi.mocked(mockProvider.startCompletion).mock.calls[1][0]
    expect(lastCall.messages).toHaveLength(3)
    expect(lastCall.messages[0]).toEqual({
      role: 'user',
      content: 'Initial message',
    })
    expect(lastCall.messages[1].role).toBe('assistant')
    expect((lastCall.messages[1] as AssistantMessage).tool_calls).toBeDefined()
    expect(lastCall.messages[2].role).toBe('tool')
  })
})
