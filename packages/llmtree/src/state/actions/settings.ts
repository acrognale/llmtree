import { produce } from 'immer'

import { ActionCreator, LLMProvider, State } from '@/state/state'

export type SettingsActions = {
  updateSettings: (settings: Partial<State['settings']>) => void
  updateProviderConfig: (
    provider: LLMProvider,
    key: keyof State['settings']['providers'][LLMProvider],
    value: string,
  ) => void
  setSelectedModel: (model: string) => void
  addProvider: (provider: LLMProvider) => void
  removeProvider: (provider: LLMProvider) => void
}

export const settingsActions: ActionCreator<SettingsActions> = (set) => ({
  addProvider: (provider: LLMProvider) =>
    set(
      produce((state: State) => {
        state.settings.providers[provider] = {
          apiKey: '',
        }
      }),
    ),
  removeProvider: (provider: LLMProvider) =>
    set(
      produce((state: State) => {
        delete state.settings.providers[provider]
      }),
    ),
  updateSettings: (newSettings) => {
    set(
      produce((state: State) => {
        state.settings = { ...state.settings, ...newSettings }
      }),
    )
  },
  updateProviderConfig: (
    provider: LLMProvider,
    key: keyof State['settings']['providers'][LLMProvider],
    value: string,
  ) =>
    set(
      produce((state: State) => {
        state.settings.providers[provider][key] = value
      }),
    ),

  setSelectedModel: (model: string) =>
    set(
      produce((state: State) => {
        state.settings.selectedModel = model
      }),
    ),
})
