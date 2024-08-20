import { completion } from '@llmtree/litellm'
import { AvailableProviders } from '@llmtree/litellm/src/types'
import { ipcMain } from 'electron'

import { LLMProvider, Settings, State } from '@/state/state'

interface StartCompletionParams {
  settings: Pick<State, 'settings'>['settings']
  history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  prompt: string
  provider: LLMProvider
  providerConfig: Settings['providers'][LLMProvider]
}

interface CompletionResult {
  id: number
  usage: {
    totalInputTokens: number
    totalOutputTokens: number
  }
}

class CompletionManager {
  private static instance: CompletionManager
  private activeCompletions: Map<number, AbortController> = new Map()

  private constructor() {}

  static getInstance(): CompletionManager {
    if (!CompletionManager.instance) {
      CompletionManager.instance = new CompletionManager()
    }
    return CompletionManager.instance
  }

  async startCompletion(
    event: Electron.IpcMainInvokeEvent,
    params: StartCompletionParams,
  ): Promise<CompletionResult> {
    console.log('Starting completion', params)
    const id = Date.now()
    const abortController = new AbortController()
    this.activeCompletions.set(id, abortController)

    try {
      const { settings, history, prompt, provider, providerConfig } = params
      const baseUrl =
        providerConfig.baseUrl && providerConfig.baseUrl !== ''
          ? providerConfig.baseUrl
          : undefined

      const messages = [
        ...history.filter((message) => message.content !== ''),
        { role: 'user' as const, content: prompt },
      ]

      const iterable = await completion({
        provider: provider as AvailableProviders,
        apiKey: providerConfig.apiKey,
        baseUrl,
        model: settings.selectedModel as string,
        system: settings.systemPrompt,
        messages,
        tools: [
          {
            type: 'function',
            function: {
              name: 'addBranch',
              description: 'Add a branch to the graph to explain a concept.',
              parameters: {
                type: 'object',
                properties: {
                  content: { type: 'string' },
                },
                required: ['content'],
              },
            },
          },
        ],
        stream: true,
      })

      let totalInputTokens = 0
      let totalOutputTokens = 0

      for await (const chunk of iterable) {
        console.log('Chunk', chunk)
        if (abortController.signal.aborted) {
          console.log(`Completion ${id} was cancelled`)
          break
        }
        event.sender.send(`completion-chunk`, {
          id,
          chunk,
        })
        totalOutputTokens += chunk.usage?.completion_tokens || 0
      }

      totalInputTokens = messages.reduce(
        (acc, msg) => acc + msg.content.length,
        0,
      )

      return { id, usage: { totalInputTokens, totalOutputTokens } }
    } catch (error) {
      console.error(`Error in completion ${id}:`, error)
      throw error
    } finally {
      this.activeCompletions.delete(id)
    }
  }

  cancelCompletion(id: number): void {
    const abortController = this.activeCompletions.get(id)
    if (abortController) {
      abortController.abort()
      // We don't delete from activeCompletions here, it will be cleaned up in the finally block of startCompletion
    }
  }
}

export function setupCompletions() {
  const completionManager = CompletionManager.getInstance()

  ipcMain.handle(
    'start-completion',
    async (event, params: StartCompletionParams) => {
      const id = Date.now() // Generate id here
      try {
        const result = await completionManager.startCompletion(event, {
          ...params,
          id,
        })
        event.sender.send(`completion-done`, {
          id: result.id,
          usage: result.usage,
        })
        return result.id // Return the id to the renderer
      } catch (error) {
        console.error('Completion error:', error)
        event.sender.send(`completion-error`, {
          id,
          message: error.message,
        })
        throw error // Re-throw the error so the renderer can handle it
      }
    },
  )

  ipcMain.handle('cancel-completion', (_, id: number) => {
    completionManager.cancelCompletion(id)
  })
}
