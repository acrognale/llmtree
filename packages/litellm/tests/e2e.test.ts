import { completion } from '../src';
import { ResultStreaming } from '../src/types';

const TIMEOUT = 30000;
const PROMPT = 'How are you today?';

/**
 * @group e2e
 */
describe('e2e', () => {
  describe('completion', () => {
    it.each`
      model
      ${'gemini-1.5-flash-latest'}
    `(
      'gets response from supported model $model',
      async ({ model }) => {
        const result = await completion({
          model: model as string,
          messages: [{ role: 'user', content: PROMPT }],
          stream: false,
        });
        expect(result).toBeTruthy();
        expect(result);
      },
      TIMEOUT,
    );

    it.each`
      model
      ${'gemini-1.5-flash-latest'}
    `(
      'gets streaming response from supported model $model',
      async ({ model }) => {
        const result: ResultStreaming = await completion({
          model: model as string,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: PROMPT },
          ],
          stream: true,
        });

        for await (const chunk of result) {
          expect(chunk.choices[0].delta.content).not.toBeNull();
        }
      },
      TIMEOUT,
    );
  });

  // describe('embedding', () => {
  //   it.each`
  //     model
  //     ${'text-embedding-ada-002'}
  //     ${'ollama/llama2'}
  //     ${'mistral/mistral-embed'}
  //   `(
  //     'returns embedding models for $model',
  //     async ({ model }) => {
  //       const result = await embedding({
  //         model: model as string,
  //         input: PROMPT,
  //       });

  //       expect(result.data.length).toBeGreaterThan(0);
  //     },
  //     TIMEOUT,
  //   );
  // });
});
