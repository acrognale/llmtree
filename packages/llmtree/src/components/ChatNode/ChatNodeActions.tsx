import { useState } from 'react'

import { ChatNodeActionContext } from '@/components/ChatNode/ChatNodeContext'
import { useStore } from '@/state/store'

export const ChatNodeActionProvider = ({
  children,
  id,
}: {
  children: React.ReactNode
  id: string
}) => {
  const [loading, setLoading] = useState(false)
  const actions = useStore((state) => state.actions)

  const fetchResponse = async (prompt: string) => {
    setLoading(true)
    await actions.fetchResponse(prompt, id)
    setLoading(false)
  }

  return (
    <ChatNodeActionContext.Provider value={{ loading, fetchResponse }}>
      {children}
    </ChatNodeActionContext.Provider>
  )
}
