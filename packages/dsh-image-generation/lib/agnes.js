// Agnes AI (https://platform.agnes-ai.cn) serves image and video models behind
// one OpenAI-compatible gateway. Checked against the official docs on
// 2026-11-02 (https://wiki.agnes-ai.cn, mirror of https://wiki.agnes-ai.com):
// - Base URL: China site https://api.agnes-ai.cn/v1, international site
//   https://apihub.agnes-ai.com/v1; `Authorization: Bearer <key>`.
// - Images: POST /v1/images/generations with `size` as a 1K/2K/3K/4K tier plus
//   `ratio`; `return_base64: true` returns `data[0].b64_json` for text-to-image
//   (a top-level `response_format` is rejected).
// - Video: POST /v1/videos with `mode: "text"`, `seconds` as a string "4"-"12",
//   `size` 720P/1080P/2K and `aspect_ratio`; the response's `video_id` is polled
//   at GET <host>/agnesapi?video_id=&model_name= (outside /v1) until `status` is
//   `completed` (top-level `url`) or `failed`.
import { HTTP_ERRORS, ImageError, readBounded, safeError } from './errors.js'
import { download } from './download.js'
import { imageSizeFields, videoChoice } from './options.js'

export const AGNES_DEFAULT_BASE = 'https://api.agnes-ai.cn/v1'
export const AGNES_DEFAULT_IMAGE_MODEL = 'agnes-image-2.5-flash'
export const AGNES_DEFAULT_VIDEO_MODEL = 'agnes-video-2.5'
export const AGNES_IMAGE_MODELS = Object.freeze(['agnes-image-2.5-flash', 'agnes-image-2.1-flash', 'agnes-image-2.0-flash'])
export const AGNES_VIDEO_MODELS = Object.freeze(['agnes-video-2.5', 'agnes-video-2.5-flash'])
const MAX_VIDEO_BYTES = 200 * 1024 * 1024
const VIDEO_DEADLINE_MS = 840_000

function rejected(response) {
  const [code, message] = HTTP_ERRORS[response.status] ?? [response.status === 400 || response.status === 422 ? 'PARAMETERS' : 'PROVIDER_ERROR',
    response.status === 400 || response.status === 422 ? 'The provider rejected the request parameters.' : 'The provider could not complete the request.']
  return Object.assign(new ImageError(code, `${message} (HTTP ${response.status})`, 502), { providerStatus: response.status })
}

/** One authenticated JSON call. Error bodies are read and dropped: they can echo the prompt. */
async function request(url, key, { method = 'GET', body, signal, maxBytes = 1024 * 1024, fetchImpl = fetch } = {}) {
  try {
    const response = await fetchImpl(url, {
      method, redirect: 'error', signal,
      headers: { Authorization: `Bearer ${key}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (!response.ok) {
      await readBounded(response, 64 * 1024, signal).catch(() => signal?.throwIfAborted())
      throw rejected(response)
    }
    const text = (await readBounded(response, maxBytes, signal)).toString('utf8')
    try { return JSON.parse(text) } catch { throw new ImageError('RESPONSE', 'The provider returned invalid JSON.', 502) }
  } catch (error) { throw safeError(error) }
}

/** The task route lives at the host root, beside /v1. */
const hostRoot = baseUrl => baseUrl.replace(/\/v1$/u, '')

/**
 * The image request body for one choice (see options.js). It goes out on the
 * shared Images API path in provider.js, which also reads a URL answer.
 */
export function agnesImageBody(spec, prompt, choice) {
  return { model: spec.model, prompt, ...imageSizeFields('agnes', spec.model, choice), return_base64: true }
}

/** The clip request body; ratio, resolution and length are checked before submission. */
export function agnesVideoBody(spec, prompt, ratio, duration) {
  const choice = videoChoice('agnes', spec, ratio, duration)
  return {
    model: spec.videoModel, prompt, mode: 'text',
    // The API takes the length as a string.
    seconds: String(choice.seconds), size: choice.resolution, aspect_ratio: choice.ratio,
  }
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted()
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve() }, ms)
    const abort = () => { clearTimeout(timer); reject(signal.reason) }
    signal?.addEventListener('abort', abort, { once: true })
  })
}

/** Create one text-to-video task, poll it to completion and download the MP4. */
export async function agnesVideo(spec, key, prompt, { ratio, duration }, options = {}) {
  const body = agnesVideoBody(spec, prompt, ratio, duration)
  const signal = AbortSignal.any([AbortSignal.timeout(VIDEO_DEADLINE_MS), ...(options.signal ? [options.signal] : [])])
  try {
    const created = await request(`${spec.baseUrl}/videos`, key, { ...options, method: 'POST', body, signal })
    const id = created?.video_id
    if (typeof id !== 'string' || !id) throw new ImageError('RESPONSE', 'The provider returned no video id.', 502)
    const poll = `${hostRoot(spec.baseUrl)}/agnesapi?video_id=${encodeURIComponent(id)}&model_name=${encodeURIComponent(spec.videoModel)}`
    let task = created
    for (let attempt = 0; task?.status !== 'completed'; attempt++) {
      if (task?.status === 'failed') throw new ImageError('PROVIDER_ERROR', 'The provider could not complete the generation. Try again.', 502)
      // The docs poll every 1-2 s; back off to 5 s during a long render.
      await wait(Math.min(5000, 1000 * 1.5 ** attempt), signal)
      try {
        task = await request(poll, key, { ...options, signal })
      } catch (error) {
        // A task can be briefly unknown right after creation.
        if (error.providerStatus === 404 && attempt < 5) continue
        throw error
      }
    }
    return await download(task.url, MAX_VIDEO_BYTES, options)
  } catch (error) { throw safeError(error) }
}

/**
 * The key's visible models, which also proves the key: the China gateway
 * refuses a bad key with 401. The international gateway lists models for any
 * key, so validation also reads the selected model.
 */
export async function agnesModels(spec, key, options = {}) {
  const signal = AbortSignal.any([AbortSignal.timeout(15_000), ...(options.signal ? [options.signal] : [])])
  const result = await request(`${spec.baseUrl}/models`, key, { ...options, signal })
  if (!Array.isArray(result?.data)) throw new ImageError('RESPONSE', 'The provider returned an invalid model list.', 502)
  const ids = result.data.map(model => model?.id).filter(id => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/u.test(id))
  return { models: ids.filter(id => id.includes('image')), videoModels: ids.filter(id => id.includes('video')) }
}

/** One non-generating check: GET /models/{model} needs a valid key on both gateways. */
export async function agnesValidate(spec, key, options = {}) {
  const signal = AbortSignal.any([AbortSignal.timeout(15_000), ...(options.signal ? [options.signal] : [])])
  const result = await request(`${spec.baseUrl}/models/${encodeURIComponent(spec.model)}`, key, { ...options, signal })
  if (result?.id !== spec.model) throw new ImageError('MODEL', 'The requested model was not returned by the provider.')
  return 'model'
}
