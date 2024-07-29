import { createOpenAICompatibleHandler } from './genericOpenai';

export const GroqHandler = createOpenAICompatibleHandler({
  defaultApiKeyEnvVar: 'GROQ_API_KEY',
  defaultBaseUrl: 'https://api.groq.com/openai/v1',
});
