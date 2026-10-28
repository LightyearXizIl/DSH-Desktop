import type { AvailableRelease } from '../../shared/contracts'

export type { AvailableRelease }

export const UPDATE_REPOSITORY = 'LightyearXizIl/DSH-Desktop'
export const GITHUB_FEED = {
  provider: 'github' as const,
  owner: 'LightyearXizIl',
  repo: 'DSH-Desktop'
}
export const RELEASES_API_URL = `https://api.github.com/repos/${UPDATE_REPOSITORY}/releases?per_page=100`
export const VERSION_INDEX_URL = RELEASES_API_URL

const INDEX_TIMEOUT_MS = 8_000

export function archiveFeedUrl(version: string): string {
  return `https://github.com/${UPDATE_REPOSITORY}/releases/download/v${version}/`
}

/** Split "1.2.3-rc.1" into ([1,2,3], "rc.1"). Non-numeric segments read as 0. */
function splitVersion(value: string): { nums: number[]; pre: string } {
  const [core = '', ...preParts] = value.trim().split('-')
  const nums = core.split('.').map((part) => {
    const parsed = Number.parseInt(part, 10)
    return Number.isFinite(parsed) ? parsed : 0
  })
  while (nums.length < 3) nums.push(0)
  return { nums, pre: preParts.join('-') }
}

export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const left = splitVersion(a)
  const right = splitVersion(b)
  for (let i = 0; i < Math.max(left.nums.length, right.nums.length); i += 1) {
    const diff = (left.nums[i] ?? 0) - (right.nums[i] ?? 0)
    if (diff !== 0) return diff < 0 ? -1 : 1
  }
  return comparePrerelease(left.pre, right.pre)
}

/**
 * Semver-style prerelease precedence once the numeric core is equal. A release
 * (no prerelease) sorts above any prerelease; dot-separated identifiers
 * compare with numeric identifiers numerically and below alphanumeric ones,
 * and fewer identifiers sort below more ("alpha" < "alpha.1"). Plain string
 * comparison would order "rc.10" below "rc.9", mis-sorting the archive index
 * (and the picker/downgrade split in the preload) once a prerelease counter
 * reaches two digits.
 */
function comparePrerelease(left: string, right: string): -1 | 0 | 1 {
  if (left === right) return 0
  if (!left) return 1 // release > prerelease
  if (!right) return -1
  const l = left.split('.')
  const r = right.split('.')
  const length = Math.max(l.length, r.length)
  for (let i = 0; i < length; i += 1) {
    const x = l[i]
    const y = r[i]
    if (x === undefined) return -1 // fewer identifiers sorts below
    if (y === undefined) return 1
    if (x === y) continue
    const xn = /^\d+$/.test(x)
    const yn = /^\d+$/.test(y)
    if (xn && yn) {
      // Compare without Number() so leading-zero forms and large counters do
      // not lose precision.
      const nx = x.replace(/^0+/, '') || '0'
      const ny = y.replace(/^0+/, '') || '0'
      if (nx.length !== ny.length) return nx.length < ny.length ? -1 : 1
      if (nx !== ny) return nx < ny ? -1 : 1
      continue
    }
    if (xn) return -1 // numeric identifiers sort below alphanumeric ones
    if (yn) return 1
    if (x < y) return -1
    if (x > y) return 1
  }
  return 0
}

function releaseFromGitHub(value: unknown): AvailableRelease | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  if (record.draft === true) return undefined
  if (typeof record.tag_name !== 'string' || !record.tag_name.startsWith('v')) return undefined
  const version = record.tag_name.slice(1)
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) return undefined
  const assets = Array.isArray(record.assets)
    ? record.assets.flatMap((asset: unknown) => {
      if (!asset || typeof asset !== 'object' || !('name' in asset)) return []
      return typeof asset.name === 'string' ? [asset.name] : []
    })
    : []
  if (!assets.includes('latest.yml') && !assets.includes('latest-mac.yml')) return undefined
  return {
    version,
    tag: record.tag_name,
    archiveUrl: `https://github.com/${UPDATE_REPOSITORY}/releases/download/${record.tag_name}/`,
    prerelease: record.prerelease === true
  }
}

export function parseVersionIndex(raw: unknown): AvailableRelease[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((release) => {
    const parsed = releaseFromGitHub(release)
    return parsed === undefined ? [] : [parsed]
  })
}

export async function fetchAvailableReleases(
  currentVersion: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<AvailableRelease[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), INDEX_TIMEOUT_MS)
  try {
    const response = await fetchImpl(VERSION_INDEX_URL, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Version index request failed: ${response.status}`)
    }
    const releases = parseVersionIndex(await response.json())
    return releases
      .filter((release) => compareVersions(release.version, currentVersion) < 0)
      .sort((a, b) => compareVersions(b.version, a.version))
  } finally {
    clearTimeout(timer)
  }
}
