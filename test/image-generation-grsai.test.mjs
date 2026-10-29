import { createServer } from 'node:http'
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
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
import {
  apply, CONFIGURED_TEXT_PROMPT, CONFIGURED_VIDEO_PROMPT, TEXT_PROMPT_SECTION, UNCONFIGURED_TEXT_PROMPT, UNCONFIGURED_VIDEO_PROMPT, VIDEO_PROMPT_SECTION,
} from '../packages/dsh-image-generation/index.js'
import { createSettings } from '../packages/dsh-image-generation/lib/settings.js'
import { DEFAULTS, MODEL_CATALOG, generate, profile } from '../packages/dsh-image-generation/lib/provider.js'
import { download, grsaiVideoRequest, videoCapabilities } from '../packages/dsh-image-generation/lib/grsai.js'

const cleanups = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); vi.restoreAllMocks() })
async function temp() { const p = await realpath(await mkdtemp(path.join(tmpdir(), 'dsh-grsai-test-'))); cleanups.push(() => rm(p, { recursive: true, force: true })); return p }

/**
 * A local stand-in for the GrsAI API with both documented task contracts: the
 * unified `/v1/api/generate` + `/v1/api/result` and the legacy Veo draw API.
 */
async function grsai({ failure, chat } = {}) {
  const calls = []
  const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#335577' } }).png().toBuffer()
  // A minimal ISO media header: size, `ftyp`, brand.
  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(32, 7)])
  const polls = new Map()
  let base = ''
  const http = createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk
    const body = raw ? JSON.parse(raw) : undefined
    const url = new URL(req.url, 'http://local')
    calls.push({ url: url.pathname, query: url.search, method: req.method, auth: req.headers.authorization, body })
    const json = (value, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)) }
    const isVideo = model => /^(veo|minimax|agnes)/.test(model ?? '')
    const result = id => isVideo(id) ? `${base}/files/out.mp4` : `${base}/files/out.png`
    if (url.pathname === '/client/openapi/getAPIKeyCredits') {
      return json(body?.apiKey === 'grsai-good-key' ? { code: 0, msg: 'success', data: { credits: 5000 } } : { code: -1, msg: 'apikey invalid: grsai-bad-key' })
    }
    if (url.pathname === '/v1/api/generate') {
      const id = `${body.model}-${randomUUID()}`
      polls.set(id, 0)
      return json({ id, status: 'running' })
    }
    if (url.pathname === '/v1/api/result') {
      const id = url.searchParams.get('id')
      const count = polls.get(id) ?? 0
      polls.set(id, count + 1)
      if (count === 0) return json({ id, status: 'running', progress: 40 })
      if (failure === 'violation') return json({ id, status: 'violation', error: 'echo of the prompt' }, 400)
      if (failure) return json({ id, status: 'failed', error: 'echo of the prompt' }, 400)
      return json({ id, status: 'succeeded', progress: 100, results: [{ url: result(id) }] })
    }
    if (url.pathname === '/v1/chat/completions') {
      if (req.headers.authorization !== 'Bearer grsai-good-key') return json({ error: { message: 'Invalid token: grsai-bad-key', type: 'invalid_request_error' } }, 401)
      return json(chat ?? { id: 'chatcmpl-1', object: 'chat.completion', model: body.model,
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: `Draft from ${body.model}` } }],
        usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 } })
    }
    if (url.pathname === '/v1/video/veo') {
      const id = `veo-${randomUUID()}`
      polls.set(id, 0)
      return json({ code: 0, msg: 'success', data: { id } })
    }
    if (url.pathname === '/v1/draw/result') {
      const count = polls.get(body.id) ?? 0
      polls.set(body.id, count + 1)
      if (count === 0) return json({ code: 0, data: { id: body.id, status: 'running', progress: 40 } })
      return json({ code: 0, data: { id: body.id, status: 'succeeded', progress: 100, url: result(body.id) } })
    }
    if (url.pathname === '/files/out.png') { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(png) }
    if (url.pathname === '/files/out.mp4') { res.writeHead(200, { 'content-type': 'video/mp4' }); return res.end(mp4) }
    res.writeHead(404); res.end()
  })
  await new Promise((resolve, reject) => { http.once('error', reject); http.listen(0, '127.0.0.1', resolve) })
  cleanups.push(() => { http.closeAllConnections(); return new Promise(resolve => http.close(resolve)) })
  base = `http://127.0.0.1:${http.address().port}`
  return { calls, png, mp4, baseUrl: base }
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

const save = (f, baseUrl, apiKey = 'grsai-good-key', extra = {}) =>
  f.settings.save({ provider: 'grsai', baseUrl, model: DEFAULTS.grsai.model, videoModel: DEFAULTS.grsai.videoModel, apiKey, revision: 0, ...extra })

const runVideo = (f, args) => f.ctx.tools.execute({ callId: 'video', name: 'video_generate', arguments: args, agent: f.agent, signal: new AbortController().signal })

describe('GrsAI provider', () => {
  it('lists GrsAI with image and video models, a host-only base and the mainland default', () => {
    expect(DEFAULTS.grsai).toEqual({ baseUrl: 'https://grsai.dakka.com.cn', model: 'nano-banana-fast', videoModel: 'veo3.1-fast', textModel: 'gemini-3.1-pro' })
    expect(MODEL_CATALOG.grsai.textModels.slice(0, 2)).toEqual(['gemini-3.1-pro', 'gpt-5.6-sol'])
    // The text menu carries chat models only; image models live in their own list.
    expect(MODEL_CATALOG.grsai.textModels.some(model => /image|banana/.test(model))).toBe(false)
    expect(() => profile('grsai', { textModel: 'bad model' })).toThrow(/valid text model/)
    expect(MODEL_CATALOG.grsai.models).toEqual(expect.arrayContaining(['nano-banana-pro', 'gpt-image-2']))
    expect(MODEL_CATALOG.grsai.videoModels).toEqual(['veo3.1-fast', 'veo3.1-pro', 'minimax-h3', 'agnes-video-2.5'])
    // A pasted endpoint collapses to the documented host.
    expect(profile('grsai', { baseUrl: 'https://grsaiapi.com/v1/draw/completions' }).baseUrl).toBe('https://grsaiapi.com')
    expect(() => profile('grsai', { videoModel: 'sora-2' })).toThrow(/supported video model/)
  })

  it('saves a key with one balance check that submits no generation and keeps the key out of results and logs', async () => {
    const f = await fixture(); const s = await grsai()
    const result = await save(f, s.baseUrl)
    expect(s.calls).toHaveLength(1)
    expect(s.calls[0]).toMatchObject({ url: '/client/openapi/getAPIKeyCredits', method: 'POST', auth: 'Bearer grsai-good-key', body: { apiKey: 'grsai-good-key' } })
    expect(result.profiles.grsai).toMatchObject({ configured: true, validation: 'credits', videoModel: 'veo3.1-fast' })
    expect(JSON.stringify(result)).not.toContain('grsai-good-key')
    expect(JSON.stringify(f.log.mock.calls)).not.toContain('grsai-good-key')
  })

  it('rejects a bad key as AUTH without storing it or echoing the provider message', async () => {
    const f = await fixture(); const s = await grsai()
    await expect(save(f, s.baseUrl, 'grsai-bad-key')).rejects.toMatchObject({ code: 'AUTH' })
    expect((await f.settings.describe()).profiles.grsai.configured).toBe(false)
    await expect(save(f, s.baseUrl, 'grsai-bad-key')).rejects.not.toThrow(/grsai-bad-key/)
  })

  it('draws Nano Banana and GPT Image through the unified task API and downloads the result', async () => {
    const s = await grsai()
    const nano = await generate('grsai', { baseUrl: s.baseUrl, model: 'nano-banana-pro' }, 'k', { prompt: 'A lighthouse', aspect_ratio: '16:9' })
    expect(Buffer.compare(nano, s.png)).toBe(0)
    const submitted = s.calls.find(call => call.url === '/v1/api/generate')
    expect(submitted).toMatchObject({ method: 'POST', auth: 'Bearer k', body: { model: 'nano-banana-pro', aspectRatio: '16:9', imageSize: '1K', replyType: 'async' } })
    expect(submitted.body.prompt).toContain('A lighthouse')
    // Running, then succeeded: the result endpoint is polled by task id until done.
    const polls = s.calls.filter(call => call.url === '/v1/api/result')
    expect(polls.length).toBeGreaterThanOrEqual(2)
    expect(polls[0]).toMatchObject({ method: 'GET', auth: 'Bearer k' })
    expect(polls[0].query).toMatch(/^\?id=nano-banana-pro-/)

    // GPT Image 2 takes the ratio; the VIP canvases take a pixel size only.
    await generate('grsai', { baseUrl: s.baseUrl, model: 'gpt-image-2' }, 'k', { prompt: 'A lighthouse', aspect_ratio: '9:16' })
    await generate('grsai', { baseUrl: s.baseUrl, model: 'gpt-image-2-vip' }, 'k', { prompt: 'A lighthouse', aspect_ratio: '16:9' })
    const bodies = s.calls.filter(call => call.url === '/v1/api/generate').map(call => call.body)
    expect(bodies[1]).toMatchObject({ model: 'gpt-image-2', aspectRatio: '9:16' })
    expect(bodies[2]).toMatchObject({ model: 'gpt-image-2-vip', aspectRatio: '1280x720' })
  })

  it('downloads result links only over HTTPS, including after a redirect', async () => {
    await expect(download('http://cdn.example.com/out.png', 1024)).rejects.toMatchObject({ code: 'RESPONSE' })
    // A signed link that redirects to plain HTTP is refused before reading the body.
    const downgraded = new Response('x')
    Object.defineProperty(downgraded, 'url', { value: 'http://cdn.example.com/out.png' })
    const fetchImpl = vi.fn(async () => downgraded)
    await expect(download('https://cdn.example.com/out.png', 1024, { fetchImpl })).rejects.toMatchObject({ code: 'RESPONSE', message: expect.stringContaining('insecure') })
    expect(fetchImpl.mock.calls[0][1]).not.toHaveProperty('headers')
  })

  it('reports a violating task as MODERATION and a failed one as PROVIDER_ERROR, never with the provider text', async () => {
    const violation = await grsai({ failure: 'violation' })
    const declined = generate('grsai', { baseUrl: violation.baseUrl, model: 'nano-banana-fast' }, 'k', { prompt: 'x' })
    await expect(declined).rejects.toMatchObject({ code: 'MODERATION' })
    await expect(declined).rejects.not.toThrow(/echo of the prompt/)
    const failed = await grsai({ failure: 'failed' })
    await expect(generate('grsai', { baseUrl: failed.baseUrl, model: 'nano-banana-fast' }, 'k', { prompt: 'x' })).rejects.toMatchObject({ code: 'PROVIDER_ERROR' })
  })

  it('maps each video family to its request and refuses what the model cannot render', () => {
    expect(grsaiVideoRequest('veo3.1-pro', 'p', '9:16')).toEqual({ legacy: true, path: '/v1/video/veo', body: { model: 'veo3.1-pro', prompt: 'p', aspectRatio: '9:16' } })
    // MiniMax names its canvases instead of taking a ratio.
    expect(grsaiVideoRequest('minimax-h3', 'p', '9:16')).toEqual({ legacy: false, body: { model: 'minimax-h3', prompt: 'p', aspectRatio: 'portrait', resolution: '768p', duration: 6 } })
    expect(grsaiVideoRequest('minimax-h3', 'p', '16:9', 12).body).toMatchObject({ aspectRatio: 'landscape', duration: 12 })
    expect(grsaiVideoRequest('agnes-video-2.5', 'p', '21:9').body).toEqual({ model: 'agnes-video-2.5', prompt: 'p', aspectRatio: '21:9', resolution: '720p', duration: 5 })
    expect(() => grsaiVideoRequest('minimax-h3', 'p', '1:1')).toThrow(expect.objectContaining({ code: 'RATIO' }))
    expect(() => grsaiVideoRequest('agnes-video-2.5', 'p', '16:9', 13)).toThrow(expect.objectContaining({ code: 'DURATION' }))
    expect(() => grsaiVideoRequest('minimax-h3', 'p', '16:9', 16)).toThrow(expect.objectContaining({ code: 'DURATION' }))
    expect(videoCapabilities('veo3.1-fast')).toEqual({ ratios: ['16:9', '9:16'], duration: null })
  })
})

describe('video_generate', () => {
  it('generates a Veo clip on the legacy route and saves the MP4 through the sandboxed writer', async () => {
    const f = await fixture(); const s = await grsai()
    await mountPlugin(f)
    await save(f, s.baseUrl, 'grsai-good-key', { videoModel: 'veo3.1-pro' })
    const result = await runVideo(f, { prompt: 'Waves at dusk', aspect_ratio: '9:16' })
    expect(result.isError, JSON.stringify(result)).toBeFalsy()
    const value = JSON.parse(result.content[0].text)
    const sha = createHash('sha256').update(s.mp4).digest('hex')
    expect(value).toEqual({ asset_id: `sha256:${sha}`, workspace_path: `.workbuddy/generated-videos/${sha}.mp4`, media_type: 'video/mp4', bytes: s.mp4.length, sha256: sha, provider: 'grsai', model: 'veo3.1-pro' })
    expect(Buffer.compare(await readFile(path.join(f.workspace, value.workspace_path)), s.mp4)).toBe(0)
    expect(s.calls.find(call => call.url === '/v1/video/veo').body).toMatchObject({ model: 'veo3.1-pro', aspectRatio: '9:16', webHook: '-1' })
  })

  it('generates MiniMax and Agnes clips on the unified API with the requested duration', async () => {
    const f = await fixture(); const s = await grsai()
    await mountPlugin(f)
    await save(f, s.baseUrl, 'grsai-good-key', { videoModel: 'minimax-h3' })
    const minimax = await runVideo(f, { prompt: 'Rain on neon', aspect_ratio: '9:16', duration: 10 })
    expect(minimax.isError, JSON.stringify(minimax)).toBeFalsy()
    expect(JSON.parse(minimax.content[0].text)).toMatchObject({ model: 'minimax-h3', media_type: 'video/mp4' })
    expect(s.calls.find(call => call.url === '/v1/api/generate').body).toMatchObject({ model: 'minimax-h3', aspectRatio: 'portrait', resolution: '768p', duration: 10, replyType: 'async' })

    await f.settings.save({ provider: 'grsai', baseUrl: s.baseUrl, model: DEFAULTS.grsai.model, videoModel: 'agnes-video-2.5', apiKey: '', revision: 1 })
    const agnes = await runVideo(f, { prompt: 'A city at dawn', aspect_ratio: '21:9' })
    expect(agnes.isError, JSON.stringify(agnes)).toBeFalsy()
    expect(s.calls.filter(call => call.url === '/v1/api/generate').at(-1).body).toMatchObject({ model: 'agnes-video-2.5', aspectRatio: '21:9', resolution: '720p', duration: 5 })
  })

  it('refuses a ratio the saved model cannot render before submitting anything', async () => {
    const f = await fixture(); const s = await grsai()
    await mountPlugin(f)
    await save(f, s.baseUrl)
    const before = s.calls.length
    const result = await runVideo(f, { prompt: 'Waves', aspect_ratio: '21:9' })
    expect(result.isError).toBe(true)
    expect(JSON.stringify(result)).toContain('16:9, 9:16')
    expect(s.calls.length).toBe(before)
  })

  it('refuses without a saved GrsAI key and points to the settings page', async () => {
    const f = await fixture()
    await mountPlugin(f)
    const result = await runVideo(f, { prompt: 'Waves' })
    expect(result.isError).toBe(true)
    expect(JSON.stringify(result)).toContain('GrsAI')
  })

  it('tells the agent about video only once a GrsAI key is saved', async () => {
    const f = await fixture(); const s = await grsai()
    await mountPlugin(f)
    const section = async () => (await f.ctx.systemPrompt.assemble()).sections.find(item => item.name === VIDEO_PROMPT_SECTION)?.text
    expect(await section()).toBe(UNCONFIGURED_VIDEO_PROMPT)
    await save(f, s.baseUrl)
    expect(await section()).toBe(CONFIGURED_VIDEO_PROMPT)
  })
})

describe('text_generate', () => {
  const runText = (f, args) => f.ctx.tools.execute({ callId: 'text', name: 'text_generate', arguments: args, agent: f.agent, signal: new AbortController().signal })

  it('sends one chat completion to the saved text model and returns its reply', async () => {
    const f = await fixture(); const s = await grsai()
    await mountPlugin(f)
    await save(f, s.baseUrl, 'grsai-good-key', { textModel: 'gpt-5.6-sol' })
    const result = await runText(f, { prompt: 'Write a tagline for a lighthouse museum.', instructions: 'Answer in Chinese.', max_output_tokens: 200 })
    expect(result.isError, JSON.stringify(result)).toBeFalsy()
    expect(result.content[0].text).toBe('[grsai gpt-5.6-sol, finish_reason=stop]\n\nDraft from gpt-5.6-sol')
    const call = s.calls.find(item => item.url === '/v1/chat/completions')
    expect(call).toMatchObject({ method: 'POST', auth: 'Bearer grsai-good-key' })
    expect(call.body).toEqual({
      model: 'gpt-5.6-sol', stream: false, max_tokens: 200,
      messages: [{ role: 'system', content: 'Answer in Chinese.' }, { role: 'user', content: 'Write a tagline for a lighthouse museum.' }],
    })
    // Neither the prompt nor the reply reaches the host log.
    expect(JSON.stringify(f.log.mock.calls)).not.toMatch(/lighthouse|Draft from/)
  })

  it('classifies a rejected key and a filtered reply without echoing provider text', async () => {
    const f = await fixture(); const s = await grsai()
    await mountPlugin(f)
    await save(f, s.baseUrl)
    const spec = await f.settings.grsaiSpec()
    const { grsaiText } = await import('../packages/dsh-image-generation/lib/grsai.js')
    const rejected = grsaiText({ ...spec }, 'grsai-bad-key', { prompt: 'x' })
    await expect(rejected).rejects.toMatchObject({ code: 'AUTH' })
    await expect(rejected).rejects.not.toThrow(/grsai-bad-key/)
    const filtered = await grsai({ chat: { choices: [{ index: 0, finish_reason: 'content_filter', message: { role: 'assistant', content: '' } }] } })
    await expect(grsaiText({ ...spec, baseUrl: filtered.baseUrl }, 'grsai-good-key', { prompt: 'x' })).rejects.toMatchObject({ code: 'MODERATION' })
  })

  it('checks its arguments and needs a saved GrsAI key', async () => {
    const f = await fixture(); const s = await grsai()
    await mountPlugin(f)
    const unconfigured = await runText(f, { prompt: 'Hi' })
    expect(unconfigured.isError).toBe(true)
    expect(JSON.stringify(unconfigured)).toContain('GrsAI')
    await save(f, s.baseUrl)
    const tooLong = await runText(f, { prompt: 'Hi', max_output_tokens: 40000 })
    expect(tooLong.isError).toBe(true)
    expect(JSON.stringify(tooLong)).toContain('max_output_tokens')
    expect(s.calls.some(item => item.url === '/v1/chat/completions')).toBe(false)
  })

  it('tells the agent about text generation only once a GrsAI key is saved', async () => {
    const f = await fixture(); const s = await grsai()
    await mountPlugin(f)
    const section = async () => (await f.ctx.systemPrompt.assemble()).sections.find(item => item.name === TEXT_PROMPT_SECTION)?.text
    expect(await section()).toBe(UNCONFIGURED_TEXT_PROMPT)
    await save(f, s.baseUrl)
    expect(await section()).toBe(CONFIGURED_TEXT_PROMPT)
  })
})

describe('GrsAI credits', () => {
  it('reads the saved key\'s balance through the credits route, never returning the key', async () => {
    const f = await fixture(); const s = await grsai()
    const plugin = await mountPlugin(f)
    const unconfigured = await plugin.route('/api/image-generation.credits').fetch(new Request('http://local/api/image-generation.credits'))
    expect(unconfigured.status).toBe(400)
    expect(await unconfigured.json()).toMatchObject({ code: 'NOT_CONFIGURED' })

    await save(f, s.baseUrl)
    const response = await plugin.route('/api/image-generation.credits').fetch(new Request('http://local/api/image-generation.credits'))
    expect(response.headers.get('cache-control')).toBe('no-store')
    const text = await response.text()
    expect(JSON.parse(text)).toEqual({ credits: 5000 })
    expect(text).not.toContain('grsai-good-key')
    expect(s.calls.at(-1)).toMatchObject({ url: '/client/openapi/getAPIKeyCredits', auth: 'Bearer grsai-good-key' })
  })

})
