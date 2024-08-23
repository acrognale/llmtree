import { describe, it, expect, vi, beforeEach } from 'vitest'

import { CompletionProvider } from '@/completions/CompletionProvider'
import { EventPayload } from '@/completions/EventTypes'
import { MainCompletionManager } from '@/completions/MainCompletionManager'
import { Transport } from '@/completions/Transport'

describe('MainCompletionManager', () => {
  let mockTransport: Transport
  let mockProvider: CompletionProvider
  let handleStartCompletion: (
    message: EventPayload<'start-completion'>,
  ) => Promise<void>

  beforeEach(() => {
    mockTransport = {
      send: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      invoke: vi.fn(),
      handle: vi.fn(),
    } as unknown as Transport

    mockProvider = {
      startCompletion: vi.fn(),
    } as unknown as CompletionProvider

    vi.mocked(mockTransport.handle).mockImplementation((channel, handler) => {
      if (channel === 'start-completion') {
        handleStartCompletion = handler as (
          message: EventPayload<'start-completion'>,
        ) => Promise<void>
      }
    })

    MainCompletionManager.getInstance(mockTransport, mockProvider)

    console.log(mockTransport.handle.mock.calls)
  })

  it('should start a completion with correct parameters', async () => {
    const completionParams = {
      id: '123',
      payload: {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4o',
        messages: [
          { role: 'system' as const, content: 'You are a helpful assistant.' },
          { role: 'user' as const, content: 'Hello, world!' },
        ],
      },
    }

    const mockIterator = {
      [Symbol.asyncIterator]: vi.fn().mockImplementation(function* () {}),
    }
    vi.mocked(mockProvider.startCompletion).mockResolvedValue(mockIterator)

    const handleFn = vi.mocked(mockTransport.handle).mock.calls[0][1] as (
      message: EventPayload<'start-completion'>,
    ) => Promise<void>
    await handleFn(completionParams)

    expect(mockProvider.startCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, world!' },
        ],
      }),
    )
  })

  it('should handle function calls correctly', async () => {
    const completionParams: EventPayload<'start-completion'> = {
      id: '456',
      payload: {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: "What's the weather like?" }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get the current weather',
              parameters: {
                type: 'object',
                properties: {
                  location: { type: 'string' },
                },
                required: ['location'],
              },
            },
          },
        ],
      },
    }

    const mockStream: AsyncIterable<CompletionResult> = {
      [Symbol.asyncIterator]: vi.fn().mockImplementation(function* () {
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    id: 'call_123',
                    type: 'function',
                    function: {
                      name: 'get_weather',
                      arguments: '{"location":"New York"}',
                    },
                  },
                ],
              },
            },
          ],
        }
      }),
    }

    vi.mocked(mockProvider.startCompletion).mockResolvedValue(mockStream)
    vi.mocked(mockTransport.invoke).mockResolvedValue({
      temperature: 22,
      condition: 'sunny',
    })

    // Call startCompletion directly
    await MainCompletionManager.getInstance(
      mockTransport,
      mockProvider,
    ).startCompletion(completionParams)

    // Wait for any pending promises to resolve
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(mockTransport.invoke).toHaveBeenCalledWith('function-call-request', {
      id: '456',
      payload: {
        name: 'get_weather',
        arguments: '{"location":"New York"}',
      },
    })

    expect(mockProvider.startCompletion).toHaveBeenCalledTimes(2)
    expect(mockProvider.startCompletion).toHaveBeenLastCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'user', content: "What's the weather like?" },
          {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_123',
                type: 'function',
                function: {
                  name: 'get_weather',
                  arguments: '{"location":"New York"}',
                },
              },
            ],
          },
          {
            role: 'tool',
            content: JSON.stringify({ temperature: 22, condition: 'sunny' }),
            name: 'get_weather',
          },
        ],
      }),
    )
  })
})
