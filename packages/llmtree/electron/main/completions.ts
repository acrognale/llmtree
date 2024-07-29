import { completion } from '@llmtree/litellm'
import { AvailableProviders } from '@llmtree/litellm/src/types'
import { ipcMain } from 'electron'

import { LLM_PROVIDER_INFO } from '@/data/llmLists'
import { State } from '@/state/state'

export interface StartCompletionParams {
  settings: Pick<State, 'settings'>['settings']
  history: {
    role: 'system' | 'user' | 'assistant'
    content: string
  }[]
  prompt: string
}

export function setupCompletions() {
  ipcMain.handle(
    'start-completion',
    async (
      event,
      { settings, history, prompt }: StartCompletionParams,
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
        const selectedProviderKey = Object.keys(LLM_PROVIDER_INFO).find(
          (provider) =>
            LLM_PROVIDER_INFO[provider].modelList.find(
              (model) => model === settings.selectedModel,
            ),
        )

        const selectedProvider =
          settings.providers[
            selectedProviderKey as keyof typeof settings.providers
          ]

        const baseUrl =
          selectedProvider.baseUrl && selectedProvider.baseUrl !== ''
            ? selectedProvider.baseUrl
            : undefined

        const iterable = await completion({
          provider: selectedProviderKey as AvailableProviders,
          apiKey: selectedProvider.apiKey,
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
          stream: true,
        })

        // Wait for the renderer to acknowledge
        await ackPromise

        // Start the completion process
        for await (const chunk of iterable) {
          event.sender.send(`completion-chunk-${id}`, chunk)
        }
        event.sender.send(`completion-done-${id}`)
      } catch (error) {
        event.sender.send(`completion-error-${id}`, error)
      }
    },
  )
}
