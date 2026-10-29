/**
 * The live glass floor: the thinnest pane that keeps text legible over the
 * fluid the user actually picked. A fixed floor has to survive the darkest
 * bloom of every hue and depth, which turns panes milky over pale palettes;
 * this one checks only the current palette's blooms, each taken as if it
 * filled the pane alone (no credit for blur mixing), so it stays as strict
 * as the fixed floor while letting light backdrops show through.
 */
import { fluidToneColors } from './fluid-tones.ts'
import { BASE_TOKENS } from './tokens.ts'

type Rgb = [number, number, number]
type Scheme = 'light' | 'dark'

/** Thinnest pane that still reads as glass, and the thickest the floor goes. */
export const LIVE_FLOOR_RANGE: Readonly<Record<Scheme, readonly [number, number]>> = {
  light: [0.3, 0.8],
  dark: [0.35, 0.82],
}

/**
 * Text that sits directly on panes, with the contrast each must keep: WCAG AA
 * for body and secondary text, and the large-text minimum plus a margin for
 * tertiary hints. The fixed floor keeps primary text at AAA; the live floor
 * trades that for translucency.
 */
export const LIVE_FLOOR_TARGETS = [
  ['--dsw-alias-label-primary', 4.5],
  ['--dsw-alias-label-secondary', 4.5],
  ['--dsw-alias-label-tertiary', 3.8],
] as const

function token(name: string, scheme: Scheme): string {
  const value = BASE_TOKENS[name]?.[scheme]
  if (value === undefined) throw new Error(`missing theme token ${name}`)
  return value
}

const hex = (value: string): Rgb =>
  [1, 3, 5].map((start) => Number.parseInt(value.slice(start, start + 2), 16)) as Rgb
const triple = (value: string): Rgb => value.split(' ').map(Number) as Rgb
const channel = (v: number): number => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]: Rgb): number => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

export function contrast(a: Rgb, b: Rgb): number {
  const hi = Math.max(luminance(a), luminance(b))
  const lo = Math.min(luminance(a), luminance(b))
  return (hi + 0.05) / (lo + 0.05)
}

/** `top` laid over `under` at the given opacity. */
export function over(top: Rgb, under: Rgb, alpha: number): Rgb {
  const [r, g, b] = top
  const [ur, ug, ub] = under
  return [r * alpha + ur * (1 - alpha), g * alpha + ug * (1 - alpha), b * alpha + ub * (1 - alpha)]
}

/**
 * The fluid's bloom colours as panes see them: the shader paints the palette
 * as given, under the brightness control's white veil (light, above 50) or
 * black one (dark, below 50) from the ambient layer in theme-css.ts.
 */
export function visibleBlooms(dark: boolean, hue: number, depth: number, brightness: number): Rgb[] {
  const tones = fluidToneColors(dark, hue, depth)
  const veil = dark ? Math.max(0, (50 - brightness) / 50) : Math.max(0, (brightness - 50) / 50)
  const veilColor: Rgb = dark ? [0, 0, 0] : [255, 255, 255]
  return [tones.color1, tones.color2, tones.color3].map((bloom) => over(veilColor, hex(bloom), veil))
}

/** Strongest reading wash; past this the fluid is no longer visible. */
export const MAX_TEXT_WASH = 0.85
/**
 * Bare text also passes over the whale's dots, the mesh lines and the cards'
 * drop shadows, which the palette does not describe; the wash plans for them
 * darkening the backdrop by a tenth.
 */
const DECORATION_SHADE = 0.9

/**
 * The reading wash: the least white (light) or black (dark) layer over the
 * fluid that lets text with no pane under it (the mica transcript, its status
 * lines) meet the same contrast as text on glass. It fades in only while a
 * conversation is open, so the home page and other views keep the full fluid.
 */
export function liveTextWash(dark: boolean, hue: number, depth: number, brightness: number): number {
  const scheme: Scheme = dark ? 'dark' : 'light'
  const wash: Rgb = dark ? [0, 0, 0] : [255, 255, 255]
  const labels = LIVE_FLOOR_TARGETS.map(([name, ratio]) => [hex(token(name, scheme)), ratio] as const)
  const blooms = visibleBlooms(dark, hue, depth, brightness).map(([r, gr, b]): Rgb => [r * DECORATION_SHADE, gr * DECORATION_SHADE, b * DECORATION_SHADE])
  for (let step = 0; step <= Math.round(MAX_TEXT_WASH * 100); step++) {
    const alpha = step / 100
    if (blooms.every((bloom) => labels.every(([text, ratio]) => contrast(text, over(wash, bloom, alpha)) >= ratio))) return alpha
  }
  return MAX_TEXT_WASH
}

/** The pane opacity, rounded up to 0.01, that keeps every target over every bloom. */
export function liveGlassFloor(dark: boolean, hue: number, depth: number, brightness: number): number {
  const scheme: Scheme = dark ? 'dark' : 'light'
  const tint = triple(token('--dsh-desktop-glass-tint', scheme))
  const labels = LIVE_FLOOR_TARGETS.map(([name, ratio]) => [hex(token(name, scheme)), ratio] as const)
  const blooms = visibleBlooms(dark, hue, depth, brightness)
  const [min, max] = LIVE_FLOOR_RANGE[scheme]
  for (let step = Math.round(min * 100); step < Math.round(max * 100); step++) {
    const alpha = step / 100
    if (blooms.every((bloom) => labels.every(([text, ratio]) => contrast(text, over(tint, bloom, alpha)) >= ratio))) return alpha
  }
  return max
}
