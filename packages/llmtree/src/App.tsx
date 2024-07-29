import { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { ReactFlowProvider } from 'reactflow'

import { Canvas } from '@/components/Canvas'
import { DevModal } from '@/components/DevModal' // Add this import
import { Onboarding } from '@/components/Onboarding'
import { Sidebar } from '@/components/Sidebar'
import { UpdateChecker } from '@/components/UpdateChecker'
import { useStore } from '@/state/store'

function App() {
  const {
    devmode: isDevMode,
    canvas,
    updateCanvas,
    onboardingCompleted,
    settings,
  } = useStore((state) => ({
    devmode: state.devmode,
    toggleDevMode: state.actions.toggleDevMode,
    canvas: state.canvases.find((c) => c.id === state.currentCanvasId),
    updateCanvas: state.actions.updateCanvas,
    onboardingCompleted: state.onboardingCompleted,
    settings: state.settings,
  }))
  const [error, setError] = useState<string | null>(null)
  const [showDevModal, setShowDevModal] = useState(false)

  const handleStateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const newState = JSON.parse(e.target.value)
      updateCanvas(newState)
    } catch (err) {
      setError('Invalid JSON')
    }
  }

  useHotkeys('meta+d', () => {
    setShowDevModal(true)
  })

  if (!onboardingCompleted) {
    return <Onboarding />
  }

  return (
    <div className="h-full flex">
      <UpdateChecker />
      <Sidebar />
      <div className="flex-1">
        {isDevMode ? (
          <>
            {error && <p className="text-red-500">{error}</p>}
            <textarea
              className="w-full h-full p-4 font-mono text-sm"
              defaultValue={JSON.stringify(
                {
                  canvas,
                  settings,
                },
                null,
                2,
              )}
              onChange={handleStateChange}
            />
          </>
        ) : (
          <ReactFlowProvider>
            <Canvas />
          </ReactFlowProvider>
        )}
      </div>
      {showDevModal && <DevModal onClose={() => setShowDevModal(false)} />}
    </div>
  )
}

export default App
