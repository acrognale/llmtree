import { AvailableProviders } from '@llmtree/litellm/src/types'
import { Node, Edge } from 'reactflow'

import { AppActions } from '@/state/actions/app'
import { CanvasOperations } from '@/state/actions/canvases'
import { MessageActions } from '@/state/actions/messages'
import { OnboardingActions } from '@/state/actions/onboarding'
import { SettingsActions } from '@/state/actions/settings'

export type LLMProvider = AvailableProviders

export interface Canvas {
  id: string
  name: string
  nodes: ChatNode[]
  edges: ChatEdge[]
}

export interface Message {
  id: string
  hidden: boolean
  prompt: string
  response: string
  error?: string
  isProcessing: boolean
}

export interface ChatNode extends Node {
  id: string
  type: string
  data: {
    parentId?: string
    messages: Message[]
    promptInput: string
    selectedText: string | null
  }
}

export interface ChatEdge extends Omit<Edge, 'id' | 'source' | 'target'> {
  id: string
  source: string
  target: string
}

export interface Settings {
  providers: {
    [key in LLMProvider]: {
      apiKey: string
      baseUrl?: string
    }
  }
  selectedModel: string | null
  systemPrompt: string
}

export type DevmodeActions = {
  toggleDevMode: () => void
  resetState: () => void
}

export type Actions = AppActions &
  MessageActions &
  DevmodeActions &
  CanvasOperations &
  SettingsActions &
  OnboardingActions

export type State = {
  canvases: Canvas[]
  currentCanvasId: string
  draggedNode?: Node
  devmode: boolean
  settings: Settings
  onboardingCompleted: boolean
  actions: Actions
}

type SetState = (
  partial: State | Partial<State> | ((state: State) => State | Partial<State>),
  replace?: boolean | undefined,
) => void

type GetState = () => State

export type ActionCreator<T> = (set: SetState, get: GetState) => T
