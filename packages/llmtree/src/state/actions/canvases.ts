import { produce } from 'immer'
import { nanoid } from 'nanoid'
import {
  Edge,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow'

import { selectCurrentCanvas } from '@/state/selectors'
import { ActionCreator, State } from '@/state/state'
import { ChatEdge, ChatNode, Message } from '@/state/state'
import { getRandomPosition } from '@/utils/organicLayout'

export type CanvasOperations = {
  setEdges: (edges: Edge[]) => void
  onEdgeUpdate: (edgeId: string, newEdge: Edge) => void

  onSetDraggedNode: (node?: Node) => void
  setNodes: (nodes: ChatNode[]) => void
  deleteNode: (nodeId: string) => void
  addChildNode: (
    parentNode: ChatNode,
    initialLabel: string,
    selectedText: string | null,
    forkParent: boolean,
  ) => ChatNode

  onSetLayout: (nodes: ChatNode[], edges: ChatEdge[]) => void

  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  forkNodeAtMessage: (nodeId: string, forkedMessages: Message[]) => ChatNode
}

export const canvasOperations: ActionCreator<CanvasOperations> = (
  set,
  get,
) => ({
  onSetDraggedNode: (node?: Node) => {
    set({
      draggedNode: node as ChatNode | undefined,
    })
  },
  setNodes: (nodes: ChatNode[]) => {
    set(
      produce((state: State) => {
        const currentCanvas = selectCurrentCanvas(state)
        if (currentCanvas) {
          currentCanvas.nodes = nodes
        }
      }),
    )
  },
  setEdges: (edges: Edge[]) => {
    set(
      produce((state: State) => {
        const currentCanvas = selectCurrentCanvas(state)
        if (currentCanvas) {
          currentCanvas.edges = edges
        }
      }),
    )
  },
  onNodesChange: (changes) => {
    set(
      produce((state: State) => {
        const currentCanvas = selectCurrentCanvas(state)
        if (currentCanvas) {
          currentCanvas.nodes = applyNodeChanges(
            changes,
            currentCanvas.nodes,
          ) as ChatNode[]
        }
      }),
    )
  },
  onEdgesChange: (changes) => {
    set(
      produce((state: State) => {
        const currentCanvas = selectCurrentCanvas(state)
        if (currentCanvas) {
          currentCanvas.edges = applyEdgeChanges(changes, currentCanvas.edges)
        }
      }),
    )
  },
  deleteNode: (nodeId: string) => {
    set(
      produce((state: State) => {
        const currentCanvas = selectCurrentCanvas(state)
        if (!currentCanvas) return
        // Remove the node
        currentCanvas.nodes = currentCanvas.nodes.filter(
          (node) => node.id !== nodeId,
        )

        // Remove edges connected to the deleted node
        currentCanvas.edges = currentCanvas.edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId,
        )

        // Remove links in other nodes pointing to the deleted node
        currentCanvas.nodes = currentCanvas.nodes.map((node) => {
          if (node.type === 'chat') {
            const updatedMessages = node.data.messages.map((message) => ({
              ...message,
              response: message.response.replace(
                new RegExp(`\\[==(.*)?==\\]\\(#${nodeId}\\)`, 'g'),
                '$1',
              ),
            }))
            return {
              ...node,
              data: {
                ...node.data,
                messages: updatedMessages,
              },
            }
          }
          return node
        })
      }),
    )
  },
  addChildNode: (
    parentNode: ChatNode,
    initialLabel = 'Enter a prompt...',
    selectedText: string | null,
    forkParent: boolean,
  ) => {
    const currentCanvas = get().canvases.find(
      (c) => c.id === get().currentCanvasId,
    )
    const { x, y } = getRandomPosition(
      currentCanvas?.nodes.map((node) => ({
        ...node,
        width: node.width ?? 0,
        height: node.height ?? 0,
      })) ?? [],
      currentCanvas?.edges ?? [],
      parentNode.id,
      600,
      600,
      10,
      'topRight',
    )

    const newNode: ChatNode = {
      id: nanoid(),
      type: 'chat',
      data: {
        parentId: parentNode.id,
        messages: parentNode.data.messages.map((message) => ({
          ...message,
          hidden: forkParent ? message.hidden : true,
        })),
        promptInput: initialLabel,
        selectedText: selectedText,
      },
      dragHandle: '.chat-node-drag-handle',
      position: {
        x,
        y,
      },
      width: 600,
      height: 600,
      dragging: true,
    }

    const newEdge: ChatEdge = {
      id: `${parentNode.id}-${newNode.id}`,
      source: parentNode.id,
      target: newNode.id,
    }

    set(
      produce((state: State) => {
        const currentCanvas = selectCurrentCanvas(state)
        if (!currentCanvas) return
        currentCanvas.nodes.push(newNode as ChatNode)
        currentCanvas.edges.push(newEdge as ChatEdge)
      }),
    )

    return newNode
  },
  onSetLayout: (nodes: ChatNode[], edges: ChatEdge[]) => {
    set(
      produce((state: State) => {
        const currentCanvas = selectCurrentCanvas(state)
        if (!currentCanvas) return
        currentCanvas.nodes = nodes as ChatNode[]
        currentCanvas.edges = edges as ChatEdge[]
      }),
    )
  },
  onEdgeUpdate: (edgeId: string, newEdge: Edge) => {
    set(
      produce((state: State) => {
        const currentCanvas = selectCurrentCanvas(state)
        if (!currentCanvas) return
        currentCanvas.edges = currentCanvas.edges.map((edge) =>
          edge.id === edgeId ? newEdge : edge,
        )
      }),
    )
  },
  forkNodeAtMessage: (nodeId: string, forkedMessages: Message[]) => {
    const state = get()
    const currentCanvas = selectCurrentCanvas(state)
    if (!currentCanvas) throw new Error('No current canvas')
    const parentNode = currentCanvas.nodes.find((node) => node.id === nodeId)

    if (!parentNode) {
      throw new Error(`Node with id ${nodeId} not found`)
    }

    const { x, y } = getRandomPosition(
      currentCanvas.nodes.map((node) => ({
        ...node,
        width: node.width ?? 0,
        height: node.height ?? 0,
      })),
      currentCanvas.edges,
      parentNode.id,
      600,
      600,
      10,
      'topRight',
    )

    const newNode: ChatNode = {
      id: nanoid(),
      type: 'chat',
      data: {
        parentId: parentNode.id,
        messages: forkedMessages,
        promptInput: 'Continue the conversation...',
        selectedText: null,
      },
      position: { x, y },
      width: 600,
      height: 600,
      dragging: true,
    }

    const newEdge: ChatEdge = {
      id: `${parentNode.id}-${newNode.id}`,
      source: parentNode.id,
      target: newNode.id,
    }

    set(
      produce((state: State) => {
        const currentCanvas = selectCurrentCanvas(state)
        if (!currentCanvas) return
        currentCanvas.nodes.push(newNode)
        currentCanvas.edges.push(newEdge)
      }),
    )

    return newNode
  },
})
