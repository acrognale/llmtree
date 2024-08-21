export type CompletionStatus = {
  chunks: string[]
  isDone: boolean
  error: Error | null
  usage?: {
    totalInputTokens: number
    totalOutputTokens: number
  }
}
