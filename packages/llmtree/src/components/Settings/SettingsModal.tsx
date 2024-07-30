import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { LLMSettings } from '@/components/Settings/LLMSettings'
import { cls } from '@/helpers/ui'
import { useStore } from '@/state/store'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  isOnboarding?: boolean
}

function SystemPromptSettings() {
  const systemPrompt = useStore((state) => state.settings.systemPrompt)
  const updateSystemPrompt = useStore(
    (state) => state.actions.updateSystemPrompt,
  )
  const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt)

  useEffect(() => {
    return () => {
      updateSystemPrompt(localSystemPrompt)
    }
  }, [localSystemPrompt, updateSystemPrompt])

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">System Prompt</h3>
      <textarea
        className="w-full h-48 p-2 border rounded-md"
        value={localSystemPrompt}
        onChange={(e) => setLocalSystemPrompt(e.target.value)}
      />
    </div>
  )
}

export function SettingsModal({
  isOpen,
  onClose,
  isOnboarding = false,
}: SettingsModalProps) {
  const [selectedTab, setSelectedTab] = useState(0)

  useHotkeys('escape', onClose)

  const handleSave = () => {
    // This will trigger the useEffect in SystemPromptSettings
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-[32rem] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {isOnboarding ? 'Add Your First Provider' : 'Settings'}
          </h2>
          {!isOnboarding && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {isOnboarding ? (
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              To get started, configure an LLM below.
            </p>
            <LLMSettings />
          </div>
        ) : (
          <TabGroup
            vertical
            selectedIndex={selectedTab}
            onChange={setSelectedTab}>
            <div className="flex">
              <div className="w-1/4">
                <TabList className="flex flex-col space-y-2">
                  {tabs.map((tab, index) => (
                    <Tab
                      key={index}
                      className={({ selected }) =>
                        cls(
                          'py-2 px-2 rounded-lg focus:outline-none text-sm w-full text-left whitespace-nowrap',
                          selected
                            ? 'bg-gray-200 text-black'
                            : 'bg-white text-black hover:bg-gray-200',
                        )
                      }>
                      {tab.name}
                    </Tab>
                  ))}
                </TabList>
              </div>

              <div className="w-3/4 pl-4">
                <TabPanels>
                  {tabs.map((tab, index) => (
                    <TabPanel key={index}>{tab.content}</TabPanel>
                  ))}
                </TabPanels>
              </div>
            </div>
          </TabGroup>
        )}
        <button
          onClick={handleSave}
          className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mt-6`}>
          {isOnboarding ? 'Save and Continue' : 'Save and Close'}
        </button>
      </div>
    </div>
  )
}

const tabs = [
  { name: 'LLM Providers', content: <LLMSettings /> },
  { name: 'System Prompt', content: <SystemPromptSettings /> },
]
