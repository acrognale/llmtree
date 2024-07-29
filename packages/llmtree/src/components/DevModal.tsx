import { useStore } from '@/state/store'

interface DevModalProps {
  onClose: () => void
}

export function DevModal({ onClose }: DevModalProps) {
  const { updateOnboardingCompleted, resetState } = useStore((state) => ({
    updateOnboardingCompleted: state.actions.updateOnboardingCompleted,
    resetState: state.actions.resetState,
  }))

  const handleTestOnboarding = () => {
    updateOnboardingCompleted(false)
    onClose()
  }

  const handleResetState = () => {
    resetState()
    onClose()
  }

  const handleTestUpdate = () => {
    window.ipcRenderer.updater.mockUpdate()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg flex flex-col gap-2">
        <h2 className="text-xl font-bold mb-4">Development Actions</h2>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={handleTestOnboarding}>
          Test Onboarding Flow
        </button>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={handleResetState}>
          Reset State
        </button>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={handleTestUpdate}>
          Test Update
        </button>
        <button className="bg-gray-300 px-4 py-2 rounded" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
