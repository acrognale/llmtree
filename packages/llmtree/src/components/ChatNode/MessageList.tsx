import { Reply } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'
import Markdown from 'react-markdown'
import SyntaxHighlighter from 'react-syntax-highlighter'
import dark from 'react-syntax-highlighter/dist/esm/styles/prism/dark'
import rehypeKatex from 'rehype-katex'
import remarkDirective from 'remark-directive'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import colors from 'tailwindcss/colors'

import { selectCurrentCanvas } from '@/state/selectors'
import { Message } from '@/state/state'
import { useStore } from '@/state/store'
import { highlightPlugin } from '@/utils/markdown/highlightPlugin'

interface MessageListProps {
  nodeId: string
  messages: Message[]
}

export function MessageList({ messages, nodeId }: MessageListProps) {
  const currentCanvas = useStore(selectCurrentCanvas)

  const {
    edges,
    actions: { setEdges, retryMessage, forkNodeAtMessage },
  } = useStore((state) => ({
    edges: currentCanvas?.edges || [],
    actions: state.actions,
  }))

  const handleHighlightHover = useCallback(
    (linkId: string, isHovering: boolean) => {
      // check if the edge is already marked as hovering
      const edge = edges.find(
        (edge) => edge.source === nodeId && edge.target === linkId,
      )
      if (edge?.animated === isHovering) {
        return
      }

      setEdges(
        edges.map((edge) => {
          if (edge.source === nodeId && edge.target === linkId) {
            return {
              ...edge,
              animated: isHovering,
              style: {
                stroke: isHovering ? colors['red']['400'] : undefined,
                strokeWidth: isHovering ? 8 : undefined,
              },
            }
          }
          return edge
        }),
      )
    },
    [edges, nodeId, setEdges],
  )

  const handleFork = useCallback(
    (messageId: string) => {
      const messageIndex = messages.findIndex((m) => m.id === messageId)
      const forkedMessages = messages.slice(0, messageIndex + 1)
      forkNodeAtMessage(nodeId, forkedMessages)
    },
    [forkNodeAtMessage, messages, nodeId],
  )

  if (!currentCanvas) {
    return null
  }

  return (
    <>
      {messages
        .filter((x) => !x.hidden)
        .map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            handleHighlightHover={handleHighlightHover}
            onRetry={() => retryMessage(currentCanvas.id, nodeId, message.id)}
            onFork={() => handleFork(message.id)}
          />
        ))}
    </>
  )
}

const MemoizedMarkdown = React.memo(
  ({
    children,
    handleHighlightHover,
  }: {
    children: React.ReactNode
    handleHighlightHover: (linkId: string, isHovering: boolean) => void
  }) => {
    const markdownComponents = useMemo(
      () => ({
        mark: ({ children }: { children: React.ReactNode }) => (
          <mark className="bg-yellow-200 hover:bg-yellow-400 cursor-pointer">
            {children}
          </mark>
        ),

        a: (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node: any },
        ) => {
          const { children, node: aNode, ...rest } = props
          const target = (aNode!.properties.href as string).slice(1)
          return (
            <span
              onMouseEnter={() => handleHighlightHover(target, true)}
              onMouseLeave={() => handleHighlightHover(target, false)}>
              <a {...rest}>{children}</a>
            </span>
          )
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code(
          props: React.HTMLAttributes<HTMLElement> & { className?: string },
        ) {
          const { children, className, ...rest } = props
          const match = /language-(\w+)/.exec(className || '')
          return match ? (
            <SyntaxHighlighter
              {...rest}
              PreTag="div"
              customStyle={{
                fontSize: '12px',
              }}
              children={String(children).replace(/\n$/, '')}
              language={match[1]}
              style={dark}
              wrapLines={true}
              wrapLongLines={true}
            />
          ) : (
            <code {...rest} className={className}>
              {children}
            </code>
          )
        },
      }),
      [handleHighlightHover],
    )

    return (
      <Markdown
        remarkPlugins={[
          remarkDirective,
          remarkMath,
          remarkGfm,
          highlightPlugin,
        ]}
        rehypePlugins={[rehypeKatex]}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        components={markdownComponents as any}
        className="markdown">
        {children as string}
      </Markdown>
    )
  },
)

const MessageItem = React.memo(
  ({
    message,
    handleHighlightHover,
    onRetry,
    onFork,
  }: {
    message: Message
    handleHighlightHover: (linkId: string, isHovering: boolean) => void
    onRetry: () => void
    onFork: () => void
  }) => {
    const [isHovering, setIsHovering] = useState(false)

    return (
      <div
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="relative">
        <div>
          <div className="flex justify-end">
            <div className="relative p-2 bg-blue-500 text-white rounded-lg">
              {message.prompt}
            </div>
          </div>
          <div className="p-2 mt-2">
            {message.error ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex flex-col gap-2">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline"> {message.error}</span>
                <button
                  onClick={onRetry}
                  className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                  Retry
                </button>
              </div>
            ) : (
              <MemoizedMarkdown handleHighlightHover={handleHighlightHover}>
                {message.response}
              </MemoizedMarkdown>
            )}
          </div>
          <div className="absolute bottom-2 right-2 z-10">
            <div className="group relative">
              <button
                onClick={onFork}
                className={`p-1 bg-white rounded-full shadow-md text-blue-500 hover:text-blue-700 transition-opacity duration-200 ${
                  isHovering ? 'opacity-100' : 'opacity-0'
                }`}>
                <Reply className="h-10 w-10" />
              </button>
              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Create a new chat node from this message
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
)
