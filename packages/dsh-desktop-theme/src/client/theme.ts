import type { Context } from '@deepseek-ai/cordis'
import { DEFAULT_SETTINGS, normalizeSettings, type ThemeSettings } from './settings-model.ts'
import { BASE_TOKENS, COMPAT_TOKENS } from './tokens.ts'
import { ensureAmbient, startSeamStamper } from './ambient.ts'
import type { EffectsController } from './effects.ts'

export const THEME_ATTRIBUTE = 'data-dsh-desktop-theme'
export const FLOAT_ATTRIBUTE = 'data-dsh-desktop-float'
export const COMPAT_ATTRIBUTE = 'data-dsh-desktop-compat'
const OVERRIDE_SOURCE = 'dsh-desktop-theme'
const STYLE_ID = 'dsh-desktop-theme-runtime-style'
const STYLE_ATTR = 'data-plugin-css'
const API = '/api/desktop-theme'

export interface ThemeState {
  revision: number
  settings: ThemeSettings
}

export interface ThemeLayerOptions {
  ctx: Context
  createEffects: () => EffectsController
  styles: string
  onChange?: (state: ThemeState, dark: boolean, error?: string) => void
}

export class ThemeLayer {
  private state: ThemeState = { revision: 0, settings: { ...DEFAULT_SETTINGS } }
  private dark = false
  private tokenDisposer: (() => void) | undefined
  private ambientDisposer: (() => void) | undefined
  private seamDisposer: (() => void) | undefined
  private effects: EffectsController | undefined
  private videoUrl: string | undefined
  private videoMarker: string | undefined
  private loadGeneration = 0
  private mutationGeneration = 0
  private saveTimer: ReturnType<typeof setTimeout> | undefined
  /** Callers awaiting the next settled save (one debounce window). */
  private pendingSaves: Array<(saved: boolean) => void> = []
  private disposed = false
  private mounted = false
  private readonly options: ThemeLayerOptions

  constructor(options: ThemeLayerOptions) {
    this.options = options
    this.dark = resolveDark(options.ctx)
    options.ctx.effect(() => {
      const offTheme = options.ctx.on('theme/change', () => {
        this.dark = resolveDark(options.ctx)
        if (this.state.settings.enabled) this.apply()
        this.emit()
      })
      return () => {
        offTheme()
        this.dispose()
      }
    }, 'dsh-desktop-theme: lifecycle')
    void this.load()
    this.emit()
  }

  getState(): ThemeState {
    return { revision: this.state.revision, settings: { ...this.state.settings } }
  }

  getDark(): boolean {
    return this.dark
  }

  /**
   * Apply a settings patch locally and persist it after the debounce window.
   * @returns whether the patch reached the host. Updates coalesced into one
   *  save share its outcome; callers use this to clean up host-side files.
   */
  update(patch: Partial<ThemeSettings>): Promise<boolean> {
    if (this.disposed) return Promise.resolve(false)
    const previous = this.state.settings
    const next = normalizeSettings({ ...previous, ...patch })
    this.loadGeneration += 1
    this.mutationGeneration += 1
    this.state = { ...this.state, settings: next }
    this.applyEnabledTransition(previous.enabled, next.enabled)
    if (previous.mode !== next.mode && next.enabled) this.applyTokens()
    this.emit()
    if (this.saveTimer !== undefined) clearTimeout(this.saveTimer)
    return new Promise<boolean>((resolve) => {
      this.pendingSaves.push(resolve)
      this.saveTimer = setTimeout(() => {
        this.saveTimer = undefined
        void this.save()
      }, 220)
    })
  }

  /** Resolve every caller waiting on the save that just settled. */
  private settleSaves(saved: boolean): void {
    const pending = this.pendingSaves
    this.pendingSaves = []
    for (const resolve of pending) resolve(saved)
  }

  private async save(): Promise<void> {
    const generation = this.mutationGeneration
    const revision = this.state.revision
    const settings = { ...this.state.settings }
    try {
      const response = await fetch(API, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revision, settings }),
      })
      // A newer patch arrived while this request was in flight; its own save
      // owns the outcome, so the waiting callers stay pending.
      if (this.disposed || generation !== this.mutationGeneration) return
      if (response.status === 409) {
        await this.load()
        this.settleSaves(false)
        this.emit(this.options.ctx.locale.bind('settings.desktopTheme')('theme.saveFailed'))
        return
      }
      if (!response.ok) throw new Error(`Theme save failed: ${response.status}`)
      const saved = await readState(response)
      if (this.disposed || generation !== this.mutationGeneration) return
      this.state = saved
      this.applyEnabledTransition(settings.enabled, saved.settings.enabled)
      this.settleSaves(true)
      this.emit()
    } catch {
      // An older request failing after a newer patch was queued must not
      // settle the newer caller: that patch still owns the next save.
      if (this.disposed || generation !== this.mutationGeneration) return
      this.settleSaves(false)
      this.emit(this.options.ctx.locale.bind('settings.desktopTheme')('theme.saveFailed'))
    }
  }

  async reload(): Promise<void> {
    if (this.saveTimer !== undefined) {
      clearTimeout(this.saveTimer)
      this.saveTimer = undefined
      this.settleSaves(false)
    }
    await this.load()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.saveTimer !== undefined) {
      clearTimeout(this.saveTimer)
      this.saveTimer = undefined
      void this.save()
    }
    this.settleSaves(false)
    this.unmount()
  }

  private async load(): Promise<void> {
    const generation = ++this.loadGeneration
    try {
      const response = await fetch(API, { credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok) throw new Error(`Theme load failed: ${response.status}`)
      const loaded = await readState(response)
      if (this.disposed || generation !== this.loadGeneration) return
      const previous = this.state.settings
      this.state = loaded
      this.applyEnabledTransition(previous.enabled, loaded.settings.enabled)
      this.emit()
    } catch {
      if (this.disposed) return
      this.state = { revision: 0, settings: { ...DEFAULT_SETTINGS } }
      this.applyEnabledTransition(false, this.state.settings.enabled)
      this.emit()
    }
  }

  private emit(error?: string): void {
    if (this.disposed) return
    this.options.onChange?.(this.getState(), this.dark, error)
  }

  private applyEnabledTransition(previous: boolean, next: boolean): void {
    if (this.disposed) return
    if (next) {
      if (!this.mounted) this.mount()
      else this.apply()
      return
    }
    if (this.mounted) this.unmount()
  }

  private mount(): void {
    if (this.mounted) return
    this.mounted = true
    document.documentElement.setAttribute(THEME_ATTRIBUTE, '')
    installStyles(this.options.styles)
    this.ambientDisposer = ensureAmbient()
    this.seamDisposer = startSeamStamper()
    this.applyTokens()
    this.apply()
    this.effects = this.options.createEffects()
    this.effects.mount(this.state.settings, this.dark)
  }

  private unmount(): void {
    this.mounted = false
    this.effects?.dispose()
    this.effects = undefined
    this.tokenDisposer?.()
    this.tokenDisposer = undefined
    this.seamDisposer?.()
    this.seamDisposer = undefined
    removeStyles(STYLE_ID)
    this.ambientDisposer?.()
    this.ambientDisposer = undefined
    const root = document.documentElement
    root.removeAttribute(THEME_ATTRIBUTE)
    root.removeAttribute(FLOAT_ATTRIBUTE)
    root.removeAttribute(COMPAT_ATTRIBUTE)
    root.removeAttribute('data-dsh-desktop-wallpaper')
    root.removeAttribute('data-dsh-desktop-media')
    root.removeAttribute('data-dsh-desktop-spotlight')
    root.removeAttribute('data-dsh-desktop-press')
    for (const name of [
      '--dsh-desktop-blur', '--dsh-desktop-frost', '--dsh-desktop-surface-frost', '--dsh-desktop-frost-ratio',
      '--dsh-desktop-wallpaper-blur', '--dsh-desktop-wallpaper-frost', '--dsh-desktop-video-blur',
      '--dsh-desktop-video-dim', '--dsh-desktop-brightness-black', '--dsh-desktop-brightness-white',
      '--dsh-desktop-glow-hue',
    ]) root.style.removeProperty(name)
    this.videoUrl = undefined
    this.videoMarker = undefined
  }

  private applyTokens(): void {
    this.tokenDisposer?.()
    this.tokenDisposer = this.options.ctx.theme.overrideTokens(
      OVERRIDE_SOURCE,
      this.state.settings.mode === 'compat' ? COMPAT_TOKENS : BASE_TOKENS,
    )
  }

  private apply(): void {
    const settings = this.state.settings
    const root = document.documentElement
    const style = root.style
    const compat = settings.mode === 'compat'
    root.toggleAttribute(FLOAT_ATTRIBUTE, !compat)
    root.toggleAttribute(COMPAT_ATTRIBUTE, compat)
    root.toggleAttribute('data-dsh-desktop-spotlight', !compat && settings.spotlight)
    root.toggleAttribute('data-dsh-desktop-press', !compat && settings.press)
    style.setProperty('--dsh-desktop-blur', `${settings.blur}px`)
    style.setProperty('--dsh-desktop-frost', String(Math.min(settings.frost / 50, 1.4)))
    style.setProperty('--dsh-desktop-surface-frost', String(Math.min((settings.frost + 20) / 50, 1.4)))
    // Glass panes rise from the legibility floor toward opaque as frost grows.
    style.setProperty('--dsh-desktop-frost-ratio', String(settings.frost / 100))
    style.setProperty('--dsh-desktop-wallpaper-blur', `${settings.wallpaperBlur}px`)
    style.setProperty('--dsh-desktop-wallpaper-frost', String(settings.wallpaperFrost / 100))
    style.setProperty('--dsh-desktop-video-blur', `${settings.videoBlur}px`)
    style.setProperty('--dsh-desktop-video-dim', String(((100 - settings.videoBrightness) / 100) * 0.65))
    style.setProperty(
      '--dsh-desktop-brightness-black',
      String(this.dark ? Math.max(0, (50 - settings.bgBrightness) / 50) : 0),
    )
    style.setProperty(
      '--dsh-desktop-brightness-white',
      String(this.dark ? 0 : Math.max(0, (settings.bgBrightness - 50) / 50)),
    )
    style.setProperty('--dsh-desktop-glow-hue', String((settings.fluidHue + 217) % 360))

    const ambient = document.querySelector<HTMLElement>('[data-dsh-desktop-ambient]')
    if (ambient !== null) {
      ambient.dataset.background = settings.background
      ambient.dataset.critters = settings.critters ? 'on' : 'off'
    }
    this.syncWallpaper()
    this.effects?.update(settings, this.dark)
  }

  private syncWallpaper(): void {
    const wallpaper = this.state.settings.wallpaper
    const isVideo = wallpaper.startsWith('host:')
    const active = this.state.settings.background === 'wallpaper' && wallpaper !== ''
    const root = document.documentElement
    root.toggleAttribute('data-dsh-desktop-wallpaper', active)
    if (active) root.setAttribute('data-dsh-desktop-media', isVideo ? 'video' : 'image')
    else root.removeAttribute('data-dsh-desktop-media')

    const image = document.querySelector<HTMLImageElement>('[data-dsh-desktop-wallpaper-img]')
    if (image !== null) {
      if (active && !isVideo) image.src = wallpaper
      else image.removeAttribute('src')
    }
    const video = document.querySelector<HTMLVideoElement>('[data-dsh-desktop-wallpaper-video]')
    if (video === null) return
    if (!active || !isVideo) {
      video.pause()
      video.removeAttribute('src')
      video.load()
      return
    }
    if (wallpaper.startsWith('host:')) {
      if (this.videoMarker === wallpaper && this.videoUrl !== undefined) return
      this.attachVideo(video, `/api/desktop-theme/wallpaper?id=${encodeURIComponent(wallpaper.slice(5))}`, wallpaper)
    } else if (video.getAttribute('src') !== wallpaper) {
      video.setAttribute('src', wallpaper)
      this.configureVideo(video)
    }
  }

  private attachVideo(video: HTMLVideoElement, url: string, marker: string): void {
    this.videoUrl = url
    this.videoMarker = marker
    video.setAttribute('src', url)
    this.configureVideo(video)
  }

  private configureVideo(video: HTMLVideoElement): void {
    video.loop = true
    if (!video.paused) return
    void video.play().catch(() => {
      video.muted = true
      void video.play().catch(() => {})
    })
  }
}

async function readState(response: Response): Promise<ThemeState> {
  const value: unknown = await response.json()
  if (typeof value !== 'object' || value === null) throw new Error('Invalid theme response')
  const record = value as Record<string, unknown>
  if (typeof record.revision !== 'number' || !Number.isSafeInteger(record.revision)) {
    throw new Error('Invalid theme revision')
  }
  return { revision: record.revision, settings: normalizeSettings(record.settings) }
}

function resolveDark(ctx: Context): boolean {
  try {
    return ctx.theme.getTheme().active.colorScheme === 'dark'
  } catch {
    return document.body.hasAttribute('data-ds-dark-theme')
  }
}

function installStyles(css: string): HTMLStyleElement {
  const existing = document.querySelector<HTMLStyleElement>(`style[${STYLE_ATTR}="${STYLE_ID}"]`)
  if (existing !== null) return existing
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.setAttribute(STYLE_ATTR, STYLE_ID)
  style.dataset.plugin = 'dsh-desktop-theme'
  style.textContent = css
  document.head.appendChild(style)
  return style
}

function removeStyles(id: string): void {
  document.querySelectorAll(`style[${STYLE_ATTR}="${id}"]`).forEach((node) => node.remove())
}
