import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCurrentReleaseNotes } from '../src/main/update/current-release-notes'
import { fetchReleaseBody, releasePageUrl } from '../src/main/update/version-catalog'

const roots: string[] = []

async function cacheFile(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-release-notes-'))
  roots.push(root)
  return join(root, 'desktop-service', 'release-notes.json')
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('release notes of the running version', () => {
  it('reads the GitHub Release body by tag and treats an unpublished version as having no notes', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith('/releases/tags/v0.0.5')) return Response.json({ tag_name: 'v0.0.5', body: '## 更新内容\r\n- a' })
      return new Response('Not Found', { status: 404 })
    })
    await expect(fetchReleaseBody('0.0.5', fetchImpl as unknown as typeof fetch)).resolves.toBe('## 更新内容\r\n- a')
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.github.com/repos/LightyearXizIl/DSH-Desktop/releases/tags/v0.0.5')
    // A development build of an unreleased version is not an error.
    await expect(fetchReleaseBody('9.9.9', fetchImpl as unknown as typeof fetch)).resolves.toBeUndefined()
    const failing = vi.fn(async () => new Response('rate limited', { status: 403 }))
    await expect(fetchReleaseBody('0.0.5', failing as unknown as typeof fetch)).rejects.toThrow('403')
    expect(releasePageUrl('0.0.5')).toBe('https://github.com/LightyearXizIl/DSH-Desktop/releases/tag/v0.0.5')
  })

  it('reads once per session, keeps a copy, and serves that copy when GitHub is unreachable', async () => {
    const file = await cacheFile()
    // The internal section is dropped before the notes reach the renderer or the copy.
    const fetchBody = vi.fn(async () => '# DSH Desktop v0.0.5 — 主题\r\n\r\n## 更新内容\r\n- a\r\n\r\n## 说明\r\n- see harness.log')
    const read = createCurrentReleaseNotes({ version: '0.0.5', cacheFile: file, fetchBody })
    const first = await read()
    expect(first).toEqual({
      version: '0.0.5',
      notes: '# DSH Desktop v0.0.5 — 主题\n\n## 更新内容\n- a',
      url: 'https://github.com/LightyearXizIl/DSH-Desktop/releases/tag/v0.0.5'
    })
    await read()
    expect(fetchBody).toHaveBeenCalledTimes(1)
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ version: '0.0.5', notes: first.notes })

    // Next session, offline: the copy for this version is served.
    const offline = createCurrentReleaseNotes({
      version: '0.0.5',
      cacheFile: file,
      fetchBody: async () => { throw new Error('getaddrinfo ENOTFOUND api.github.com') }
    })
    await expect(offline()).resolves.toEqual(first)
  })

  it('does not serve another version\'s copy and retries after a failure', async () => {
    const file = await cacheFile()
    const { mkdir } = await import('node:fs/promises')
    await mkdir(join(file, '..'), { recursive: true })
    await writeFile(file, JSON.stringify({ version: '0.0.4', notes: 'old notes' }))
    const fetchBody = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('## 问题修复\n- b')
    const read = createCurrentReleaseNotes({ version: '0.0.5', cacheFile: file, fetchBody })
    await expect(read()).rejects.toThrow('timeout')
    await expect(read()).resolves.toMatchObject({ version: '0.0.5', notes: '## 问题修复\n- b' })
    expect(fetchBody).toHaveBeenCalledTimes(2)
  })

  it('still answers when the offline copy cannot be written', async () => {
    const warn = vi.fn()
    // A directory where the file should go makes the write fail.
    const file = await cacheFile()
    const { mkdir } = await import('node:fs/promises')
    await mkdir(file, { recursive: true })
    const read = createCurrentReleaseNotes({ version: '0.0.5', cacheFile: file, fetchBody: async () => 'notes', warn })
    await expect(read()).resolves.toMatchObject({ notes: 'notes' })
    expect(warn).toHaveBeenCalledOnce()
  })
})
