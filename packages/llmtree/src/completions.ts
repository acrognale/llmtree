import { LLM_PROVIDER_INFO } from '@/data/llmLists'
import { Settings, LLMProvider } from '@/state/state'

interface CompletionParams {
  settings: Settings
  history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  prompt: string
}

interface ProviderInfo {
  provider: LLMProvider
  providerConfig: Settings['providers'][LLMProvider]
}

class CompletionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CompletionError'
  }
}

class CompletionManager {
  private static instance: CompletionManager
  private activeCompletions: Map<
    number,
    {
      chunks: string[]
      isDone: boolean
      error: Error | null
    }
  > = new Map()
  private pendingChunks: Map<number, string[]> = new Map()

  private constructor() {
    this.setupEventListeners()
  }

  static getInstance(): CompletionManager {
    if (!CompletionManager.instance) {
      CompletionManager.instance = new CompletionManager()
    }
    return CompletionManager.instance
  }

  async *getCompletion(
    params: CompletionParams,
  ): AsyncGenerator<string, void, unknown> {
    console.log('[CompletionManager] Starting getCompletion', params)
    const { provider, providerConfig } = this.findProvider(params.settings)
    console.log('[CompletionManager] Provider found', {
      provider,
      providerConfig,
    })
    const id = await this.initializeCompletion(params, provider, providerConfig)
    console.log(`[CompletionManager] Completion initialized with ID ${id}`)

    try {
      yield* this.streamCompletion(id)
    } finally {
      this.activeCompletions.delete(id)
      this.pendingChunks.delete(id)
      console.log(
        `[CompletionManager] Completion finished, removed from activeCompletions ${id}`,
      )
    }
  }

  private findProvider(settings: Settings): ProviderInfo {
    console.log('[CompletionManager] Finding provider for settings', settings)
    if (!settings.selectedModel) {
      throw new CompletionError('No selected model')
    }

    // Check pre-set models
    for (const [key, info] of Object.entries(LLM_PROVIDER_INFO)) {
      if (info.modelList.includes(settings.selectedModel)) {
        return {
          provider: key as LLMProvider,
          providerConfig: settings.providers[key as LLMProvider],
        }
      }
    }

    // Check custom providers
    const customProvider = Object.entries(settings.providers).find(
      ([_, config]) => config.models?.includes(settings.selectedModel),
    )

    if (customProvider) {
      return {
        provider: customProvider[0] as LLMProvider,
        providerConfig: customProvider[1],
      }
    }

    throw new CompletionError('Selected model not found in any provider')
  }

  private async initializeCompletion(
    params: CompletionParams,
    provider: LLMProvider,
    providerConfig: Settings['providers'][LLMProvider],
  ): Promise<number> {
    console.log('[CompletionManager] Initializing completion', {
      provider,
      providerConfig,
    })
    const completionSettings = {
      ...params.settings,
      provider,
      apiKey: providerConfig.apiKey,
      baseUrl:
        providerConfig.baseUrl || LLM_PROVIDER_INFO[provider]?.defaultBaseUrl,
      model: params.settings.selectedModel,
    }

    return new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new CompletionError('Completion initialization timed out'))
      }, 10000)

      window.ipcRenderer
        .startCompletion({
          settings: completionSettings,
          history: params.history,
          prompt: params.prompt,
          provider,
          providerConfig,
        })
        .then((id: number) => {
          clearTimeout(timeout)
          this.activeCompletions.set(id, {
            chunks: [],
            isDone: false,
            error: null,
          })
          // Move any pending chunks
          const pendingChunks = this.pendingChunks.get(id) || []
          this.activeCompletions.get(id)!.chunks.push(...pendingChunks)
          this.pendingChunks.delete(id)
          console.log(
            `[CompletionManager] Completion initialized successfully ${id}`,
          )
          resolve(id)
        })
        .catch((error) => {
          clearTimeout(timeout)
          reject(new CompletionError(error.message))
        })
    })
  }

  private async *streamCompletion(
    id: number,
  ): AsyncGenerator<string, void, unknown> {
    console.log(`[CompletionManager] Starting to stream completion ${id}`)
    const completion = this.activeCompletions.get(id)
    if (!completion) {
      console.log(
        `[CompletionManager] Completion ${id} not found, stopping stream`,
      )
      return
    }

    while (true) {
      if (completion.error) {
        console.error(
          `[CompletionManager] Error in completion ${id}:`,
          completion.error,
        )
        throw completion.error
      }

      if (completion.chunks.length > 0) {
        const chunk = completion.chunks.shift()!
        console.log(`[CompletionManager] Yielding chunk for completion ${id}`)
        yield chunk
      } else if (completion.isDone) {
        console.log(
          `[CompletionManager] Completion ${id} is done, stopping stream`,
        )
        break
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10)) // Small delay to prevent busy waiting
      }
    }
  }

  private setupEventListeners(): void {
    console.log('[CompletionManager] Setting up event listeners')
    window.ipcRenderer.on(
      'completion-chunk',
      (
        _,
        {
          id,
          chunk,
        }: {
          id: number
          chunk: { choices: Array<{ delta: { content?: string } }> }
        },
      ) => {
        console.log(`[CompletionManager] Received completion chunk`, {
          id,
          chunk,
        })
        const completion = this.activeCompletions.get(id)
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          if (completion) {
            completion.chunks.push(content)
          } else {
            // Queue the chunk if the completion hasn't been initialized yet
            if (!this.pendingChunks.has(id)) {
              this.pendingChunks.set(id, [])
            }
            this.pendingChunks.get(id)!.push(content)
          }
        }
      },
    )

    window.ipcRenderer.on(
      'completion-error',
      (_, { id, message }: { id: number; message: string }) => {
        console.error(`[CompletionManager] Received completion error`, {
          id,
          message,
        })
        const completion = this.activeCompletions.get(id)
        if (completion) {
          completion.error = new CompletionError(message)
        }
      },
    )

    window.ipcRenderer.on('completion-done', (_, { id }: { id: number }) => {
      console.log(`[CompletionManager] Received completion done`, { id })
      const completion = this.activeCompletions.get(id)
      if (completion) {
        completion.isDone = true
      }
    })
  }

  cancelCompletion(id: number): void {
    console.log(`[CompletionManager] Cancelling completion ${id}`)
    const completion = this.activeCompletions.get(id)
    if (completion) {
      completion.isDone = true
    }
    this.activeCompletions.delete(id)
    this.pendingChunks.delete(id)
    window.ipcRenderer.cancelCompletion(id)
  }
}

// Export a function to get the CompletionManager instance
export function getCompletionManager(): CompletionManager {
  return CompletionManager.getInstance()
}
