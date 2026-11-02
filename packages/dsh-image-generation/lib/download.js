// Result files that providers return as short-lived signed links (GrsAI media,
// Agnes video, URL output from OpenAI-compatible services).
import { ImageError, readBounded, safeError } from './errors.js'

export const secure = url => url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))

/** Download a result file (no credentials; the URL is a short-lived signed link). */
export async function download(link, maxBytes, options = {}) {
  let url
  try { url = new URL(String(link)) } catch { throw new ImageError('RESPONSE', 'The provider returned no result file.', 502) }
  if (!secure(url)) throw new ImageError('RESPONSE', 'The provider returned an insecure result link.', 502)
  const signal = AbortSignal.any([AbortSignal.timeout(120_000), ...(options.signal ? [options.signal] : [])])
  try {
    // Result links may hop through a CDN redirect; the file must still arrive over HTTPS.
    const response = await (options.fetchImpl ?? fetch)(url.href, { signal })
    if (response.url && !secure(new URL(response.url))) throw new ImageError('RESPONSE', 'The provider returned an insecure result link.', 502)
    if (!response.ok) throw new ImageError('RESPONSE', `The result file could not be downloaded. (HTTP ${response.status})`, 502)
    return await readBounded(response, maxBytes, signal)
  } catch (error) { throw safeError(error) }
}
