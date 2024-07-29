export async function* receiveCompletion(
  response: Response
): AsyncGenerator<string> {
  if (!response.body) {
    console.error('Response body is null')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') {
          // Stream finished
          break
        }
        try {
          const parsed = JSON.parse(data)
          yield parsed.content
        } catch (e) {
          console.error('Error parsing JSON:', e)
        }
      }
    }
  }
}
