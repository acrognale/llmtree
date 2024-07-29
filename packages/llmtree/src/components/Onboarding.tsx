import { shallow } from 'zustand/shallow'

import { SettingsModal } from '@/components/Settings/SettingsModal'
import { useStore } from '@/state/store'

export function Onboarding() {
  const { completeOnboarding } = useStore(
    (state) => ({
      completeOnboarding: state.actions.completeOnboarding,
    }),
    shallow,
  )

  const handleSettingsClose = () => {
    completeOnboarding()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <SettingsModal
        isOpen={true}
        onClose={handleSettingsClose}
        isOnboarding={true}
      />
    </div>
  )
}
