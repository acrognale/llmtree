import { CircleX, Split } from 'lucide-react'
import { useLayoutEffect, useRef, useState, useCallback } from 'react'
import { Handle, NodeProps, Position, NodeResizer } from 'reactflow'
import { useReactFlow } from 'reactflow'

import { MessageList } from '@/components/ChatNode/MessageList'
import { PromptInput } from '@/components/ChatNode/PromptInput'
import { useChatNodeActions } from '@/components/ChatNode/useChatNodeActions'
import { selectCurrentCanvas } from '@/state/selectors'
import { ChatNode as TChatNode } from '@/state/state'
import { useStore } from '@/state/store'

export function ChatNode({ id, data }: NodeProps<TChatNode['data']>) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const { loading } = useChatNodeActions()

  // keep the messagesContainerRef scrolled to the bottom as new text is added
  useLayoutEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight
    }
  }, [data.messages])

  const actions = useStore((state) => state.actions)

  const [isHovering, setIsHovering] = useState(false)

  const currentCanvas = useStore(selectCurrentCanvas)
  const currentNode = currentCanvas?.nodes.find((node) => node.id === id)

  const handleDelete = () => {
    if (currentNode) {
      actions.deleteNode(id)
    }
  }

  const handleSplit = () => {
    if (currentNode) {
      actions.addChildNode(currentNode, '', '', true)
    }
  }

  const [promptInputHeight, setPromptInputHeight] = useState(38)

  const { setNodes } = useReactFlow()

  const handlePromptInputResize = useCallback(
    (height: number) => {
      setPromptInputHeight(height)
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              height: node.height! + (height - promptInputHeight),
            }
          }
          return node
        }),
      )
    },
    [id, setNodes, promptInputHeight],
  )

  if (!currentNode) {
    return null
  }

  const isRootNode = currentNode.data.parentId === undefined
  const hasMessages = data.messages.length > 0

  return (
    <div
      id={id}
      ref={nodeRef}
      className="p-4 bg-white border border-gray-300 rounded shadow-md flex flex-col space-y-4 nowheel select-text relative custom-scrollbar"
      style={{
        width: currentNode.width!,
        height: currentNode.height!,
        minHeight: `${100 + promptInputHeight}px`,
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}>
      {!isRootNode && (
        <div className="absolute top-0 right-0 w-10 h-10">
          <button
            onClick={handleDelete}
            className={`
          absolute -top-4 -right-4
          bg-white rounded-full p-1 
          text-red-500 hover:text-red-700 shadow-md 
          transition-all duration-200 ease-in-out
          ${isHovering ? 'scale-100' : 'scale-0'}
          origin-center
        `}>
            <CircleX className="h-8 w-8" />
          </button>
        </div>
      )}

      <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10 flex flex-col gap-2">
        <div className="group relative">
          <button
            aria-label="Split node"
            onClick={handleSplit}
            className={`
              bg-white rounded-full p-1
              text-blue-500 hover:text-blue-700 shadow-md
              transition-all duration-200 ease-in-out
              ${isHovering ? 'scale-100' : 'scale-0'}
              origin-center
            `}>
            <Split className="h-10 w-10 transform rotate-90" />
          </button>
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Fork this chat
          </div>
        </div>
      </div>

      {hasMessages && data.selectedText && (
        <div className="mb-4 p-2 bg-gray-100 border-l-4 border-gray-300 text-sm italic">
          {data.selectedText}
        </div>
      )}
      {loading && (
        <span className="ml-2 text-sm text-gray-500">Loading...</span>
      )}
      <div
        className="flex-1 flex flex-col overflow-auto select-text custom-scrollbar"
        ref={messagesContainerRef}>
        <div className="mt-1 p-2 bg-gray-100 border border-gray-300 rounded flex-1 scroll-smooth">
          <MessageList nodeId={id} messages={data.messages} />
        </div>
      </div>
      <PromptInput
        hasMessages={hasMessages}
        selectedText={data.selectedText}
        onResize={handlePromptInputResize}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 bg-blue-500 opacity-0 cursor-pointer"
      />
      <NodeResizer
        isVisible={true}
        minWidth={180}
        minHeight={100}
        lineClassName="border-2 border-blue-400"
        handleClassName="h-3 w-3 bg-white border-2 border-blue-400"
      />
    </div>
  )
}
