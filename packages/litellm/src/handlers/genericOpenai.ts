import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';

import {
  HandlerParams,
  ResultStreaming,
  ResultNotStreaming,
  ConsistentResponseChoice,
  ConsistentResponseStreamingChoice,
  Message,
  Tool,
  ToolChoice,
} from '../types';

function toConsistentResponseChoice(
  choice: OpenAI.Chat.ChatCompletion.Choice,
): ConsistentResponseChoice {
  return {
    finish_reason: choice.finish_reason,
    index: choice.index,
    message: {
      role: choice.message.role,
      content: choice.message.content,
      tool_calls: choice.message.tool_calls,
    },
  };
}

function toConsistentResponseStreamingChoice(
  choice: OpenAI.Chat.ChatCompletionChunk.Choice,
): ConsistentResponseStreamingChoice {
  return {
    finish_reason: choice.finish_reason,
    index: choice.index,
    delta: {
      content: choice.delta.content as string,
      role: choice.delta.role as 'assistant' | 'system' | 'user' | 'tool',
      tool_calls: choice.delta.tool_calls,
    },
  };
}

async function* toStreamingResponse(
  response: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>,
): ResultStreaming {
  for await (const chunk of response) {
    yield {
      model: chunk.model,
      created: chunk.created,
      choices: chunk.choices.map(toConsistentResponseStreamingChoice),
    };
  }
}

interface HandlerConfig {
  defaultApiKeyEnvVar: string;
  defaultBaseUrl: string;
}

function toChatCompletionMessageParam(
  message: Message,
): ChatCompletionMessageParam {
  switch (message.role) {
    case 'system':
    case 'assistant':
    case 'user':
      return {
        role: message.role,
        content: message.content as string,
        tool_calls: message.tool_calls,
      };
    case 'tool':
      return {
        content: message.content as string,
        role: 'tool',
        tool_call_id: message.tool_call_id as string,
      };
  }

  throw new Error('Unsupported message role');
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
      completionsParamsWithoutProvider.tool_choice =
        params.tool_choice as ToolChoice;
    }

    console.log(
      toChatCompletionCreateParamsBase(completionsParamsWithoutProvider),
    );

    if (params.stream) {
      console.log('[genericOpenai] Creating openai completion');
      const response = await client.chat.completions.create({
        ...toChatCompletionCreateParamsBase(completionsParamsWithoutProvider),
        stream: true,
      });
      console.log('[genericOpenai] Returning streaming completion');
      return toStreamingResponse(response);
    }

    const response = await client.chat.completions.create({
      ...toChatCompletionCreateParamsBase(completionsParamsWithoutProvider),
      stream: false,
    });

    return {
      choices: response.choices.map(toConsistentResponseChoice),
      usage: response.usage,
    };
  };
}

export const GenericOpenAIHandler = createOpenAICompatibleHandler({
  defaultApiKeyEnvVar: 'GENERIC_OPENAI_API_KEY',
  defaultBaseUrl: 'https://api.openai.com/v1',
});
