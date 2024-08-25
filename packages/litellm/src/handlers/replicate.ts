import EventSource from 'eventsource';
import Replicate, { Prediction } from 'replicate';

import {
  HandlerParams,
  HandlerParamsNotStreaming,
  ResultStreaming,
  ResultNotStreaming,
  HandlerParamsStreaming,
} from '../types';
import { combinePrompts } from '../utils/combinePrompts';
import { getUnixTimestamp } from '../utils/getUnixTimestamp';
import { toUsage } from '../utils/toUsage';

async function sleep(time: number): Promise<unknown> {
  return new Promise((res) => {
    setTimeout(() => {
      res({});
    }, time);
  });
}

async function handleNonStreamingPrediction(
  prompt: string,
  prediction: Prediction,
  replicate: Replicate,
): Promise<ResultNotStreaming> {
  const pred = await replicate.wait(prediction, {});
  const output: string = (pred.output as string[]).reduce(
    (acc, curr) => (acc += curr),
    '',
  );
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    model: prediction.version,
    usage: toUsage(prompt, output),
    created: getUnixTimestamp(),
    choices: [
      {
        message: {
          role: 'assistant',
          content: output,
          refusal: null,
        },
        finish_reason: 'stop',
        index: 0,
      },
    ],
  };
}

export async function ReplicateHandler(
  params: HandlerParams,
): Promise<ResultNotStreaming | ResultStreaming> {
  const apiKey = params.apiKey ?? process.env.REPLICATE_API_KEY;
  const replicate = new Replicate({
    auth: apiKey,
  });
  const model = params.model.split('replicate/')[1];
  const version = model.split(':')[1];

  const prompt = combinePrompts(params.messages);
  const prediction = await replicate.predictions.create({
    version: version,
    stream: params.stream,
    input: {
      prompt,
    },
  });

  if (params.stream) {
    return handleStreamingPrediction(prompt, prediction);
  }
  return handleNonStreamingPrediction(prompt, prediction, replicate);
}

async function* handleStreamingPrediction(
  prompt: string,
  prediction: Prediction,
): ResultStreaming {
  if (!prediction?.urls?.stream) {
    throw new Error();
  }

  const source = new EventSource(prediction.urls.stream, {
    withCredentials: true,
  });

  let results: string[] = [];
  let done = false;

  // added comments because of funky conversion of EventSource to AsyncIterator - For context: https://stackoverflow.com/questions/51045136/how-can-i-use-a-event-emitter-as-an-async-generator
  // initialise a dummy promise - with a function called resolve in this scope set to its resolver
  let resolve: (a: unknown) => void;
  let promise = new Promise((r) => (resolve = r));

  source.addEventListener('output', (e) => {
    results.push(e.data as string);
    // resolve the previous promise
    resolve({});
    // override the promise - overide the resolve with the resolver of this promise
    promise = new Promise((r) => (resolve = r));
  });

  source.addEventListener('done', () => {
    done = true;
    source.close();
  });

  while (!done) {
    // await the last promise
    await promise;
    // sleep half a second - to avoid being throttled and rate limited by replicate
    await sleep(500);
    // flush the results since last yield
    const combined = results.reduce((acc, curr) => (acc += curr), '');
    yield {
      id: `chatcmpl-${Date.now()}`,
      model: params.model,
      object: 'chat.completion.chunk',
      created: getUnixTimestamp(),
      usage: toUsage(prompt, combined),
      choices: [
        {
          delta: {
            content: combined,
            role: 'assistant',
            refusal: null,
          },
          index: 0,
          finish_reason: 'stop',
        },
      ],
    };
    // reset the results
    results = [];
  }
}

export async function ReplicateHandler(
  params: HandlerParams,
): Promise<ResultNotStreaming | ResultStreaming> {
  const apiKey = params.apiKey ?? process.env.REPLICATE_API_KEY;
  const replicate = new Replicate({
    auth: apiKey,
  });
  const model = params.model.split('replicate/')[1];
  const version = model.split(':')[1];

  const prompt = combinePrompts(params.messages);
  const prediction = await replicate.predictions.create({
    version: version,
    stream: params.stream,
    input: {
      prompt,
    },
  });

  if (params.stream) {
    return handleStreamingPrediction(prompt, prediction);
  }
  return handleNonStreamingPrediction(prompt, prediction, replicate);
}
