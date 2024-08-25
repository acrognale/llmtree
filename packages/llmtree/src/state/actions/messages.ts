import { IpcRenderer } from 'electron'
import { produce } from 'immer'
import { nanoid } from 'nanoid'

import { CompletionParams } from '@/completions/CompletionProvider'
import { ElectronRendererTransport } from '@/completions/ElectronRendererTransport'
import { CompletionManager } from '@/completions/RendererCompletionManager'
import { LLM_PROVIDER_INFO } from '@/data/llmLists'
import { selectCurrentCanvas } from '@/state/selectors'
import type {
  ActionCreator,
  LLMProvider,
  Message,
  Settings,
  State,
} from '@/state/state'

export type MessageActions = {
  fetchResponse: (prompt: string, targetNodeId: string) => Promise<void>
  retryMessage: (canvasId: string, nodeId: string, messageId: string) => void
}

function buildRequest(
  settings: Settings,
  history: { role: 'system' | 'user' | 'assistant'; content: string }[],
  prompt: string,
): CompletionParams {
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

  return {
    provider: provider as LLMProvider,
    apiKey: providerConfig.apiKey,
    baseUrl: providerConfig.baseUrl,
    model: settings.selectedModel,
    system: `You are a helpful assistant. You can add nodes to the graph with the given content using the addNode function and the content argument.`,
    messages: [
      ...history,
      {
        role: 'user',
        content: prompt,
      },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'addNode',
          description: 'Add a node to the graph with the given content.',
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
  }
}

export const messageActions: ActionCreator<MessageActions> = (set, get) => {
  // Helper functions
  function getCanvasAndNode(targetNodeId: string) {
    const currentCanvas = get().canvases.find(
      (c) => c.id === get().currentCanvasId,
    )
    const targetNode = currentCanvas?.nodes.find(
      (node) => node.id === targetNodeId,
    )
    return { currentCanvas, targetNode }
  }

  function addNewMessageToNode(targetNodeId: string, prompt: string) {
    const newMessage = {
      id: nanoid(),
      prompt,
      response: '',
      isProcessing: true,
      hidden: false,
    }

    set(
      produce((state: State) => {
        const currentCanvas = selectCurrentCanvas(state)
        if (currentCanvas) {
          const targetNode = currentCanvas.nodes.find(
            (node) => node.id === targetNodeId,
          )
          if (targetNode) {
            targetNode.data.messages.push(newMessage)
          }
        }
      }),
    )

    return newMessage
  }

  async function streamResponse(
    targetNodeId: string,
    newMessage: Message,
    prompt: string,
    context: { prompt: string; response: string }[],
    selectedText: string | null,
  ) {
    let accumulatedText = ''

    const updateMessage = (updatedFields: Partial<typeof newMessage>) => {
      set(
        produce((state: State) => {
          const currentCanvas = selectCurrentCanvas(state)
          if (currentCanvas) {
            const targetNode = currentCanvas.nodes.find(
              (node) => node.id === targetNodeId,
            )
            if (targetNode) {
              targetNode.data.messages = targetNode.data.messages.map((msg) =>
                msg.id === newMessage.id ? { ...msg, ...updatedFields } : msg,
              )
            }
          }
        }),
      )
    }

    try {
      console.log('[streamResponse] Starting response stream')
      const history = context.slice(0, -1).flatMap(({ prompt, response }) => [
        { role: 'user' as const, content: prompt },
        { role: 'assistant' as const, content: response },
      ])

      const completionManager = CompletionManager.getInstance(
        new ElectronRendererTransport(
          window.ipcRenderer as unknown as IpcRenderer,
        ),
      )

      console.log('[streamResponse] Calling completionManager.getCompletion')
      const { stream } = completionManager.getCompletion(
        buildRequest(
          get().settings,
          history,
          selectedText ? `Focusing on ${selectedText}, ${prompt}` : prompt,
        ),
      )

      for await (const chunk of stream) {
        accumulatedText += chunk
        requestAnimationFrame(() => {
          updateMessage({
            response: accumulatedText,
            isProcessing: true,
          })
        })
      }

      updateMessage({
        response: accumulatedText,
        isProcessing: false,
      })
      return accumulatedText
    } catch (error) {
      console.error('[streamResponse] Error:', error)
      updateMessage({
        response: accumulatedText,
        isProcessing: false,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        error: error.message,
      })
    }
  }

  function getContext(targetNodeId: string) {
    const { currentCanvas, targetNode } = getCanvasAndNode(targetNodeId)
    if (!currentCanvas || !targetNode) return []
    return targetNode.data.messages
  }

  return {
    fetchResponse: async (
      prompt: string,
      targetNodeId: string,
    ): Promise<void> => {
      const { currentCanvas, targetNode } = getCanvasAndNode(targetNodeId)
      if (!currentCanvas || !targetNode) return
      const selectedText = targetNode.data.selectedText
      const newMessage = addNewMessageToNode(targetNodeId, prompt)

      streamResponse(
        targetNodeId,
        newMessage,
        prompt,
        getContext(targetNodeId),
        selectedText,
      )
    },
    retryMessage: async (
      canvasId: string,
      nodeId: string,
      messageId: string,
    ) => {
      const { currentCanvas, targetNode } = getCanvasAndNode(nodeId)
      if (!currentCanvas || !targetNode) return

      const messageIndex = targetNode.data.messages.findIndex(
        (msg) => msg.id === messageId,
      )
      if (messageIndex === -1) return

      const messageToRetry = targetNode.data.messages[messageIndex]

      // Update the message to clear the error and mark as processing
      set(
        produce((state: State) => {
          const currentCanvas = selectCurrentCanvas(state)
          if (currentCanvas) {
            const targetNode = currentCanvas.nodes.find(
              (node) => node.id === nodeId,
            )
            if (targetNode) {
              targetNode.data.messages = targetNode.data.messages.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      error: undefined,
                      isProcessing: true,
                      response: '',
                    }
                  : msg,
              )
            }
          }
        }),
      )

      await streamResponse(
        nodeId,
        messageToRetry,
        messageToRetry.prompt,
        getContext(nodeId),
        targetNode.data.selectedText,
      )
    },
  }
}
