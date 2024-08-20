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

interface CompletionStatus {
  chunks: string[]
  isDone: boolean
  error: Error | null
  usage?: {
    totalInputTokens: number
    totalOutputTokens: number
  }
}

class CompletionManager {
  private static instance: CompletionManager
  private completionStatus: Map<number, CompletionStatus> = new Map()

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
      this.completionStatus.delete(id)
      console.log(
        `[CompletionManager] Completion finished, removed from completionStatus ${id}`,
      )
    }
  }

  private findProvider(settings: Settings): ProviderInfo {
    console.log('[CompletionManager] Finding provider for settings', settings)
    if (!settings.selectedModel) {
      throw new Error('No selected model')
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ([_, config]) => config.models?.includes(settings.selectedModel!),
    )

    if (customProvider) {
      return {
        provider: customProvider[0] as LLMProvider,
        providerConfig: customProvider[1],
      }
    }

    throw new Error('Selected model not found in any provider')
  }
  private async initializeCompletion(
    params: CompletionParams,
    provider: LLMProvider,
    providerConfig: Settings['providers'][LLMProvider],
  ): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Completion initialization timed out'))
      }, 10000)

      window.ipcRenderer
        .startCompletion({
          settings: params.settings,
          history: params.history,
          prompt: params.prompt,
          provider,
          providerConfig,
        })
        .then((id: number) => {
          console.log(`[CompletionManager] Received ID ${id}`)
          clearTimeout(timeout)
          this.completionStatus.set(id, {
            chunks: [],
            isDone: false,
            error: null,
          })
          console.log(
            `[CompletionManager] Completion initialized successfully ${id}`,
          )
          resolve(id)
        })
        .catch((error) => {
          clearTimeout(timeout)
          reject(new Error(error.message))
        })
    })
  }

  private async *streamCompletion(
    id: number,
  ): AsyncGenerator<string, void, unknown> {
    console.log(`[CompletionManager] Starting to stream completion ${id}`)

    while (true) {
      const status = this.completionStatus.get(id)
      if (!status) {
        console.log(
          `[CompletionManager] Completion ${id} not found, stopping stream`,
        )
        await new Promise((resolve) => setTimeout(resolve, 10)) // Small delay to prevent busy waitin
        continue
      }

      if (status.error) {
        console.error(
          `[CompletionManager] Error in completion ${id}:`,
          status.error,
        )
        throw status.error
      }

      if (status.chunks.length > 0) {
        const chunk = status.chunks.shift()!
        console.log(`[CompletionManager] Yielding chunk for completion ${id}`)
        yield chunk
      } else if (status.isDone) {
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
        if (!this.completionStatus.has(id)) {
          console.log(`[CompletionManager] Setting up unknown completion ${id}`)
          this.completionStatus.set(id, {
            chunks: [],
            isDone: false,
            error: null,
          })
        }
        const status = this.completionStatus.get(id)!
        const content = chunk.choices[0]?.delta?.content
        console.log(`[CompletionManager] Received chunk for completion ${id}`, {
          content,
        })
        if (content) {
          status.chunks.push(content)
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
        let status = this.completionStatus.get(id)
        if (!status) {
          // If status doesn't exist, create it
          status = {
            chunks: [],
            isDone: false,
            error: null,
          }
          this.completionStatus.set(id, status)
        }
        status.error = new Error(message)
      },
    )

    window.ipcRenderer.on(
      'completion-done',
      (
        _,
        {
          id,
          usage,
        }: {
          id: number
          usage: { totalInputTokens: number; totalOutputTokens: number }
        },
      ) => {
        console.log(`[CompletionManager] Received completion done`, {
          id,
          usage,
        })
        let status = this.completionStatus.get(id)
        if (!status) {
          // If status doesn't exist, create it
          status = {
            chunks: [],
            isDone: false,
            error: null,
          }
          this.completionStatus.set(id, status)
        }
        status.isDone = true
        status.usage = usage
      },
    )
  }

  cancelCompletion(id: number): void {
    console.log(`[CompletionManager] Cancelling completion ${id}`)
    window.ipcRenderer.cancelCompletion(id)
    this.completionStatus.delete(id)
  }
}

// Export a function to get the CompletionManager instance
export function getCompletionManager(): CompletionManager {
  return CompletionManager.getInstance()
}
