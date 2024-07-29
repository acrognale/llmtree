import { NodeProps } from 'reactflow'

import { ChatNode } from '@/components/ChatNode/ChatNode'
import { ChatNodeActionProvider } from '@/components/ChatNode/ChatNodeActions'
import { ChatNode as TChatNode } from '@/state/state'

export function ChatNodeContainer(props: NodeProps<TChatNode['data']>) {
  return (
    <ChatNodeActionProvider id={props.id}>
      <ChatNode {...props} />
    </ChatNodeActionProvider>
  )
}
