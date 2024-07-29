import { Eye, EyeOff, X } from 'lucide-react'
import { useState } from 'react'

import { TextInput } from '@/components/TextInput'
import { LLM_PROVIDER_INFO } from '@/data/llmLists'
import { LLMProvider } from '@/state/state'
import { useStore } from '@/state/store'

export const LLMSettings: React.FC = () => {
  const settings = useStore((state) => state.settings)
  const updateProviderConfig = useStore(
    (state) => state.actions.updateProviderConfig,
  )
  const addProvider = useStore((state) => state.actions.addProvider)
  const removeProvider = useStore((state) => state.actions.removeProvider)
  const [showApiKey, setShowApiKey] = useState(false)

  const configuredProviders = Object.keys(settings.providers) as LLMProvider[]
  const availableProviders = Object.keys(LLM_PROVIDER_INFO).filter(
    (provider) => !configuredProviders.includes(provider as LLMProvider),
  ) as LLMProvider[]

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">LLM Provider Settings</h3>
      <div className="mb-4 flex flex-wrap gap-2">
        {availableProviders.map((provider) => (
          <button
            key={provider}
            onClick={() => addProvider(provider)}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 border border-gray-400">
            {LLM_PROVIDER_INFO[provider].icon}
            {LLM_PROVIDER_INFO[provider].name}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {configuredProviders.map((provider) => {
          const config = settings.providers[provider]
          const providerInfo = LLM_PROVIDER_INFO[provider]
          return (
            <div key={provider} className="border p-4 rounded-lg relative">
              <button
                onClick={() => removeProvider(provider)}
                className="absolute top-2 right-2 text-gray-500 hover:text-red-500">
                <X className="h-5 w-5" />
              </button>
              <h4 className="text-md font-semibold mb-2 flex items-center gap-2">
                {providerInfo.icon}
                {providerInfo.name}
              </h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    API Key
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <TextInput
                      type={showApiKey ? 'text' : 'password'}
                      value={config.apiKey}
                      onChange={(e) =>
                        updateProviderConfig(
                          provider as LLMProvider,
                          'apiKey',
                          e.target.value,
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500">
                      {showApiKey ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                {
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Base URL (optional)
                    </label>
                    <TextInput
                      type="text"
                      value={config.baseUrl}
                      onChange={(e) =>
                        updateProviderConfig(
                          provider as LLMProvider,
                          'baseUrl',
                          e.target.value,
                        )
                      }
                    />
                  </div>
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
