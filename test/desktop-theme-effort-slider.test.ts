// @vitest-environment jsdom
import path from 'node:path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { projectRoot } from './patch-path'

// The theme sources import each other with `.ts` extensions under the
// package's own tsconfig, so they are loaded at runtime (see
// desktop-theme-tilt.test.ts); the theme package's typecheck covers their types.
const CLIENT = path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client')

interface SliderSettings {
  motion: string
  reachedTicks: string
}

interface SliderInternals {
  CSS: string
  KNOB_SIZE: number
  TRACK_HEIGHT: number
  TRACK_RADIUS: number
  energyFor: (pct: number) => number
  fillBackgroundFor: (pct: number) => string
  valueColorFor: (pct: number, level: { id: string; name: string } | null, style?: string) => string
  starCountFor: (pct: number) => number
  readSettings: () => SliderSettings & { style: string; v: number }
  motionMode: () => string
}

interface SliderModule {
  createEffortSlider: (deps: {
    t: (key: string) => string
    getSettings: () => unknown
    settingsEvent: string
    startPixelField?: (canvas: HTMLCanvasElement, options: { reducedMotion: boolean }) => () => void
  }) => {
    apply: (ctx: unknown) => void
    __internals: SliderInternals
  }
}

interface ThemeSettingsLike {
  enabled: boolean
  effortSlider: boolean
  effortStyle: string
  effortMotion: string
  effortTicks: string
}

interface ControllerModule {
  EFFORT_SLIDER_SETTINGS_EVENT: string
  createEffortSliderController: (ctx: unknown) => {
    sync: (settings: ThemeSettingsLike) => void
    dispose: () => void
  }
}

interface SettingsModelModule {
  DEFAULT_SETTINGS: ThemeSettingsLike
  normalizeSettings: (value: unknown) => ThemeSettingsLike
}

interface PixelFieldModule {
  cellHash: (col: number, row: number, salt: number) => number
  rateIntegral: (t: number, points: ReadonlyArray<readonly [number, number]>) => number
  frontAt: (t: number) => number
  frontTimeAt: (u: number) => number
  lightAt: (u: number, col: number, row: number, t: number) => number
  envelopeAt: (u: number) => number
  chargeAt: (t: number) => number
  waveOffsetAt: (t: number) => number
  flickerClockAt: (t: number) => number
  glowReachAt: (t: number) => number
  glowShareAt: (u: number, t: number) => number
  flickerAt: (col: number, row: number, t: number) => number
  haloClockAt: (t: number) => number
  haloAt: (u: number, col: number, row: number, t: number) => number
  waveStrengthAt: (t: number) => number
  waveAt: (u: number, t: number) => number
  WAVE_LENGTH: number
  WAVE_SWING: number
  baseBrightness: (u: number, t: number, envelope?: number, light?: number) => number
  cellLight: (u: number, col: number, row: number, t: number) => { b: number; glow: number }
  cellColor: (u: number, b: number, light?: boolean) => string
  glowLayer: (glow: number, light?: boolean) => { fill: string; halo: string }
  isLightColor: (value: string) => boolean
  FRONT_EXTENT: number
  GLOW_START: number
  GLOW_REACH: number
  startPixelField: (canvas: HTMLCanvasElement, options: { reducedMotion: boolean }) => () => void
}

interface LocaleModule {
  zh: Record<string, string>
  en: Record<string, string>
}

let slider: SliderModule
let controller: ControllerModule
let settingsModel: SettingsModelModule
let locale: LocaleModule
let pixels: PixelFieldModule

async function load<T>(file: string, check: (value: Record<string, unknown>) => boolean): Promise<T> {
  const loaded: unknown = await import(/* @vite-ignore */ path.join(CLIENT, file))
  if (typeof loaded !== 'object' || loaded === null || !check(loaded as Record<string, unknown>)) {
    throw new Error(`${file} no longer exports the expected API`)
  }
  return loaded as T
}

beforeAll(async () => {
  slider = await load('effort-slider/slider.js', (m) => typeof m.createEffortSlider === 'function')
  controller = await load('effort-slider.ts', (m) => typeof m.createEffortSliderController === 'function')
  settingsModel = await load('settings-model.ts', (m) => typeof m.normalizeSettings === 'function')
  locale = await load('settings.ts', (m) => typeof m.zh === 'object' && typeof m.en === 'object')
  pixels = await load('effort-slider/pixel-field.ts', (m) => typeof m.startPixelField === 'function')
})

afterEach(() => {
  document.head.innerHTML = ''
  vi.restoreAllMocks()
})

interface TestRoot {
  render: (element: unknown) => void
  unmount: () => void
}

// The repository has no react-dom typings, so the renderer is loaded by a
// runtime specifier and checked here instead of adding a dev dependency.
const REACT_DOM_CLIENT = 'react-dom/client'

async function loadCreateRoot(): Promise<(host: Element) => TestRoot> {
  const loaded: unknown = await import(/* @vite-ignore */ REACT_DOM_CLIENT)
  const record = typeof loaded === 'object' && loaded !== null ? loaded as Record<string, unknown> : {}
  const fallback = typeof record.default === 'object' && record.default !== null
    ? record.default as Record<string, unknown>
    : {}
  const createRoot = record.createRoot ?? fallback.createRoot
  if (typeof createRoot !== 'function') throw new Error('react-dom/client has no createRoot')
  return createRoot as (host: Element) => TestRoot
}

function createSlider(settings: unknown = { motion: 'full', reachedTicks: 'highlight' }) {
  return slider.createEffortSlider({
    t: (key) => `t:${key}`,
    getSettings: () => settings,
    settingsEvent: 'test:effort-settings',
  })
}

describe('built-in effort slider', () => {
  it('uses only blue below the top level and the violet nebula at the top level', () => {
    const { energyFor, fillBackgroundFor, valueColorFor, starCountFor } = createSlider().__internals
    for (const pct of [0, 1 / 3, 0.5, 2 / 3, 0.8, 0.99]) {
      expect(energyFor(pct)).toBe(0)
      expect(starCountFor(pct)).toBe(0)
      expect(fillBackgroundFor(pct)).toBe('rgb(61,145,255)')
      expect(valueColorFor(pct, { id: 'high', name: 'High' })).toContain('--dsw-alias-state-business-primary')
    }
    // The old continuous blue→violet mix painted intermediate levels purple.
    expect(energyFor(1)).toBe(1)
    expect(starCountFor(1)).toBeGreaterThan(0)
    expect(fillBackgroundFor(1)).toBe('rgb(61,145,255)')
    expect(valueColorFor(1, { id: 'max', name: 'Max' })).toBe('rgb(139,92,246)')
    // Off keeps the official grey in the menu row and on the collapsed seat.
    expect(valueColorFor(0, { id: 'off', name: 'Off' })).toBe('')
  })

  it('colours only the top level in the Claude Code style', () => {
    const { valueColorFor, CSS } = createSlider().__internals
    expect(valueColorFor(2 / 3, { id: 'high', name: 'High' }, 'claude')).toBe('')
    expect(valueColorFor(1, { id: 'max', name: 'Max' }, 'claude')).toBe('rgb(139,92,246)')
    expect(valueColorFor(2 / 3, { id: 'high', name: 'High' }, 'codex')).toContain('--dsw-alias-state-business-primary')
    // Unfilled track, rounded-square knob, and the pixel canvas only in this style.
    expect(CSS).toContain(".ces-inline[data-style='claude'] .ces-fill,.ces-inline[data-style='claude'] .ces-energy,.ces-inline[data-style='claude'] .ces-stars{display:none}")
    // The knob is as tall as the track and both share one corner radius, so at
    // either end the knob's corners sit exactly on the track's.
    const { CLAUDE_RADIUS, KNOB_SIZE } = createSlider().__internals as unknown as Record<string, number>
    expect(CSS).toContain(`.ces-inline[data-style='claude'] .ces-track{height:${KNOB_SIZE}px;margin:0;border-radius:${CLAUDE_RADIUS}px;overflow:hidden;`)
    const claudeKnob = CSS.split('\n').find((rule) => rule.startsWith(".ces-inline[data-style='claude'] .ces-knob{"))
    expect(claudeKnob).toContain(`border-radius:${CLAUDE_RADIUS}px;`)
    // Not shrunk: the size comes from the shared knob rule.
    expect(claudeKnob).not.toMatch(/(?:^|[{;])(?:width|height|min-width|margin):/u)
    // Two equal arcs antialias separately and let the pixel field show through
    // as a purple fringe around the end corners; a 1px ring in the knob's own
    // colour covers that seam and the track's clip becomes the end outline.
    expect(claudeKnob).toContain('box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-bg-base,#1b1c20) 34%,#fff),')
    expect(claudeKnob).not.toContain('.5px rgba(0,0,0')
    // The knob stays light in both schemes (grey in dark, white in light) and the
    // track is the base colour darkened a little (near-black in dark, light grey in
    // light). A label-heavy knob mix turned it near-black in light mode.
    expect(CSS).toMatch(/\.ces-knob\{[^}]*background:color-mix\(in srgb,var\(--dsw-alias-bg-base,#1b1c20\) 34%,#fff\)/u)
    expect(CSS).toMatch(/data-style='claude'\] \.ces-track\{[^}]*background:color-mix\(in srgb,var\(--dsw-alias-bg-base,#1b1c20\) 92%,#000\)/u)
    expect(CSS).not.toContain('var(--dsw-alias-label-primary,#0f1115) 70%')
    expect(CSS).toContain('.ces-pixels{display:none}')
    // The field grows in by itself, so the canvas shows at once and only fades out.
    expect(CSS).toContain(".ces-inline[data-style='claude'][data-energy='1'] .ces-pixels{opacity:1;transition:none}")
  })

  it('draws a pill track with a round knob taller than the track', () => {
    const { CSS, KNOB_SIZE, TRACK_HEIGHT, TRACK_RADIUS } = createSlider().__internals
    expect(KNOB_SIZE).toBeGreaterThan(TRACK_HEIGHT)
    expect(TRACK_RADIUS).toBe(TRACK_HEIGHT / 2)
    const knob = CSS.split('\n').find((rule) => rule.startsWith('.ces-inline .ces-knob{'))
    expect(knob).toBeDefined()
    expect(knob).toContain(`width:${KNOB_SIZE}px;height:${KNOB_SIZE}px`)
    expect(knob).toContain('border-radius:50%')
    expect(knob).toContain('aspect-ratio:1/1')
    expect(CSS).toMatch(/\.ces-track\{[^}]*border-radius:999px/u)
    // Harness draws every radius as superellipse(1.5) unless an element opts
    // back into round corners; without this the knob renders as a squircle.
    expect(CSS).toContain('.ces-inline,.ces-inline *{corner-shape:round}')
    // The stacked model menu: the drilled list grows in upward, starting from the
    // covered row's height, with a divider above the rows; the open row's chevron turns up.
    expect(CSS).toMatch(/\[data-dsh-desktop-stack-pane\]\{[^}]*border-bottom:1px solid[^}]*animation:dsh-desktop-stack-grow [^}]*backwards\}/u)
    // Animations do not interpolate to height:auto here; the patch measures the target.
    expect(CSS).toContain('@keyframes dsh-desktop-stack-grow{from{height:var(--dsh-stack-from,0px);opacity:0}to{height:var(--dsh-stack-to,auto);opacity:1}}')
    expect(CSS).toContain("[data-dsh-desktop-open='true'] > svg:last-of-type{transform:rotate(-90deg)}")
    // Reduced motion stills the grow, unless the theme's "Always play" overrules it.
    expect(CSS).toContain('@media (prefers-reduced-motion: reduce){:root:not([data-dsh-desktop-motion-always]) [data-dsh-desktop-stack-pane]{animation:none}')
    // The settings panel and its hand-written dark branch are gone with it.
    expect(CSS).not.toContain('.ces-set')
    expect(CSS).not.toContain('data-ds-dark-theme')
  })

  it('reads its settings from the theme and validates them', () => {
    expect(createSlider({ motion: 'fast', reachedTicks: 'dim' }).__internals.readSettings())
      .toMatchObject({ motion: 'fast', reachedTicks: 'dim', style: 'codex' })
    expect(createSlider({ style: 'claude' }).__internals.readSettings()).toMatchObject({ style: 'claude' })
    const invalid = createSlider({ motion: 'warp', reachedTicks: 3, style: 'other' }).__internals
    expect(invalid.readSettings()).toMatchObject({ motion: 'full', reachedTicks: 'highlight', style: 'codex' })
    expect(invalid.motionMode()).toBe('full')
    expect(createSlider(null).__internals.readSettings()).toMatchObject({ motion: 'full', reachedTicks: 'highlight' })
  })

  it('renders its slot entry with localized copy', async () => {
    // A `var t` loop in the component once shadowed the translator, so every
    // render threw and the slot showed its error boundary instead of the slider.
    const React = await import('react')
    const createRoot = await loadCreateRoot()
    const flags = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    flags.IS_REACT_ACT_ENVIRONMENT = true
    let component: ((props: Record<string, unknown>) => unknown) | undefined
    const instance = createSlider()
    instance.apply({
      effect: () => undefined,
      slots: {
        inject: (_name: string, callback: () => unknown) => callback(),
        register: (_config: unknown, value: (props: Record<string, unknown>) => unknown) => {
          component = value
          return () => undefined
        },
      },
    })
    if (component === undefined) throw new Error('slider did not register a component')
    const Entry = component as unknown as React.FunctionComponent<Record<string, unknown>>
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      await React.act(async () => {
        root.render(React.createElement(Entry, { sessionId: 'session-1' }))
      })
      expect(errors).not.toHaveBeenCalled()
      expect(host.querySelector('[data-ces-part="anchor"]')).not.toBeNull()
    } finally {
      await React.act(async () => root.unmount())
      host.remove()
      flags.IS_REACT_ACT_ENVIRONMENT = false
    }
  })

  it('owns its styles and slot entry for the fiber lifetime without global listeners', () => {
    const addListener = vi.spyOn(document, 'addEventListener')
    const effects: Array<() => void> = []
    const registrations: Array<Record<string, unknown>> = []
    const ctx = {
      effect: (setup: () => () => void) => {
        effects.push(setup())
      },
      slots: {
        inject: (_name: string, callback: () => unknown) => callback(),
        register: (config: Record<string, unknown>) => {
          registrations.push(config)
          return () => undefined
        },
      },
    }
    const instance = createSlider()
    expect(document.querySelector('style[data-plugin-css="dsh-desktop-theme-effort-slider"]')).toBeNull()
    instance.apply(ctx)
    expect(document.querySelectorAll('style[data-plugin-css="dsh-desktop-theme-effort-slider"]')).toHaveLength(1)
    // While mounted, the official model menu stacks its drilled panes above the root.
    expect(document.documentElement.hasAttribute('data-dsh-desktop-model-menu-stack')).toBe(true)
    expect(registrations).toHaveLength(1)
    expect(registrations[0]).toMatchObject({ name: 'conversation.input.right', id: 'desktop-theme-effort-slider' })
    const label = registrations[0]?.label
    expect(typeof label === 'function' ? label() : undefined).toBe('t:effortSlider.label')
    // The market plugin's right-click panel hooked the whole document forever.
    expect(addListener).not.toHaveBeenCalled()
    for (const dispose of effects) dispose()
    expect(document.querySelector('style[data-plugin-css="dsh-desktop-theme-effort-slider"]')).toBeNull()
    expect(document.documentElement.hasAttribute('data-dsh-desktop-model-menu-stack')).toBe(false)
  })
})

describe('effort slider controller', () => {
  function createContext() {
    const fibers: Array<{ dispose: ReturnType<typeof vi.fn> }> = []
    const inject = vi.fn((_deps: string[], _callback: (child: unknown) => void) => {
      const fiber = { dispose: vi.fn(async () => undefined) }
      fibers.push(fiber)
      return fiber
    })
    return { ctx: { inject, locale: { bind: () => (key: string) => key } }, inject, fibers }
  }

  const settings = (patch: Partial<ThemeSettingsLike> = {}): ThemeSettingsLike => ({
    ...settingsModel.DEFAULT_SETTINGS,
    ...patch,
  })

  it('runs the slider while the theme and its switch are on', () => {
    const { ctx, inject, fibers } = createContext()
    const control = controller.createEffortSliderController(ctx)
    control.sync(settings())
    control.sync(settings())
    expect(inject).toHaveBeenCalledTimes(1)
    // Model selection services wait in the child fiber, never in the theme's own inject.
    expect(inject.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining(['slots', 'locale', 'sessions', 'modelDirectories', 'remote', 'remote.session'])
    )

    control.sync(settings({ effortSlider: false }))
    expect(fibers[0]?.dispose).toHaveBeenCalledTimes(1)
    control.sync(settings({ effortSlider: true }))
    expect(inject).toHaveBeenCalledTimes(2)
    control.sync(settings({ enabled: false }))
    expect(fibers[1]?.dispose).toHaveBeenCalledTimes(1)
    control.sync(settings({ enabled: false }))
    expect(inject).toHaveBeenCalledTimes(2)
  })

  it('announces setting changes to the running slider only', () => {
    const { ctx } = createContext()
    const control = controller.createEffortSliderController(ctx)
    const listener = vi.fn()
    window.addEventListener(controller.EFFORT_SLIDER_SETTINGS_EVENT, listener)
    try {
      control.sync(settings())
      control.sync(settings({ effortMotion: 'fast' }))
      control.sync(settings({ effortMotion: 'fast' }))
      control.sync(settings({ effortTicks: 'hidden' }))
      expect(listener).toHaveBeenCalledTimes(2)
      control.sync(settings({ effortTicks: 'hidden', effortStyle: 'claude' }))
      expect(listener).toHaveBeenCalledTimes(3)
      control.sync(settings({ effortSlider: false, effortTicks: 'dim' }))
      expect(listener).toHaveBeenCalledTimes(3)
    } finally {
      window.removeEventListener(controller.EFFORT_SLIDER_SETTINGS_EVENT, listener)
    }
  })

  it('unloads the slider with the theme', () => {
    const { ctx, fibers } = createContext()
    const control = controller.createEffortSliderController(ctx)
    control.sync(settings())
    control.dispose()
    control.dispose()
    expect(fibers[0]?.dispose).toHaveBeenCalledTimes(1)
  })
})

describe('effort slider settings', () => {
  it('defaults to on with full motion and bright reached dots', () => {
    expect(settingsModel.DEFAULT_SETTINGS).toMatchObject({
      effortSlider: true,
      effortStyle: 'codex',
      effortMotion: 'full',
      effortTicks: 'highlight',
    })
    expect(settingsModel.normalizeSettings({ effortSlider: 'no', effortStyle: 'x', effortMotion: 'warp', effortTicks: null }))
      .toMatchObject({ effortSlider: true, effortStyle: 'codex', effortMotion: 'full', effortTicks: 'highlight' })
    expect(settingsModel.normalizeSettings({ effortStyle: 'claude' })).toMatchObject({ effortStyle: 'claude' })
    expect(settingsModel.normalizeSettings({ effortSlider: false, effortMotion: 'quick', effortTicks: 'dim' }))
      .toMatchObject({ effortSlider: false, effortMotion: 'quick', effortTicks: 'dim' })
  })

  it('keeps Chinese and English copy for every slider key', () => {
    const zhKeys = Object.keys(locale.zh).filter((key) => key.startsWith('effortSlider.'))
    const enKeys = Object.keys(locale.en).filter((key) => key.startsWith('effortSlider.'))
    expect(zhKeys.length).toBeGreaterThan(0)
    expect(enKeys.sort()).toEqual(zhKeys.sort())
    expect(locale.zh['effortSlider.labelWithLevel']).toContain('{level}')
    expect(locale.en['effortSlider.labelWithLevel']).toContain('{level}')
  })
})

describe('Claude Code pixel field', () => {
  // Shapes and timings measured from the reference recording; t is seconds
  // since the top level was reached, u the distance from the knob's left edge.
  it('lights cells one by one as the front moves left', () => {
    expect(pixels.frontAt(0)).toBe(0)
    expect(pixels.frontAt(0.5)).toBeCloseTo(pixels.FRONT_EXTENT / 2, 6)
    expect(pixels.frontAt(1)).toBe(pixels.FRONT_EXTENT)
    for (const u of [0.05, 0.2, 0.4, 0.6]) expect(pixels.frontAt(pixels.frontTimeAt(u))).toBeCloseTo(u, 6)
    // About 60% of the track is reached within roughly a second.
    expect(pixels.frontAt(0.9)).toBeGreaterThan(0.6)
    // A cell lights within ~0.12 s once its own moment comes, not gradually.
    const times = Array.from({ length: 400 }, (_, i) => i / 200)
    const lit = times.map((t) => pixels.lightAt(0.3, 12, 3, t))
    const first = lit.findIndex((value) => value > 0)
    const full = lit.findIndex((value) => value === 1)
    expect(first).toBeGreaterThan(0)
    expect((full - first) / 200).toBeLessThanOrEqual(0.13)
    // Cells at the same distance light at different moments: a sparse front.
    const moments = Array.from({ length: 6 }, (_, row) => times.find((t) => pixels.lightAt(0.3, 12, row, t) > 0))
    expect(new Set(moments).size).toBeGreaterThan(3)
    // Nearer cells light first on average.
    const meanStart = (u: number) => {
      const starts = Array.from({ length: 30 }, (_, k) => times.find((t) => pixels.lightAt(u, k, 2, t) > 0) ?? 2)
      return starts.reduce((sum, value) => sum + value, 0) / starts.length
    }
    expect(meanStart(0.05)).toBeLessThan(meanStart(0.3))
    expect(meanStart(0.3)).toBeLessThan(meanStart(0.55))
  })

  it('is purple at every distance, flat next to the knob, fading out by 70%', () => {
    expect(pixels.envelopeAt(0)).toBe(1)
    expect(pixels.envelopeAt(0.08)).toBe(1)
    expect(pixels.envelopeAt(0.25)).toBeCloseTo(0.73, 2)
    expect(pixels.envelopeAt(0.375)).toBeCloseTo(0.52, 2)
    expect(pixels.envelopeAt(0.7)).toBe(0)
    expect(pixels.envelopeAt(-0.1)).toBe(0)
    expect(pixels.chargeAt(0)).toBeCloseTo(0.6, 6)
    expect(pixels.chargeAt(1.4)).toBe(1)
    expect(pixels.cellColor(0, 1)).toBe('rgba(186,118,222,1.000)')
    expect(pixels.cellColor(0.7, 0.4)).toBe('rgba(178,104,232,0.400)')
    // The recording's lit cells have a saturation of ~0.45 everywhere.
    for (const u of [0, 0.2, 0.45, 0.69]) {
      const [r = 0, g = 0, b = 0] = (/rgba\((\d+),(\d+),(\d+)/u.exec(pixels.cellColor(u, 1)) ?? []).slice(1).map(Number)
      expect((Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b)).toBeGreaterThan(0.4)
    }
  })

  it('rolls one soft wave leftward at the measured pace', () => {
    // A feature at u is found as far further left as the wave travelled.
    for (const [u, t1, t2] of [[0.1, 0.4, 0.7], [0.3, 1.5, 1.9], [0.45, 3.2, 3.6]] as const) {
      const shift = pixels.waveOffsetAt(t2) - pixels.waveOffsetAt(t1)
      expect(pixels.waveAt(u + shift, t2)).toBeCloseTo(pixels.waveAt(u, t1), 10)
    }
    // Measured from the recording at 60 fps: ~0.28 track/s, ~0.38 later on.
    const speed = (t: number) => (pixels.waveOffsetAt(t + 0.01) - pixels.waveOffsetAt(t)) / 0.01
    expect(speed(0.5)).toBeCloseTo(0.28, 3)
    expect(speed(4)).toBeCloseTo(0.38, 3)
    expect(speed(2)).toBeGreaterThan(speed(1))
    // About one pass per second at any one place.
    const period = pixels.WAVE_LENGTH / speed(4)
    expect(period).toBeGreaterThan(0.9)
    expect(period).toBeLessThan(1.5)
    // The bright part (above +15%) is about six columns of a ~224px track,
    // narrower than the dark part between passes.
    const profile = Array.from({ length: 1000 }, (_, i) => pixels.waveAt(i / 1000, 3))
    const factor = profile.map((w) => 1 - pixels.WAVE_SWING + 2 * pixels.WAVE_SWING * w)
    const mean = factor.reduce((sum, value) => sum + value, 0) / factor.length
    const bright = factor.filter((value) => value > mean + 0.15).length / 1000
    const perWave = bright / (1 / pixels.WAVE_LENGTH)
    expect(perWave * 224 / 4).toBeGreaterThan(4.5)
    expect(perWave * 224 / 4).toBeLessThan(8)
    expect(factor.filter((value) => value < mean).length).toBeGreaterThan(500)
    // Brightness swings by about +-28%.
    expect(Math.max(...factor)).toBeCloseTo(1 + pixels.WAVE_SWING, 2)
    expect(Math.min(...factor)).toBeCloseTo(1 - pixels.WAVE_SWING, 2)
    expect(pixels.rateIntegral(10, [[0, 2]])).toBeCloseTo(20, 10)
    expect(pixels.rateIntegral(2, [[0, 0], [2, 2]])).toBeCloseTo(2, 10)
  })

  it('grows star-like white halos from the knob leftward, apart from the quick purple flicker', () => {
    // Nothing glows at first; the glowing region then spreads to ~30% of the track.
    expect(pixels.glowShareAt(0, pixels.GLOW_START - 0.1)).toBe(0)
    expect(pixels.glowReachAt(1.2)).toBeGreaterThan(0)
    expect(pixels.glowReachAt(2)).toBeGreaterThan(pixels.glowReachAt(1.2))
    expect(pixels.glowReachAt(4)).toBeCloseTo(pixels.GLOW_REACH, 6)
    // Most cells by the knob glow once it has spread, fewer further out, none far away.
    expect(pixels.glowShareAt(0, 4)).toBeGreaterThan(0.5)
    expect(pixels.glowShareAt(0.15, 4)).toBeLessThan(pixels.glowShareAt(0.05, 4))
    expect(pixels.glowShareAt(0.15, 4)).toBeGreaterThan(0.1)
    expect(pixels.glowShareAt(0.4, 4)).toBe(0)
    // A halo lasts much longer than a purple flicker: it swells and fades like a star.
    const medianRun = (value: (col: number, t: number) => number) => {
      const runs: number[] = []
      for (let col = 0; col < 24; col += 1) {
        let run = 0
        for (let i = 0; i < 720; i += 1) {
          if (value(col, 3 + i / 120) > 0.3) run += 1
          else if (run) { runs.push(run / 120); run = 0 }
        }
      }
      runs.sort((a, b) => a - b)
      return runs[Math.floor(runs.length / 2)] ?? 0
    }
    const haloRun = medianRun((col, t) => pixels.haloAt(0.02, col, 2, t))
    const flickerRun = medianRun((col, t) => pixels.flickerAt(col, 2, t))
    expect(haloRun).toBeGreaterThan(0.45)
    expect(haloRun).toBeGreaterThan(2 * flickerRun)
    // Smooth swell with a shimmer at the peak, never a hard switch.
    const halo = Array.from({ length: 720 }, (_, i) => Math.max(...Array.from({ length: 12 }, (_, col) => pixels.haloAt(0.02, col, 2, 3 + i / 120))))
    const steps = halo.slice(1).map((value, i) => Math.abs(value - (halo[i] ?? value)))
    expect(Math.max(...steps)).toBeLessThan(0.15)
    expect(Math.max(...halo)).toBeGreaterThan(0.85)
    expect(Math.max(...halo)).toBeLessThanOrEqual(1)
    const rateOf = (clock: (t: number) => number, t: number) => (clock(t + 0.01) - clock(t)) / 0.01
    expect(rateOf(pixels.haloClockAt, 3)).toBeLessThan(rateOf(pixels.flickerClockAt, 3) / 2)
    // The flicker quickens: its clock runs faster later on and stays continuous.
    const rate = (t: number) => (pixels.flickerClockAt(t + 0.01) - pixels.flickerClockAt(t)) / 0.01
    expect(rate(0.4)).toBeCloseTo(0.65, 3)
    expect(rate(1.6)).toBeGreaterThan(1.6)
    expect(rate(4)).toBeCloseTo(2.1, 3)
    expect(Math.abs(pixels.flickerClockAt(1.5 + 1e-6) - pixels.flickerClockAt(1.5 - 1e-6))).toBeLessThan(1e-4)
    // The purple flicker dims cells briefly now and then, everywhere in the field.
    const dips = Array.from({ length: 240 }, (_, i) => pixels.flickerAt(30, 1, 3 + i / 120))
    expect(Math.max(...dips)).toBeGreaterThan(0.8)
    expect(dips.filter((value) => value === 0).length).toBeGreaterThan(80)
  })

  it('adds white light on top of the purple instead of turning cells white', () => {
    // The cell's own colour has no glow input; the glow is a separate white layer.
    expect(pixels.glowLayer(0)).toEqual({ fill: 'rgba(255,255,255,0.000)', halo: 'rgba(255,255,255,0.000)' })
    expect(pixels.glowLayer(1).fill).toMatch(/^rgba\(255,255,255,0\.2\d+\)$/u)
    const ops: Array<{ fill: string; composite: string; shadow: string; blur: number }> = []
    const context = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      globalCompositeOperation: 'source-over',
      shadowColor: '',
      shadowBlur: 0,
      fillRect() {
        ops.push({ fill: this.fillStyle, composite: this.globalCompositeOperation, shadow: this.shadowColor, blur: this.shadowBlur })
      },
    }
    const canvas = { clientWidth: 252, clientHeight: 28, width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement
    pixels.startPixelField(canvas, { reducedMotion: true })()
    const cells = ops.filter((op) => op.composite === 'source-over')
    const light = ops.filter((op) => op.composite === 'lighter')
    // Every drawn cell is purple; the white light is added over some of them with a halo.
    expect(cells.length).toBeGreaterThan(100)
    expect(cells.every((op) => /^rgba\((1[78]\d|186),1[01]\d,2[23]\d,/u.test(op.fill))).toBe(true)
    expect(light.length).toBeGreaterThan(5)
    expect(light.every((op) => op.fill.startsWith('rgba(255,255,255,') && op.shadow.startsWith('rgba(255,255,255,') && op.blur > 0)).toBe(true)
    expect(context.restore).toHaveBeenCalled()
  })

  it('uses a deeper purple and a violet halo on a light track', () => {
    // Computed colours come as rgb() or, from color-mix(), as color(srgb ...).
    expect(pixels.isLightColor('rgb(225, 228, 233)')).toBe(true)
    expect(pixels.isLightColor('color(srgb 0.88 0.894 0.913)')).toBe(true)
    expect(pixels.isLightColor('color(srgb 0.0386 0.0579 0.0868)')).toBe(false)
    expect(pixels.isLightColor('rgb(12, 18, 27)')).toBe(false)
    expect(pixels.isLightColor('transparent')).toBe(false)
    expect(pixels.cellColor(0, 1, true)).toBe('rgba(126,62,200,1.000)')
    expect(pixels.cellColor(0, 1, false)).toBe('rgba(186,118,222,1.000)')
    expect(pixels.glowLayer(1, true).halo).toBe('rgba(168,112,255,0.750)')
    expect(pixels.glowLayer(1, true).fill).toBe(pixels.glowLayer(1, false).fill)
    // The field reads its track's colour and switches palette.
    const fills: Array<{ fill: string; composite: string; shadow: string }> = []
    const context = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      globalCompositeOperation: 'source-over',
      shadowColor: '',
      shadowBlur: 0,
      fillRect() { fills.push({ fill: this.fillStyle, composite: this.globalCompositeOperation, shadow: this.shadowColor }) },
    }
    const track = document.createElement('div')
    track.style.backgroundColor = 'rgb(225, 228, 233)'
    const canvas = { clientWidth: 252, clientHeight: 28, width: 0, height: 0, parentElement: track, getContext: () => context } as unknown as HTMLCanvasElement
    pixels.startPixelField(canvas, { reducedMotion: true })()
    const cells = fills.filter((op) => op.composite === 'source-over')
    expect(cells.length).toBeGreaterThan(100)
    expect(cells.every((op) => /^rgba\(1[12]\d,(4[6-9]|5\d|6[0-2]),(19\d|200),/u.test(op.fill))).toBe(true)
    expect(fills.filter((op) => op.composite === 'lighter').every((op) => op.shadow.startsWith('rgba(168,112,255,'))).toBe(true)
  })

  it('draws a full lattice up to the right end, under the knob, brighter next to it', () => {
    const rects: Array<{ x: number; y: number; alpha: number }> = []
    const context = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      globalCompositeOperation: 'source-over',
      shadowColor: '',
      shadowBlur: 0,
      fillRect(x: number, y: number) {
        if (this.globalCompositeOperation !== 'source-over') return
        rects.push({ x, y, alpha: Number(/,([\d.]+)\)$/u.exec(this.fillStyle)?.[1] ?? 0) })
      },
    }
    const canvas = { clientWidth: 252, clientHeight: 28, width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement
    pixels.startPixelField(canvas, { reducedMotion: true })()
    const knobLeft = 252 - 28
    expect(rects.every((r) => r.x < 252 && r.y >= 0 && r.y < 28)).toBe(true)
    // Nothing beyond 70% of the track.
    expect(Math.min(...rects.map((r) => r.x))).toBeGreaterThanOrEqual(knobLeft * 0.3 - 4)
    // The lattice continues under the knob (7 columns), so its rounded corners
    // show cells instead of a seam at its left edge.
    expect(rects.filter((r) => r.x >= knobLeft).length).toBe(7 * 7)
    // Every slot within 40px left of the knob is lit once settled: 7 rows x 10 columns.
    const near = rects.filter((r) => r.x >= knobLeft - 40 && r.x < knobLeft)
    expect(near.length).toBe(7 * 10)
    const mean = (list: typeof rects) => list.reduce((sum, r) => sum + r.alpha, 0) / list.length
    expect(mean(near)).toBeGreaterThan(mean(rects.filter((r) => r.x < knobLeft - 100)))
  })

  it('stops its animation loop', () => {
    const cancel = vi.spyOn(window, 'cancelAnimationFrame')
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockReturnValue({
      setTransform: () => undefined,
      clearRect: () => undefined,
      fillRect: () => undefined,
    } as unknown as CanvasRenderingContext2D)
    const stop = pixels.startPixelField(canvas, { reducedMotion: false })
    stop()
    expect(cancel).toHaveBeenCalledTimes(1)
  })
})
