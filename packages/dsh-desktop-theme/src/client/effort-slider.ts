import type { Context, Fiber } from '@deepseek-ai/cordis'
import { createEffortSlider, type EffortSliderSettings } from './effort-slider/slider.js'
import { startPixelField } from './effort-slider/pixel-field.ts'
import { prefersReducedMotion } from './motion.ts'
import type { ThemeSettings } from './settings-model.ts'
import { NS, zh, type DesktopThemeKey } from './settings.ts'

export const EFFORT_SLIDER_SETTINGS_EVENT = 'dsh-desktop-theme:effort-slider-settings'

/**
 * Services the slider needs on top of the theme's own. They load in a child
 * fiber, so a profile without model selection (or a late provider) leaves only
 * the slider pending and never holds back the theme.
 */
const SLIDER_INJECT = ['slots', 'locale', 'sessions', 'modelDirectories', 'remote', 'remote.session']

export interface EffortSliderController {
  sync: (settings: ThemeSettings) => void
  dispose: () => void
}

/**
 * Run the reasoning-effort slider as part of the theme: it is active while the
 * theme and its own switch are both on, and its settings come from the theme.
 */
export function createEffortSliderController(ctx: Context): EffortSliderController {
  let fiber: Fiber | undefined
  let settings: EffortSliderSettings = { motion: 'full', reachedTicks: 'highlight', style: 'codex' }

  const start = (): void => {
    const slider = createEffortSlider({
      // The vendored JS passes plain strings; an unknown key shows as itself.
      t: (key) => isThemeKey(key) ? ctx.locale.bind(NS)(key) : key,
      getSettings: () => settings,
      settingsEvent: EFFORT_SLIDER_SETTINGS_EVENT,
      startPixelField,
      prefersReducedMotion,
    })
    fiber = ctx.inject(SLIDER_INJECT, (child) => slider.apply(child))
  }

  const stop = (): void => {
    const current = fiber
    fiber = undefined
    // Disposal removes the slot entry and styles; the menu bridge restores the
    // official row on unmount, so a failure here only leaves stale UI behind.
    current?.dispose().catch((error: unknown) => {
      console.warn('dsh-desktop-theme: could not unload the effort slider', error)
    })
  }

  return {
    sync(next) {
      const nextSettings: EffortSliderSettings = {
        motion: next.effortMotion,
        reachedTicks: next.effortTicks,
        style: next.effortStyle,
      }
      const changed = nextSettings.motion !== settings.motion
        || nextSettings.reachedTicks !== settings.reachedTicks
        || nextSettings.style !== settings.style
      settings = nextSettings
      const active = next.enabled && next.effortSlider
      if (active && fiber === undefined) start()
      else if (!active && fiber !== undefined) stop()
      else if (changed && fiber !== undefined) window.dispatchEvent(new CustomEvent(EFFORT_SLIDER_SETTINGS_EVENT))
    },
    dispose: stop,
  }
}

function isThemeKey(key: string): key is DesktopThemeKey {
  return Object.hasOwn(zh, key)
}
