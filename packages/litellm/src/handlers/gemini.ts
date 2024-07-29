import {
  EnhancedGenerateContentResponse,
  GoogleGenerativeAI,
  ModelParams,
  StartChatParams,
} from '@google/generative-ai';

import {
  HandlerParams,
  HandlerParamsNotStreaming,
  HandlerParamsStreaming,
  ResultNotStreaming,
  ResultStreaming,
  FinishReason,
} from '../types';

function mapFinishReason(geminiReason: string | undefined): FinishReason {
  switch (geminiReason) {
    case 'STOP':
      return 'stop';
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
    case 'RECITATION':
      return 'content_filter';
    default:
      return 'stop';
  }
}

async function* toStreamingResponse(
  response: AsyncIterable<EnhancedGenerateContentResponse>,
): ResultStreaming {
  for await (const chunk of response) {
    yield {
      model: chunk.candidates?.[0]?.content?.role ?? 'model',
      created: Date.now(),
      choices: [
        {
          delta: {
            content: chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
            role: chunk.candidates?.[0]?.content?.role ?? 'model',
          },
          index: 0,
          finish_reason: mapFinishReason(chunk.candidates?.[0]?.finishReason),
        },
      ],
    };
  }
}

function toGeminiParams(params: HandlerParams): StartChatParams & ModelParams {
  const messages = params.messages.map((msg) => ({
    role: msg.role as string,
    parts: [{ text: msg.content ?? '' }],
  }));

  messages.forEach((msg) => {
    if (msg.role === 'assistant') {
      msg.role = 'model';
    }
  });

  return {
    generationConfig: {
      temperature: params.temperature ?? undefined,
      topP: params.top_p ?? undefined,
      maxOutputTokens: params.max_tokens ?? undefined,
    },
    systemInstruction: params.system,
    history: messages,
    model: params.model,
  };
}

export async function GeminiHandler(
  params: HandlerParamsNotStreaming,
): Promise<ResultNotStreaming>;

export async function GeminiHandler(
  params: HandlerParamsStreaming,
): Promise<ResultStreaming>;

export async function GeminiHandler(
  params: HandlerParams,
): Promise<ResultNotStreaming | ResultStreaming>;

export async function GeminiHandler(
  params: HandlerParams,
): Promise<ResultNotStreaming | ResultStreaming> {
  const { apiKey: providedApiKey, ...completionsParams } = params;
  const apiKey = providedApiKey ?? process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('No API key provided');
  }

  const geminiParams = toGeminiParams(params);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: params.model,
    systemInstruction: geminiParams.systemInstruction ?? undefined,
  });

  const chat = model.startChat({
    history: geminiParams.history,
    generationConfig: geminiParams.generationConfig,
  });

  const lastMessage =
    completionsParams.messages[completionsParams.messages.length - 1];

  if (!lastMessage.content) {
    throw new Error('No content provided');
  }

  if (params.stream) {
    try {
      const response = await chat.sendMessageStream(lastMessage.content);
      return toStreamingResponse(response.stream);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  const response = await chat.sendMessage(lastMessage.content);

  return {
    model: params.model,
    created: Date.now(),
    choices: [
      {
        index: 0,
        message: {
          role: 'model',
          content: response.response.text(),
        },
        finish_reason:
          mapFinishReason(response.response.candidates?.[0]?.finishReason) ??
          'stop',
      },
    ],
  };
}
