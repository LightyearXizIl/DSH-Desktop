/**
 * Legibility over a wallpaper. Mica leaves the transcript, the hero and the
 * status lines on the bare backdrop, so an arbitrary photo can put dark text
 * on a dark patch (light scheme) or light text on a bright one (dark scheme).
 * The wallpaper is sampled once per image, and the veil is the least white
 * (light) or black (dark) wash that brings all but the most extreme 2% of the
 * picture to the same text contrast the glass floor guarantees. Panes then
 * take the live floor over those washed pixels instead of the fixed one.
 */
import { LIVE_FLOOR_RANGE, LIVE_FLOOR_TARGETS, contrast, over } from './glass-floor.ts'
import { BASE_TOKENS } from './tokens.ts'

type Rgb = [number, number, number]
type Scheme = 'light' | 'dark'

/** Share of the picture allowed to stay past the threshold (tiny details, noise). */
const TAIL = 0.02
/** Strongest wash the veil applies; past this the wallpaper is no longer visible. */
export const MAX_VEIL = 0.8
/** Washes used while an image is still being sampled, and for video. */
export const FALLBACK_VEIL: Readonly<Record<Scheme, number>> = { light: 0.45, dark: 0.5 }

const SAMPLE_WIDTH = 96
const SAMPLE_HEIGHT = 60

function token(name: string, scheme: Scheme): string {
  const value = BASE_TOKENS[name]?.[scheme]
  if (value === undefined) throw new Error(`missing theme token ${name}`)
  return value
}
const hex = (value: string): Rgb =>
  [1, 3, 5].map((start) => Number.parseInt(value.slice(start, start + 2), 16)) as Rgb
const triple = (value: string): Rgb => value.split(' ').map(Number) as Rgb
const relative = ([r, g, b]: Rgb): number => 0.2126 * r + 0.7152 * g + 0.0722 * b

/**
 * Downscale the image (which also averages it, like a light blur) and return
 * its pixels darkest first.
 */
export async function sampleWallpaper(src: string): Promise<Rgb[]> {
  const image = new Image()
  image.decoding = 'async'
  image.src = src
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = SAMPLE_WIDTH
  canvas.height = SAMPLE_HEIGHT
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (context === null) throw new Error('No 2D canvas to sample the wallpaper')
  context.drawImage(image, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT)
  const data = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data
  const pixels: Rgb[] = []
  for (let i = 0; i + 2 < data.length; i += 4) pixels.push([data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0])
  return pixels.sort((a, b) => relative(a) - relative(b))
}

/** The pixels text has to read against: the dark end (light) or bright end (dark), minus the tail. */
function exposed(pixels: readonly Rgb[], dark: boolean): Rgb[] {
  const cut = Math.floor(pixels.length * TAIL)
  const kept = pixels.slice(cut, pixels.length - cut)
  const span = Math.max(1, Math.ceil(kept.length * 0.1))
  return dark ? kept.slice(kept.length - span) : kept.slice(0, span)
}

function legible(dark: boolean, colours: readonly Rgb[], underlay?: { tint: Rgb, alpha: number }): boolean {
  const scheme: Scheme = dark ? 'dark' : 'light'
  return colours.every((colour) => {
    const surface = underlay ? over(underlay.tint, colour, underlay.alpha) : colour
    return LIVE_FLOOR_TARGETS.every(([name, ratio]) => contrast(hex(token(name, scheme)), surface) >= ratio)
  })
}

/**
 * The wash for the bare-backdrop text. `frost` is the user's own white wash,
 * already applied under this one.
 */
export function wallpaperVeil(dark: boolean, pixels: readonly Rgb[], frost: number): number {
  const white: Rgb = [255, 255, 255]
  const washed = exposed(pixels, dark).map((pixel) => over(white, pixel, frost))
  const veil: Rgb = dark ? [0, 0, 0] : white
  for (let step = 0; step <= Math.round(MAX_VEIL * 100); step++) {
    const alpha = step / 100
    if (legible(dark, washed.map((pixel) => over(veil, pixel, alpha)))) return alpha
  }
  return MAX_VEIL
}

/** The pane floor over the wallpaper as it shows after the user's frost and the veil. */
export function wallpaperFloor(dark: boolean, pixels: readonly Rgb[], frost: number, veil: number): number {
  const scheme: Scheme = dark ? 'dark' : 'light'
  const white: Rgb = [255, 255, 255]
  const wash: Rgb = dark ? [0, 0, 0] : white
  const shown = exposed(pixels, dark).map((pixel) => over(wash, over(white, pixel, frost), veil))
  const tint = triple(token('--dsh-desktop-glass-tint', scheme))
  const [min, max] = LIVE_FLOOR_RANGE[scheme]
  for (let step = Math.round(min * 100); step < Math.round(max * 100); step++) {
    if (legible(dark, shown, { tint, alpha: step / 100 })) return step / 100
  }
  return max
}
