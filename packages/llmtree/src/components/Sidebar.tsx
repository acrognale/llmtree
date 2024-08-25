import {
  PanelLeft,
  PanelLeftClose,
  PencilIcon,
  Code,
  Trash2,
  Settings,
  MoreVertical,
} from 'lucide-react'
import { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { shallow } from 'zustand/shallow'

import { ProviderQuickSelect } from '@/components/ProviderQuickSelect'
import { SettingsModal } from '@/components/Settings/SettingsModal'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

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
    <TooltipProvider>
      <div
        className={`bg-background border-r border-input transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        } flex flex-col h-screen z-10 pt-10 pb-4 drag`}>
        {!isCollapsed && <ProviderQuickSelect />}
        <div
          className={`px-4 pt-4 ${
            isCollapsed ? 'hidden' : ''
          } flex-grow overflow-y-auto`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Canvases</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
          <ul className="mb-4 space-y-2">
            {canvases.map((canvas) => (
              <li
                key={canvas.id}
                className={`nodrag cursor-pointer p-2 rounded flex items-center justify-between group ${
                  canvas.id === currentCanvasId
                    ? 'bg-secondary'
                    : 'hover:bg-primary hover:text-primary-foreground'
                }`}>
                {editingCanvasId === canvas.id ? (
                  <Input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={() => handleSaveCanvasName()}
                    onKeyDown={(e) => handleSaveCanvasName(e)}
                    className="w-full"
                    autoFocus
                  />
                ) : (
                  <>
                    <span onClick={() => switchCanvas(canvas.id)}>
                      {canvas.name}
                    </span>
                    <DropdownMenu
                      onOpenChange={(open) =>
                        setOpenDropdownId(open ? canvas.id : null)
                      }>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant={
                            openDropdownId === canvas.id ? 'secondary' : 'ghost'
                          }
                          size="icon"
                          className={`${
                            openDropdownId === canvas.id
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          } transition-opacity`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() =>
                            handleEditCanvasName(canvas.id, canvas.name)
                          }>
                          <PencilIcon className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {canvases.length > 1 && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteCanvas(canvas.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </li>
            ))}
          </ul>
          <Button className="w-full" onClick={handleAddCanvas}>
            Add New Canvas
          </Button>
        </div>
        <div
          className={`p-2 ${
            isCollapsed ? '' : 'hidden'
          } flex-grow overflow-y-auto`}>
          {canvases.map((canvas, index) => (
            <Button
              key={canvas.id}
              variant={canvas.id === currentCanvasId ? 'default' : 'secondary'}
              className="w-full mb-2"
              onClick={() => switchCanvas(canvas.id)}>
              {index + 1}
            </Button>
          ))}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleAddCanvas}>
            +
          </Button>
        </div>
        {isCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => toggleDevMode()}>
                <Code className="w-6 h-6 mx-auto" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle Dev Mode</p>
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="muted"
              className="mt-auto flex justify-end"
              onClick={toggleSidebar}>
              {isCollapsed ? (
                <PanelLeft className="w-8 h-8" />
              ) : (
                <PanelLeftClose className="w-8 h-8" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}</p>
          </TooltipContent>
        </Tooltip>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </TooltipProvider>
  )
}
