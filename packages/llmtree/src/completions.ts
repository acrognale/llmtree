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

  const providerInfo = Object.entries(LLM_PROVIDER_INFO).find(([_, info]) =>
    info.modelList.includes(settings.selectedModel!),
  )

  if (!providerInfo) {
    throw new Error('Selected model not found')
  }

  const [provider, _] = providerInfo
  const providerConfig = settings.providers[provider as LLMProvider]

  if (!providerConfig) {
    throw new Error('Provider configuration not found')
  }

  const completionSettings = {
    ...settings,
    provider: provider as LLMProvider,
    apiKey: providerConfig.apiKey,
    baseUrl: providerConfig.baseUrl,
    model: settings.selectedModel,
  }

  window.ipcRenderer.startCompletion({
    settings: completionSettings,
    history,
    prompt,
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
