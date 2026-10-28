import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { patchPath, projectRoot } from './patch-path'

interface HostSettings {
  enabled: boolean
  mode: 'mica' | 'compat'
  blur: number
  frost: number
  fluidHue: number
  fluidDepth: number
  bgBrightness: number
  background: 'fluid' | 'wallpaper'
  wallpaper: string
  whale: boolean
  critters: boolean
  mesh: boolean
  spotlight: boolean
  press: boolean
  wallpaperBlur: number
  wallpaperFrost: number
  videoBlur: number
  videoBrightness: number
}

interface HostModule {
  normalizeThemeSettings: (value: unknown) => HostSettings
  apply: (ctx: unknown, config: { root: string }) => void
}

async function loadHost(overrides: { rm?: (file: string) => Promise<void> } = {}): Promise<HostModule> {
  const source = await readFile(
    path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'index.js'),
    'utf8'
  )
  const transformed = source
    .replace("import { credentialKey } from '@deepseek-ai/dsh-credentials'", '')
    .replace("import Schema from '@deepseek-ai/schemastery'", '')
    .replace("import { randomUUID } from 'node:crypto'", '')
    .replace("import { mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises'", '')
    .replace("import { join } from 'node:path'", '')
    .replace('export const name', 'const name')
    .replace('export const inject', 'const inject')
    .replace('export const Config', 'const Config')
    .replace('export function normalizeThemeSettings', 'function normalizeThemeSettings')
    .replace('export function apply', 'function apply')
    + '\nreturn { normalizeThemeSettings, apply }'
  const credentialKey = (scope: string, id: string) => `${scope}/${id}`
  const stringSchema = { required: () => stringSchema }
  const Schema = { object: () => ({}), string: () => stringSchema }
  return new Function(
    'credentialKey',
    'Schema',
    'randomUUID',
    'mkdir',
    'open',
    'readFile',
    'rename',
    'rm',
    'stat',
    'join',
    transformed,
  )(
    credentialKey,
    Schema,
    () => '00000000-0000-4000-8000-000000000000',
    vi.fn(async () => undefined),
    vi.fn(async () => ({
      write: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    })),
    vi.fn(async () => Buffer.alloc(0)),
    vi.fn(async () => undefined),
    overrides.rm ?? vi.fn(async () => undefined),
    vi.fn(async () => ({ size: 0 })),
    (...parts: string[]) => parts.join('/'),
  ) as HostModule
}

function createHostContext() {
  const stored = { revision: 0, settings: undefined as HostSettings | undefined }
  const removedWallpapers: string[] = []
  const rm = vi.fn(async (file: string) => {
    removedWallpapers.push(file)
  })
  const routes = new Map<string, { methods: Set<string>; fetch: (request: Request) => Promise<Response> }>()
  const ctx = {
    credentials: {
      readRecord: vi.fn(async () => stored.settings === undefined
        ? undefined
        : { kind: 'grant', payload: { revision: stored.revision, settings: stored.settings } }),
      modifyRecord: vi.fn(async (_key: string, mutate: (record: unknown) => Promise<unknown>) => {
        const result = await mutate(stored.settings === undefined
          ? undefined
          : { kind: 'grant', payload: { revision: stored.revision, settings: stored.settings } })
        if (result && typeof result === 'object' && 'payload' in result) {
          const payload = (result as { payload: { revision: number; settings: HostSettings } }).payload
          stored.revision = payload.revision
          stored.settings = payload.settings
        }
        return result
      }),
    },
    connection: {
      fetch: {
        register: vi.fn((route: { path: string; methods: string[]; fetch: (request: Request) => Promise<Response> }) => {
          routes.set(route.path, { methods: new Set(route.methods), fetch: route.fetch })
          return async () => {}
        }),
      },
    },
    inject: vi.fn(),
    rm,
  }
  return { ctx, routes, stored, removedWallpapers, rm }
}

describe('desktop theme host', () => {
  it('normalizes every external field and rejects an oversized wallpaper', async () => {
    const { normalizeThemeSettings } = await loadHost()
    const settings = normalizeThemeSettings({
      enabled: false,
      mode: 'compat',
      blur: 999,
      frost: -5,
      fluidHue: 360,
      fluidDepth: 200,
      bgBrightness: 'nope',
      background: 'wallpaper',
      wallpaper: 'x'.repeat(2_200_001),
      whale: false,
      critters: 'yes',
      mesh: true,
      spotlight: false,
      press: 1,
      wallpaperBlur: 60,
      wallpaperFrost: 101,
      videoBlur: -1,
      videoBrightness: 44,
    })
    expect(settings).toMatchObject({
      enabled: false,
      mode: 'compat',
      blur: 40,
      frost: 0,
      fluidHue: 360,
      fluidDepth: 100,
      bgBrightness: 50,
      background: 'wallpaper',
      wallpaper: '',
      whale: false,
      critters: true,
      mesh: true,
      spotlight: false,
      press: true,
      wallpaperBlur: 40,
      wallpaperFrost: 100,
      videoBlur: 0,
      videoBrightness: 44,
    })
    expect(normalizeThemeSettings({ wallpaper: 'javascript:alert(1)' }).wallpaper).toBe('')
    expect(normalizeThemeSettings({
      wallpaper: 'host:00000000-0000-4000-8000-000000000000.mp4',
    }).wallpaper).toBe('host:00000000-0000-4000-8000-000000000000.mp4')
  })

  it('registers one authenticated route and persists a revisioned settings document', async () => {
    const { apply } = await loadHost()
    const { ctx, routes, stored } = createHostContext()
    apply(ctx, { root: 'C:\\theme-data' })
    const route = routes.get('/api/desktop-theme')
    expect(route).toBeDefined()
    if (route === undefined) throw new Error('theme route was not registered')
    expect(route.methods).toEqual(new Set(['GET', 'POST', 'HEAD']))
    expect(routes.get('/api/desktop-theme/wallpaper')?.methods)
      .toEqual(new Set(['GET', 'POST', 'DELETE']))

    const initial = await route.fetch(new Request('http://localhost/api/desktop-theme'))
    expect(await initial.json()).toMatchObject({ revision: 0, settings: { enabled: true } })

    const saved = await route.fetch(new Request('http://localhost/api/desktop-theme', {
      method: 'POST',
      body: JSON.stringify({ revision: 0, settings: { enabled: false, blur: 12 } }),
    }))
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({ revision: 1, settings: { enabled: false, blur: 12 } })
    expect(stored.revision).toBe(1)

    const stale = await route.fetch(new Request('http://localhost/api/desktop-theme', {
      method: 'POST',
      body: JSON.stringify({ revision: 0, settings: { enabled: true } }),
    }))
    expect(stale.status).toBe(409)
  })

  it('removes replaced wallpaper media and never deletes the active file', async () => {
    const { ctx, routes, stored, removedWallpapers, rm } = createHostContext()
    const { apply } = await loadHost({ rm })
    const oldId = '00000000-0000-4000-8000-000000000001.mp4'
    const newId = '00000000-0000-4000-8000-000000000002.mp4'
    apply(ctx, { root: 'C:\\theme-data' })
    const settingsRoute = routes.get('/api/desktop-theme')
    const wallpaperRoute = routes.get('/api/desktop-theme/wallpaper')
    if (settingsRoute === undefined || wallpaperRoute === undefined) {
      throw new Error('theme routes were not registered')
    }

    const initial = await settingsRoute.fetch(new Request('http://localhost/api/desktop-theme', {
      method: 'POST',
      body: JSON.stringify({ revision: 0, settings: { wallpaper: `host:${oldId}` } }),
    }))
    expect(initial.status).toBe(200)
    const replaced = await settingsRoute.fetch(new Request('http://localhost/api/desktop-theme', {
      method: 'POST',
      body: JSON.stringify({ revision: 1, settings: { wallpaper: `host:${newId}` } }),
    }))
    expect(replaced.status).toBe(200)

    const active = await wallpaperRoute.fetch(new Request(
      `http://localhost/api/desktop-theme/wallpaper?id=${newId}`,
      { method: 'DELETE' },
    ))
    expect(active.status).toBe(204)
    expect(stored.settings?.wallpaper).toBe(`host:${newId}`)
    expect(removedWallpapers).toEqual([`C:\\theme-data/wallpapers/${oldId}`])
    expect(rm).toHaveBeenCalledTimes(1)
  })

  it('is mounted by the desktop and safe-mode profiles and injected into the dsh closure', async () => {
    const [profile, safe, patch] = await Promise.all([
      readFile(path.join(projectRoot, 'build', 'dsh-desktop.patch.yml'), 'utf8'),
      readFile(path.join(projectRoot, 'build', 'dsh-desktop-safe.patch.yml'), 'utf8'),
      readFile(patchPath('@deepseek-ai/dsh'), 'utf8'),
    ])
    const rows = parseYaml(profile, {
      customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: (value: string) => value }],
    }) as Array<{ insert?: Array<{ id?: string; name?: string }> }>
    const mounted = rows.flatMap((row) => row.insert ?? [])
      .find((entry) => entry.id === 'dsh-desktop-theme')
    expect(mounted).toMatchObject({
      id: 'dsh-desktop-theme',
      name: 'dsh-desktop-theme',
      config: { root: "dshHomePath('desktop-theme')" },
    })
    const safeRows = parseYaml(safe, {
      customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: (value: string) => value }],
    }) as Array<{ insert?: Array<{ id?: string; name?: string }> }>
    expect(safeRows.flatMap((row) => row.insert ?? [])
      .find((entry) => entry.id === 'dsh-desktop-theme')).toMatchObject({
      id: 'dsh-desktop-theme',
      name: 'dsh-desktop-theme',
      config: { root: "dshHomePath('desktop-theme')" },
    })
    expect(patch).toContain('+    "dsh-desktop-theme": "0.1.0",')
  })
})

interface ClientRegistration {
  id: string
  factory: (require: (id: string) => unknown) => {
    apply: (ctx: unknown) => void
    inject: string[]
  }
}

async function loadClient(globals: Record<string, unknown>) {
  const source = await readFile(
    path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'lib', 'client.js'),
    'utf8'
  )
  let registration: ClientRegistration | undefined
  vm.runInNewContext(source, {
    ...globals,
    window: {
      ...(globals.window as Record<string, unknown>),
      __ModuleLoader__: {
        load: (value: ClientRegistration) => {
          registration = value
        },
      },
    },
  })
  if (registration === undefined) throw new Error('theme bundle did not register')
  const React = {
    createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }),
    useRef: (initial: unknown) => ({ current: initial }),
  }
  const primitives = {
    IconCheckOutlineRegular: () => null,
    Switch: () => null,
  }
  return registration.factory((id) => {
    if (id === 'react') return React
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return primitives
    throw new Error(`Unexpected client dependency: ${id}`)
  })
}

describe('desktop theme client', () => {
  it('keeps the full settings page visible while the theme is off', async () => {
    const source = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'settings-page.ts'),
      'utf8'
    )
    expect(source).toContain('settings.enabled ? null : h(\'p\'')
    expect(source).not.toContain('settings.enabled ? h(\'div\'')
    expect(source).toContain("h(Group, { title: t('theme.mode')")
    expect(source).toContain("h(Group, { title: t('theme.materialGroup')")
    expect(source).toContain("h(Group, { title: t('theme.background')")
    expect(source).toContain("h(Group, { title: t('theme.decorAmbient')")
    expect(source).toContain("h(Group, { title: t('theme.decorHover')")
  })

  it('uses the official settings controls and radius tokens', async () => {
    const [settingsPage, themeCss] = await Promise.all([
      readFile(path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'settings-page.ts'), 'utf8'),
      readFile(path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'theme-css.ts'), 'utf8'),
    ])
    expect(settingsPage).toContain('SegmentedControl')
    expect(settingsPage).toContain('Switch')
    expect(settingsPage).toContain('Button')
    expect(settingsPage).not.toContain('function Segmented(')
    expect(settingsPage).not.toContain('function ToggleRow(')
    expect(settingsPage).toContain('border-radius:var(--dsw-radius-md)')
    expect(themeCss).not.toContain("[data-dsh-desktop-float] button { border-radius: 8px; }")
    expect(themeCss).not.toContain("[role='dialog'],\n[data-dsh-desktop-float] [role='menu']")
    expect(themeCss).not.toMatch(/border-radius:\s*(?:8|10|12|14|16|18|20|24)px/u)
    expect(themeCss).toContain("[data-dsh-desktop-spot][data-composer-seat]")
    expect(themeCss).toContain('position: sticky;')
  })

  it('keeps settings layout CSS outside the removable theme runtime styles', async () => {
    const [index, theme] = await Promise.all([
      readFile(path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'index.ts'), 'utf8'),
      readFile(path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'theme.ts'), 'utf8'),
    ])
    expect(index).toContain('styles: THEME_RUNTIME_STYLES,')
    expect(index).toContain('style.textContent = THEME_SETTINGS_STYLES')
    expect(index).toContain('return () => style.remove()')
    expect(theme).not.toContain('SETTINGS_STYLE_ID')
  })

  it('keeps the upstream sidebar geometry and shares the mica backdrop', async () => {
    const themeCss = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'theme-css.ts'),
      'utf8'
    )
    expect(themeCss).not.toContain('width: auto !important;')
    expect(themeCss).not.toContain('margin: 12px -12px 12px 12px;')
    expect(themeCss).toContain('[data-dsh-desktop-brand]')
    expect(themeCss).toContain('[data-dsh-desktop-new-session]')
    expect(themeCss).toContain('[data-dsh-desktop-conversation]')
    expect(themeCss).toContain('[data-dsh-desktop-conversation] [data-conversation-scroll]')
    expect(themeCss).toContain('background: transparent;')
  })

  it('keeps the composer and sidebar seams on the elements the effects measure', async () => {
    const source = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'ambient.ts'),
      'utf8'
    )
    const spotlight = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'spotlight.ts'),
      'utf8'
    )
    expect(source).toContain("{ attribute: 'data-dsh-desktop-spot', selector: '[data-dsh-sidebar-root]', first: true }")
    expect(source).toContain("{ attribute: 'data-dsh-desktop-brand', selector: '[data-dsh-sidebar-root] [data-dsh-sidebar-brand]', first: true }")
    expect(source).toContain("{ attribute: 'data-dsh-desktop-new-session', selector: '[data-dsh-sidebar-root] [data-dsh-sidebar-new-session]', first: true }")
    expect(source).toContain("{ attribute: 'data-dsh-desktop-conversation', selector: '[data-phase]', first: true }")
    expect(source).not.toContain('data-dsh-desktop-stats')
    expect(spotlight).toContain("spot.matches('[data-dsh-sidebar-root]')")
    expect(spotlight).not.toContain("spot.matches('[data-dsh-desktop-sidebar]')")
    const sidebar = await readFile(
      path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-client-ui-sidebar', 'lib', 'client.js'),
      'utf8'
    )
    expect(sidebar).toContain('"data-dsh-sidebar-brand": "",')
    expect(sidebar).toContain('"data-dsh-sidebar-new-session": "",')
  })

  it('registers a settings page and owns its locale and slot lifetime', async () => {
    const document = {
      documentElement: {
        setAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        toggleAttribute: vi.fn(),
        style: { setProperty: vi.fn() },
      },
      body: { hasAttribute: () => false, prepend: vi.fn(), appendChild: vi.fn() },
      head: { appendChild: vi.fn() },
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
      createElement: vi.fn(() => ({
        dataset: {},
        setAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        appendChild: vi.fn(),
        remove: vi.fn(),
      })),
    }
    const window = {
      localStorage: { getItem: () => null, setItem: vi.fn() },
    }
    const MutationObserver = class {
      observe() {}
      disconnect() {}
    }
    const requestAnimationFrame = (callback: (time: number) => void) => {
      callback(0)
      return 1
    }
    const plugin = await loadClient({
      document,
      window,
      fetch: vi.fn(async () => Response.json({ revision: 0, settings: { enabled: true } })),
      MutationObserver,
      requestAnimationFrame,
      cancelAnimationFrame: vi.fn(),
    })
    expect(plugin.inject).toEqual(['theme', 'slots', 'locale'])
    const registrations: Array<{ config: Record<string, unknown>; component: unknown }> = []
    const localeRegister = vi.fn()
    const effects: Array<() => void> = []
    const ctx = {
      effect: (setup: () => (() => void) | undefined) => {
        const dispose = setup()
        if (dispose) effects.push(dispose)
        return dispose
      },
      locale: {
        register: localeRegister,
        bind: () => (key: string) => key,
      },
      on: () => () => undefined,
      theme: {
        getTheme: () => ({ active: { colorScheme: 'light' } }),
        overrideTokens: () => () => undefined,
      },
      slots: {
        inject: (_name: string, callback: () => unknown) => callback(),
        register: (config: Record<string, unknown>, component: unknown) => {
          registrations.push({ config, component })
          return () => undefined
        },
      },
    }

    plugin.apply(ctx)
    expect(localeRegister).toHaveBeenCalledWith('settings.desktopTheme', expect.any(Object))
    expect(registrations).toHaveLength(1)
    expect(registrations[0]?.config).toMatchObject({
      name: 'settings.plugins.tab',
      id: 'desktop-theme',
      locale: 'settings.desktopTheme',
    })
    expect(typeof registrations[0]?.config.inject).toBe('function')
    for (const dispose of effects.reverse()) dispose()
    expect(document.documentElement.removeAttribute).toHaveBeenCalledWith('data-dsh-desktop-theme')
    expect(document.querySelectorAll).toHaveBeenCalled()
  })
})
