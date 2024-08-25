import { OpenAI } from 'openai';

import { EmbeddingParams, EmbeddingResponse } from './embedding';

export type Role = 'system' | 'user' | 'assistant' | 'function' | 'tool';

export type SystemMessage = OpenAI.ChatCompletionSystemMessageParam;
export type UserMessage = OpenAI.ChatCompletionUserMessageParam;
export type AssistantMessage = OpenAI.ChatCompletionAssistantMessageParam;
export type ToolMessage = OpenAI.ChatCompletionToolMessageParam;
export type Message = OpenAI.ChatCompletionMessageParam;

export type FinishReason = OpenAI.ChatCompletion.Choice['finish_reason'];

export type FunctionDefinition =
  OpenAI.ChatCompletionMessageToolCall['function'];

export type Tool = OpenAI.ChatCompletionNamedToolChoice;

export type ToolCall =
  OpenAI.ChatCompletionChunk.Choice.Delta.ToolCall.Function;

export type StreamingToolCall =
  OpenAI.ChatCompletionChunk.Choice.Delta.ToolCall;

export type ConsistentResponseChoice = Omit<OpenAI.ChatCompletion.Choice, 'logprobs'>;

export type ConsistentResponseStreamingChoice =
  OpenAI.ChatCompletionChunk.Choice;

export type ConsistentResponseUsage = OpenAI.CompletionUsage;

export type ConsistentResponse = Omit<OpenAI.ChatCompletion, 'choices'> & {
  choices: ConsistentResponseChoice[];
};

export type ResultNotStreaming = ConsistentResponse;

export type StreamingChunk = Omit<OpenAI.ChatCompletionChunk, 'choices'> & {
  choices: ConsistentResponseStreamingChoice[];
};

export type ResultStreaming = AsyncIterable<StreamingChunk>;

export type Result = ResultNotStreaming | ResultStreaming;

export interface ChatCompletionMessage extends Omit<OpenAI.ChatCompletionMessage, 'refusal'> {
  refusal?: string | null;
}

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
