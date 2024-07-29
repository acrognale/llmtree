import { createOpenAICompatibleHandler } from './genericOpenai';

export const OpenAIHandler = createOpenAICompatibleHandler({
  defaultApiKeyEnvVar: 'OPENAI_API_KEY',
  defaultBaseUrl: 'https://api.openai.com/v1',
});
