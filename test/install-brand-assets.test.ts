import { describe, expect, it } from 'vitest'
// @ts-expect-error -- plain Node script without a declaration file.
import { replaceIconLink, replaceManifestIcon } from '../scripts/install-brand-assets.mjs'

const replaceManifest = replaceManifestIcon as (contents: string, file: string) => string
const replaceLink = replaceIconLink as (contents: string, file: string) => string

interface ManifestIcon {
  src: string
  sizes?: string
  type?: string
  purpose?: string
}

function icons(manifest: string): ManifestIcon[] {
  return (JSON.parse(manifest) as { icons: ManifestIcon[] }).icons
}

const desktopIcon = {
  src: '/dsh-desktop-logo.png',
  sizes: '1254x1254',
  type: 'image/png',
  purpose: 'any'
}

describe('install-brand-assets manifest icon', () => {
  it('replaces the single favicon entry Harness shipped through 0.2.1', () => {
    const manifest = JSON.stringify({
      name: 'DeepSeek Harness',
      icons: [{ src: './favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
    })

    expect(icons(replaceManifest(manifest, 'manifest.webmanifest'))).toEqual([desktopIcon])
  })

  it('collapses the PNG icon set Harness 0.2.2 ships into the desktop logo', () => {
    const manifest = JSON.stringify({
      name: 'DeepSeek Harness',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    })

    const replaced = replaceManifest(manifest, 'manifest.webmanifest')

    expect(icons(replaced)).toEqual([desktopIcon])
    expect((JSON.parse(replaced) as { name: string }).name).toBe('DeepSeek Harness')
  })

  it('keeps icon entries it does not recognise next to the desktop logo', () => {
    const custom = { src: 'partner-mark.png', sizes: '64x64', type: 'image/png' }
    const manifest = JSON.stringify({
      icons: [{ src: './icon-192.png', sizes: '192x192', type: 'image/png' }, custom]
    })

    expect(icons(replaceManifest(manifest, 'manifest.webmanifest'))).toEqual([desktopIcon, custom])
  })

  it('leaves an already branded manifest unchanged when run again', () => {
    const manifest = JSON.stringify({
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }]
    })

    const once = replaceManifest(manifest, 'manifest.webmanifest')

    expect(replaceManifest(once, 'manifest.webmanifest')).toBe(once)
  })

  it('fails loudly when the manifest has no icon it can take over', () => {
    expect(() => replaceManifest(JSON.stringify({ icons: [] }), 'manifest.webmanifest')).toThrow(
      'Could not update DSH Desktop branding in manifest.webmanifest: no icon entry to replace'
    )
  })
})

describe('install-brand-assets icon link', () => {
  it('swaps a light/dark favicon pair for the single desktop icon', () => {
    const html = [
      '<link rel="icon" href="./favicon.svg" media="(prefers-color-scheme: light)" />',
      '<link rel="icon" href="./favicon-dark.svg" media="(prefers-color-scheme: dark)" />'
    ].join('\n')

    const replaced = replaceLink(html, 'index.html')

    expect(replaced.match(/<link rel="icon"/gu)).toHaveLength(1)
    expect(replaced).toContain('<link rel="icon" type="image/png" href="/dsh-desktop-logo.png" />')
  })

  it('refuses an index with an unexpected number of icon links', () => {
    expect(() => replaceLink('<html></html>', 'index.html')).toThrow(
      'expected one icon link or a light/dark pair, found 0'
    )
  })
})
