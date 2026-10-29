import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { BASE_TOKENS } from '../packages/dsh-desktop-theme/src/client/tokens'
import { fluidToneColors } from '../packages/dsh-desktop-theme/src/client/fluid-tones'
import { projectRoot } from './patch-path'

type Rgb = [number, number, number]
type Scheme = 'light' | 'dark'

interface GlassFloorModule {
  LIVE_FLOOR_RANGE: Record<Scheme, readonly [number, number]>
  LIVE_FLOOR_TARGETS: ReadonlyArray<readonly [string, number]>
  MAX_TEXT_WASH: number
  liveGlassFloor: (dark: boolean, hue: number, depth: number, brightness: number) => number
  liveTextWash: (dark: boolean, hue: number, depth: number, brightness: number) => number
}
interface WallpaperModule {
  MAX_VEIL: number
  FALLBACK_VEIL: Record<Scheme, number>
  wallpaperVeil: (dark: boolean, pixels: readonly Rgb[], frost: number) => number
  wallpaperFloor: (dark: boolean, pixels: readonly Rgb[], frost: number, veil: number) => number
}

// The modules import siblings with `.ts` extensions, which the test tsconfig
// does not resolve; load them at runtime and describe their surface here.
const source = (name: string): string => path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', name)
const glass = (await import(source('glass-floor.ts'))) as GlassFloorModule
const wallpaper = (await import(source('wallpaper-legibility.ts'))) as WallpaperModule

// An independent model of what the panes sit on, so a regression in the
// modules' own colour handling cannot pass by agreeing with itself.
const hex = (value: string): Rgb => [1, 3, 5].map((i) => Number.parseInt(value.slice(i, i + 2), 16)) as Rgb
const channel = (v: number): number => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const luminance = ([r, g, b]: Rgb): number => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const contrast = (a: Rgb, b: Rgb): number => {
  const hi = Math.max(luminance(a), luminance(b))
  const lo = Math.min(luminance(a), luminance(b))
  return (hi + 0.05) / (lo + 0.05)
}
const over = (top: Rgb, under: Rgb, alpha: number): Rgb =>
  [top[0] * alpha + under[0] * (1 - alpha), top[1] * alpha + under[1] * (1 - alpha), top[2] * alpha + under[2] * (1 - alpha)]
const token = (name: string, scheme: Scheme): string => {
  const value = BASE_TOKENS[name]?.[scheme]
  if (value === undefined) throw new Error(`missing token ${name}`)
  return value
}
const tint = (scheme: Scheme): Rgb => token('--dsh-desktop-glass-tint', scheme).split(' ').map(Number) as Rgb
const blooms = (dark: boolean, hue: number, depth: number, brightness: number): Rgb[] => {
  const tones = fluidToneColors(dark, hue, depth)
  const veil = dark ? Math.max(0, (50 - brightness) / 50) : Math.max(0, (brightness - 50) / 50)
  return [tones.color1, tones.color2, tones.color3].map((c) => over(dark ? [0, 0, 0] : [255, 255, 255], hex(c), veil))
}
const legible = (scheme: Scheme, surface: Rgb): boolean =>
  glass.LIVE_FLOOR_TARGETS.every(([name, ratio]) => contrast(hex(token(name, scheme)), surface) >= ratio - 1e-9)

const palettes: Array<[number, number, number]> = []
for (let hue = 0; hue < 360; hue += 30) for (const depth of [0, 25, 50, 75, 100]) for (const brightness of [0, 50, 100]) palettes.push([hue, depth, brightness])

describe('live glass floor', () => {
  it('holds the text targets over every bloom of the chosen fluid', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const dark = scheme === 'dark'
      const [min, max] = glass.LIVE_FLOOR_RANGE[scheme]
      for (const [hue, depth, brightness] of palettes) {
        const floor = glass.liveGlassFloor(dark, hue, depth, brightness)
        expect(floor).toBeGreaterThanOrEqual(min)
        expect(floor).toBeLessThanOrEqual(max)
        for (const bloom of blooms(dark, hue, depth, brightness)) {
          expect(legible(scheme, over(tint(scheme), bloom, floor)), `${scheme} ${hue}/${depth}/${brightness}`).toBe(true)
        }
      }
    }
  })

  it('lets pale and default palettes show through instead of the fixed floor', () => {
    const fixed = Number(token('--dsh-desktop-glass-floor', 'light'))
    // The shipped default and the user's deep cyan both stay well under the
    // fixed floor that has to survive the darkest bloom of every palette.
    expect(glass.liveGlassFloor(false, 320, 25, 50)).toBeLessThanOrEqual(0.35)
    expect(glass.liveGlassFloor(false, 323, 0, 50)).toBeLessThan(fixed - 0.1)
    expect(glass.liveGlassFloor(false, 320, 100, 50)).toBe(glass.LIVE_FLOOR_RANGE.light[0])
    // A deeper palette needs a thicker pane, never a thinner one.
    expect(glass.liveGlassFloor(false, 0, 0, 50)).toBeGreaterThan(glass.liveGlassFloor(false, 0, 75, 50))
  })
})

describe('reading wash', () => {
  it('lets bare transcript text meet the targets over the fluid and its decorations', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const dark = scheme === 'dark'
      const washColour: Rgb = dark ? [0, 0, 0] : [255, 255, 255]
      for (const [hue, depth, brightness] of palettes) {
        const wash = glass.liveTextWash(dark, hue, depth, brightness)
        expect(wash).toBeGreaterThanOrEqual(0)
        expect(wash).toBeLessThanOrEqual(glass.MAX_TEXT_WASH)
        if (wash === glass.MAX_TEXT_WASH) continue
        for (const bloom of blooms(dark, hue, depth, brightness)) {
          // The wash plans for dots, lines and shadows darkening the fluid by a tenth.
          const shaded: Rgb = [bloom[0] * 0.9, bloom[1] * 0.9, bloom[2] * 0.9]
          expect(legible(scheme, over(washColour, shaded, wash)), `${scheme} ${hue}/${depth}/${brightness}`).toBe(true)
        }
      }
    }
  })

  it('stays light over the default palette and adds nothing where text already reads', () => {
    expect(glass.liveTextWash(false, 320, 25, 50)).toBeLessThanOrEqual(0.3)
    // Light text on the near-black dark fluid needs no wash.
    expect(glass.liveTextWash(true, 320, 0, 50)).toBe(0)
  })
})

describe('wallpaper legibility', () => {
  // Pixels darkest first, as sampleWallpaper returns them.
  const sorted = (pixels: Rgb[]): Rgb[] => [...pixels].sort((a, b) => luminance(a) - luminance(b))
  const photo = sorted([
    ...Array.from({ length: 400 }, (): Rgb => [135, 181, 224]),
    ...Array.from({ length: 300 }, (): Rgb => [44, 59, 42]),
    ...Array.from({ length: 200 }, (): Rgb => [242, 193, 78]),
    ...Array.from({ length: 100 }, (): Rgb => [122, 46, 59]),
  ])

  it('washes a light-scheme photo just enough for dark text on its dark patches', () => {
    const veil = wallpaper.wallpaperVeil(false, photo, 0)
    expect(veil).toBeGreaterThan(0)
    expect(veil).toBeLessThanOrEqual(wallpaper.MAX_VEIL)
    expect(legible('light', over([255, 255, 255], [44, 59, 42], veil))).toBe(true)
    // One step less would leave the dark ground under the targets.
    expect(legible('light', over([255, 255, 255], [44, 59, 42], veil - 0.01))).toBe(false)
    // The user's own white frost counts toward it.
    expect(wallpaper.wallpaperVeil(false, photo, 0.4)).toBeLessThan(veil)
    // A pale picture needs no wash at all.
    expect(wallpaper.wallpaperVeil(false, sorted(Array.from({ length: 50 }, (): Rgb => [236, 240, 246])), 0)).toBe(0)
  })

  it('shades a dark-scheme photo for light text on its bright patches', () => {
    const veil = wallpaper.wallpaperVeil(true, photo, 0)
    expect(veil).toBeGreaterThan(0)
    expect(legible('dark', over([0, 0, 0], [242, 193, 78], veil))).toBe(true)
  })

  it('fits the pane floor to the washed picture and keeps the fallbacks conservative', () => {
    for (const dark of [false, true]) {
      const scheme: Scheme = dark ? 'dark' : 'light'
      const veil = wallpaper.wallpaperVeil(dark, photo, 0)
      const floor = wallpaper.wallpaperFloor(dark, photo, 0, veil)
      const [min, max] = glass.LIVE_FLOOR_RANGE[scheme]
      expect(floor).toBeGreaterThanOrEqual(min)
      expect(floor).toBeLessThanOrEqual(max)
    }
    expect(wallpaper.FALLBACK_VEIL.light).toBeGreaterThanOrEqual(0.4)
    expect(wallpaper.FALLBACK_VEIL.dark).toBeGreaterThanOrEqual(0.4)
  })
})
