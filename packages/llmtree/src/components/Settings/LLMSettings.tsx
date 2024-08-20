import { Eye, EyeOff, X, PlusCircle, MinusCircle, Edit2 } from 'lucide-react'
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

  const [customModels, setCustomModels] = useState<string[]>([])

  const handleAddCustomModel = () => {
    setCustomModels([...customModels, ''])
  }

  const handleRemoveCustomModel = (index: number) => {
    setCustomModels(customModels.filter((_, i) => i !== index))
  }

  const handleCustomModelChange = (index: number, value: string) => {
    const updatedModels = [...customModels]
    updatedModels[index] = value
    setCustomModels(updatedModels)
  }

  const [customProviderName, setCustomProviderName] = useState('')

  const handleAddCustomProvider = () => {
    if (customProviderName) {
      const newProviderId = `customOpenAI_${Date.now()}`
      addProvider(newProviderId as LLMProvider)
      updateProviderConfig(
        newProviderId as LLMProvider,
        'name',
        customProviderName,
      )
      setCustomProviderName('')
    }
  }

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
      <div className="mb-4">
        <h4 className="text-md font-semibold">Add Custom Provider</h4>
        <p className="text-xs text-gray-500 mb-2">
          Must be an OpenAI compatible API.
        </p>
        <div className="flex items-center gap-2">
          <TextInput
            type="text"
            value={customProviderName}
            onChange={(e) => setCustomProviderName(e.target.value)}
            placeholder="Custom Provider Name"
          />
          <button
            onClick={handleAddCustomProvider}
            className="px-3 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600">
            <PlusCircle className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {configuredProviders.map((provider) => {
          const config = settings.providers[provider]
          const providerInfo = provider.startsWith('customOpenAI_')
            ? LLM_PROVIDER_INFO.customOpenAI
            : LLM_PROVIDER_INFO[provider]
          return (
            <div key={provider} className="border p-4 rounded-lg relative">
              <button
                onClick={() => removeProvider(provider)}
                className="absolute top-2 right-2 text-gray-500 hover:text-red-500">
                <X className="h-5 w-5" />
              </button>
              <h4 className="text-md font-semibold mb-2 flex items-center gap-2">
                {providerInfo.icon}
                {config.name || providerInfo.name}
                {provider.startsWith('customOpenAI_') && (
                  <button
                    onClick={() => {
                      const newName = prompt(
                        'Enter new name for the provider',
                        config.name,
                      )
                      if (newName) {
                        updateProviderConfig(provider, 'name', newName)
                      }
                    }}
                    className="text-gray-500 hover:text-blue-500">
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
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
                {(provider === 'customOpenAI' ||
                  provider.startsWith('customOpenAI_')) && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Custom Models
                    </label>
                    {(config.models || []).map((model, index) => (
                      <div key={index} className="flex items-center mt-2">
                        <TextInput
                          type="text"
                          value={model}
                          onChange={(e) => {
                            const updatedModels = [...(config.models || [])]
                            updatedModels[index] = e.target.value
                            updateProviderConfig(
                              provider,
                              'models',
                              updatedModels,
                            )
                          }}
                          className="flex-grow"
                        />
                        <button
                          onClick={() => {
                            const updatedModels = (config.models || []).filter(
                              (_, i) => i !== index,
                            )
                            updateProviderConfig(
                              provider,
                              'models',
                              updatedModels,
                            )
                          }}
                          className="ml-2 text-red-500 hover:text-red-700">
                          <MinusCircle className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const updatedModels = [...(config.models || []), '']
                        updateProviderConfig(provider, 'models', updatedModels)
                      }}
                      className="mt-2 flex items-center text-blue-500 hover:text-blue-700">
                      <PlusCircle className="h-5 w-5 mr-1" />
                      Add Custom Model
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
