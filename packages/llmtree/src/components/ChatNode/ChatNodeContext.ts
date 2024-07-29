import { createContext } from 'react'

interface ChatNodeActions {
  fetchResponse: (prompt: string) => Promise<void>
  loading: boolean
}

export const ChatNodeActionContext = createContext<ChatNodeActions>({
  fetchResponse: () => Promise.resolve(),
  loading: false,
})
