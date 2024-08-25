import { completion } from '@llmtree/litellm'
import { Message, ResultStreaming } from '@llmtree/litellm/src/types'

export type CompletionParams = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any
  apiKey: string
  baseUrl?: string
  model: string
  system?: string
  messages: Message[]
  tools?: Array<{
    type: 'function'
    function: {
      name: string
      description: string
      parameters: {
        type: 'object'
        properties: Record<string, unknown>
        required: string[]
      }
    }
  }>
}

export type CompletionResult = {
  choices: Array<{
    delta: {
      content?: string | null
      tool_calls?: Array<{
        index?: number
        id: string
        type: string
        function: { name: string; arguments: string }
      }>
    }
  }>
  usage?: {
    completion_tokens: number
  }
}

// Define the CompletionProvider interface
export interface CompletionProvider {
  startCompletion(params: CompletionParams): Promise<ResultStreaming>
}

// Implement the LiteLLMCompletionProvider class
export class LiteLLMCompletionProvider implements CompletionProvider {
  async startCompletion(params: CompletionParams): Promise<ResultStreaming> {
    console.log('[LiteLLMCompletionProvider] Starting completion', params)
    return await completion({
      ...params,
      stream: true,
    })
  }
}

// Factory function to create a LiteLLMCompletionProvider
export function createLiteLLMCompletionProvider(): CompletionProvider {
  return new LiteLLMCompletionProvider()
}
