import {
  CompletionProvider,
  CompletionParams,
  CompletionResult,
} from '@/completions/CompletionProvider'
import { MainCompletionManager } from '@/completions/MainCompletionManager'
import { createMockTransport } from '@/completions/MockTransport'
import { RendererCompletionManager } from '@/completions/RendererCompletionManager'

class MockCompletionProvider implements CompletionProvider {
  async *startCompletion(
    params: CompletionParams,
  ): AsyncIterator<CompletionResult> {
    const messages = params.messages
    for (const message of messages) {
      const words = message.content.split(' ')
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
  const params: CompletionParams = {
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
  const completionGenerator = rendererManager.getCompletion(params)

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
  const cancelGenerator = rendererManager.getCompletion(cancelParams)
  const cancelId = await cancelGenerator
    .next()
    .then((result) => result.value as unknown as number)

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
}

runSimulator().catch(console.error)
