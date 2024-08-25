import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { LLMSettings } from '@/components/Settings/LLMSettings'
import { useStore } from '@/state/store'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

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
      <Textarea
        className="w-full h-48"
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
  useHotkeys('escape', onClose)

  const handleSave = () => {
    // This will trigger the useEffect in SystemPromptSettings
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isOnboarding ? 'Add Your First Provider' : 'Settings'}
          </DialogTitle>
          {!isOnboarding && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </DialogHeader>
        {isOnboarding ? (
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              To get started, configure an LLM below.
            </p>
            <LLMSettings />
          </div>
        ) : (
          <Tabs defaultValue="llm-providers" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="llm-providers">LLM Providers</TabsTrigger>
              <TabsTrigger value="system-prompt">System Prompt</TabsTrigger>
            </TabsList>
            <TabsContent value="llm-providers">
              <LLMSettings />
            </TabsContent>
            <TabsContent value="system-prompt">
              <SystemPromptSettings />
            </TabsContent>
          </Tabs>
        )}
        <Button onClick={handleSave} className="w-full mt-6">
          {isOnboarding ? 'Save and Continue' : 'Save and Close'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
