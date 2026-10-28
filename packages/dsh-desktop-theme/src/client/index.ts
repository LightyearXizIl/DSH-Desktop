import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import { ThemeSettingsPage, THEME_SETTINGS_STYLES, type ThemeSettingsPageInjected } from './settings-page.ts'
import { NS, en, zh } from './settings.ts'
import { ThemeLayer, type ThemeState } from './theme.ts'
import { DEFAULT_SETTINGS, type ThemeSettings } from './settings-model.ts'
import { createEffects } from './effects.ts'
import { THEME_RUNTIME_STYLES } from './theme-css.ts'

export const inject = ['theme', 'slots', 'locale']
const SETTINGS_STYLE_ID = 'dsh-desktop-theme-settings-style'

interface SnapshotStore<T> extends ObservableSnapshot<T> {
  getSnapshot: () => T
  subscribe: (listener: () => void) => () => void
  set: (next: T) => void
}

function createSnapshotStore<T>(initial: T): SnapshotStore<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => value,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    set: (next) => {
      if (Object.is(value, next)) return
      value = next
      for (const listener of listeners) listener()
    },
  }
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-desktop-theme: dictionaries')
  ctx.effect(() => {
    // The settings page belongs to the plugin, not to the enabled appearance.
    // Keeping this stylesheet outside ThemeLayer prevents the off switch from
    // collapsing its controls while still removing it when the plugin unloads.
    const style = document.createElement('style')
    style.id = SETTINGS_STYLE_ID
    style.setAttribute('data-plugin-css', SETTINGS_STYLE_ID)
    style.dataset.plugin = 'dsh-desktop-theme'
    style.textContent = THEME_SETTINGS_STYLES
    document.head.appendChild(style)
    return () => style.remove()
  }, 'dsh-desktop-theme: settings styles')

  const themeStore = createSnapshotStore<ThemeState>({
    revision: 0,
    settings: { ...DEFAULT_SETTINGS },
  })
  const darkStore = createSnapshotStore(false)
  const errorStore = createSnapshotStore('')

  const layer = new ThemeLayer({
    ctx,
    createEffects,
    styles: THEME_RUNTIME_STYLES,
    onChange(state, dark, error) {
      themeStore.set(state)
      darkStore.set(dark)
      if (error !== undefined) errorStore.set(error)
    },
  })
  const injected = (): ThemeSettingsPageInjected => ({
    update: (patch: Partial<ThemeSettings>): Promise<boolean> => {
      errorStore.set('')
      return layer.update(patch)
    },
    hooks: {
      settings: themeStore,
      dark: darkStore,
      error: errorStore,
    },
  })

  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'desktop-theme',
    order: 20,
    label: () => ctx.locale.bind(NS)('theme.pluginTab'),
    locale: NS,
    inject: injected,
  }, ThemeSettingsPage))
}
