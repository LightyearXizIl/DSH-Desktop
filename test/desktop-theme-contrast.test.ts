import { describe, expect, it } from 'vitest'
import { BASE_TOKENS, COMPAT_TOKENS } from '../packages/dsh-desktop-theme/src/client/tokens'
import { fluidToneColors } from '../packages/dsh-desktop-theme/src/client/fluid-tones'

type Rgb = [number, number, number]
type Scheme = 'light' | 'dark'

const hex = (value: string): Rgb => {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/iu.exec(value)
  if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined) {
    throw new Error(`not a hex colour: ${value}`)
  }
  return [Number.parseInt(match[1], 16), Number.parseInt(match[2], 16), Number.parseInt(match[3], 16)]
}
const triple = (value: string): Rgb => {
  const [r, g, b] = value.split(' ').map(Number)
  if (r === undefined || g === undefined || b === undefined) throw new Error(`not an r g b triple: ${value}`)
  return [r, g, b]
}
const channel = (v: number): number => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]: Rgb): number => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const contrast = (a: Rgb, b: Rgb): number => {
  const hi = Math.max(luminance(a), luminance(b))
  const lo = Math.min(luminance(a), luminance(b))
  return (hi + 0.05) / (lo + 0.05)
}
const mix = ([r, g, b]: Rgb, [br, bg, bb]: Rgb, alpha: number): Rgb =>
  [r * alpha + br * (1 - alpha), g * alpha + bg * (1 - alpha), b * alpha + bb * (1 - alpha)]

const token = (name: string, scheme: Scheme): string => {
  const value = BASE_TOKENS[name]?.[scheme]
  if (value === undefined) throw new Error(`missing token ${name}`)
  return value
}

/** Every bloom colour the fluid can put behind a pane, across hue and depth. */
function blooms(scheme: Scheme): Rgb[] {
  const out: Rgb[] = []
  for (let hue = 0; hue < 360; hue += 15) {
    for (let depth = 0; depth <= 100; depth += 10) {
      const tones = fluidToneColors(scheme === 'dark', hue, depth)
      out.push(hex(tones.color1), hex(tones.color2), hex(tones.color3))
    }
  }
  return out
}

/** The blooms of the shipped default backdrop (hue 320, depth 25). */
function defaultBlooms(scheme: Scheme): Rgb[] {
  const tones = fluidToneColors(scheme === 'dark', 320, 25)
  return [hex(tones.color1), hex(tones.color2), hex(tones.color3)]
}

/** Worst contrast of a label over the glass floor across the given blooms. */
function worstOnGlass(label: string, scheme: Scheme, backdrop: Rgb[] = blooms(scheme)): number {
  const tint = triple(token('--dsh-desktop-glass-tint', scheme))
  const floor = Number(token('--dsh-desktop-glass-floor', scheme))
  const text = hex(token(label, scheme))
  return Math.min(...backdrop.map((bloom) => contrast(text, mix(tint, bloom, floor))))
}

const STATUS_LABELS = [
  '--dsw-alias-state-error-primary',
  '--dsw-alias-state-warn-primary',
  '--dsw-alias-state-warn-label',
  '--dsw-alias-state-success-primary',
] as const

describe('Liquid Glass legibility', () => {
  it.each(['light', 'dark'] as const)('keeps %s text legible on the glass floor over any fluid bloom', (scheme) => {
    // Primary text stays at AAA and secondary at AA even where the most
    // saturated bloom of any hue/depth passes behind the thinnest pane.
    expect(worstOnGlass('--dsw-alias-label-primary', scheme)).toBeGreaterThanOrEqual(7)
    expect(worstOnGlass('--dsw-alias-label-secondary', scheme)).toBeGreaterThanOrEqual(4.5)
    // Tertiary hints are never fainter than the large-text minimum.
    expect(worstOnGlass('--dsw-alias-label-tertiary', scheme)).toBeGreaterThanOrEqual(3.8)
  })

  it.each(['light', 'dark'] as const)('keeps %s status text readable on the conversation glass', (scheme) => {
    // Status lines (stopped, failed, token limit) and trajectory role tags use
    // these colours as text on the conversation pane. Upstream's bright
    // green-500 / amber-500 washed out to under 2:1 on the light pane.
    for (const label of STATUS_LABELS) {
      expect(worstOnGlass(label, scheme, defaultBlooms(scheme)), label).toBeGreaterThanOrEqual(4.5)
      expect(worstOnGlass(label, scheme), label).toBeGreaterThanOrEqual(2.8)
    }
    expect(worstOnGlass('--dsw-alias-state-business-primary', scheme, defaultBlooms(scheme))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['light', 'dark'] as const)('gives white %s button labels 4.5:1 on the primary fill and hover', (scheme) => {
    const white = hex(token('--dsw-alias-label-primary-foreground', scheme))
    expect(contrast(white, hex(token('--dsw-alias-button-primary-fill', scheme)))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(white, hex(token('--dsw-alias-button-primary-hover', scheme)))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['light', 'dark'] as const)('separates the %s switch thumb from its on track', (scheme) => {
    // The on thumb is label-primary-foreground (white). Upstream's dark track
    // was near-white brand-primary, a 1.07:1 white-on-white switch.
    const thumb = hex(token('--dsw-alias-label-primary-foreground', scheme))
    expect(contrast(thumb, hex(token('--dsh-desktop-switch-on', scheme)))).toBeGreaterThanOrEqual(3)
  })

  it('publishes the same glass material in compatibility mode', () => {
    for (const name of ['--dsh-desktop-glass-tint', '--dsh-desktop-glass-floor', '--dsh-desktop-switch-on']) {
      expect(COMPAT_TOKENS[name]).toEqual(BASE_TOKENS[name])
    }
  })
})
