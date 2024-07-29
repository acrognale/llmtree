import { produce } from 'immer'
import { nanoid } from 'nanoid'

import { ActionCreator, State, Canvas } from '@/state/state'

export type AppActions = {
  addCanvas: (name: string) => void
  switchCanvas: (canvasId: string) => void
  deleteCanvas: (canvasId: string) => void
  updateCanvasName: (canvasId: string, name: string) => void
  updateCanvas: (canvas: Canvas) => void
  toggleDevMode: () => void
}

export const appActions: ActionCreator<AppActions> = (set) => ({
  addCanvas: (name: string) => {
    const newCanvas: Canvas = {
      id: nanoid(),
      name,
      nodes: [
        {
          id: 'root',
          data: {
            messages: [],
            selectedText: null,
            promptInput: '',
          },
          dragHandle: '.chat-node-drag-handle',
          position: {
            x: document.body.clientWidth / 2 - 125,
            y: document.body.clientHeight / 2 - 150,
          },
          width: 600,
          height: 800,
          type: 'chat',
        },
      ],
      edges: [],
    }
    set(
      produce((state: State) => {
        state.canvases.push(newCanvas)
        state.currentCanvasId = newCanvas.id
      }),
    )
  },
  switchCanvas: (canvasId: string) => {
    set({ currentCanvasId: canvasId })
  },
  deleteCanvas: (canvasId: string) => {
    set(
      produce((state: State) => {
        state.canvases = state.canvases.filter((c) => c.id !== canvasId)
        if (state.currentCanvasId === canvasId) {
          state.currentCanvasId = state.canvases[0]?.id || ''
        }
      }),
    )
  },
  updateCanvasName: (canvasId: string, name: string) => {
    set(
      produce((state: State) => {
        const canvas = state.canvases.find((c) => c.id === canvasId)
        if (canvas) {
          canvas.name = name
        }
      }),
    )
  },

  toggleDevMode: () => {
    set(
      produce((state: State) => {
        state.devmode = !state.devmode
      }),
    )
  },
  updateCanvas: (canvas: Canvas) => {
    set(
      produce((state: State) => {
        state.canvases = state.canvases.map((c) =>
          c.id === canvas.id ? canvas : c,
        )
      }),
    )
  },
})
