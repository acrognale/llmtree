import {
  CompletionProvider,
  CompletionParams,
  CompletionResult,
} from '@/completions/CompletionProvider'
import { MainCompletionManager } from '@/completions/MainCompletionManager'
import { createMockTransport } from '@/completions/MockTransport'
import { RendererCompletionManager } from '@/completions/RendererCompletionManager'

class MockCompletionProvider implements CompletionProvider {
  private async *streamByToken(content?: string) {
    const words = content?.split(' ') || []
    for (const word of words) {
      yield {
        choices: [
          {
            delta: {
              content: word + ' ',
            },
          },
        ],
        usage: {
          completion_tokens: word.length,
        },
      }
      await new Promise((resolve) => setTimeout(resolve, 100)) // Simulate delay
    }
  }

  async *startCompletion(
    params: CompletionParams,
  ): AsyncIterator<CompletionResult> {
    const messages = params.messages
    const targetMessage = messages[messages.length - 1]

    if (
      targetMessage.role === 'user' &&
      targetMessage.content?.includes('weather')
    ) {
      // Simulate a tool call for weather information
      return yield {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  function: {
                    name: 'get_weather',
                    arguments: JSON.stringify({ city: 'New York' }),
                  },
                },
              ],
            },
          },
        ],
      }
    }

    if (targetMessage.role === 'tool') {
      // Process the weather information
      const weatherInfo = JSON.parse(targetMessage.content!)
      for await (const word of this.streamByToken(
        `Based on the weather information: The weather in ${weatherInfo.city} is ${weatherInfo.temperature}°C and ${weatherInfo.condition}.`,
      )) {
        yield word
      }
      return
    }

    // Normal message processing
    for await (const word of this.streamByToken(targetMessage.content)) {
      yield word
    }
  }
}

async function runSimulator() {
  const transport = createMockTransport()
  const provider = new MockCompletionProvider()

  const rendererManager = new RendererCompletionManager(transport)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mainManager = new MainCompletionManager(transport, provider)

  // Simulate a completion request
  console.log('\n\n=== Starting regular completion ===')
  const completionParams: CompletionParams = {
    messages: [
      {
        role: 'user',
        content: 'Hello, world!',
      },
    ],
    provider: 'openai',
    apiKey: 'dummy-api-key',
    model: 'gpt-3.5-turbo',
  }

  console.log('[simulator] Starting completion...')
  const { stream: completionGenerator } =
    rendererManager.getCompletion(completionParams)

  try {
    for await (const chunk of completionGenerator) {
      console.log('[simulator] Received chunk:', chunk)
    }
    console.log('[simulator] Completion finished')
  } catch (error) {
    console.error(
      '[simulator] Error during completion:',
      (error as Error).message,
    )
  }

  // Simulate a cancellation
  console.log('\n\n=== Starting cancellation ===')
  const cancelParams: CompletionParams = {
    messages: [
      {
        role: 'user',
        content: 'This completion will be cancelled.',
      },
    ],
    provider: 'openai',
    apiKey: 'dummy-api-key',
    model: 'gpt-3.5-turbo',
  }

  console.log('[simulator] Starting completion to be cancelled...')
  const { id: cancelId, stream: cancelGenerator } =
    rendererManager.getCompletion(cancelParams)

  setTimeout(() => {
    rendererManager.cancelCompletion(cancelId)
  }, 100)

  try {
    for await (const chunk of cancelGenerator) {
      console.log('[simulator] Received chunk:', chunk)
      await new Promise((resolve) => setTimeout(resolve, 100)) // Add delay between chunks
    }
  } catch (error) {
    console.log('[simulator] Completion cancelled:', (error as Error).message)
  }

  // Simulate a completion request with a tool call
  console.log('\n\n=== Starting completion with tool call ===')
  const toolParams: CompletionParams = {
    messages: [
      {
        role: 'user',
        content: "What's the weather like today?",
      },
    ],
    provider: 'openai',
    apiKey: 'dummy-api-key',
    model: 'gpt-3.5-turbo',
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get the current weather for a city',
          parameters: {
            type: 'object',
            properties: {
              city: { type: 'string' },
            },
            required: ['city'],
          },
        },
      },
    ],
  }

  console.log('[simulator] Starting completion with tool call...')
  const { stream: toolCompletionGenerator } =
    rendererManager.getCompletion(toolParams)

  // Mock the function call response
  transport.handle('function-call-response', async ({ payload }) => {
    if (payload.name === 'get_weather') {
      return {
        city: 'New York',
        temperature: 22,
        condition: 'sunny',
      }
    }
    return null
  })

  try {
    for await (const chunk of toolCompletionGenerator) {
      console.log('[simulator] Received chunk:', chunk)
    }
    console.log('[simulator] Completion finished')
  } catch (error) {
    console.error(
      '[simulator] Error during completion:',
      (error as Error).message,
    )
  }
}

runSimulator().catch(console.error)
