/* eslint-disable @typescript-eslint/no-unused-vars */
import { LLM_PROVIDER_INFO } from '@/data/llmLists'
import { Settings } from '@/state/state'
import { LLMProvider } from '@/state/state'

async function* getCompletion({
  settings,
  history,
  prompt,
}: {
  settings: Settings
  history: { role: 'system' | 'user' | 'assistant'; content: string }[]
  prompt: string
}): AsyncGenerator<string, void, unknown> {
  const id = await initializeCompletion(settings, history, prompt)

  try {
    yield* streamCompletion(id)
  } catch (error) {
    console.error('error', error)
    throw error
  } finally {
    cleanupListeners(id)
  }
}

async function initializeCompletion(
  settings: Settings,
  history: { role: 'system' | 'user' | 'assistant'; content: string }[],
  prompt: string,
): Promise<number> {
  if (!settings.selectedModel) {
    throw new Error('No selected model')
  }

  // Find the provider for the selected model
  let provider: LLMProvider | undefined
  let providerConfig: Settings['providers'][LLMProvider] | undefined

  // Helper function to find provider
  const findProvider = (
    model: string,
  ): {
    provider: LLMProvider
    providerConfig: Settings['providers'][LLMProvider]
  } | null => {
    // Check pre-set models first
    for (const [key, info] of Object.entries(LLM_PROVIDER_INFO)) {
      if (info.modelList.includes(model)) {
        return {
          provider: key as LLMProvider,
          providerConfig: settings.providers[key as LLMProvider],
        }
      }
    }

    // If not found in pre-set models, check custom providers
    const customProvider = Object.entries(settings.providers).find(
      ([_, config]) => config.models?.includes(model),
    )

    if (customProvider) {
      return {
        provider: customProvider[0] as LLMProvider,
        providerConfig: customProvider[1],
      }
    }

    return null
  }

  // Use the helper function to find the provider
  const result = findProvider(settings.selectedModel)
  if (result !== null) {
    provider = result.provider
    providerConfig = result.providerConfig
  } else {
    throw new Error('Selected model not found in any provider')
  }

  const completionSettings = {
    ...settings,
    provider,
    apiKey: providerConfig.apiKey,
    baseUrl:
      providerConfig.baseUrl || LLM_PROVIDER_INFO[provider]?.defaultBaseUrl,
    model: settings.selectedModel,
  }

  window.ipcRenderer.startCompletion({
    settings: completionSettings,
    history,
    prompt,
    provider,
    providerConfig,
  })
  return new Promise((resolve) =>
    window.ipcRenderer.once('completion-id', (_, id) => {
      window.ipcRenderer.ackCompletion(id)
      resolve(id)
    }),
  )
}

async function* streamCompletion(
  id: number,
): AsyncGenerator<string, void, unknown> {
  const chunkQueue: string[] = []
  let resolveChunk: ((value: string | undefined) => void) | null = null
  let isDone = false
  let error: Error | null = null

  const handleChunk = (chunk: string | undefined) => {
    if (resolveChunk) {
      resolveChunk(chunk)
      resolveChunk = null
    } else if (chunk) {
      chunkQueue.push(chunk)
    }
  }

  const onDone = () => {
    isDone = true
    if (resolveChunk) {
      resolveChunk(undefined)
    }
  }

  setupEventListeners(id, handleChunk, onDone, (err) => {
    error = err
    if (resolveChunk) {
      resolveChunk(undefined)
    }
  })

  try {
    while (!isDone) {
      if (error) throw error
      if (chunkQueue.length > 0) {
        yield chunkQueue.shift()!
      } else {
        const chunk = await new Promise<string | undefined>((resolve) => {
          resolveChunk = resolve
        })
        if (chunk === undefined) {
          if (error) throw error
          break
        }
        yield chunk
      }
    }
  } finally {
    cleanupListeners(id)
  }
}

function setupEventListeners(
  id: number,
  onChunk: (chunk: string) => void,
  onDone: (usage: {
    totalInputTokens: number
    totalOutputTokens: number
  }) => void,
  onError: (error: Error) => void,
) {
  window.ipcRenderer.on(`completion-chunk-${id}`, (_, chunk) => {
    const content = chunk.choices[0].delta.content
    if (content) onChunk(content)
  })

  window.ipcRenderer.once(`completion-error-${id}`, (_, errorMessage) => {
    onError(new Error(errorMessage))
  })

  window.ipcRenderer.once(`completion-done-${id}`, (_, usage) => {
    onDone(usage)
  })
}

function cleanupListeners(id: number) {
  // eslint-disable-next-line no-extra-semi
  ;[
    'completion-chunk',
    'completion-error',
    'completion-done',
    'completion-ready',
  ].forEach((event) => window.ipcRenderer.removeAllListeners(`${event}-${id}`))
}

export { getCompletion }
