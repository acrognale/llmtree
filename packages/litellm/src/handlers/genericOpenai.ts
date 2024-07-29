import OpenAI from 'openai';

import { HandlerParams, ResultStreaming, ResultNotStreaming } from '../types';

async function* toStreamingResponse(
  response: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>,
): ResultStreaming {
  for await (const chunk of response) {
    yield {
      model: chunk.model,
      created: chunk.created,
      choices: chunk.choices.map((choice) => ({
        delta: {
          content: choice.delta.content,
          role: choice.delta.role,
          function_call: choice.delta.function_call,
        },
        index: choice.index,
        finish_reason: choice.finish_reason,
      })),
    };
  }
}

interface HandlerConfig {
  defaultApiKeyEnvVar: string;
  defaultBaseUrl: string;
}

export function createOpenAICompatibleHandler(config: HandlerConfig) {
  return async function handler(
    params: HandlerParams,
  ): Promise<ResultNotStreaming | ResultStreaming> {
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

    if (params.stream) {
      const response = await client.chat.completions.create({
        ...completionsParamsWithoutProvider,
        stream: params.stream,
      });
      return toStreamingResponse(response);
    }

    return client.chat.completions.create({
      ...completionsParams,
      stream: false,
    });
  };
}
