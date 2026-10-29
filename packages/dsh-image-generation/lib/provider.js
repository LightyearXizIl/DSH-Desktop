import { ImageError, readBounded, safeError } from './errors.js'
import {
  GRSAI_DEFAULT_BASE, GRSAI_DEFAULT_IMAGE_MODEL, GRSAI_DEFAULT_TEXT_MODEL, GRSAI_DEFAULT_VIDEO_MODEL,
  GRSAI_IMAGE_MODELS, GRSAI_TEXT_MODELS, GRSAI_VIDEO_MODELS,
  grsaiCatalog, grsaiImage, grsaiValidate,
} from './grsai.js'

export { ImageError, readBounded, safeError }

export const DEFAULTS = Object.freeze({
  bytedance: { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seedream-4-5-251128' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-image-1.5' },
  // The mainland direct host; the overseas host is https://grsaiapi.com.
  grsai: { baseUrl: GRSAI_DEFAULT_BASE, model: GRSAI_DEFAULT_IMAGE_MODEL, videoModel: GRSAI_DEFAULT_VIDEO_MODEL, textModel: GRSAI_DEFAULT_TEXT_MODEL },
})
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
// Models documented by Images API; text, legacy DALL-E and unknown adapters
// remain outside this tool's parameter contract.
const OPENAI_IMAGES = new Set(['gpt-image-2.5-sunburst', 'gpt-image-2.5-sunburst-2026-09-08', 'gpt-image-2.5-flare', 'gpt-image-2.5-flare-2026-09-08', 'gpt-image-2', 'gpt-image-2-2026-04-21', 'gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini'])
export const MODEL_CATALOG = Object.freeze({
  openai: { source: 'builtin', canFetch: true, models: [...OPENAI_IMAGES] },
  // Ark image model list, checked 2026-09-10:
  // https://docs.volcengine.com/docs/82379/1330310
  // Both 5.0 and 5.0 Lite IDs are explicitly supported by the provider.
  bytedance: { source: 'builtin', canFetch: false, models: [
    'doubao-seedream-5-0-pro-260628',
    'doubao-seedream-5-0-260128',
    'doubao-seedream-5-0-lite-260128',
    DEFAULTS.bytedance.model,
    'doubao-seedream-4-0-250828',
  ] },
  // GrsAI's documented image, video and text models; one key covers all three.
  // The shipped lists are the offline menu; the card refreshes them from GrsAI.
  grsai: { source: 'builtin', canFetch: true, models: [...GRSAI_IMAGE_MODELS], videoModels: [...GRSAI_VIDEO_MODELS], textModels: [...GRSAI_TEXT_MODELS] },
})

const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/

export function profile(provider, input = {}) {
  if (!Object.hasOwn(DEFAULTS, provider)) throw new ImageError('PROVIDER', 'Choose a supported image provider.')
  const model = String(input.model ?? DEFAULTS[provider].model).trim()
  if (!MODEL_ID.test(model)) throw new ImageError('MODEL', 'Enter a valid model ID.')
  let extra = {}
  if (provider === 'grsai') {
    const videoModel = String(input.videoModel ?? DEFAULTS.grsai.videoModel).trim()
    // Models GrsAI adds after this release come from its live catalog.
    if (!MODEL_ID.test(videoModel)) throw new ImageError('MODEL', 'Enter a valid video model ID.')
    // Any chat model id works on the OpenAI-compatible route; the list is a menu.
    const textModel = String(input.textModel ?? DEFAULTS.grsai.textModel).trim()
    if (!MODEL_ID.test(textModel)) throw new ImageError('MODEL', 'Enter a valid text model ID.')
    extra = { videoModel, textModel }
  }
  let url
  try { url = new URL(String(input.baseUrl ?? DEFAULTS[provider].baseUrl).trim()) } catch { throw new ImageError('ENDPOINT', 'Enter a valid API base URL.') }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) || url.username || url.password || url.search || url.hash) {
    throw new ImageError('ENDPOINT', 'Use an HTTPS API base URL without credentials, query parameters or fragments.')
  }
  // Provider consoles present the full REST endpoint; store one canonical base
  // for validation, model discovery and generation so the suffix appears once.
  url.pathname = provider === 'grsai'
    // GrsAI documents a bare host plus /v1/... routes.
    ? url.pathname.replace(/\/v1(?:\/.*)?$/, '')
    : url.pathname.replace(/\/images\/generations\/?$/, '')
  return { baseUrl: url.href.replace(/\/+$/, ''), model, ...extra }
}

const IMAGE_PARAMETERS = new Set(['model', 'prompt', 'size', 'response_format', 'output_format', 'quality', 'n', 'watermark', 'stream', 'sequential_image_generation', 'sequential_image_generation_options', 'image', 'background', 'moderation'])
// Keep actionable identifiers, rather than forwarding a provider's free-form
// message: an upstream error can echo credentials, prompts or a proxy HTML page.
function providerFailure(response, payload, key, probe) {
  const error = payload?.error
  const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(value) && !(key && value.includes(key)) ? value : undefined
  const details = {
    providerStatus: response.status,
    providerCode: identifier(error?.code),
    requestId: identifier(response.headers.get('x-request-id') || response.headers.get('x-tt-logid') || payload?.request_id || error?.request_id),
  }
  const upstreamMessage = typeof error?.message === 'string' ? error.message : ''
  // Only infer a field from a parameter-specific phrase, never from arbitrary
  // mentions of model/prompt elsewhere in the provider response.
  const named = upstreamMessage.match(/\b(?:parameter|argument|field)\s*[:=]?\s*[`'"\[]?([a-z_]+)\b/i)?.[1]
  const parameter = IMAGE_PARAMETERS.has(error?.param) ? error.param : IMAGE_PARAMETERS.has(named) ? named : undefined
  if (parameter) details.parameter = parameter
  const errors = {
    401: ['AUTH', 'The API key is invalid or expired.'],
    403: ['PERMISSION', 'This API key lacks access. Enable the model and check account verification.'],
    404: ['MODEL', 'The model or API endpoint is unavailable.'],
    429: ['QUOTA', 'The provider quota or rate limit has been reached.'],
    400: ['PARAMETERS', probe ? 'The provider did not confirm the required-prompt check. Verify the API URL and model.' : 'The provider rejected the image parameters.'],
  }
  let [code, message] = errors[response.status] ?? ['PROVIDER_ERROR', 'The image provider could not complete the request.']
  if (response.status === 400 && parameter) {
    const unsupported = /not support|unsupported|不支持/i.test(upstreamMessage)
    message = unsupported ? `The image parameter "${parameter}" is unsupported for this model.` : `The provider rejected the image parameter "${parameter}".`
  }
  const context = [`HTTP ${details.providerStatus}`, details.providerCode && `code=${details.providerCode}`, details.requestId && `request_id=${details.requestId}`].filter(Boolean).join('; ')
  return Object.assign(new ImageError(code, `${message} (${context})`, 502), details)
}

async function request(url, key, { signal, body, maxBytes = 2 * 1024 * 1024, fetchImpl = fetch, parameterProbe = false } = {}) {
  try {
    const response = await fetchImpl(url, {
      method: body ? 'POST' : 'GET', redirect: 'error', signal,
      headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) {
      let payload
      try { payload = JSON.parse((await readBounded(response, 64 * 1024, signal)).toString('utf8')) }
      catch { signal?.throwIfAborted() /* Preserve HTTP status for non-JSON/oversized error bodies. */ }
      if (parameterProbe && response.status === 400) {
        const error = payload?.error
        // Ark has no documented runtime Models API. A request with the required
        // prompt omitted reaches authentication/parameter validation without
        // submitting an inference job. Accept only the prompt-required error.
        const code = error?.code
        const message = String(error?.message ?? '')
        if (/^(?:MissingParameter|InvalidParameter)(?:\.[A-Za-z]+)?$/.test(code ?? '')
          && (error?.param === 'prompt' || /\bprompt\b/i.test(message))
          && /required|missing|empty|not provided|not set|不能为空|必填|缺少/i.test(message)) return { probe: 'connection' }
      }
      throw providerFailure(response, payload, key, parameterProbe)
    }
    const data = await readBounded(response, maxBytes, signal)
    try { return JSON.parse(data.toString('utf8')) } catch { throw new ImageError('RESPONSE', 'The provider returned invalid JSON.', 502) }
  } catch (error) { throw safeError(error) }
}

/** Read the account's visible models without submitting image generation. */
export async function listModels(provider, spec, key, options = {}) {
  if (provider === 'grsai') {
    // GrsAI publishes its catalog without a key.
    const { source, ...lists } = await grsaiCatalog(spec, options)
    return { source: source === 'builtin' ? 'builtin' : 'provider', origin: source, canFetch: true, ...lists }
  }
  if (provider !== 'openai') throw new ImageError('MODEL_DISCOVERY', 'This provider does not offer account model discovery here. Choose a built-in model or enter a model ID.')
  const signal = AbortSignal.any([AbortSignal.timeout(15_000), ...(options.signal ? [options.signal] : [])])
  const result = await request(`${spec.baseUrl}/models`, key, { ...options, signal })
  if (!Array.isArray(result.data)) throw new ImageError('RESPONSE', 'The provider returned an invalid model list.', 502)
  const ids = new Set(result.data.filter(model => model && typeof model.id === 'string' && (!model.shutdown_date || model.shutdown_date > new Date().toISOString().slice(0, 10))).map(model => model.id))
  return { source: 'provider', canFetch: true, models: [...OPENAI_IMAGES].filter(id => ids.has(id)) }
}

/** One non-generating request: OpenAI model metadata, Ark required-prompt validation, or the GrsAI key's balance. */
export async function validateConnection(provider, spec, key, options = {}) {
  if (provider === 'grsai') return grsaiValidate(spec, key, options)
  const signal = AbortSignal.any([AbortSignal.timeout(15_000), ...(options.signal ? [options.signal] : [])])
  if (provider === 'openai') {
    const result = await request(`${spec.baseUrl}/models/${encodeURIComponent(spec.model)}`, key, { ...options, signal })
    if (result.id !== spec.model) throw new ImageError('MODEL', 'The requested model was not returned by the provider.')
    return 'model'
  }
  const result = await request(`${spec.baseUrl}/images/generations`, key, { ...options, signal, body: { model: spec.model }, parameterProbe: true })
  if (result.probe === 'connection') return 'connection'
  throw new ImageError('RESPONSE', 'The provider returned an unexpected validation response.', 502)
}

const RATIOS = new Set(['1:1', '16:9', '9:16', '4:3', '3:4'])

/** The validated prompt (with art direction and framing) and target ratio shared by every provider. */
export function composedPrompt(args) {
  const prompt = typeof args.prompt === 'string' ? args.prompt.trim() : ''
  const style = typeof args.style_context === 'string' ? args.style_context.trim() : ''
  if (!prompt || prompt.length + style.length > 8000) throw new ImageError('PROMPT', 'Enter an image description of up to 8000 characters including style context.')
  const ratio = args.aspect_ratio ?? '1:1'
  if (!RATIOS.has(ratio)) throw new ImageError('RATIO', 'Choose a supported image aspect ratio.')
  return {
    ratio,
    prompt: [prompt, style && `Art direction: ${style}`, args.purpose && `Intended use: ${args.purpose}`, `Compose for ${ratio}. Keep important subjects inside the safe central area for cropping.`].filter(Boolean).join('\n\n'),
  }
}

export function generationBody(provider, spec, args) {
  const { prompt, ratio } = composedPrompt(args)
  const sizes = provider === 'openai'
    ? { '1:1': '1024x1024', '16:9': '1536x1024', '9:16': '1024x1536', '4:3': '1536x1024', '3:4': '1024x1536' }
    : { '1:1': '2048x2048', '16:9': '2560x1440', '9:16': '1440x2560', '4:3': '2304x1728', '3:4': '1728x2304' }
  return {
    model: spec.model,
    prompt,
    size: sizes[ratio],
    ...(provider === 'openai'
      ? { n: 1, quality: 'auto', output_format: 'png' }
      // Ark defaults to single-image generation. Use its shared single-image
      // fields for Seedream 4.x / 5.x and opaque endpoint IDs; group controls belong
      // to a separate capability and 5.0 Pro rejects them.
      : { response_format: 'b64_json', watermark: false }),
  }
}

export async function generate(provider, spec, key, args, options = {}) {
  if (provider === 'grsai') {
    const { prompt, ratio } = composedPrompt(args)
    // Returns the downloaded PNG/JPEG/WebP; the tool normalizes it to PNG.
    return grsaiImage(spec, key, prompt, ratio, MAX_IMAGE_BYTES, options)
  }
  const body = generationBody(provider, spec, args)
  const signal = AbortSignal.any([AbortSignal.timeout(180_000), ...(options.signal ? [options.signal] : [])])
  const result = await request(`${spec.baseUrl}/images/generations`, key, { ...options, signal, body, maxBytes: Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 1024 * 1024 })
  const b64 = result?.data?.[0]?.b64_json
  if (typeof b64 !== 'string' || b64.length === 0 || b64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) {
    throw new ImageError('IMAGE', 'The provider returned no valid base64 image.', 502)
  }
  const bytes = Buffer.from(b64, 'base64')
  if (bytes.length > MAX_IMAGE_BYTES) throw new ImageError('TOO_LARGE', 'The generated image exceeds 20 MB.', 502)
  signal.throwIfAborted()
  return bytes
}
