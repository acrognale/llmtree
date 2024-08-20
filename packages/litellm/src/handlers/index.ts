import type { AvailableProviders, Handler } from '../types';

import { AI21Handler } from './ai21';
import { AnthropicHandler } from './anthropic';
import { CohereHandler } from './cohere';
import { DeepInfraHandler } from './deepinfra';
import { GeminiHandler } from './gemini';
import { GenericOpenAIHandler } from './genericOpenai';
import { GroqHandler } from './groq';
import { MistralHandler } from './mistral';
import { OllamaHandler } from './ollama';
import { OpenAIHandler } from './openai';
import { ReplicateHandler } from './replicate';

export const PROVIDER_HANDLER_MAPPINGS: Record<AvailableProviders, Handler> = {
  anthropic: AnthropicHandler,
  openai: OpenAIHandler,
  cohere: CohereHandler,
  ollama: OllamaHandler,
  ai21: AI21Handler,
  replicate: ReplicateHandler,
  deepinfra: DeepInfraHandler,
  mistral: MistralHandler,
  google: GeminiHandler,
  groq: GroqHandler,
  customOpenAI: GenericOpenAIHandler,
};

export function getHandler(provider: AvailableProviders): Handler {
  if (provider.startsWith('customOpenAI')) {
    return GenericOpenAIHandler;
  }
  return PROVIDER_HANDLER_MAPPINGS[provider];
}
