import OpenAI from 'openai';
import { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';

import {
  HandlerParams,
  ResultStreaming,
  ResultNotStreaming,
  Tool,
} from '../types';

interface HandlerConfig {
  defaultApiKeyEnvVar: string;
  defaultBaseUrl: string;
}

function toChatCompletionCreateParamsBase(
  params: Omit<HandlerParams, 'provider' | 'system'>,
): ChatCompletionCreateParamsBase {
  const result: ChatCompletionCreateParamsBase = {
    ...params,
  };

  if (params.tools) {
    result.tools = params.tools as Tool[];
  }

  return result;
}

export function createOpenAICompatibleHandler(config: HandlerConfig) {
  return async function handler(
    params: HandlerParams,
  ): Promise<ResultNotStreaming | ResultStreaming> {
    console.log(params);
    const {
      apiKey: providedApiKey,
      baseUrl: providedBaseUrl,
      ...completionsParams
    } = params;
    const apiKey = providedApiKey ?? process.env[config.defaultApiKeyEnvVar];
    const baseUrl = providedBaseUrl ?? config.defaultBaseUrl;

    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { provider, system, ...completionsParamsWithoutProvider } =
      completionsParams;

    if (params.system) {
      completionsParamsWithoutProvider.messages = [
        {
          role: 'system',
          content: params.system,
        },
        ...(completionsParams.messages || []),
      ];
    }

    // Add tools and tool_choice to the request if provided
    if (params.tools) {
      completionsParamsWithoutProvider.tools = params.tools as Tool[];
    }
    if (params.tool_choice) {
      completionsParamsWithoutProvider.tool_choice = params.tool_choice;
    }

    if (params.stream) {
      return await client.chat.completions.create({
        ...toChatCompletionCreateParamsBase(completionsParamsWithoutProvider),
        stream: true,
      });
    }

    return await client.chat.completions.create({
      ...toChatCompletionCreateParamsBase(completionsParamsWithoutProvider),
      stream: false,
    });
  };
}

export const GenericOpenAIHandler = createOpenAICompatibleHandler({
  defaultApiKeyEnvVar: 'GENERIC_OPENAI_API_KEY',
  defaultBaseUrl: 'https://api.openai.com/v1',
});
