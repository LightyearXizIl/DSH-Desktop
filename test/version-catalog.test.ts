import { describe, expect, it } from 'vitest'
import {
  archiveFeedUrl,
  compareVersions,
  fetchAvailableReleases,
  GITHUB_FEED,
  parseVersionIndex,
  VERSION_INDEX_URL
} from '../src/main/update/version-catalog'

describe('version-catalog constants', () => {
  it('points the stable feed and history at this repository GitHub Releases', () => {
    expect(GITHUB_FEED).toEqual({
      provider: 'github',
      owner: 'LightyearXizIl',
      repo: 'DSH-Desktop'
    })
    expect(VERSION_INDEX_URL).toBe(
      'https://api.github.com/repos/LightyearXizIl/DSH-Desktop/releases?per_page=100'
    )
  })

  it('builds a per-version archive feed url with a trailing slash', () => {
    expect(archiveFeedUrl('1.2.3')).toBe(
      'https://github.com/LightyearXizIl/DSH-Desktop/releases/download/v1.2.3/'
    )
  })
})

describe('compareVersions', () => {
  it('orders by numeric segments', () => {
    expect(compareVersions('1.2.0', '1.10.0')).toBe(-1)
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1)
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
  })

  it('treats a prerelease as lower than its release', () => {
    expect(compareVersions('1.2.3-rc.1', '1.2.3')).toBe(-1)
    expect(compareVersions('1.2.3', '1.2.3-rc.1')).toBe(1)
    expect(compareVersions('1.2.3-rc.1', '1.2.3-rc.2')).toBe(-1)
  })

  it('compares prerelease counters numerically, not lexicographically', () => {
    // "rc.10" < "rc.9" under string comparison; semver says the reverse.
    expect(compareVersions('1.2.3-rc.10', '1.2.3-rc.9')).toBe(1)
    expect(compareVersions('1.2.3-rc.9', '1.2.3-rc.10')).toBe(-1)
    expect(compareVersions('1.2.3-alpha.10', '1.2.3-alpha.9')).toBe(1)
    expect(compareVersions('1.2.3-rc.10', '1.2.3-rc.1')).toBe(1)
  })

  it('follows semver identifier precedence', () => {
    // fewer identifiers < more ("alpha" < "alpha.1")
    expect(compareVersions('1.2.3-alpha', '1.2.3-alpha.1')).toBe(-1)
    // numeric identifiers < alphanumeric ones ("1" < "alpha")
    expect(compareVersions('1.2.3-1', '1.2.3-alpha')).toBe(-1)
    expect(compareVersions('1.2.3-alpha', '1.2.3-beta')).toBe(-1)
    expect(compareVersions('1.2.3-rc.10', '1.2.3-rc.10')).toBe(0)
  })
})

describe('parseVersionIndex', () => {
  it('keeps only publishable GitHub releases with update metadata', () => {
    const raw = [
      {
        tag_name: 'v1.2.3',
        draft: false,
        prerelease: false,
        assets: [{ name: 'latest.yml' }]
      },
      {
        tag_name: 'v1.3.0',
        draft: false,
        prerelease: false,
        assets: [{ name: 'README.txt' }]
      },
      {
        tag_name: 'v1.4.0',
        draft: true,
        prerelease: false,
        assets: [{ name: 'latest.yml' }]
      },
      { tag_name: 'release-1.5.0', assets: [{ name: 'latest.yml' }] },
      { nope: true },
      42
    ]
    expect(parseVersionIndex(raw)).toEqual([
      {
        version: '1.2.3',
        tag: 'v1.2.3',
        archiveUrl: 'https://github.com/LightyearXizIl/DSH-Desktop/releases/download/v1.2.3/',
        prerelease: false
      }
    ])
  })

  it('returns an empty array for non-arrays', () => {
    expect(parseVersionIndex(null)).toEqual([])
    expect(parseVersionIndex({})).toEqual([])
    expect(parseVersionIndex('nope')).toEqual([])
  })
})

describe('fetchAvailableReleases', () => {
  const index = [
    { tag_name: 'v1.0.0', assets: [{ name: 'latest.yml' }] },
    { tag_name: 'v1.2.0', assets: [{ name: 'latest.yml' }] },
    { tag_name: 'v1.1.0', assets: [{ name: 'latest.yml' }] }
  ]
  const ok = () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(index) } as Response)

  it('only returns older releases, excluding the current and newer versions', async () => {
    const releases = await fetchAvailableReleases('1.1.0', ok as unknown as typeof fetch)
    expect(releases.map((r) => r.version)).toEqual(['1.0.0'])
  })

  it('returns no rollback options when only current and newer releases exist', async () => {
    const releases = await fetchAvailableReleases('1.0.0', ok as unknown as typeof fetch)
    expect(releases).toEqual([])
  })

  it('keeps prereleases below the running release in numeric order', async () => {
    const response = () => Promise.resolve({ ok: true, json: async () => [
      { tag_name: 'v1.2.0-rc.9', prerelease: true, assets: [{ name: 'latest.yml' }] },
      { tag_name: 'v1.2.0-rc.10', prerelease: true, assets: [{ name: 'latest.yml' }] },
      { tag_name: 'v1.2.0', assets: [{ name: 'latest.yml' }] },
      { tag_name: 'v1.3.0', assets: [{ name: 'latest.yml' }] }
    ] } as Response)
    const releases = await fetchAvailableReleases('1.2.0', response as unknown as typeof fetch)
    expect(releases.map(release => release.version)).toEqual(['1.2.0-rc.10', '1.2.0-rc.9'])
  })

  it('throws when the request fails', async () => {
    const bad = () => Promise.resolve({ ok: false, status: 503 } as Response)
    await expect(
      fetchAvailableReleases('1.1.0', bad as unknown as typeof fetch)
    ).rejects.toThrow()
  })

  it('throws when the network rejects', async () => {
    const boom = () => Promise.reject(new Error('offline'))
    await expect(
      fetchAvailableReleases('1.1.0', boom as unknown as typeof fetch)
    ).rejects.toThrow('offline')
  })
})
