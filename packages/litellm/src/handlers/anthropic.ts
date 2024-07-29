import Anthropic from '@anthropic-ai/sdk';
import { MessageCreateParams } from '@anthropic-ai/sdk/resources';

import {
  HandlerParams,
  HandlerParamsNotStreaming,
  ResultStreaming,
  ResultNotStreaming,
  HandlerParamsStreaming,
  StreamingChunk,
  FinishReason,
} from '../types';
import { getUnixTimestamp } from '../utils/getUnixTimestamp';

function toFinishReson(string: string): FinishReason {
  if (string === 'max_tokens') {
    return 'length';
  }

  return 'stop';
}

function toResponse(anthropicResponse: Anthropic.Message): ResultNotStreaming {
  return {
    model: anthropicResponse.model,
    created: getUnixTimestamp(),
    usage: {
      prompt_tokens: anthropicResponse.usage.input_tokens,
      completion_tokens: anthropicResponse.usage.output_tokens,
      total_tokens:
        anthropicResponse.usage.input_tokens +
        anthropicResponse.usage.output_tokens,
    },
    choices: [
      {
        message: {
          content:
            anthropicResponse.content[0].type === 'text'
              ? anthropicResponse.content[0].text
              : null,
          role: 'assistant',
        },
        finish_reason: anthropicResponse.stop_reason
          ? toFinishReson(anthropicResponse.stop_reason)
          : null,
        index: 0,
      },
    ],
  };
}

function toStreamingChunk(
  model: string,
  anthropicResponse: Anthropic.MessageStreamEvent,
): StreamingChunk | null {
  if (anthropicResponse.type === 'content_block_delta') {
    return {
      model,
      created: getUnixTimestamp(),
      choices: [
        {
          delta: {
            content:
              anthropicResponse.delta.type === 'text_delta'
                ? anthropicResponse.delta.text
                : null,
            role: 'assistant',
          },
          finish_reason: null,
          index: 0,
        },
      ],
    };
  }
  return null;
}

function toAnthropicParams(params: HandlerParams): MessageCreateParams {
  return {
    max_tokens: params.max_tokens ?? 4096,
    messages: params.messages.map((msg) => ({
      role: msg.role as 'assistant' | 'user',
      content: msg.content as string,
    })),
    system: params.system,
    model: params.model,
  };
}

async function* toStreamingResponse(
  model: string,
  stream: AsyncIterable<Anthropic.MessageStreamEvent>,
): ResultStreaming {
  for await (const chunk of stream) {
    const streamingChunk = toStreamingChunk(model, chunk);
    if (streamingChunk) {
      yield streamingChunk;
    }
  }
}

export async function AnthropicHandler(
  params: HandlerParamsNotStreaming,
): Promise<ResultNotStreaming>;

export async function AnthropicHandler(
  params: HandlerParamsStreaming,
): Promise<ResultStreaming>;

export async function AnthropicHandler(
  params: HandlerParams,
): Promise<ResultNotStreaming | ResultStreaming>;

export async function AnthropicHandler(
  params: HandlerParams,
): Promise<ResultNotStreaming | ResultStreaming> {
  const apiKey = params.apiKey ?? process.env.ANTHROPIC_API_KEY;

  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  const anthropicMessages = params.messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const anthropicParams = toAnthropicParams({
    ...params,
    messages: anthropicMessages,
  });

  if (params.stream) {
    const messageStream = await anthropic.messages.create({
      ...anthropicParams,
      stream: true,
    });
    return toStreamingResponse(params.model, messageStream);
  }

  const message = await anthropic.messages.create(anthropicParams);

  return toResponse(message as Anthropic.Message);
}
