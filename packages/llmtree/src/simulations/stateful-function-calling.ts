import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config({
  path: '../../.env',
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  name?: string
  tool_call_id?: string
}

interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface Tool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: {
        [key: string]: any
      }
      required: string[]
    }
  }
}

class ConversationSimulator {
  private messages: Message[] = []
  private nodes: Record<string, string> = {}
  private tools: Tool[] = [
    {
      type: 'function',
      function: {
        name: 'addNode',
        description: 'Add a node to the graph with the given content.',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string' },
          },
          required: ['content'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'setActiveNode',
        description: 'Set the active node for the conversation',
        parameters: {
          type: 'object',
          properties: {
            nodeId: { type: 'string' },
          },
          required: ['nodeId'],
        },
      },
    },
  ]

  private activeNode = 'root'

  constructor() {
    this.nodes = {
      root: '',
    }
  }

  private async getCompletion(): Promise<OpenAI.Chat.ChatCompletion> {
    return await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that can create and navigate between conversation nodes.

            ${
              Object.keys(this.nodes).length > 0
                ? 'You have the following nodes in your graph:'
                : 'Only the root node is on the graph.'
            }

            You are currently on node ${this.activeNode}

            ${
              Object.keys(this.nodes).length > 0 &&
              Object.keys(this.nodes)
                .map((nodeId) => {
                  return `Node ID: ${nodeId}, Content: ${this.nodes[
                    nodeId
                  ].slice(0, 20)}...`
                })
                .join('\n')
            }
            `,
        },
        ...this.messages,
      ],
      tools: this.tools,
      tool_choice: 'auto',
    })
  }

  private handleToolCalls(toolCalls: ToolCall[]): void {
    for (const call of toolCalls) {
      const args = JSON.parse(call.function.arguments)
      if (call.function.name === 'addNode') {
        const nodeId = `node_${Date.now()}`
        console.log(`Added new node: ${nodeId} with content: ${args.content}`)
        this.nodes[nodeId] = args.content
      } else if (call.function.name === 'setActiveNode') {
        console.log(`Set active node to: ${args.nodeId}`)
        this.activeNode = args.nodeId
      }

      this.messages.push({
        role: 'tool',
        content: 'Tool call executed successfully',
        name: call.function.name,
        tool_call_id: call.id,
      })
    }
  }

  public async simulateConversation(userInput: string) {
    console.log('User: ', userInput)
    this.messages.push({ role: 'user', content: userInput })

    const completion = await this.getCompletion(userInput)
    const assistantMessage = completion.choices[0].message

    if (assistantMessage.tool_calls) {
      this.messages.push({
        role: 'assistant',
        content: assistantMessage.content || '',
        tool_calls: assistantMessage.tool_calls,
      })

      this.handleToolCalls(assistantMessage.tool_calls)

      // Get a follow-up completion after tool calls
      const followUpCompletion = await this.getCompletion(userInput)
      const followUpMessage = followUpCompletion.choices[0].message
      this.messages.push({
        role: 'assistant',
        content: followUpMessage.content || '',
      })
    } else {
      this.messages.push({
        role: 'assistant',
        content: assistantMessage.content || '',
      })
    }

    console.log('Assistant:', assistantMessage.content)
    // console.log('Current message history:', this.messages)
  }
}

// Usage
async function runSimulation() {
  const simulator = new ConversationSimulator()

  await simulator.simulateConversation(
    "Let's discuss the benefits of exercise.",
  )
  await simulator.simulateConversation(
    'Can you create a new node for cardiovascular benefits?',
  )
  await simulator.simulateConversation(
    "Now, let's go back to the main topic and discuss mental health benefits.",
  )
}

runSimulation().catch(console.error)
