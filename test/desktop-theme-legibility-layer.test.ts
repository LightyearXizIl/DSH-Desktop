// @vitest-environment jsdom
import path from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { projectRoot } from './patch-path'

interface ThemeLayerLike {
  update: (patch: Record<string, unknown>) => Promise<boolean>
  dispose?: () => void
}
interface ThemeModule {
  ThemeLayer: new (options: Record<string, unknown>) => ThemeLayerLike
}
interface SettingsModule {
  DEFAULT_SETTINGS: Record<string, unknown>
}

// theme.ts imports siblings with `.ts` extensions, which the test tsconfig
// does not resolve; load it at runtime.
const source = (name: string): string => path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', name)

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.replaceChildren()
  for (const attribute of [...document.documentElement.attributes]) {
    if (attribute.name !== 'lang') document.documentElement.removeAttribute(attribute.name)
  }
})

it('keeps the wallpaper veil off the fluid and fits floor and reading wash to what is behind the panes', async () => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0 })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  // jsdom does not implement media playback.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve())
  const { ThemeLayer } = (await import(source('theme.ts'))) as ThemeModule
  const { DEFAULT_SETTINGS } = (await import(source('settings-model.ts'))) as SettingsModule
  let stored: Record<string, unknown> = { ...DEFAULT_SETTINGS, enabled: true }
  let revision = 1
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST' && typeof init.body === 'string') {
      stored = (JSON.parse(init.body) as { settings: Record<string, unknown> }).settings
      revision += 1
    }
    return Response.json({ revision, settings: stored })
  }))
  const ctx = {
    effect: (setup: () => unknown) => { setup() },
    on: () => () => undefined,
    theme: { getTheme: () => ({ active: { colorScheme: 'light' } }), overrideTokens: () => () => undefined },
    locale: { bind: () => (key: string) => key },
  }
  const layer = new ThemeLayer({ ctx, createEffects: () => ({ mount() {}, update() {}, dispose() {} }), styles: '' })
  const root = document.documentElement
  await vi.waitFor(() => expect(root.hasAttribute('data-dsh-desktop-theme')).toBe(true))

  // Over the fluid the wallpaper layer is marked so its dim/frost veil stays off.
  const wallpaperLayer = document.querySelector<HTMLElement>('[data-dsh-desktop-wallpaper-layer]')
  if (wallpaperLayer === null) throw new Error('No wallpaper layer')
  expect(wallpaperLayer.dataset.background).toBe('fluid')
  expect(wallpaperLayer.dataset.media).toBeUndefined()
  // The default light palette gets the thinnest pane and a light reading wash.
  expect(Number(root.style.getPropertyValue('--dsh-desktop-glass-floor-live'))).toBeLessThanOrEqual(0.35)
  const wash = Number(root.style.getPropertyValue('--dsh-desktop-text-wash-white'))
  expect(wash).toBeGreaterThan(0)
  expect(wash).toBeLessThanOrEqual(0.3)

  // The wash only applies while a conversation is open.
  expect(root.hasAttribute('data-dsh-desktop-reading')).toBe(false)
  const conversation = document.createElement('div')
  conversation.setAttribute('data-phase', 'active')
  document.body.appendChild(conversation)
  await vi.waitFor(() => expect(root.hasAttribute('data-dsh-desktop-reading')).toBe(true))
  conversation.remove()
  await vi.waitFor(() => expect(root.hasAttribute('data-dsh-desktop-reading')).toBe(false))

  // Compatibility keeps conversation text on glass, so it needs no wash.
  void layer.update({ mode: 'compat' })
  expect(root.style.getPropertyValue('--dsh-desktop-text-wash-white')).toBe('0')

  // A video wallpaper cannot be sampled: the layer veil comes back on with the
  // fallback wash, and panes return to the fixed floor.
  void layer.update({ mode: 'mica', background: 'wallpaper', wallpaper: 'host:2f1c4b8e-0d6a-4c1e-9b7f-3a5d6e7f8091.mp4' })
  expect(wallpaperLayer.dataset.background).toBe('wallpaper')
  expect(wallpaperLayer.dataset.media).toBe('video')
  expect(root.style.getPropertyValue('--dsh-desktop-wallpaper-veil')).toBe('0.45')
  expect(root.style.getPropertyValue('--dsh-desktop-glass-floor-live')).toBe('')
  expect(root.style.getPropertyValue('--dsh-desktop-text-wash-white')).toBe('')
})

it('keeps wallpaper media without a source from painting edge strips over the fluid', async () => {
  // Chromium frames an empty <img> with a 1px silver border; over the fluid it
  // showed as light strips down both window edges.
  const { THEME_RUNTIME_STYLES } = (await import(source('theme-css.ts'))) as { THEME_RUNTIME_STYLES: string }
  const style = document.createElement('style')
  style.textContent = THEME_RUNTIME_STYLES
  document.head.appendChild(style)
  document.documentElement.setAttribute('data-dsh-desktop-theme', '')
  const layer = document.createElement('div')
  layer.setAttribute('data-dsh-desktop-wallpaper-layer', '')
  layer.dataset.background = 'fluid'
  layer.innerHTML = '<img data-dsh-desktop-wallpaper-img alt=""><video data-dsh-desktop-wallpaper-video></video>'
  document.body.appendChild(layer)
  const image = layer.querySelector('img')
  const video = layer.querySelector('video')
  if (image === null || video === null) throw new Error('No wallpaper media')
  try {
    expect(getComputedStyle(image).display).toBe('none')
    expect(getComputedStyle(video).display).toBe('none')
    // A chosen wallpaper still shows.
    image.setAttribute('src', 'data:image/png;base64,iVBORw0KGgo=')
    video.setAttribute('src', '/api/desktop-theme/wallpaper?id=demo.mp4')
    expect(getComputedStyle(image).display).not.toBe('none')
    expect(getComputedStyle(video).display).not.toBe('none')
  } finally {
    style.remove()
  }
})
