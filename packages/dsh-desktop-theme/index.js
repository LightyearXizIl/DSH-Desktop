import { credentialKey } from '@deepseek-ai/dsh-credentials'
import Schema from '@deepseek-ai/schemastery'
import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

export const name = 'dsh-desktop-theme'
export const inject = ['connection', 'credentials']
export const Config = Schema.object({ root: Schema.string().required() })

const KEY = credentialKey('dsh-desktop-theme', 'appearance')
const MAX_BODY = 3_000_000
const MAX_WALLPAPER_DATA_URL = 2_200_000
const MAX_MEDIA_BYTES = 80 * 1024 * 1024
const MEDIA_TYPES = new Map([
  ['video/mp4', 'mp4'],
  ['video/webm', 'webm'],
  ['video/ogg', 'ogg'],
  ['video/quicktime', 'mov'],
  ['video/x-m4v', 'm4v'],
  ['video/x-matroska', 'mkv'],
])

export function normalizeThemeSettings(value) {
  const source = isRecord(value) ? value : {}
  const mode = source.mode === 'compat' ? 'compat' : 'mica'
  const background = source.background === 'wallpaper' ? 'wallpaper' : 'fluid'
  const wallpaper = normalizeWallpaper(source.wallpaper)
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : true,
    mode,
    blur: number(source.blur, 20, 0, 40),
    frost: number(source.frost, 7, 0, 100),
    fluidHue: number(source.fluidHue, 320, 0, 360),
    fluidDepth: number(source.fluidDepth, 25, 0, 100),
    bgBrightness: number(source.bgBrightness, 50, 0, 100),
    background,
    wallpaper,
    whale: boolean(source.whale, true),
    critters: boolean(source.critters, true),
    mesh: boolean(source.mesh, true),
    spotlight: boolean(source.spotlight, true),
    press: boolean(source.press, true),
    motion: oneOf(source.motion, ['system', 'always']),
    effortSlider: boolean(source.effortSlider, true),
    effortStyle: oneOf(source.effortStyle, ['codex', 'claude']),
    effortMotion: oneOf(source.effortMotion, ['full', 'fast', 'quick']),
    effortTicks: oneOf(source.effortTicks, ['highlight', 'dim', 'hidden']),
    wallpaperBlur: number(source.wallpaperBlur, 0, 0, 40),
    wallpaperFrost: number(source.wallpaperFrost, 0, 0, 100),
    videoBlur: number(source.videoBlur, 6, 0, 40),
    videoBrightness: number(source.videoBrightness, 45, 0, 100),
  }
}

export function apply(ctx, config) {
  const wallpaperDirectory = join(config.root, 'wallpapers')
  const readState = async () => {
    const record = await ctx.credentials.readRecord(KEY)
    if (record?.kind !== 'grant') return { revision: 0, settings: normalizeThemeSettings({}) }
    const payload = isRecord(record.payload) ? record.payload : {}
    return {
      revision: Number.isSafeInteger(payload.revision) ? payload.revision : 0,
      settings: normalizeThemeSettings(payload.settings),
    }
  }

  ctx.connection.fetch.register({
    path: '/api/desktop-theme',
    methods: ['GET', 'POST', 'HEAD'],
    requestBody: 'buffered',
    async fetch(request) {
      if (request.method === 'GET' || request.method === 'HEAD') {
        try {
          return Response.json(await readState(), { headers: { 'cache-control': 'no-store' } })
        } catch {
          return jsonError('Could not read the desktop theme settings.', 500)
        }
      }
      try {
        const body = JSON.parse((await readBounded(request, MAX_BODY)).toString('utf8'))
        if (!isRecord(body) || !Number.isSafeInteger(body.revision)) {
          return jsonError('Invalid theme settings payload.', 400)
        }
        const settings = normalizeThemeSettings(body.settings)
        let previousWallpaper = ''
        const result = await ctx.credentials.modifyRecord(KEY, async (current) => {
          const payload = current?.kind === 'grant' && isRecord(current.payload) ? current.payload : {}
          const currentRevision = Number.isSafeInteger(payload.revision) ? payload.revision : 0
          if (body.revision !== currentRevision) throw new ThemeConflict(currentRevision)
          previousWallpaper = normalizeThemeSettings(payload.settings).wallpaper
          return { kind: 'grant', payload: { revision: currentRevision + 1, settings } }
        })
        if (previousWallpaper !== settings.wallpaper) {
          // The settings write is already committed. A stale media file that
          // cannot be removed must not turn a successful save into a failure
          // (the client would otherwise treat the new wallpaper as unsaved).
          await removeHostWallpaper(previousWallpaper, wallpaperDirectory).catch(() => {})
        }
        const payload = result?.kind === 'grant' && isRecord(result.payload) ? result.payload : {}
        return Response.json({
          revision: Number.isSafeInteger(payload.revision) ? payload.revision : 0,
          settings: normalizeThemeSettings(payload.settings),
        }, { headers: { 'cache-control': 'no-store' } })
      } catch (error) {
        if (error instanceof ThemeConflict) {
          return Response.json({
            error: 'The theme settings changed in another window.',
            revision: error.revision,
          }, { status: 409, headers: { 'cache-control': 'no-store' } })
        }
        return jsonError('Could not save the desktop theme settings.', 500)
      }
    },
  })

  ctx.connection.fetch.register({
    path: '/api/desktop-theme/wallpaper',
    methods: ['GET', 'POST', 'DELETE'],
    requestBody: 'streaming',
    async fetch(request) {
      try {
        if (request.method === 'GET') {
          const id = new URL(request.url).searchParams.get('id') ?? ''
          const path = wallpaperPath(wallpaperDirectory, id)
          if (path === undefined) return jsonError('Invalid wallpaper id.', 400)
          const info = await stat(path)
          const bytes = await readFile(path)
          return new Response(bytes, {
            headers: {
              'content-type': mediaTypeFor(id),
              'content-length': String(info.size),
              'cache-control': 'private, max-age=31536000, immutable',
            },
          })
        }
        if (request.method === 'DELETE') {
          const id = new URL(request.url).searchParams.get('id') ?? ''
          const path = wallpaperPath(wallpaperDirectory, id)
          if (path === undefined) return jsonError('Invalid wallpaper id.', 400)
          const state = await readState()
          // A client cleanup can race with a commit whose response was lost.
          // Keep any file the durable settings still reference.
          if (state.settings.wallpaper === `host:${id}`) {
            return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })
          }
          await rm(path, { force: true })
          return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })
        }
        const type = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ?? ''
        const extension = MEDIA_TYPES.get(type)
        if (extension === undefined) return jsonError('Unsupported wallpaper media type.', 415)
        await mkdir(wallpaperDirectory, { recursive: true })
        const id = `${randomUUID()}.${extension}`
        const destination = join(wallpaperDirectory, id)
        const temporary = `${destination}.${randomUUID()}.tmp`
        let file
        let size = 0
        try {
          file = await open(temporary, 'wx', 0o600)
          const reader = request.body?.getReader()
          if (reader === undefined) throw new Error('A wallpaper body is required.')
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            size += value.length
            if (size > MAX_MEDIA_BYTES) {
              await reader.cancel()
              throw new Error('Wallpaper media is too large.')
            }
            await file.write(value)
          }
          await file.close()
          file = undefined
          if (size === 0) throw new Error('Wallpaper media is empty.')
          await rename(temporary, destination)
          return Response.json({ id, size }, { headers: { 'cache-control': 'no-store' } })
        } catch (error) {
          await file?.close().catch(() => {})
          await rm(temporary, { force: true })
          throw error
        }
      } catch {
        return jsonError('Could not store the wallpaper media.', 500)
      }
    },
  })

  // The client owns the theme UI, so suppress the generated settings page while
  // keeping the host half mounted for its authenticated settings route.
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber))
  })
}

class ThemeConflict extends Error {
  constructor(revision) {
    super('Theme settings revision conflict')
    this.revision = revision
  }
}

async function readBounded(request, maximum) {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maximum) throw new Error('Theme settings payload is too large.')
  const reader = request.body?.getReader()
  if (!reader) throw new Error('A JSON body is required.')
  const chunks = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.length
      if (length > maximum) {
        await reader.cancel()
        throw new Error('Theme settings payload is too large.')
      }
      chunks.push(value)
    }
    return Buffer.concat(chunks)
  } finally {
    reader.releaseLock()
  }
}

function jsonError(error, status) {
  return Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } })
}

function number(value, fallback, min, max) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function boolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback
}

/** The first choice is the fallback for anything outside the list. */
function oneOf(value, choices) {
  return choices.includes(value) ? value : choices[0]
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeWallpaper(value) {
  if (typeof value !== 'string') return ''
  if (value.startsWith('data:image/')) {
    return value.length <= MAX_WALLPAPER_DATA_URL ? value : ''
  }
  if (value.startsWith('host:')) {
    return wallpaperPath('', value.slice(5)) === undefined ? '' : value
  }
  return ''
}

function wallpaperPath(directory, id) {
  if (!/^[0-9a-f-]{36}\.(?:mp4|webm|ogg|mov|m4v|mkv)$/u.test(id)) return undefined
  return directory === '' ? id : join(directory, id)
}

function mediaTypeFor(id) {
  const extension = id.slice(id.lastIndexOf('.') + 1)
  for (const [type, suffix] of MEDIA_TYPES) if (suffix === extension) return type
  return 'application/octet-stream'
}

async function removeHostWallpaper(wallpaper, directory) {
  if (!wallpaper.startsWith('host:')) return
  const path = wallpaperPath(directory, wallpaper.slice(5))
  if (path === undefined) return
  await rm(path, { force: true })
}
