// Shared by every provider module; provider.js re-exports these.

export class ImageError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status }
}

export function safeError(error) {
  if (error instanceof ImageError) return error
  if (error?.name === 'TimeoutError') return new ImageError('TIMEOUT', 'The image provider timed out. Save again to retry.', 504)
  if (error?.name === 'AbortError') return new ImageError('CANCELLED', 'Image operation cancelled.', 499)
  return new ImageError('UNAVAILABLE', 'The image service is unavailable. Check the connection and try again.', 502)
}

// Bound the stream before parsing; a Content-Length header alone is insufficient.
export async function readBounded(response, maxBytes, signal) {
  if (!response.body) throw new ImageError('RESPONSE', 'The provider returned an empty response.', 502)
  const reader = response.body.getReader()
  const chunks = []; let bytes = 0
  try {
    while (true) {
      signal?.throwIfAborted()
      const part = await reader.read()
      if (part.done) break
      bytes += part.value.byteLength
      if (bytes > maxBytes) throw new ImageError('TOO_LARGE', 'The provider response exceeds the size limit.', 502)
      chunks.push(part.value)
    }
    return Buffer.concat(chunks, bytes)
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}
