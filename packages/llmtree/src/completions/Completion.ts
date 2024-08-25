export type CompletionStatus = {
  controller: AbortController
  isDone: boolean
  error: Error | null
  usage?: {
    totalInputTokens: number
    totalOutputTokens: number
  }
}

export type CompletionId = string | number
