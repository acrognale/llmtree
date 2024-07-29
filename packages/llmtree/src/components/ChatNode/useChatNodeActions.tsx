import { useContext } from 'react'

import { ChatNodeActionContext } from '@/components/ChatNode/ChatNodeContext'

export const useChatNodeActions = () => {
  return useContext(ChatNodeActionContext)
}
