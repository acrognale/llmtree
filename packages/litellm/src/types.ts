import { EmbeddingParams, EmbeddingResponse } from './embedding';

export type Role = 'system' | 'user' | 'assistant' | 'function' | 'tool';

export type SystemMessage = {
  role: 'system';
  content: string;
};

export type UserMessage = {
  role: 'user';
  content: string;
};

export type AssistantMessage = {
  role: 'assistant';
  content?: string;
  refusal?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
};

export type ToolMessage = {
  role: 'tool';
  content: string;
  tool_call_id: string;
};

export type Message =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage;

export type FinishReason =
  | 'stop'
  | 'length'
  | 'tool_calls'
  | 'content_filter'
  | 'function_call'
  | null;

interface FunctionDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  strict?: boolean;
}

export interface Tool {
  type: 'function';
  function: FunctionDefinition;
}

export interface ToolCall {
  arguments?: string;
  name?: string;
}

export interface StreamingToolCall {
  index: number;
  id?: string;
  function?: ToolCall;
  type?: 'function';
}

export interface ConsistentResponseChoice {
  finish_reason: FinishReason | null;
  index: number;
  message: Message;
}

export interface ConsistentResponseStreamingChoice
  extends Omit<ConsistentResponseChoice, 'message'> {
  delta: {
    content: string | null;
    tool_calls?: Array<StreamingToolCall>;
    role: Role;
    refusal?: string;
  };
}

export interface ConsistentResponseUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ConsistentResponse {
  choices: ConsistentResponseChoice[];
  model?: string;
  created?: number;
  usage?: ConsistentResponseUsage;
}

export type ResultNotStreaming = ConsistentResponse;

export interface StreamingChunk extends Omit<ConsistentResponse, 'choices'> {
  choices: ConsistentResponseStreamingChoice[];
}

export type ResultStreaming = AsyncIterable<StreamingChunk>;

export type Result = ResultNotStreaming | ResultStreaming;

export type AvailableProviders =
  | 'openai'
  | 'anthropic'
  | 'cohere'
  | 'ollama'
  | 'ai21'
  | 'replicate'
  | 'deepinfra'
  | 'mistral'
  | 'google'
  | 'groq'
  | 'customOpenAI'
  | `customOpenAI_${string}`;

export type AvailableEmbeddingsProviders = 'openai' | 'ollama' | 'mistral';

export interface HandlerParamsBase {
  provider: AvailableProviders;
  model: string;
  messages: Message[];
  stream?: boolean | null;
  baseUrl?: string;
  temperature?: number | null;
  top_p?: number | null;
  stop?: string | null | string[];
  presence_penalty?: number | null;
  n?: number | null;
  max_tokens?: number | null;
  apiKey?: string;
  tools?: Tool[];
  tool_choice?:
    | 'none'
    | 'auto'
    | { type: 'function'; function: { name: string } };
  system?: string;
}

export interface HandlerParamsStreaming extends HandlerParamsBase {
  stream?: true;
}

export interface HandlerParamsNotStreaming extends HandlerParamsBase {
  stream?: false;
}

export type HandlerParams = HandlerParamsStreaming | HandlerParamsNotStreaming;

export type Handler = (params: HandlerParams) => Promise<Result>;
export type EmbeddingHandler = (
  params: EmbeddingParams,
) => Promise<EmbeddingResponse>;
