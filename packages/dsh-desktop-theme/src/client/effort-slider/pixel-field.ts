/**
 * The Claude Code style's top-level effect: a fixed lattice of small purple
 * cells next to the knob, where cells catch a white-grey glow. Timings and
 * shapes are measured from the reference recording (t = seconds since the top
 * level was reached, u = distance from the knob's left edge as a share of the
 * track left of it):
 *
 *   - Cells light up one by one, each within about 0.12 s, at a time that
 *     moves leftward with the field front plus a random delay that grows with
 *     distance, so only the columns by the knob fill in at once and the front
 *     stays a sparse scatter. The field reaches about 60% of the track in ~1 s.
 *   - Brightness is flat for the first 8% and falls linearly to nothing at 70%;
 *     the whole field charges up from 60% to full over ~1.4 s.
 *   - One travelling wave, measured from the recording at 60 fps: a soft bright
 *     band (about six columns at its peak) and a wider dark band alternating
 *     every ~0.41 track widths, every row together, moving leftward at about
 *     0.28 → 0.38 track widths per second (about one pass per second at any one
 *     place), brightness swinging by about ±28%.
 *   - Purple flicker: each cell dims briefly now and then, quicker and quicker
 *     over time (~0.65 → 2.1 Hz).
 *   - White halo, separate from the flicker: cells keep their purple and get a
 *     soft white light added on top (additive, with a wide halo), not a new
 *     colour. Like a star it swells, shimmers at its peak and fades, lasting
 *     about a second. Nothing glows at first; from ~0.6 s halos appear next to
 *     the knob and the region where they appear spreads leftward (to ~30% of the
 *     track): later many cells by the knob glow, fewer further out, none far away.
 */

export interface PixelFieldOptions {
  /** Draw the settled field once, without growth, wave or flicker. */
  reducedMotion: boolean
}

/** Cell pitch and size in CSS pixels: 3px squares with a 1px gap. */
const PITCH = 4
const CELL = 3
/** The knob is as wide as the track is tall; distances are measured from its left edge. */
const KNOB_WIDTH = 28
/** Field front: the share of the track it reaches, and how long it takes. */
export const FRONT_EXTENT = 0.72
export const FRONT_SECONDS = 1
/**
 * Random extra delay before a cell lights up, growing quickly with distance:
 * only the first few columns by the knob fill in at once, the rest of the field
 * stays a scatter with dark cells for most of the first second.
 */
const LIGHT_JITTER_NEAR = 0.06
const LIGHT_JITTER_FAR = 0.78
const LIGHT_SECONDS = 0.12
/** Envelope: flat next to the knob, then a linear fall to zero. */
const ENVELOPE_FLAT = 0.08
const ENVELOPE_END = 0.7
/** Overall charge: starting level and how long it takes to reach full. */
const CHARGE_START = 0.6
const CHARGE_SECONDS = 1.4
/**
 * The travelling wave: wavelength in track widths, speed in track widths per
 * second as [time, speed] points, and the brightness swing either side.
 */
export const WAVE_LENGTH = 0.41
export const WAVE_SPEED: ReadonlyArray<readonly [number, number]> = [[0, 0.28], [1.2, 0.28], [3, 0.38]]
export const WAVE_SWING = 0.28

/** Purple flicker rate in hertz as [time, rate] points. */
export const FLICKER_RATE: ReadonlyArray<readonly [number, number]> = [[0, 0.65], [0.8, 0.65], [1.5, 1.7], [3, 2.1]]
/**
 * White halo: when it starts and how far it spreads (as a share of the track)
 * by when, and the share of cells glowing right at the knob once it has spread.
 */
export const GLOW_START = 0.6
const GLOW_FULL = 2.6
export const GLOW_REACH = 0.32
const GLOW_SHARE = 0.55
/**
 * Halo cycle rate in hertz as [time, rate] points: much slower than the
 * flicker, so a halo lasts about a second. Its shimmer at the peak, in hertz.
 */
export const HALO_RATE: ReadonlyArray<readonly [number, number]> = [[0, 0.45], [1.5, 0.55], [3, 0.75]]
const HALO_SHIMMER = 3.5
/** How far a purple cell dims at the bottom of a dip. */
const DIP_DEPTH = 0.45
/** Time the reduced-motion field is drawn at: fully grown and settled. */
const SETTLED_SECONDS = 4

type Rgb = readonly [number, number, number]
/**
 * Purple at full brightness by distance: the recording's lit cells have a
 * saturation of ~0.45 at every distance before the glow sets in, hue ~280°,
 * scaled by its knob-to-ours brightness ratio (about 1.4).
 */
const PURPLE_NEAR: Rgb = [186, 118, 222]
const PURPLE_FAR: Rgb = [178, 104, 232]
/**
 * On a light track the same purple at partial opacity washes out to pastel, so
 * light mode draws a deeper, more saturated purple (same hue).
 */
const PURPLE_NEAR_LIGHT: Rgb = [126, 62, 200]
const PURPLE_FAR_LIGHT: Rgb = [112, 46, 190]
/** Strength of the white light added over a fully glowing cell, and its halo. */
const GLOW_FILL = 0.28
const GLOW_HALO = 0.75
const GLOW_BLUR = 6
/** A white halo vanishes on a light track; light mode blooms in a light violet instead. */
const HALO_LIGHT: Rgb = [168, 112, 255]

/** Deterministic hash in [0, 1), so the lattice does not jump between frames. */
export function cellHash(col: number, row: number, salt: number): number {
  let h = Math.imul(col + 1, 374761393) ^ Math.imul(row + 1, 668265263) ^ Math.imul(salt + 1, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(value: number): number {
  const k = clamp01(value)
  return k * k * (3 - 2 * k)
}

/**
 * Integral over [0, t] of a piecewise-linear rate given as [time, rate]
 * points (held constant after the last point). Integrating keeps the wave
 * and the flicker continuous while they speed up.
 */
export function rateIntegral(t: number, points: ReadonlyArray<readonly [number, number]>): number {
  let total = 0
  for (let i = 0; i < points.length; i += 1) {
    const [t0, r0] = points[i] ?? [0, 0]
    const next = points[i + 1]
    if (t <= t0) break
    if (next === undefined) return total + r0 * (t - t0)
    const [t1, r1] = next
    const end = Math.min(t, t1)
    const rateAtEnd = r0 + ((r1 - r0) * (end - t0)) / (t1 - t0)
    total += ((r0 + rateAtEnd) / 2) * (end - t0)
    if (t <= t1) break
  }
  return total
}

/** How far the field front has reached at time `t`, as a share of the track. */
export function frontAt(t: number): number {
  return FRONT_EXTENT * smoothstep(t / FRONT_SECONDS)
}

/** When the front reaches distance `u` (the inverse of `frontAt`). */
export function frontTimeAt(u: number): number {
  const y = clamp01(u / FRONT_EXTENT)
  return FRONT_SECONDS * (0.5 - Math.sin(Math.asin(1 - 2 * y) / 3))
}

/** How lit a cell is at time `t` (0 before it lights up, 1 once lit). */
export function lightAt(u: number, col: number, row: number, t: number): number {
  const jitter = LIGHT_JITTER_NEAR + (LIGHT_JITTER_FAR - LIGHT_JITTER_NEAR) * Math.sqrt(clamp01(u / FRONT_EXTENT))
  const start = frontTimeAt(u) + jitter * cellHash(col, row, 13)
  return clamp01((t - start) / LIGHT_SECONDS)
}

/** Brightness envelope by distance: flat next to the knob, then a linear fall. */
export function envelopeAt(u: number): number {
  if (u < 0 || u >= ENVELOPE_END) return 0
  if (u <= ENVELOPE_FLAT) return 1
  return 1 - (u - ENVELOPE_FLAT) / (ENVELOPE_END - ENVELOPE_FLAT)
}

/** Overall charge of the field at time `t`. */
export function chargeAt(t: number): number {
  return CHARGE_START + (1 - CHARGE_START) * smoothstep(t / CHARGE_SECONDS)
}

/** How far the wave has travelled leftward after `t` seconds, in track widths. */
export function waveOffsetAt(t: number): number {
  return rateIntegral(t, WAVE_SPEED)
}

/** How strong the wave is at time `t`: present from the start, full by ~1 s. */
export function waveStrengthAt(t: number): number {
  return 0.6 + 0.4 * smoothstep(t / 1)
}

/**
 * Wave shape at distance `u` (the same for every row), 0..1: a raised cosine
 * squared, so the bright part is narrower than the dark part between passes.
 */
export function waveAt(u: number, t: number): number {
  const crest = 0.5 + 0.5 * Math.cos((2 * Math.PI * (u - waveOffsetAt(t))) / WAVE_LENGTH)
  return crest * crest
}

/** The flicker clock after `t` seconds (cycles of the base flicker rate). */
export function flickerClockAt(t: number): number {
  return rateIntegral(t, FLICKER_RATE)
}

/** How far the glowing region reaches from the knob at time `t`, as a share of the track. */
export function glowReachAt(t: number): number {
  return GLOW_REACH * smoothstep((t - GLOW_START) / (GLOW_FULL - GLOW_START))
}

/** Share of cells glowing at distance `u` and time `t`: most by the knob, none past the reach. */
export function glowShareAt(u: number, t: number): number {
  const reach = glowReachAt(t)
  if (reach <= 0) return 0
  return GLOW_SHARE * clamp01(1 - u / reach) ** 1.2 * smoothstep((t - GLOW_START) / 0.5)
}

/** How far a cell's purple is dimmed by its flicker at time `t` (0 most of the time). */
export function flickerAt(col: number, row: number, t: number): number {
  const cycles = flickerClockAt(t) * (0.7 + 0.6 * cellHash(col, row, 5)) + cellHash(col, row, 9)
  return Math.max(0, -Math.cos(2 * Math.PI * cycles)) ** 1.6
}

/** The halo clock after `t` seconds (cycles of the base halo rate). */
export function haloClockAt(t: number): number {
  return rateIntegral(t, HALO_RATE)
}

/**
 * One cell's white halo at time `t` (0..1). Each cell runs its own slow cycle;
 * in every cycle it either lights up or not, decided per cycle. A lit cycle is
 * a star's twinkle: it swells, shimmers at its peak and fades out by the end.
 */
export function haloAt(u: number, col: number, row: number, t: number): number {
  const cycles = haloClockAt(t) * (0.75 + 0.5 * cellHash(col, row, 21)) + cellHash(col, row, 23)
  const index = Math.floor(cycles)
  if (cellHash(col, row, 301 + index) >= glowShareAt(u, t)) return 0
  const swell = Math.sin(Math.PI * (cycles - index)) ** 2
  const shimmer = 0.82 + 0.18 * Math.sin(2 * Math.PI * HALO_SHIMMER * t + cellHash(col, row, 27) * Math.PI * 2)
  return swell * shimmer
}

/** A lit cell's brightness before its flicker: envelope, charge and the travelling wave. */
export function baseBrightness(u: number, t: number, envelope = envelopeAt(u), light = 1): number {
  const swing = WAVE_SWING * waveStrengthAt(t)
  return envelope * chargeAt(t) * light * (1 - swing + 2 * swing * waveAt(u, t))
}

/**
 * Brightness (0..1) of one cell's purple and its white halo (0..1). Under a
 * halo the purple is brought partway up, so the white light sits on a lit cell.
 */
export function cellLight(u: number, col: number, row: number, t: number): { b: number, glow: number } {
  const envelope = envelopeAt(u)
  if (envelope === 0) return { b: 0, glow: 0 }
  const light = lightAt(u, col, row, t)
  if (light === 0) return { b: 0, glow: 0 }
  const base = Math.min(1, baseBrightness(u, t, envelope, light))
  const dimmed = base * (1 - DIP_DEPTH * flickerAt(col, row, t) * smoothstep(t / 0.8))
  const glow = haloAt(u, col, row, t) * light
  return { b: dimmed + (Math.max(dimmed, 0.75 * light) - dimmed) * 0.5 * glow, glow }
}

/**
 * A cell's own purple at distance `u` with brightness `b`, as rgba; the glow
 * never changes it. `light` selects the deeper purple drawn on a light track.
 */
export function cellColor(u: number, b: number, light = false): string {
  const k = clamp01(u / ENVELOPE_END)
  const [near, far] = light ? [PURPLE_NEAR_LIGHT, PURPLE_FAR_LIGHT] : [PURPLE_NEAR, PURPLE_FAR]
  const channel = (i: 0 | 1 | 2): number => Math.round(near[i] + (far[i] - near[i]) * k)
  return `rgba(${channel(0)},${channel(1)},${channel(2)},${clamp01(b).toFixed(3)})`
}

/**
 * The white light layer over a cell glowing by `glow`: its additive fill and
 * its halo, as rgba. On a light track the halo is light violet so it shows.
 */
export function glowLayer(glow: number, light = false): { fill: string, halo: string } {
  const w = clamp01(glow)
  const [r, g, b] = light ? HALO_LIGHT : [255, 255, 255]
  return {
    fill: `rgba(255,255,255,${(GLOW_FILL * w).toFixed(3)})`,
    halo: `rgba(${r},${g},${b},${(GLOW_HALO * w).toFixed(3)})`,
  }
}

/**
 * Whether a computed CSS colour is light (relative luminance above 0.5). Reads
 * both `rgb()/rgba()` and the `color(srgb ...)` form that color-mix() computes to.
 */
export function isLightColor(value: string): boolean {
  let channels: number[] | null = null
  const rgb = /^rgba?\(([^)]+)\)/u.exec(value)
  if (rgb !== null) channels = (rgb[1] ?? '').split(/[\s,/]+/u).filter(Boolean).slice(0, 3).map((part) => Number(part) / 255)
  const srgb = /^color\(srgb\s+([^)]+)\)/u.exec(value)
  if (srgb !== null) channels = (srgb[1] ?? '').split(/[\s/]+/u).filter(Boolean).slice(0, 3).map(Number)
  if (channels === null || channels.length < 3 || channels.some((part) => !Number.isFinite(part))) return false
  const linear = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0) > 0.5
}

/**
 * Animate the field on `canvas` until the returned function is called. The
 * caller fades the canvas out with CSS, so stopping leaves the last frame.
 */
export function startPixelField(canvas: HTMLCanvasElement, options: PixelFieldOptions): () => void {
  const context = canvas.getContext('2d')
  if (context === null) return () => undefined
  const start = performance.now()
  let frame = 0
  let stopped = false

  const draw = (now: number): void => {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (width === 0 || height === 0) return
    const ratio = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, width, height)
    const t = options.reducedMotion ? SETTLED_SECONDS : (now - start) / 1000
    // The track's colour follows the theme; read it each frame so a scheme switch
    // while the field runs picks the matching palette.
    const backdrop = canvas.parentElement
    const light = backdrop instanceof Element && isLightColor(getComputedStyle(backdrop).backgroundColor)
    const knobLeft = width - KNOB_WIDTH
    if (knobLeft <= 0) return
    const rows = Math.floor(height / PITCH)
    const top = (height - rows * PITCH + (PITCH - CELL)) / 2
    const glowing: Array<{ x: number, y: number, glow: number }> = []
    // The lattice runs to the right end of the track, under the knob: its
    // rounded corners show the cells behind it instead of a seam at its edge.
    for (let col = 0; (col + 1) * PITCH <= width; col += 1) {
      const x = width - (col + 1) * PITCH + (PITCH - CELL)
      const u = Math.max(0, (knobLeft - x - CELL / 2) / knobLeft)
      if (u >= ENVELOPE_END) break
      for (let row = 0; row < rows; row += 1) {
        const { b, glow } = cellLight(u, col, row, t)
        if (b < 0.03) continue
        const y = top + row * PITCH
        context.fillStyle = cellColor(u, b, light)
        context.fillRect(x, y, CELL, CELL)
        if (glow > 0.05) glowing.push({ x, y, glow })
      }
    }
    // The white light is added on top of the purple in a second pass: additive
    // ('lighter') so the cell keeps its hue, with a blurred halo around it. The
    // blur is switched on once per frame rather than per cell.
    if (glowing.length > 0) {
      context.save()
      context.globalCompositeOperation = 'lighter'
      context.shadowBlur = GLOW_BLUR
      for (const cell of glowing) {
        const layer = glowLayer(cell.glow, light)
        context.shadowColor = layer.halo
        context.fillStyle = layer.fill
        context.fillRect(cell.x, cell.y, CELL, CELL)
      }
      context.restore()
    }
  }

  const loop = (now: number): void => {
    if (stopped) return
    draw(now)
    frame = requestAnimationFrame(loop)
  }

  if (options.reducedMotion) draw(performance.now())
  else frame = requestAnimationFrame(loop)
  return () => {
    stopped = true
    cancelAnimationFrame(frame)
  }
}
