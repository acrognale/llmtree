import { nanoid } from 'nanoid'
import { Node as FlowNode } from 'reactflow'
import { createWithEqualityFn } from 'zustand/traditional'

import { appActions } from '@/state/actions/app'
import { canvasOperations } from '@/state/actions/canvases'
import { messageActions } from '@/state/actions/messages'
import { onboardingActions } from '@/state/actions/onboarding'
import { settingsActions } from '@/state/actions/settings'
import { Canvas, ChatNode, LLMProvider, State } from '@/state/state'

export interface Node extends FlowNode<ChatNode> {}

const defaultSystemPrompt = `You are LLMTree, an intelligent AI assistant. You respond to answers using Markdown formatting when appropriate. You are able to render LaTeX. When providing mathematical equations, use LaTeX. When explaining things, you try to provide the intuition behind your reasoning.`

export const getInitialState = (): Omit<State, 'actions'> => {
  const initialCanvas: Canvas = {
    id: nanoid(),
    name: 'Default Canvas',
    nodes: [
      {
        id: 'root',
        data: {
          messages: [],
          selectedText: null,
          promptInput: '',
        },
        position: {
          x: document.body.clientWidth / 2 - 125,
          y: document.body.clientHeight / 2 - 150,
        },
        width: 600,
        height: 800,
        type: 'chat',
      },
    ],
    edges: [],
  }

  return {
    canvases: [initialCanvas],
    currentCanvasId: initialCanvas.id,
    draggedNode: undefined,
    devmode: false,
    settings: {
      providers: {} as {
        [key in LLMProvider]: {
          apiKey: string
          baseUrl?: string
          selectedModel: string
        }
      },
      selectedModel: null,
      systemPrompt: defaultSystemPrompt,
    },
    onboardingCompleted: false,
  }
}

export const createStore = (testInitialState?: Partial<State>) => {
  return createWithEqualityFn<State>((set, get) => {
    const initialState = testInitialState || getInitialState()

    // Load saved state from disk
    if (!testInitialState) {
      window.ipcRenderer.loadState().then((state) => {
        if (state) {
          set(state)
        }
      })
    }

    return {
      canvases: initialState.canvases || [],
      currentCanvasId: initialState.currentCanvasId || '',
      draggedNode: undefined,
      devmode: false,
      settings: initialState.settings || {
        providers: {} as {
          [key in LLMProvider]: {
            apiKey: string
            baseUrl?: string
            selectedModel: string
          }
        },
        selectedModel: '',
        systemPrompt: defaultSystemPrompt,
      },
      onboardingCompleted: initialState.onboardingCompleted || false,
      actions: {
        ...testInitialState?.actions,
        ...appActions(set, get),
        ...messageActions(set, get),
        ...canvasOperations(set, get),
        ...settingsActions(set, get),
        ...onboardingActions(set, get),
        resetState: () => {
          set(getInitialState())
        },
      },
    }
  })
}

export const useStore = createStore()

useStore.subscribe((state) => {
  const stateToSave = {
    canvases: state.canvases,
    currentCanvasId: state.currentCanvasId,
    settings: state.settings,
    devmode: state.devmode,
    onboardingCompleted: state.onboardingCompleted,
  }
  window.ipcRenderer.saveState(stateToSave)
})
