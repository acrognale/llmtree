import { useHotkeys } from 'react-hotkeys-hook'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from 'reactflow'
import { shallow } from 'zustand/shallow'

import { ChatEdge } from '@/components/ChatEdge'
import { ChatNodeContainer } from '@/components/ChatNode/Container'
import { useHashChange } from '@/hooks/useHashChange'
import { useStore } from '@/state/store'

import 'reactflow/dist/style.css'

const nodeTypes = {
  chat: ChatNodeContainer,
}

const edgeTypes = {
  chat: ChatEdge,
}

const connectionLineStyle = { stroke: '#F6AD55', strokeWidth: 3 }
const defaultEdgeOptions = { style: connectionLineStyle, type: 'chat' }

export function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange } = useStore(
    (state) => ({
      nodes:
        state.canvases.find((c) => c.id === state.currentCanvasId)?.nodes || [],
      edges:
        state.canvases.find((c) => c.id === state.currentCanvasId)?.edges || [],
      onNodesChange: state.actions.onNodesChange,
      onEdgesChange: state.actions.onEdgesChange,
    }),
    shallow,
  )

  useHashChange({ nodes })

  const { fitView, zoomTo } = useReactFlow()
  useHotkeys('f', () => {
    zoomTo(0.5, {
      duration: 500,
    })
  })
  useHotkeys('g', () => {
    zoomTo(1, {
      duration: 500,
    })
  })
  useHotkeys('z', () => {
    // fit all nodes
    fitView({
      nodes: nodes,
      duration: 500,
      padding: 0.25,
    })
  })

  return (
    <ReactFlow
      className="h-full top-0 bottom-0 left-0 right-0 absolute!"
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      defaultViewport={{
        zoom: 0.6,
        x: 200,
        y: 250,
      }}
      minZoom={0.0001}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      connectionLineStyle={connectionLineStyle}
      defaultEdgeOptions={defaultEdgeOptions}>
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  )
}
