// GrsAI (https://grsai.ai) aggregates image, video and text models behind one
// key. Text runs on its OpenAI-compatible POST /v1/chat/completions. Media use
// two task contracts, both checked against the GrsAI documents (2026-10-29):
// - The unified API (apifox "API新版文档"): POST /v1/api/generate with
//   `replyType: "async"` returns `{ id, status }`, and GET /v1/api/result?id=
//   reports `running | succeeded | failed | violation`. Nano Banana, GPT Image,
//   MiniMax and Agnes use it.
// - The legacy draw API, still the only documented route for Veo: a POST with
//   `webHook: "-1"` returns `{ code, data: { id } }`, and POST /v1/draw/result
//   reports `running | succeeded | failed`.
// Result URLs stay valid for two hours. The model menus come from GrsAI's
// public model catalog (see grsaiCatalog); the lists below are the offline
// fallback, matching that catalog on 2026-10-29.
import { HTTP_ERRORS, ImageError, providerDetail, readBounded, safeError } from './errors.js'
import { download } from './download.js'
import { grsaiImageFields, imageChoice, videoCapabilities as familyCapabilities, videoChoice, videoFamily } from './options.js'

export { download }

export const GRSAI_DEFAULT_BASE = 'https://grsai.dakka.com.cn'
export const GRSAI_DEFAULT_IMAGE_MODEL = 'nano-banana-fast'
// The catalog no longer sells Veo; saved Veo selections keep working.
export const GRSAI_DEFAULT_VIDEO_MODEL = 'minimax-h3'
export const GRSAI_IMAGE_MODELS = Object.freeze([
  'nano-banana-fast',
  'nano-banana-2-lite',
  'nano-banana-2',
  'nano-banana-2.1',
  'nano-banana-pro',
  'nano-banana-2-cl',
  'nano-banana-2-2k-cl',
  'nano-banana-2-4k-cl',
  'nano-banana-pro-cl',
  'nano-banana-pro-vip',
  'nano-banana-pro-4k-vip',
  'gpt-image-2',
  'gpt-image-2-vip',
  'gpt-image-2.5',
  'gpt-image-2.5-flare',
  'gpt-image-2.5-sunburst',
])
export const GRSAI_VIDEO_MODELS = Object.freeze(['minimax-h3', 'agnes-video-2.5', 'wan-3.0', 'veo3.1-fast', 'veo3.1-pro'])
export const GRSAI_DEFAULT_TEXT_MODEL = 'gemini-3.1-pro'
// The two text models GrsAI's documents use as examples come first.
export const GRSAI_TEXT_MODELS = Object.freeze([
  'gemini-3.1-pro',
  'gpt-5.6-sol',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-pro',
  'gemini-3-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gpt-6.1-sol',
  'gpt-6-astra',
  'gpt-5.6-terra',
])
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024
export const MAX_TEXT_OUTPUT_TOKENS = 32_768

/** Ratios, resolutions and duration range the given GrsAI video model accepts. */
export const videoCapabilities = model => familyCapabilities('grsai', model)

const POLL_MS = { image: 2500, video: 5000 }
const DEADLINE_MS = { image: 180_000, video: 840_000 }

const MODERATION = new Set(['input_moderation', 'output_moderation'])

// Keep only identifiers: a free-form provider message can echo the prompt,
// the key or a proxy page.
function rejected(response) {
  const [code, message] = HTTP_ERRORS[response.status] ?? ['PROVIDER_ERROR', 'The provider could not complete the request.']
  return Object.assign(new ImageError(code, `${message} (HTTP ${response.status})`, 502), { providerStatus: response.status })
}

/**
 * GrsAI reports a bad key, a bad account token or an empty balance in the
 * business code/msg. `secrets` keeps a message that echoes one out of `detail`,
 * the short reason the settings card may show.
 */
function businessError(payload, secrets = []) {
  const code = Number.isInteger(payload?.code) ? payload.code : undefined
  const message = typeof payload?.msg === 'string' ? payload.msg : typeof payload?.error === 'string' ? payload.error : ''
  const details = { providerCode: code === undefined ? undefined : String(code), detail: providerDetail(message, secrets) }
  if (/用户不存在|user not (?:found|exist)/i.test(message)) return Object.assign(new ImageError('TOKEN', 'The GrsAI account token is invalid.', 502), details)
  if (/api\s*key|apikey|unauthori|token|密钥|无效/i.test(message)) return Object.assign(new ImageError('AUTH', 'The API key is invalid or expired.', 502), details)
  if (/credit|balance|insufficient|积分|余额/i.test(message)) return Object.assign(new ImageError('QUOTA', 'The GrsAI balance is insufficient for this model.', 502), details)
  return Object.assign(new ImageError('PROVIDER_ERROR', `The provider could not complete the request.${code === undefined ? '' : ` (code=${code})`}`, 502), details)
}

/**
 * One authenticated JSON call. The unified API answers a failed or violating
 * task with HTTP 400 and the task body, so `taskErrors` lets that body through
 * for the caller to classify.
 */
async function request(baseUrl, path, key, { method = 'POST', body, taskErrors = false, signal, fetchImpl = fetch } = {}) {
  try {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method, redirect: 'error', signal,
      headers: { Authorization: `Bearer ${key}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const taskFailure = taskErrors && response.status === 400
    if (!response.ok && !taskFailure) {
      await readBounded(response, 64 * 1024, signal).catch(() => signal?.throwIfAborted())
      throw rejected(response)
    }
    const text = (await readBounded(response, 1024 * 1024, signal)).toString('utf8')
    let payload
    try { payload = JSON.parse(text) } catch { throw taskFailure ? rejected(response) : new ImageError('RESPONSE', 'The provider returned invalid JSON.', 502) }
    if (taskFailure && typeof payload?.status !== 'string') throw rejected(response)
    return payload
  } catch (error) { throw safeError(error) }
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted()
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve() }, ms)
    const abort = () => { clearTimeout(timer); reject(signal.reason) }
    signal?.addEventListener('abort', abort, { once: true })
  })
}

// Back off from 0.5s to the kind's interval: quick tasks return quickly
// without hammering the result endpoint during a long render.
const pause = (kind, attempt, signal) => wait(Math.min(POLL_MS[kind], 500 * 2 ** attempt), signal)

/** Throw for a finished-but-failed task; true once it succeeded. */
function settled(task) {
  if (task?.status === 'succeeded') return true
  if (task?.status === 'violation' || (task?.status === 'failed' && MODERATION.has(task.failure_reason))) {
    throw new ImageError('MODERATION', 'The provider declined the request under its content policy. Rephrase the prompt.', 502)
  }
  if (task?.status === 'failed') throw new ImageError('PROVIDER_ERROR', 'The provider could not complete the generation. Try again.', 502)
  return false
}

const deadline = (kind, options) => AbortSignal.any([AbortSignal.timeout(DEADLINE_MS[kind]), ...(options.signal ? [options.signal] : [])])

/**
 * Submit one task on the unified API and poll it to completion.
 * @returns the succeeded task (`results[].url`).
 */
export async function runGenerate(spec, key, body, kind, options = {}) {
  const signal = deadline(kind, options)
  const call = (path, init) => request(spec.baseUrl, path, key, { ...options, ...init, taskErrors: true, signal })
  try {
    const submitted = await call('/v1/api/generate', { body: { ...body, replyType: 'async' } })
    if (Number.isInteger(submitted?.code) && submitted.code !== 0) throw businessError(submitted)
    if (settled(submitted)) return submitted
    const id = submitted?.id
    if (typeof id !== 'string' || !id) throw new ImageError('RESPONSE', 'The provider returned no task id.', 502)
    for (let attempt = 0; ; attempt++) {
      await pause(kind, attempt, signal)
      let task
      try {
        task = await call(`/v1/api/result?id=${encodeURIComponent(id)}`, { method: 'GET' })
      } catch (error) {
        // A task can be briefly unknown right after submission.
        if (error.providerStatus === 404 && attempt < 5) continue
        throw error
      }
      if (Number.isInteger(task?.code) && task.code !== 0) throw businessError(task)
      if (settled(task)) return task
    }
  } catch (error) { throw safeError(error) }
}

/**
 * Submit one task on the legacy draw API (Veo) and poll it to completion.
 * @returns the succeeded task's data (`url` and/or `results[].url`).
 */
export async function runLegacyTask(spec, key, path, body, kind, options = {}) {
  const signal = deadline(kind, options)
  const call = (route, payload) => request(spec.baseUrl, route, key, { ...options, body: payload, signal })
  try {
    const submitted = await call(path, { ...body, webHook: '-1', shutProgress: true })
    const id = submitted?.data?.id
    if (submitted?.code !== 0 || typeof id !== 'string' || !id) throw submitted?.code === 0 ? new ImageError('RESPONSE', 'The provider returned no task id.', 502) : businessError(submitted)
    for (let attempt = 0; ; attempt++) {
      await pause(kind, attempt, signal)
      const polled = await call('/v1/draw/result', { id })
      // A task can be briefly unknown right after submission (code -22).
      if (polled?.code === -22 && attempt < 5) continue
      if (polled?.code !== 0) throw businessError(polled)
      if (settled(polled.data)) return polled.data
    }
  } catch (error) { throw safeError(error) }
}

const firstUrl = task => task?.results?.find?.(result => typeof result?.url === 'string')?.url ?? task?.url

/**
 * The unified-API body for one image: Nano Banana takes a ratio and 1K/2K/4K,
 * the VIP, Flare and Sunburst canvases a pixel size (plus quality where
 * offered), GPT Image 2 / 2.5 the ratio itself. `choice` defaults to the
 * saved options; see options.js.
 */
export function grsaiImageBody(spec, prompt, choice = imageChoice('grsai', spec)) {
  return { model: spec.model, prompt, ...grsaiImageFields(spec.model, choice) }
}

export async function grsaiImage(spec, key, prompt, choice, maxBytes, options = {}) {
  const task = await runGenerate(spec, key, grsaiImageBody(spec, prompt, choice), 'image', options)
  return download(firstUrl(task), maxBytes, options)
}

/**
 * The request for one clip. MiniMax names its two canvases instead of using
 * ratios; Veo renders a fixed length on the legacy route. `ratio` and the
 * resolution fall back to the saved defaults (`saved.videoRatio`,
 * `saved.videoResolution`) when omitted.
 */
export function grsaiVideoRequest(model, prompt, ratio, duration, saved = {}) {
  const family = videoFamily('grsai', model)
  const choice = videoChoice('grsai', { ...saved, videoModel: model }, ratio, duration)
  if (family === 'grsai:veo') return { legacy: true, path: '/v1/video/veo', body: { model, prompt, aspectRatio: choice.ratio } }
  const aspectRatio = family === 'grsai:minimax' ? (choice.ratio === '9:16' ? 'portrait' : 'landscape') : choice.ratio
  return { legacy: false, body: { model, prompt, aspectRatio, ...(choice.resolution ? { resolution: choice.resolution } : {}), ...(choice.seconds === undefined ? {} : { duration: choice.seconds }) } }
}

export async function grsaiVideo(spec, key, prompt, { ratio, duration }, options = {}) {
  const planned = grsaiVideoRequest(spec.videoModel, prompt, ratio, duration, spec)
  const task = planned.legacy
    ? await runLegacyTask(spec, key, planned.path, planned.body, 'video', options)
    : await runGenerate(spec, key, planned.body, 'video', options)
  return download(firstUrl(task), MAX_VIDEO_BYTES, options)
}

/** OpenAI message content may be a string or a list of typed parts. */
function messageText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.filter(part => part?.type === 'text' && typeof part.text === 'string').map(part => part.text).join('')
}

/**
 * One non-streaming chat completion on the saved text model.
 * @returns the reply text, why it stopped and the token counts GrsAI reports.
 */
export async function grsaiText(spec, key, { prompt, instructions, maxTokens }, options = {}) {
  const signal = AbortSignal.any([AbortSignal.timeout(180_000), ...(options.signal ? [options.signal] : [])])
  const messages = [...(instructions ? [{ role: 'system', content: instructions }] : []), { role: 'user', content: prompt }]
  const payload = await request(spec.baseUrl, '/v1/chat/completions', key, {
    ...options, signal,
    body: { model: spec.textModel, stream: false, messages, ...(maxTokens === undefined ? {} : { max_tokens: maxTokens }) },
  })
  // An OpenAI-style error can arrive with HTTP 200 from some gateways.
  if (payload?.error) throw businessError({ msg: typeof payload.error.message === 'string' ? payload.error.message : '', code: payload.error.code })
  const choice = payload?.choices?.[0]
  const text = messageText(choice?.message?.content)
  if (!text) {
    throw choice?.finish_reason === 'content_filter'
      ? new ImageError('MODERATION', 'The provider declined the request under its content policy. Rephrase the prompt.', 502)
      : new ImageError('RESPONSE', 'The provider returned no text.', 502)
  }
  const count = value => (Number.isInteger(value) && value >= 0 ? value : undefined)
  return {
    text,
    finishReason: typeof choice.finish_reason === 'string' ? choice.finish_reason : undefined,
    inputTokens: count(payload.usage?.prompt_tokens),
    outputTokens: count(payload.usage?.completion_tokens),
  }
}

const CATALOG_PAGE = 'https://grsai.ai/zh/dashboard/models'
const CATALOG_LISTS = { image: 'models', video: 'videoModels', text: 'textModels' }
const IMAGE_MODEL = /nano-banana|gpt-image|image/u
const validId = name => /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/u.test(name)

/**
 * Find the model list in a Next.js flight (RSC) response: newline-separated
 * `<id>:<json>` rows, one of which carries `{ models: [{ name, type, ... }] }`.
 */
export function catalogFromFlight(text) {
  for (const line of text.split('\n')) {
    const row = /^[0-9a-z]+:(.*)$/u.exec(line)
    if (!row || !row[1].includes('"models":[')) continue
    let value
    try { value = JSON.parse(row[1]) } catch { continue }
    const stack = [value]
    while (stack.length > 0) {
      const node = stack.pop()
      if (!node || typeof node !== 'object') continue
      if (Array.isArray(node.models) && node.models.length > 0
        && node.models.every(model => typeof model?.name === 'string' && typeof model?.type === 'string')) return node.models
      stack.push(...Object.values(node))
    }
  }
  return undefined
}

async function fetchText(url, maxBytes, { signal, fetchImpl = fetch, headers } = {}) {
  const response = await fetchImpl(url, { redirect: 'error', signal, ...(headers ? { headers } : {}) })
  if (!response.ok) throw rejected(response)
  return (await readBounded(response, maxBytes, signal)).toString('utf8')
}

/** The documented example models lead the text menu; the rest keep GrsAI's order. */
function rankText(ids) {
  const lead = GRSAI_TEXT_MODELS.slice(0, 2)
  return [...lead.filter(id => ids.includes(id)), ...ids.filter(id => !lead.includes(id))]
}

/**
 * GrsAI's current models by kind, read without a key. The public pricing page
 * is the only source that types every model and lists video, so its flight
 * data is parsed defensively; when it fails, GET /v1/models still answers text
 * and image, and the shipped lists cover the rest.
 * @returns `{ source, models, videoModels, textModels }`, where source is
 * `catalog`, `models-endpoint` or `builtin`.
 */
export async function grsaiCatalog(spec, options = {}) {
  const signal = AbortSignal.any([AbortSignal.timeout(20_000), ...(options.signal ? [options.signal] : [])])
  try {
    const listed = catalogFromFlight(await fetchText(CATALOG_PAGE, 4 * 1024 * 1024, { ...options, signal, headers: { RSC: '1' } }))
    const lists = { models: [], videoModels: [], textModels: [] }
    for (const model of listed ?? []) {
      const list = CATALOG_LISTS[model.type]
      // A withdrawn model stays out of the menus; a saved one still works.
      if (list && model.closeModel !== true && validId(model.name) && !lists[list].includes(model.name)) lists[list].push(model.name)
    }
    if (lists.models.length + lists.videoModels.length + lists.textModels.length > 0) {
      return { source: 'catalog', ...lists, textModels: rankText(lists.textModels) }
    }
  } catch {
    // Fall through to the next source; only the caller's cancellation stops here.
    options.signal?.throwIfAborted()
  }
  try {
    const listed = JSON.parse(await fetchText(`${spec.baseUrl}/v1/models`, 1024 * 1024, { ...options, signal }))
    const ids = (Array.isArray(listed?.data) ? listed.data : []).map(model => model?.id).filter(id => typeof id === 'string' && validId(id))
    if (ids.length > 0) {
      return { source: 'models-endpoint', models: ids.filter(id => IMAGE_MODEL.test(id)), videoModels: [...GRSAI_VIDEO_MODELS], textModels: rankText(ids.filter(id => !IMAGE_MODEL.test(id))) }
    }
  } catch {
    // Fall through to the next source; only the caller's cancellation stops here.
    options.signal?.throwIfAborted()
  }
  return { source: 'builtin', models: [...GRSAI_IMAGE_MODELS], videoModels: [...GRSAI_VIDEO_MODELS], textModels: [...GRSAI_TEXT_MODELS] }
}

// The two documented balance routes (GrsAI console > 在线体验/文档 > other
// APIs, checked 2026-11-02): POST /client/openapi/getAPIKeyCredits with
// `{ apiKey }` and POST /client/openapi/getCredits with the account `{ token }`
// from the console's user page; both answer `{ code: 0, data: { credits } }`.
// A key is either unlimited (type 0, drawing on the account balance) or
// limited (type 1, with its own quota). The key route reports the key's own
// quota, which an unlimited key leaves at 0, so only the account route shows
// what the account can still spend.

/** A credit count from `{ code, data: { credits } }`; anything else is a failure, never 0. */
function creditsOf(result, secrets) {
  if (result?.code !== 0) throw businessError(result, secrets)
  const value = result?.data?.credits
  const credits = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
  if (!Number.isFinite(credits)) throw new ImageError('RESPONSE', 'The provider returned no credit balance.', 502)
  return credits
}

/**
 * The key's own credit quota: one request that generates nothing. `unlimited`
 * is set only when GrsAI states the key type (a field outside the documented
 * response, read if present).
 */
export async function grsaiCredits(spec, key, options = {}) {
  const signal = AbortSignal.any([AbortSignal.timeout(15_000), ...(options.signal ? [options.signal] : [])])
  const result = await request(spec.baseUrl, '/client/openapi/getAPIKeyCredits', key, { ...options, body: { apiKey: key }, signal })
  const credits = creditsOf(result, [key])
  const type = result.data.type
  return { credits, ...(type === 0 || type === 1 ? { unlimited: type === 0 } : {}) }
}

/** The account balance behind every key, read with the console's account token. */
export async function grsaiAccountCredits(spec, token, options = {}) {
  const signal = AbortSignal.any([AbortSignal.timeout(15_000), ...(options.signal ? [options.signal] : [])])
  // The route reads the body token; the shared helper also sends it as the bearer header to the same host.
  const result = await request(spec.baseUrl, '/client/openapi/getCredits', token, { ...options, body: { token }, signal })
  return creditsOf(result, [token])
}

export async function grsaiValidate(spec, key, options = {}) {
  await grsaiCredits(spec, key, options)
  if (spec.accountToken) await grsaiAccountCredits(spec, spec.accountToken, options)
  return 'credits'
}
