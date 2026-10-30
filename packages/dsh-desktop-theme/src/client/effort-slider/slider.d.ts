import type { Context } from '@deepseek-ai/cordis'

/** Values the slider reads on every render; the theme owns and persists them. */
export interface EffortSliderSettings {
  motion: 'fast' | 'quick' | 'full'
  reachedTicks: 'highlight' | 'dim' | 'hidden'
  style: 'codex' | 'claude'
}

export interface EffortSliderDeps {
  /** Resolves an `effortSlider.*` key in the theme's locale namespace. */
  t: (key: string) => string
  getSettings: () => EffortSliderSettings
  /** Window event the theme dispatches after the settings change. */
  settingsEvent: string
  /** Draws the Claude Code style's top-level pixel field; returns its stop function. */
  startPixelField?: (canvas: HTMLCanvasElement, options: { reducedMotion: boolean }) => () => void
  /** The theme's motion answer (system request unless "Always play"); falls back to the media query. */
  prefersReducedMotion?: () => boolean
}

export interface EffortSlider {
  apply: (ctx: Context) => void
  inject: string[]
  /** Pure functions and constants exposed for offline tests. */
  __internals: Record<string, unknown>
}

export function createEffortSlider(deps: EffortSliderDeps): EffortSlider
