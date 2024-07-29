import { State, Canvas } from '@/state/state'

export const getPathToRoot = (
  state: State,
  nodeId: string,
): { prompt: string; response: string }[] => {
  const path: { prompt: string; response: string }[] = []
  const currentCanvas = state.canvases.find(
    (c) => c.id === state.currentCanvasId,
  )
  if (!currentCanvas) return path

  let currentNode = currentCanvas.nodes.find((node) => node.id === nodeId)

  while (currentNode && currentNode.id !== 'root') {
    const parentNode = currentCanvas.nodes.find(
      (node) => node.id === currentNode?.data.parentId,
    )
    if (parentNode) {
      const lastMessage =
        parentNode.data.messages[parentNode.data.messages.length - 1]
      if (lastMessage) {
        path.unshift({
          prompt: lastMessage.prompt,
          response: lastMessage.response,
        })
      }
    }
    currentNode = parentNode
  }

  return path
}

export const selectCurrentCanvas = (state: State): Canvas | undefined => {
  return state.canvases.find((c) => c.id === state.currentCanvasId)
}
