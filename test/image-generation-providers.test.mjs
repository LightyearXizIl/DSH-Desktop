import { createServer } from 'node:http'
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { LocalCredentialProvider } from '@deepseek-ai/dsh-credentials-local'
import { ToolRuntime } from '@deepseek-ai/dsh-tools'
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'
import { LocalSandboxProvider } from '@deepseek-ai/dsh-sandbox-local'
import { LocalSubprocessRuntime } from '@deepseek-ai/dsh-subprocess-local'
import { Session, SessionId, SESSION_FORMAT_VERSION } from '@deepseek-ai/dsh-session'
import sharp from 'sharp'
import { apply, CONFIGURED_VIDEO_PROMPT, VIDEO_PROMPT_SECTION } from '../packages/dsh-image-generation/index.js'
import { createSettings } from '../packages/dsh-image-generation/lib/settings.js'
import { DEFAULTS, MODEL_CATALOG, generate, generationBody, profile } from '../packages/dsh-image-generation/lib/provider.js'
import { agnesVideoBody } from '../packages/dsh-image-generation/lib/agnes.js'
import { imageCapabilities, videoCapabilities } from '../packages/dsh-image-generation/lib/options.js'

const cleanups = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); vi.restoreAllMocks() })
async function temp() { const p = await realpath(await mkdtemp(path.join(tmpdir(), 'dsh-providers-test-'))); cleanups.push(() => rm(p, { recursive: true, force: true })); return p }

async function listen(handler) {
  const http = createServer(handler)
  await new Promise((resolve, reject) => { http.once('error', reject); http.listen(0, '127.0.0.1', resolve) })
  cleanups.push(() => { http.closeAllConnections(); return new Promise(resolve => http.close(resolve)) })
  return `http://127.0.0.1:${http.address().port}`
}

/**
 * A local stand-in for the Agnes AI gateway, per its documentation: Images API
 * with tier `size` + `ratio`, /v1/videos tasks polled at <host>/agnesapi.
 */
async function agnes({ imageUrl = false } = {}) {
  const calls = []
  const png = await sharp({ create: { width: 24, height: 16, channels: 3, background: '#446688' } }).png().toBuffer()
  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(32, 3)])
  const polls = new Map()
  let host = ''
  host = await listen(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk
    const url = new URL(req.url, 'http://local')
    const body = raw ? JSON.parse(raw) : undefined
    calls.push({ url: url.pathname, query: Object.fromEntries(url.searchParams), method: req.method, auth: req.headers.authorization, body })
    const json = (value, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)) }
    if (url.pathname.startsWith('/files/')) { res.writeHead(200); return res.end(url.pathname.endsWith('.mp4') ? mp4 : png) }
    if (req.headers.authorization !== 'Bearer agnes-good-key') return json({ error: { code: '', message: '无效的令牌 agnes-bad-key', type: 'AgnesAI_error' } }, 401)
    if (url.pathname === '/v1/models') return json({ data: ['agnes-2.5-flash', 'agnes-image-2.5-flash', 'agnes-image-3.0-flash', 'agnes-video-2.5', 'agnes-video-2.5-flash'].map(id => ({ id, object: 'model' })) })
    if (url.pathname.startsWith('/v1/models/')) return json({ id: decodeURIComponent(url.pathname.slice('/v1/models/'.length)), object: 'model' })
    if (url.pathname === '/v1/images/generations') {
      if (Object.hasOwn(body, 'response_format')) return json({ error: { message: 'response_format must be inside extra_body' } }, 400)
      return json({ created: 1, data: [imageUrl ? { url: `${host}/files/out.png`, b64_json: null } : { url: null, b64_json: png.toString('base64') }] })
    }
    if (url.pathname === '/v1/videos') {
      const id = `video_${randomUUID()}`
      polls.set(id, 0)
      return json({ id: 'task_1', task_id: 'task_1', video_id: id, object: 'video', model: body.model, status: 'queued', progress: 0, seconds: body.seconds, size: body.size })
    }
    if (url.pathname === '/agnesapi') {
      const id = url.searchParams.get('video_id')
      const count = polls.get(id) ?? 0
      polls.set(id, count + 1)
      if (count === 0) return json({ id: 'task_1', status: 'in_progress', progress: 30 })
      return json({ id: 'task_1', status: 'completed', progress: 100, url: `${host}/files/out.mp4`, error: null })
    }
    json({ error: { message: 'not found' } }, 404)
  })
  return { calls, png, mp4, host, baseUrl: `${host}/v1` }
}

/** A generic OpenAI Images API service: `models` toggles its Models API, `answer` its image response. */
async function compatible({ models = true, answer = 'b64' } = {}) {
  const calls = []
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#224466' } }).png().toBuffer()
  let host = ''
  host = await listen(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk
    const url = new URL(req.url, 'http://local')
    calls.push({ url: url.pathname, method: req.method, auth: req.headers.authorization, body: raw ? JSON.parse(raw) : undefined })
    const json = (value, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)) }
    if (url.pathname === '/files/out.png') { res.writeHead(200); return res.end(png) }
    if (req.headers.authorization !== 'Bearer compat-key') return json({ error: { message: 'Incorrect API key: compat-bad' } }, 401)
    if (url.pathname === '/v1/models') return models ? json({ data: [{ id: 'flux-pro' }, { id: 'dall-e-3' }, { id: 'bad id' }] }) : json({ error: { message: 'no route' } }, 404)
    if (url.pathname === '/v1/images/generations') return json({ data: [answer === 'url' ? { url: `${host}/files/out.png` } : { b64_json: png.toString('base64') }] })
    json({ error: { message: 'not found' } }, 404)
  })
  return { calls, png, baseUrl: `${host}/v1` }
}

async function fixture() {
  const home = await temp(); const workspace = await temp()
  const ctx = new Context()
  for (const [plugin, config] of [[SystemPrompt, {}], [ToolRuntime, {}], [SkillRegistry, {}], [LocalSandboxProvider, {}], [LocalSubprocessRuntime, {}], [LocalCredentialProvider, { dshHome: home, watch: false }]]) {
    const fork = ctx.plugin(plugin, config); await fork; cleanups.push(() => fork.dispose())
  }
  const log = vi.fn()
  const services = { credentials: ctx.credentials, sandbox: ctx.sandbox, subprocess: ctx.subprocess, logger: { info: log }, sandboxPolicy: { resolve: () => ({ mode: 'workspace-write', workspaceRoot: workspace }) } }
  const settings = createSettings(services)
  const id = SessionId(randomUUID())
  const agent = { session: Session.create(id, undefined, { version: SESSION_FORMAT_VERSION, id, createdAt: Date.now(), isSeeded: false, cwd: workspace }) }
  return { ctx, workspace, services, settings, log, agent }
}

async function mountPlugin(f) {
  const routes = []
  const plugin = f.ctx.plugin({ inject: ['skills', 'systemPrompt', 'tools'], apply: ctx => apply({
    ...f.services, skills: ctx.skills, systemPrompt: ctx.systemPrompt, tools: ctx.tools,
    on: ctx.on.bind(ctx), connection: { fetch: { register: route => routes.push(route) } },
  }) })
  await plugin
  cleanups.push(() => plugin.dispose())
  return { route: target => routes.find(route => route.path === target) }
}

const run = (f, name, args) => f.ctx.tools.execute({ callId: name, name, arguments: args, agent: f.agent, signal: new AbortController().signal })

describe('Agnes AI', () => {
  it('defaults to the China site gateway with the documented image and video models', () => {
    expect(DEFAULTS.agnes).toEqual({ baseUrl: 'https://api.agnes-ai.cn/v1', model: 'agnes-image-2.5-flash', videoModel: 'agnes-video-2.5' })
    expect(MODEL_CATALOG.agnes).toMatchObject({ canFetch: true, models: ['agnes-image-2.5-flash', 'agnes-image-2.1-flash', 'agnes-image-2.0-flash'], videoModels: ['agnes-video-2.5', 'agnes-video-2.5-flash'] })
    // A pasted endpoint collapses to the base URL.
    expect(profile('agnes', { baseUrl: 'https://apihub.agnes-ai.com/v1/images/generations' }).baseUrl).toBe('https://apihub.agnes-ai.com/v1')
  })

  it('saves a key with one model lookup that generates nothing, and refuses a bad key as AUTH', async () => {
    const f = await fixture(); const s = await agnes()
    const result = await f.settings.save({ provider: 'agnes', baseUrl: s.baseUrl, model: DEFAULTS.agnes.model, videoModel: 'agnes-video-2.5', apiKey: 'agnes-good-key', revision: 0 })
    expect(s.calls).toEqual([expect.objectContaining({ url: '/v1/models/agnes-image-2.5-flash', method: 'GET', auth: 'Bearer agnes-good-key' })])
    expect(result.profiles.agnes).toMatchObject({ configured: true, validation: 'model', videoModel: 'agnes-video-2.5' })
    expect(JSON.stringify(result)).not.toContain('agnes-good-key')
    const rejected = f.settings.save({ provider: 'agnes', baseUrl: s.baseUrl, model: DEFAULTS.agnes.model, apiKey: 'agnes-bad-key', revision: 1 })
    await expect(rejected).rejects.toMatchObject({ code: 'AUTH' })
    await expect(rejected).rejects.not.toThrow(/agnes-bad-key/)
  })

  it('lists the key\'s image and video models', async () => {
    const f = await fixture(); const s = await agnes()
    const result = await f.settings.models({ provider: 'agnes', baseUrl: s.baseUrl, model: DEFAULTS.agnes.model, apiKey: 'agnes-good-key', revision: 0 })
    expect(result).toEqual({ source: 'provider', canFetch: true, models: ['agnes-image-2.5-flash', 'agnes-image-3.0-flash'], videoModels: ['agnes-video-2.5', 'agnes-video-2.5-flash'] })
  })

  it('requests an image as a size tier plus ratio in base64, without a top-level response_format', async () => {
    const s = await agnes()
    const spec = { baseUrl: s.baseUrl, model: 'agnes-image-2.5-flash', imageResolution: '2K', imageRatio: '3:2' }
    expect(await generate('agnes', spec, 'agnes-good-key', { prompt: 'A lighthouse', aspect_ratio: '21:9' })).toEqual(s.png)
    const call = s.calls.find(item => item.url === '/v1/images/generations')
    expect(call).toMatchObject({ method: 'POST', auth: 'Bearer agnes-good-key', body: { model: 'agnes-image-2.5-flash', size: '2K', ratio: '21:9', return_base64: true } })
    expect(call.body).not.toHaveProperty('response_format')
    // Without a tool ratio the saved default ratio is sent; the default tier is 1K.
    expect(generationBody('agnes', { model: 'agnes-image-2.1-flash', imageRatio: '3:2' }, { prompt: 'x' })).toMatchObject({ size: '1K', ratio: '3:2' })
    expect(imageCapabilities('agnes', 'agnes-image-2.5-flash')).toEqual({ ratios: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9'], resolutions: ['1K', '2K', '3K', '4K'], qualities: [] })
  })

  it('downloads the image when the gateway answers with a URL', async () => {
    const s = await agnes({ imageUrl: true })
    expect(await generate('agnes', { baseUrl: s.baseUrl, model: 'agnes-image-2.5-flash' }, 'agnes-good-key', { prompt: 'x' })).toEqual(s.png)
    // The link is fetched without the key.
    expect(s.calls.find(item => item.url === '/files/out.png').auth).toBeUndefined()
  })

  it('builds the documented text-to-video request and refuses what the model cannot render', () => {
    const spec = { videoModel: 'agnes-video-2.5', videoRatio: '9:16', videoResolution: '1080P' }
    expect(agnesVideoBody(spec, 'p')).toEqual({ model: 'agnes-video-2.5', prompt: 'p', mode: 'text', seconds: '5', size: '1080P', aspect_ratio: '9:16' })
    expect(agnesVideoBody(spec, 'p', '21:9', 12)).toMatchObject({ seconds: '12', aspect_ratio: '21:9' })
    expect(() => agnesVideoBody(spec, 'p', '16:9', 3)).toThrow(expect.objectContaining({ code: 'DURATION' }))
    // Flash renders 720P only, so a saved 1080P falls back to it.
    expect(agnesVideoBody({ ...spec, videoModel: 'agnes-video-2.5-flash' }, 'p')).toMatchObject({ size: '720P' })
    expect(videoCapabilities('agnes', 'agnes-video-2.5-flash').resolutions).toEqual(['720P'])
  })

  it('renders a clip through video_generate, polling the task route outside /v1', async () => {
    const f = await fixture(); const s = await agnes()
    await mountPlugin(f)
    await f.settings.save({ provider: 'agnes', baseUrl: s.baseUrl, model: DEFAULTS.agnes.model, videoModel: 'agnes-video-2.5', videoRatio: '1:1', videoResolution: '2K', apiKey: 'agnes-good-key', revision: 0 })
    const result = await run(f, 'video_generate', { prompt: 'Waves at dusk', duration: 6 })
    expect(result.isError, JSON.stringify(result)).toBeFalsy()
    const value = JSON.parse(result.content[0].text)
    expect(value).toMatchObject({ provider: 'agnes', model: 'agnes-video-2.5', media_type: 'video/mp4', bytes: s.mp4.length })
    expect(Buffer.compare(await readFile(path.join(f.workspace, value.workspace_path)), s.mp4)).toBe(0)
    expect(s.calls.find(item => item.url === '/v1/videos').body).toMatchObject({ model: 'agnes-video-2.5', mode: 'text', seconds: '6', size: '2K', aspect_ratio: '1:1' })
    const poll = s.calls.find(item => item.url === '/agnesapi')
    expect(poll).toMatchObject({ method: 'GET', auth: 'Bearer agnes-good-key', query: { model_name: 'agnes-video-2.5' } })
    expect(poll.query.video_id).toMatch(/^video_/)
  })

  it('refuses a video resolution the saved model does not offer when saving', async () => {
    const f = await fixture(); const s = await agnes()
    await expect(f.settings.save({ provider: 'agnes', baseUrl: s.baseUrl, model: DEFAULTS.agnes.model, videoModel: 'agnes-video-2.5-flash', videoResolution: '1080P', apiKey: 'agnes-good-key', revision: 0 }))
      .rejects.toMatchObject({ code: 'OPTION' })
    expect(s.calls).toHaveLength(0)
  })
})

describe('OpenAI-compatible service', () => {
  const save = (f, baseUrl, extra = {}) => f.settings.save({ provider: 'compatible', baseUrl, model: 'flux-pro', apiKey: 'compat-key', revision: 0, ...extra })

  it('asks for an address and model instead of assuming one', async () => {
    const f = await fixture()
    expect(DEFAULTS.compatible).toEqual({ baseUrl: '', model: '' })
    await expect(f.settings.save({ provider: 'compatible', baseUrl: '', model: 'flux-pro', apiKey: 'compat-key', revision: 0 })).rejects.toMatchObject({ code: 'ENDPOINT' })
    await expect(f.settings.save({ provider: 'compatible', baseUrl: 'https://images.example.com/v1', model: '', apiKey: 'compat-key', revision: 0 })).rejects.toMatchObject({ code: 'MODEL' })
    await expect(f.settings.save({ provider: 'compatible', baseUrl: 'http://images.example.com/v1', model: 'flux-pro', apiKey: 'compat-key', revision: 0 })).rejects.toMatchObject({ code: 'ENDPOINT' })
  })

  it('validates the key through GET /models, or saves unverified when the service has no Models API', async () => {
    const f = await fixture(); const s = await compatible()
    expect((await save(f, s.baseUrl)).profiles.compatible).toMatchObject({ configured: true, validation: 'models', baseUrl: s.baseUrl, model: 'flux-pro' })
    expect(s.calls).toEqual([expect.objectContaining({ url: '/v1/models', method: 'GET', auth: 'Bearer compat-key' })])
    await expect(save(f, s.baseUrl, { apiKey: 'compat-bad', revision: 1 })).rejects.toMatchObject({ code: 'AUTH' })
    const bare = await compatible({ models: false })
    const g = await fixture()
    expect((await save(g, bare.baseUrl)).profiles.compatible).toMatchObject({ configured: true, validation: 'unverified' })
  })

  it('lists every model the service names', async () => {
    const f = await fixture(); const s = await compatible()
    expect(await f.settings.models({ provider: 'compatible', baseUrl: s.baseUrl, model: 'flux-pro', apiKey: 'compat-key', revision: 0 }))
      .toEqual({ source: 'provider', canFetch: true, models: ['flux-pro', 'dall-e-3'] })
  })

  it('sends the generic Images API body with the chosen canvas and quality', () => {
    const spec = { baseUrl: 'https://images.example.com/v1', model: 'flux-pro' }
    const body = extra => { const { prompt, ...rest } = generationBody('compatible', { ...spec, ...extra }, { prompt: 'A lighthouse', aspect_ratio: '16:9' }); return rest }
    // Defaults: GPT Image canvases, no quality, no response_format (GPT Image models reject it).
    expect(body({})).toEqual({ model: 'flux-pro', n: 1, size: '1536x1024' })
    expect(body({ imageResolution: 'dalle3', imageQuality: 'hd' })).toEqual({ model: 'flux-pro', n: 1, size: '1792x1024', quality: 'hd' })
    expect(body({ imageResolution: 'omit', imageQuality: 'low' })).toEqual({ model: 'flux-pro', n: 1, quality: 'low' })
  })

  it.each(['b64', 'url'])('generates through image_generate when the service answers with %s', async answer => {
    const f = await fixture(); const s = await compatible({ answer })
    await mountPlugin(f)
    await save(f, s.baseUrl, { imageRatio: '9:16' })
    const result = await run(f, 'image_generate', { prompt: 'A calm forest' })
    expect(result.isError, JSON.stringify(result)).toBeFalsy()
    expect(JSON.parse(result.content[0].text)).toMatchObject({ provider: 'compatible', model: 'flux-pro', media_type: 'image/png', width: 20, height: 20 })
    expect(s.calls.find(item => item.url === '/v1/images/generations').body).toMatchObject({ model: 'flux-pro', size: '1024x1536', n: 1 })
    expect(JSON.stringify(result)).not.toContain('compat-key')
  })
})

describe('generation options', () => {
  it('sends the saved resolution and quality to OpenAI, with flexible canvases only for GPT Image 2', async () => {
    const f = await fixture()
    const body = (model, extra, ratio = '16:9') => generationBody('openai', profile('openai', { model, ...extra }), { prompt: 'x', aspect_ratio: ratio })
    expect(body('gpt-image-2', { imageResolution: '4K', imageQuality: 'high' })).toMatchObject({ size: '3840x2160', quality: 'high' })
    expect(body('gpt-image-2.5-flare', { imageResolution: '2K' }, '9:16')).toMatchObject({ size: '1152x2048', quality: 'auto' })
    expect(body('gpt-image-1.5', { imageQuality: 'low' }, '3:2')).toMatchObject({ size: '1536x1024', quality: 'low' })
    // GPT Image 1.x has three canvases, so 4K is refused at save time, before any request.
    await expect(f.settings.save({ provider: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-image-1.5', imageResolution: '4K', apiKey: 'k', revision: 0 })).rejects.toMatchObject({ code: 'OPTION' })
    await expect(f.settings.save({ provider: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-image-2', imageQuality: 'max', apiKey: 'k', revision: 0 })).rejects.toMatchObject({ code: 'OPTION' })
  })

  it('serves each model\'s choices through the options route without credentials', async () => {
    const f = await fixture()
    const plugin = await mountPlugin(f)
    const ask = async body => (await plugin.route('/api/image-generation.options').fetch(new Request('http://local/api/image-generation.options', { method: 'POST', body: JSON.stringify(body) }))).json()
    expect(await ask({ provider: 'openai', model: 'gpt-image-2' })).toEqual({ image: { ratios: expect.any(Array), resolutions: ['1K', '2K', '4K'], qualities: ['auto', 'low', 'medium', 'high'] }, video: null })
    expect(await ask({ provider: 'grsai', model: 'gpt-image-2.5-sunburst', videoModel: 'minimax-h3' })).toMatchObject({
      image: { resolutions: ['1K', '2K', '4K'], qualities: ['default', 'low', 'medium', 'high', 'xhigh', 'max'] },
      video: { ratios: ['16:9', '9:16'], resolutions: ['768p', '480p', '1080p'], duration: { min: 1, max: 15, default: 6 }, maxSeconds: { '1080p': 10 } },
    })
    expect(await ask({ provider: 'agnes', model: 'agnes-image-2.5-flash', videoModel: 'agnes-video-2.5-flash' })).toMatchObject({ video: { resolutions: ['720P'] } })
    expect(await ask({ provider: 'nope' })).toMatchObject({ code: 'PROVIDER' })
  })
})

describe('video provider selection', () => {
  it('renders video with the image provider when it has video, otherwise with a saved GrsAI or Agnes profile', async () => {
    const f = await fixture(); const a = await agnes(); const c = await compatible()
    await mountPlugin(f)
    await expect(f.settings.videoSpec()).rejects.toMatchObject({ code: 'NOT_CONFIGURED', message: expect.stringContaining('GrsAI or Agnes AI') })
    // An image-only provider: no video yet.
    await f.settings.save({ provider: 'compatible', baseUrl: c.baseUrl, model: 'flux-pro', apiKey: 'compat-key', revision: 0 })
    expect(await f.settings.isVideoConfigured()).toBe(false)
    await f.settings.save({ provider: 'agnes', baseUrl: a.baseUrl, model: DEFAULTS.agnes.model, apiKey: 'agnes-good-key', revision: 1 })
    expect((await f.settings.videoSpec()).provider).toBe('agnes')
    // Switching images back to the compatible service keeps Agnes for video.
    await f.settings.save({ provider: 'compatible', baseUrl: c.baseUrl, model: 'flux-pro', apiKey: '', revision: 2 })
    expect(await f.settings.videoSpec()).toMatchObject({ provider: 'agnes', videoModel: 'agnes-video-2.5' })
    const section = (await f.ctx.systemPrompt.assemble()).sections.find(item => item.name === VIDEO_PROMPT_SECTION)?.text
    expect(section).toBe(CONFIGURED_VIDEO_PROMPT)
  })
})
