/**
 * Reads a ReadableStream of NDJSON (Newline Delimited JSON) and invokes a callback for each parsed chunk.
 *
 * @param reader The stream reader from apiStream()
 * @param onChunk Callback function to handle each parsed JSON object
 */
export async function readNdjsonStream<T>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (chunk: T) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Handle NDJSON (Newline Delimited JSON)
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const chunk: T = JSON.parse(line);
            onChunk(chunk);
          } catch (parseError) {
            console.error("Failed to parse chunk", parseError);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
