import {
  PanelLeft,
  PanelLeftClose,
  PencilIcon,
  Code,
  CircleX,
  Settings,
} from 'lucide-react'
import { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { shallow } from 'zustand/shallow'

import { ProviderQuickSelect } from '@/components/ProviderQuickSelect'
import { SettingsModal } from '@/components/Settings/SettingsModal'
import { useStore } from '@/state/store'

export function Sidebar() {
  const {
    canvases,
    currentCanvasId,
    switchCanvas,
    addCanvas,
    updateCanvasName,
    toggleDevMode,
    deleteCanvas,
  } = useStore(
    (state) => ({
      canvases: state.canvases,
      currentCanvasId: state.currentCanvasId,
      switchCanvas: state.actions.switchCanvas,
      addCanvas: state.actions.addCanvas,
      updateCanvasName: state.actions.updateCanvasName,
      toggleDevMode: state.actions.toggleDevMode,
      devmode: state.devmode,
      deleteCanvas: state.actions.deleteCanvas,
    }),
    shallow,
  )

  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null)
  const [editedName, setEditedName] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useHotkeys(
    'meta+,',
    () => {
      setIsSettingsOpen(true)
    },
    { splitKey: '!' },
  )

  const handleAddCanvas = () => {
    const newCanvasName = `Canvas ${canvases.length + 1}`
    addCanvas(newCanvasName)
  }

  const handleEditCanvasName = (canvasId: string, currentName: string) => {
    setEditingCanvasId(canvasId)
    setEditedName(currentName)
  }

  const handleSaveCanvasName = (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== 'Enter') return
    if (editingCanvasId && editedName.trim()) {
      updateCanvasName(editingCanvasId, editedName.trim())
      setEditingCanvasId(null)
      setEditedName('')
    }
  }

  const handleDeleteCanvas = (canvasId: string) => {
    if (canvases.length > 1) {
      if (canvasId === currentCanvasId) {
        switchCanvas(canvases.find((c) => c.id !== canvasId)?.id || '')
      }
      deleteCanvas(canvasId)
    }
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div
      className={`bg-gray-100 border-r border-gray-300 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      } flex flex-col h-full z-10 pt-4`}>
      {!isCollapsed && <ProviderQuickSelect />}
      <div className={`px-4 pt-4 ${isCollapsed ? 'hidden' : ''} flex-grow`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Canvases</h2>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-gray-500 hover:text-gray-700">
            <Settings className="w-5 h-5" />
          </button>
        </div>
        <ul className="mb-4">
          {canvases.map((canvas) => (
            <li
              key={canvas.id}
              onClick={() => switchCanvas(canvas.id)}
              className={`cursor-pointer p-2 rounded flex items-center justify-between ${
                canvas.id === currentCanvasId
                  ? 'bg-blue-200'
                  : 'hover:bg-gray-200'
              }`}>
              {editingCanvasId === canvas.id ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={() => handleSaveCanvasName()}
                  onKeyDown={(e) => handleSaveCanvasName(e)}
                  className="w-full px-2 py-1 rounded"
                  autoFocus
                />
              ) : (
                <>
                  <span>{canvas.name}</span>
                  <div>
                    <button
                      onClick={() =>
                        handleEditCanvasName(canvas.id, canvas.name)
                      }
                      className="text-gray-500 hover:text-gray-700 mr-2">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    {canvases.length > 1 && (
                      <button
                        onClick={() => handleDeleteCanvas(canvas.id)}
                        className="text-red-500 hover:text-red-700">
                        <CircleX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
        <button
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          onClick={handleAddCanvas}>
          Add New Canvas
        </button>
      </div>
      <div className={`p-2 ${isCollapsed ? '' : 'hidden'} flex-grow`}>
        {canvases.map((canvas, index) => (
          <button
            key={canvas.id}
            onClick={() => switchCanvas(canvas.id)}
            className={`w-full mb-2 p-2 rounded ${
              canvas.id === currentCanvasId
                ? 'bg-blue-500 text-white'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}>
            {index + 1}
          </button>
        ))}
        <button
          onClick={handleAddCanvas}
          className="w-full bg-green-500 text-white rounded p-2">
          +
        </button>
      </div>
      {isCollapsed && (
        <button
          onClick={() => toggleDevMode()}
          className="w-full bg-purple-500 text-white rounded p-2 mt-2">
          <Code className="w-6 h-6 mx-auto" />
        </button>
      )}
      <button
        onClick={toggleSidebar}
        className="w-full bg-gray-200 p-2 text-gray-700 hover:bg-gray-300 mt-auto flex">
        {isCollapsed ? (
          <PanelLeft className="w-8 h-8" />
        ) : (
          <PanelLeftClose className="w-8 h-8  " />
        )}
      </button>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}
