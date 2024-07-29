import { useEffect, useRef, useState, useCallback } from 'react'

import { useChatNodeActions } from '@/components/ChatNode/useChatNodeActions'

interface PromptInput {
  hasMessages: boolean
  selectedText: string | null
  onResize: (height: number) => void
}

export function PromptInput({
  hasMessages,
  selectedText,
  onResize,
}: PromptInput) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [prompt, setPrompt] = useState('')
  const { fetchResponse, loading } = useChatNodeActions()

  const handleChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLabel = evt.target.value
    setPrompt(newLabel)
  }

  const handleKeyDown = (evt: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (evt.key === 'Enter') {
      fetchResponse(prompt).then(() => {
        setPrompt('')
      })
    }
  }

  const handleResize = useCallback(() => {
    if (inputRef.current) {
      onResize(inputRef.current.scrollHeight)
    }
  }, [onResize])

  useEffect(() => {
    const resizeObserver = new ResizeObserver(handleResize)
    if (inputRef.current) {
      resizeObserver.observe(inputRef.current)
    }
    return () => resizeObserver.disconnect()
  }, [handleResize])

  useEffect(() => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus({ preventScroll: true })
      }
    }, 1)
  }, [])

  return (
    <div className="flex flex-col mb-2">
      {!hasMessages && selectedText && (
        <div className="mb-4 p-2 bg-gray-100 border-l-4 border-gray-300 text-sm italic">
          {selectedText}
        </div>
      )}
      <div className="flex items-center">
        <div className="cursor-move chat-node-drag-handle mr-2">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-600">
            <path
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1"
              d="M15 5h2V3h-2v2zM7 5h2V3H7v2zm8 8h2v-2h-2v2zm-8 0h2v-2H7v2zm8 8h2v-2h-2v2zm-8 0h2v-2H7v2z"
            />
          </svg>
        </div>
        <div className="flex-1 relative">
          <textarea
            value={prompt}
            placeholder="Type your message..."
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && prompt.trim() !== '') {
                handleKeyDown(e)
              }
            }}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-300"
            ref={inputRef}
            disabled={loading}
            onInput={handleResize}
            style={{ resize: 'vertical', minHeight: '38px' }}
          />
          {loading && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
