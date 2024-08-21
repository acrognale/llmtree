import { completion } from '@llmtree/litellm'

// Define types for our completion parameters and results
type Message = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string
  tool_calls?: Array<{
    function: { name: string; arguments: string }
  }>
}

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
      content?: string
      tool_calls?: Array<{
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
  startCompletion(params: CompletionParams): AsyncIterator<CompletionResult>
}

// Implement the LiteLLMCompletionProvider class
export class LiteLLMCompletionProvider implements CompletionProvider {
  async *startCompletion(
    params: CompletionParams,
  ): AsyncIterator<CompletionResult> {
    const stream = await completion({
      ...params,
      stream: true,
    })

    for await (const chunk of stream) {
      yield chunk as CompletionResult
    }
  }
}

// Factory function to create a LiteLLMCompletionProvider
export function createLiteLLMCompletionProvider(): CompletionProvider {
  return new LiteLLMCompletionProvider()
}
