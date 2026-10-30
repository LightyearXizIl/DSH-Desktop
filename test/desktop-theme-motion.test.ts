// @vitest-environment jsdom
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { projectRoot } from './patch-path'

// The theme's client imports siblings with `.ts` extensions, which the test
// tsconfig does not resolve; load them at runtime.
const source = (name: string): string => path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', name)

interface MotionModule {
  MOTION_ALWAYS_ATTRIBUTE: string
  prefersReducedMotion: () => boolean
  systemPrefersReducedMotion: () => boolean
}
interface EffectsModule {
  createEffects: () => {
    mount: (settings: Record<string, unknown>, dark: boolean) => void
    update: (settings: Record<string, unknown>, dark: boolean) => void
    dispose: () => void
  }
}

/** A reduced-motion media query the test can flip, like Windows "Animation effects". */
function stubSystemMotion(initiallyReduced: boolean): { set: (reduced: boolean) => void; listeners: Set<() => void> } {
  let reduced = initiallyReduced
  const listeners = new Set<() => void>()
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() { return query.includes('prefers-reduced-motion') ? reduced : false },
    addEventListener: (_type: string, listener: () => void) => { listeners.add(listener) },
    removeEventListener: (_type: string, listener: () => void) => { listeners.delete(listener) },
  }))
  return {
    set(next) {
      reduced = next
      for (const listener of [...listeners]) listener()
    },
    listeners,
  }
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.doUnmock(source('whale.ts'))
  vi.doUnmock(source('mesh.ts'))
  vi.doUnmock(source('fluid.ts'))
  vi.doUnmock(source('fluid-interactions.ts'))
  vi.doUnmock(source('spotlight.ts'))
  document.body.replaceChildren()
  document.documentElement.removeAttribute('data-dsh-desktop-motion-always')
})

describe('theme motion', () => {
  it('follows the system request unless the user chose always play', async () => {
    const system = stubSystemMotion(true)
    const motion = (await import(source('motion.ts'))) as MotionModule
    expect(motion.systemPrefersReducedMotion()).toBe(true)
    expect(motion.prefersReducedMotion()).toBe(true)

    document.documentElement.setAttribute(motion.MOTION_ALWAYS_ATTRIBUTE, '')
    expect(motion.prefersReducedMotion()).toBe(false)
    // The system request itself is still reported, for the settings hint.
    expect(motion.systemPrefersReducedMotion()).toBe(true)

    document.documentElement.removeAttribute(motion.MOTION_ALWAYS_ATTRIBUTE)
    system.set(false)
    expect(motion.prefersReducedMotion()).toBe(false)
  })

  it('remounts the backdrop layers when the motion setting or the system request changes', async () => {
    const system = stubSystemMotion(true)
    const motion = (await import(source('motion.ts'))) as MotionModule
    // Each layer decides still-or-animated when it mounts; record that answer.
    const mounts: Array<{ layer: string; reduced: boolean }> = []
    const handle = (layer: string) => {
      mounts.push({ layer, reduced: motion.prefersReducedMotion() })
      return { dispose: vi.fn(), setDark: vi.fn(), setParams: vi.fn(), stir: vi.fn() }
    }
    vi.doMock(source('whale.ts'), () => ({ mountWhale: () => handle('whale') }))
    vi.doMock(source('mesh.ts'), () => ({ mountMesh: () => handle('mesh') }))
    vi.doMock(source('fluid.ts'), () => ({ attachFluidShader: () => handle('fluid'), SITE_FLUID_PARAMS: {} }))
    vi.doMock(source('fluid-interactions.ts'), () => ({ attachFluidInteractions: () => () => undefined }))
    vi.doMock(source('spotlight.ts'), () => ({ startSpotlight: () => () => undefined }))
    const { createEffects } = (await import(source('effects.ts'))) as EffectsModule
    const ambient = document.createElement('div')
    ambient.setAttribute('data-dsh-desktop-ambient', '')
    const canvas = document.createElement('canvas')
    canvas.setAttribute('data-dsh-desktop-fluid-canvas', '')
    document.body.append(ambient, canvas)

    const settings = { whale: true, mesh: true, spotlight: false, press: false, fluidHue: 320, fluidDepth: 25, motion: 'system' }
    const effects = createEffects()
    effects.mount(settings, false)
    expect(mounts.map((entry) => entry.layer).sort()).toEqual(['fluid', 'mesh', 'whale'])
    expect(mounts.every((entry) => entry.reduced)).toBe(true)

    // "Always play": theme.ts sets the root attribute, then updates the effects.
    mounts.length = 0
    document.documentElement.setAttribute(motion.MOTION_ALWAYS_ATTRIBUTE, '')
    effects.update({ ...settings, motion: 'always' }, false)
    expect(mounts.map((entry) => entry.layer).sort()).toEqual(['fluid', 'mesh', 'whale'])
    expect(mounts.every((entry) => !entry.reduced)).toBe(true)

    // An unrelated change does not restart the animation.
    mounts.length = 0
    effects.update({ ...settings, motion: 'always', fluidHue: 200 }, false)
    expect(mounts).toEqual([])

    // Back to following the system, then the user turns Windows animation
    // effects on while the app is open: the layers start moving without a reload.
    document.documentElement.removeAttribute(motion.MOTION_ALWAYS_ATTRIBUTE)
    effects.update({ ...settings, motion: 'system' }, false)
    expect(mounts.every((entry) => entry.reduced)).toBe(true)
    mounts.length = 0
    system.set(false)
    expect(mounts.map((entry) => entry.layer).sort()).toEqual(['fluid', 'mesh', 'whale'])
    expect(mounts.every((entry) => !entry.reduced)).toBe(true)

    effects.dispose()
    expect(system.listeners.size).toBe(0)
  })

  it('keeps the reduced-motion CSS behind the always-play attribute', async () => {
    const [{ THEME_RUNTIME_STYLES }, slider] = await Promise.all([
      import(source('theme-css.ts')) as Promise<{ THEME_RUNTIME_STYLES: string }>,
      import('node:fs/promises').then((fs) => fs.readFile(source('effort-slider/slider.js'), 'utf8')),
    ])
    const block = THEME_RUNTIME_STYLES.slice(THEME_RUNTIME_STYLES.indexOf('@media (prefers-reduced-motion: reduce)'))
    const selectors = block.slice(0, block.indexOf('\n}')).split('\n').filter((line) => line.includes('[data-dsh-desktop-'))
    expect(selectors.length).toBeGreaterThan(0)
    for (const line of selectors) expect(line).toContain(':not([data-dsh-desktop-motion-always])')
    for (const rule of slider.match(/@media \(prefers-reduced-motion: reduce\)\{[^"]*/g) ?? []) {
      expect(rule).toContain(':root:not([data-dsh-desktop-motion-always])')
    }
  })
})
