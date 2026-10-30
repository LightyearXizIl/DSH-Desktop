import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { CurrentReleaseNotes } from '../../shared/contracts'
import { releaseNotesForDisplay } from '../../shared/release-notes'
import { normalizeReleaseNotes } from './update-state'
import { fetchReleaseBody, releasePageUrl } from './version-catalog'

export interface CurrentReleaseNotesOptions {
  /** The running Desktop version. */
  version: string
  /** JSON file that keeps the last notes read, so the About page works offline. */
  cacheFile: string
  fetchBody?: (version: string) => Promise<unknown>
  warn?: (message: string, error: unknown) => void
}

/**
 * Notes of the running version for the About page: read from its GitHub
 * Release once per session, then served from memory. A successful read is
 * also written to disk, and a failed read falls back to that copy when it
 * belongs to this version, so the page still shows the notes offline.
 */
export function createCurrentReleaseNotes(options: CurrentReleaseNotesOptions): () => Promise<CurrentReleaseNotes> {
  const fetchBody = options.fetchBody ?? fetchReleaseBody
  const warn = options.warn ?? ((message, error) => console.warn(message, error))
  const url = releasePageUrl(options.version)
  let pending: Promise<CurrentReleaseNotes> | undefined

  const readCache = async (): Promise<CurrentReleaseNotes | undefined> => {
    try {
      const value: unknown = JSON.parse(await readFile(options.cacheFile, 'utf8'))
      if (typeof value !== 'object' || value === null) return undefined
      const record = value as Record<string, unknown>
      if (record.version !== options.version) return undefined
      return { version: options.version, notes: releaseNotesForDisplay(normalizeReleaseNotes(record.notes)), url }
    } catch {
      // No copy yet, or an unreadable one: the caller reports the read failure instead.
      return undefined
    }
  }

  const load = async (): Promise<CurrentReleaseNotes> => {
    try {
      // Only the sections the app shows reach the renderer (and the offline copy).
      const notes = releaseNotesForDisplay(normalizeReleaseNotes(await fetchBody(options.version)))
      const result: CurrentReleaseNotes = { version: options.version, notes, url }
      try {
        await mkdir(dirname(options.cacheFile), { recursive: true })
        await writeFile(options.cacheFile, `${JSON.stringify({ version: options.version, notes })}\n`, 'utf8')
      } catch (error) {
        // The copy is only an offline convenience; the notes were read.
        warn('[about] could not keep release notes for offline use', error)
      }
      return result
    } catch (error) {
      const cached = await readCache()
      if (cached !== undefined) return cached
      throw error
    }
  }

  return () => {
    // Retry after a failure; keep a success for the rest of the session.
    pending ??= load().catch((error: unknown) => {
      pending = undefined
      throw error
    })
    return pending
  }
}
