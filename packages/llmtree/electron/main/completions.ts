import { completion } from '@llmtree/litellm'
import { AvailableProviders } from '@llmtree/litellm/src/types'
import { ipcMain } from 'electron'

import { LLMProvider, Settings, State } from '@/state/state'

export interface StartCompletionParams {
  settings: Pick<State, 'settings'>['settings']
  history: {
    role: 'system' | 'user' | 'assistant'
    content: string
  }[]
  prompt: string
  provider: string
  providerConfig: Settings['providers'][LLMProvider]
}

export function setupCompletions() {
  ipcMain.handle(
    'start-completion',
    async (
      event,
      {
        settings,
        history,
        prompt,
        provider,
        providerConfig,
      }: StartCompletionParams,
    ): Promise<void> => {
      const id = Date.now()

      // Set up the acknowledgment listener before sending the ID
      const ackPromise = new Promise<void>((resolve) => {
        ipcMain.once(`completion-ack-${id}`, () => {
          resolve()
        })
      })

      event.sender.send('completion-id', id)

      try {
        const baseUrl =
          providerConfig.baseUrl && providerConfig.baseUrl !== ''
            ? providerConfig.baseUrl
            : undefined

        console.log([
          ...history.filter((message) => message.content !== ''),
          {
            role: 'user',
            content: prompt,
          },
        ])

        const iterable = await completion({
          provider: provider as AvailableProviders,
          apiKey: providerConfig.apiKey,
          baseUrl,
          model: settings.selectedModel as string,
          system: settings.systemPrompt,
          messages: [
            ...history.filter((message) => message.content !== ''),
            {
              role: 'user',
              content: prompt,
            },
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'addBranch',
                description:
                  'If you think it would be helpful to add a branch to the graph to explain a concept, you can do so by calling this function.',
                parameters: {
                  type: 'object',
                  properties: {
                    content: {
                      type: 'string',
                    },
                  },
                  required: ['content'],
                },
              },
            },
          ],
          stream: true,
        })

        // Wait for the renderer to acknowledge
        await ackPromise

        // Start the completion process
        for await (const chunk of iterable) {
          console.log('Chunk:', chunk)
          event.sender.send(`completion-chunk-${id}`, chunk)
        }
        event.sender.send(`completion-done-${id}`)
      } catch (error) {
        console.error('Completion error:', error)
        event.sender.send(`completion-error-${id}`, error)
      }
    },
  )
}
