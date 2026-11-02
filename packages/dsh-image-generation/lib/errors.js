// Shared by every provider module; provider.js re-exports these.

/** HTTP status → error code and message, shared by every provider's request helper. */
export const HTTP_ERRORS = Object.freeze({
  401: ['AUTH', 'The API key is invalid or expired.'],
  402: ['QUOTA', 'The provider balance or quota is insufficient.'],
  403: ['PERMISSION', 'This API key lacks access to the model.'],
  404: ['MODEL', 'The model or API endpoint is unavailable.'],
  429: ['QUOTA', 'The provider quota or rate limit has been reached.'],
})

export class ImageError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status }
}

export function safeError(error) {
  if (error instanceof ImageError) return error
  if (error?.name === 'TimeoutError') return new ImageError('TIMEOUT', 'The image provider timed out. Save again to retry.', 504)
  if (error?.name === 'AbortError') return new ImageError('CANCELLED', 'Image operation cancelled.', 499)
  return new ImageError('UNAVAILABLE', 'The image service is unavailable. Check the connection and try again.', 502)
}

/**
 * A provider's short business message ("apikey不存在") that the settings card
 * may show as the reason. Anything long, markup-like, link-bearing or echoing
 * a secret stays in the Host.
 */
export function providerDetail(message, secrets = []) {
  if (typeof message !== 'string') return undefined
  const text = message.trim()
  if (!text || text.length > 120 || /[\x00-\x1f\x7f<>]|https?:|www\./iu.test(text)) return undefined
  if (secrets.some(secret => secret && (text.includes(secret) || (secret.length > 8 && text.includes(secret.slice(-8)))))) return undefined
  return text
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
