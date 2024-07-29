/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChevronDown, Search } from 'lucide-react'
import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { LLM_PROVIDER_INFO } from '@/data/llmLists'
import { useStore } from '@/state/store'

export function ProviderQuickSelect() {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const settings = useStore((state) => state.settings)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const modelListRef = useRef<HTMLDivElement>(null)

  const onModelChange = useStore((state) => state.actions.setSelectedModel)

  useHotkeys('meta+shift+m', () => {
    setIsModelDropdownOpen(true)
  })

  useEffect(() => {
    if (isModelDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isModelDropdownOpen])

  useEffect(() => {
    if (isModelDropdownOpen) {
      setFocusedIndex(-1)
    }
  }, [isModelDropdownOpen])

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isModelDropdownOpen) return

    const totalModelCount = getTotalModelCount()

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) => (prev + 1) % totalModelCount)
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(
          (prev) => (prev - 1 + totalModelCount) % totalModelCount,
        )
        break
      case 'Enter':
        e.preventDefault()
        selectFocusedModel()
        break
      case 'Escape':
        e.preventDefault()
        setIsModelDropdownOpen(false)
        break
    }
  }

  const getTotalModelCount = () => {
    return Object.values(filteredModels).reduce(
      (acc, provider) => acc + provider.modelList.length,
      0,
    )
  }

  const selectFocusedModel = () => {
    let currentIndex = 0
    for (const [providerKey, providerInfo] of Object.entries(filteredModels)) {
      for (const model of providerInfo.modelList) {
        if (currentIndex === focusedIndex) {
          const isConfigured =
            settings.providers[providerKey as keyof typeof settings.providers]
              ?.apiKey !== ''
          if (isConfigured) {
            onModelChange(model)
            setIsModelDropdownOpen(false)
            setSearchTerm('')
          }
          return
        }
        currentIndex++
      }
    }
  }

  const selectedModelInfo = Object.entries(LLM_PROVIDER_INFO).find(
    ([_, info]) => info.modelList.includes(settings.selectedModel!),
  )

  const [provider, providerInfo] = selectedModelInfo || ['', {}]

  const filteredModels = Object.entries(LLM_PROVIDER_INFO).reduce(
    (acc, [providerKey, providerInfo]) => {
      const filteredModelList = providerInfo.modelList.filter((model) =>
        model.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      if (filteredModelList.length > 0) {
        acc[providerKey] = { ...providerInfo, modelList: filteredModelList }
      }
      return acc
    },
    {} as typeof LLM_PROVIDER_INFO,
  )

  return (
    <div className="px-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {providerInfo.icon}
          <span className="font-semibold ml-2 text-sm">
            {settings.selectedModel || 'Select a model'}
          </span>
        </div>
        <button
          onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
          className="text-gray-500 hover:text-gray-700">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      {isModelDropdownOpen && (
        <div
          className="absolute mt-2 w-60 bg-white rounded-md shadow-lg z-20 overflow-y-scroll max-h-[600px]"
          onKeyDown={handleKeyDown}
          ref={modelListRef}
          tabIndex={0}>
          <div className="p-2">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 pr-8 border rounded-md"
              />
              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>
          {Object.entries(filteredModels).map(
            ([providerKey, providerInfo], providerIndex) => {
              let currentIndex = Object.entries(filteredModels)
                .slice(0, providerIndex)
                .reduce((acc, [_, info]) => acc + info.modelList.length, 0)

              const providerConfig =
                settings.providers[
                  providerKey as keyof typeof settings.providers
                ]
              const isConfigured =
                providerConfig && providerConfig.apiKey !== ''

              return (
                <div key={providerKey}>
                  <div className="px-2 py-2 font-semibold text-sm text-gray-500 flex items-center space-x-2">
                    <span>{providerInfo.icon}</span>
                    <span>{providerInfo.name}</span>
                  </div>
                  {!isConfigured && (
                    <span className="text-xs px-4">
                      Configure provider in settings
                    </span>
                  )}
                  {providerInfo.modelList.map((model, modelIndex) => {
                    const isFocused = focusedIndex === currentIndex
                    currentIndex++

                    return (
                      <button
                        key={model}
                        className={`block w-full text-left px-2 py-2 ${
                          isConfigured
                            ? 'hover:bg-gray-100'
                            : 'text-gray-400 cursor-not-allowed'
                        } ${isFocused ? 'bg-gray-100' : ''}`}
                        onClick={() => {
                          if (!isConfigured) {
                            return
                          }

                          onModelChange(model)
                          setIsModelDropdownOpen(false)
                          setSearchTerm('')
                        }}
                        disabled={!isConfigured}>
                        <span className="ml-2 text-xs">{model}</span>
                      </button>
                    )
                  })}
                </div>
              )
            },
          )}
        </div>
      )}
    </div>
  )
}
