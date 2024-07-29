import { CompletionUsage } from 'openai/resources';

import { MistralEmbeddingHandler } from './handlers/mistralEmbedding';
import { OllamaEmbeddingHandler } from './handlers/ollamaEmbedding';
import { OpenAIEmbeddingHandler } from './handlers/openaiEmbedding';
import { AvailableEmbeddingsProviders, EmbeddingHandler } from './types';

export interface EmbeddingParams {
  provider: AvailableEmbeddingsProviders;
  input: string | string[];
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface EmbeddingObject {
  embedding: number[];
  index: number;
}

export interface EmbeddingResponse {
  usage?: Pick<CompletionUsage, 'prompt_tokens' | 'total_tokens'>;
  model: string;
  data: EmbeddingObject[];
}

const EMBEDDING_PROVIDER_HANDLER_MAPPINGS: Record<
  AvailableEmbeddingsProviders,
  EmbeddingHandler
> = {
  openai: OpenAIEmbeddingHandler,
  ollama: OllamaEmbeddingHandler,
  mistral: MistralEmbeddingHandler,
};

export async function embedding(
  params: EmbeddingParams,
): Promise<EmbeddingResponse> {
  const handler = EMBEDDING_PROVIDER_HANDLER_MAPPINGS[params.provider];

  if (!handler) {
    throw new Error(
      `Model: ${params.model} not supported. Cannot find a handler.`,
    );
  }

  return handler(params);
}
