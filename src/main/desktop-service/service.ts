import { randomUUID } from 'node:crypto'
import { closeSync, existsSync, fstatSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  archiveFeedUrl,
  compareVersions,
  VERSION_INDEX_URL,
  UPDATE_REPOSITORY
} from '../update/version-catalog'

export const SERVICE_URL = 'https://dshdesktop.com/crash'
export type DesktopPlatform = 'mac' | 'mac-intel' | 'windows'
export type FailureKind = 'startup-failure' | 'harness-crash' | 'renderer-crash' | 'gpu-crash' | 'main-crash' | 'unclean-exit'
export type UpdateDecision =
  | { updateAvailable: false }
  | {
    updateAvailable: true
    version: string
    feedUrl: string
    releaseNotes?: string
    releaseUrl?: string
  }
type Request = (url: string, init?: RequestInit) => Promise<Response>
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+[\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*)?$/
export function isVersion(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 80 || !semver.test(value)) return false
  return !(semver.exec(value)?.[4]?.split('.').some(part => /^0\d+$/.test(part)))
}
export function isPrereleaseVersion(value: string): boolean {
  return Boolean(semver.exec(value)?.[4])
}
export function desktopPlatform(platform: string, arch: string): DesktopPlatform {
  if (platform === 'darwin' && arch === 'arm64') return 'mac'
  if (platform === 'darwin' && arch === 'x64') return 'mac-intel'
  if (platform === 'win32' && arch === 'x64') return 'windows'
  throw new Error(`Unsupported desktop platform: ${platform}/${arch}`)
}
export function redact(value: string): string {
  return value.replace(/(Bearer\s+)[^\s"',;]+/gi, '$1[REDACTED]')
    .replace(/(["']?(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret|token)["']?\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s,;}]+)/gi, '$1[REDACTED]')
    .replace(/\bsk-[a-zA-Z0-9_-]{8,}\b/g, '[REDACTED]')
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[REDACTED]@')
    .replace(/(?:\/Users\/|\/home\/)[^/\s]+/g, '/home/[USER]')
    .replace(/C:\\Users\\[^\\\s]+/gi, 'C:\\Users\\[USER]')
}
function atomic(path: string, value: unknown): void {
  const temp = `${path}.${randomUUID()}.tmp`
  try { writeFileSync(temp, JSON.stringify(value), { mode: 0o600 }); renameSync(temp, path) }
  finally { if (existsSync(temp)) unlinkSync(temp) }
}
export function tailLog(path: string): { lines: string[]; logStatus: 'ok' | 'missing' | 'truncated' | 'unreadable' } {
  let fd: number | undefined
  try {
    fd = openSync(path, 'r')
    const size = fstatSync(fd).size, start = Math.max(0, size - 1024 * 1024)
    const buffer = Buffer.alloc(size - start)
    const read = readSync(fd, buffer, 0, buffer.length, start)
    let text = buffer.subarray(0, read).toString('utf8')
    if (start > 0) { const newline = text.indexOf('\n'); text = newline < 0 ? '' : text.slice(newline + 1) }
    const lines = text.split(/\r?\n/)
    if (lines.at(-1) === '') lines.pop()
    const last = lines.slice(-100)
    const truncated = (start > 0 && last.length < 100) || last.some(line => line.length > 2000)
    return { lines: last.map(line => redact(line).slice(0, 2000)), logStatus: truncated ? 'truncated' : 'ok' }
  } catch (error) { return { lines: [], logStatus: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'unreadable' } }
  finally { if (fd !== undefined) closeSync(fd) }
}
export function isHealthySessionLog(lines: string[]): boolean {
  if (lines.length === 0) return false
  const tail = lines.slice(-30)
  const hasError = tail.some(line =>
    /render-process-gone:\s*reason=crashed/i.test(line) ||
    /GPU process gone:\s*reason=crashed/i.test(line) ||
    /Harness entry failed/i.test(line) ||
    /DSH entry failed/i.test(line) ||
    /uncaught exception/i.test(line) ||
    /unhandled rejection/i.test(line) ||
    /\bfatal\b/i.test(line) ||
    /STATUS_ACCESS_VIOLATION/i.test(line) ||
    /\(exit code [^0]\)/i.test(line)
  )
  if (hasError) return false
  return lines.some(line =>
    line.includes('Harness is ready') ||
    line.includes('cleared 1 stale Harness authentication cookie') ||
    line.includes('dsh web:')
  )
}

export class DesktopService {
  readonly installationId: string
  readonly platform: DesktopPlatform
  private sessionId?: string
  private flushing?: Promise<void>
  private readonly outbox: string
  private readonly marker: string
  constructor(private readonly options: { stateDir: string; logPath: string; version: string; platform: string; arch: string; request: Request; confirmUpload: (report: string) => Promise<boolean> }) {
    this.platform = desktopPlatform(options.platform, options.arch)
    if (!isVersion(options.version)) throw new Error('Invalid application version')
    this.outbox = join(options.stateDir, 'outbox')
    this.marker = join(options.stateDir, 'session.json')
    mkdirSync(this.outbox, { recursive: true, mode: 0o700 })
    const path = join(options.stateDir, 'installation.json')
    if (!existsSync(path)) atomic(path, { id: randomUUID() })
    this.installationId = (JSON.parse(readFileSync(path, 'utf8')) as { id: string }).id
    if (!uuid.test(this.installationId)) throw new Error('Invalid installation ID')
  }
  beginSession(): void {
    this.sessionId = randomUUID()
    atomic(this.marker, { eventId: this.sessionId, version: this.options.version })
  }
  markCleanExit(): void {
    try { unlinkSync(this.marker) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  }
  discard(eventId: string): boolean {
    if (!uuid.test(eventId)) return false
    const path = join(this.outbox, `${eventId}.json`)
    if (existsSync(path)) {
      try {
        unlinkSync(path)
        return true
      } catch {
        return false
      }
    }
    return false
  }
  capture(kind: FailureKind, message: string, eventId: string = randomUUID(), version = this.options.version): string {
    if (!uuid.test(eventId)) throw new Error('Invalid event ID')
    const path = join(this.outbox, `${eventId}.json`)
    if (existsSync(path)) return eventId
    const files = this.pending()
    while (files.length >= 50) unlinkSync(join(this.outbox, files.shift()!))
    atomic(path, { eventId, installationId: this.installationId, version, platform: this.platform, kind, occurredAt: new Date().toISOString(), message: redact(message).slice(0, 4000), ...tailLog(this.options.logPath) })
    return eventId
  }
  captureFatal(error: Error): void { this.capture('main-crash', error.stack ?? error.message, this.sessionId) }
  pending(): string[] {
    return readdirSync(this.outbox).filter(name => name.endsWith('.json') && uuid.test(name.slice(0, -5)))
      .sort((a, b) => statSync(join(this.outbox, a)).mtimeMs - statSync(join(this.outbox, b)).mtimeMs)
  }
  flush(): Promise<void> {
    this.flushing ??= this.flushPending().finally(() => { this.flushing = undefined })
    return this.flushing
  }
  private async flushPending(): Promise<void> {
    // Consume before sending: even an interrupted request must not be retried.
    for (let name = this.pending()[0]; name; name = this.pending()[0]) {
      const path = join(this.outbox, name)
      const body = readFileSync(path, 'utf8')
      unlinkSync(path)
      try {
        let kind: string | undefined
        try { kind = (JSON.parse(body) as { kind?: string }).kind } catch { /* A malformed report still goes through consent. */ }
        if (kind === 'unclean-exit') continue
        if (await this.options.confirmUpload(body) !== true) continue
        await this.options.request(SERVICE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(5000), redirect: 'error' })
      } catch { /* Best effort: failed reports are discarded. */ }
    }
  }

  // Keep the caller's manual flag for compatibility; presentation is local.
  // GitHub's release API is public and does not need installation identity.
  async checkUpdate(_manual = false): Promise<UpdateDecision> {
    const response = await this.options.request(VERSION_INDEX_URL, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'DSH-Desktop'
      },
      signal: AbortSignal.timeout(8_000),
      redirect: 'error'
    })
    if (!response.ok) throw new Error(`Update release request failed (${response.status})`)
    const releases = await response.json() as unknown
    if (!Array.isArray(releases)) throw new Error('Invalid update release list')
    const platformMetadata = this.platform === 'windows' ? 'latest.yml' : 'latest-mac.yml'
    const currentStable = !isPrereleaseVersion(this.options.version)
    const candidates = releases.flatMap((value: unknown) => {
      if (!value || typeof value !== 'object') return []
      const release = value as Record<string, unknown>
      if (release.draft === true) return []
      if (currentStable && release.prerelease === true) return []
      const tag = typeof release.tag_name === 'string' ? release.tag_name : ''
      if (!tag.startsWith('v')) return []
      const version = tag.slice(1)
      if (!isVersion(version)) return []
      const assets = Array.isArray(release.assets)
        ? release.assets.flatMap((asset: unknown) => {
          if (!asset || typeof asset !== 'object' || !('name' in asset)) return []
          return typeof asset.name === 'string' ? [asset.name] : []
        })
        : []
      if (!assets.includes(platformMetadata)) return []
      if (compareVersions(version.split('+')[0]!, this.options.version.split('+')[0]!) <= 0) return []
      return [{ release, version }]
    }).sort((a, b) => compareVersions(b.version, a.version))
    const selected = candidates[0]
    if (!selected) return { updateAvailable: false }
    const { release, version } = selected
    const releaseNotes = typeof release.body === 'string'
      ? release.body.replace(/\r\n?/g, '\n').trim().slice(0, 20_000) || undefined
      : undefined
    const releaseUrl = typeof release.html_url === 'string' &&
      release.html_url.startsWith(`https://github.com/${UPDATE_REPOSITORY}/releases/tag/`)
      ? release.html_url
      : undefined
    return {
      updateAvailable: true,
      version,
      feedUrl: archiveFeedUrl(version),
      releaseNotes,
      releaseUrl
    }
  }
}
