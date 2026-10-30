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
  motion: 'system' | 'always'
  effortSlider: boolean
  effortStyle: 'codex' | 'claude'
  effortMotion: 'fast' | 'quick' | 'full'
  effortTicks: 'highlight' | 'dim' | 'hidden'
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
      motion: 'always',
      effortSlider: false,
      effortStyle: 'claude',
      effortMotion: 'warp',
      effortTicks: 'dim',
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
      motion: 'always',
      effortSlider: false,
      effortStyle: 'claude',
      effortMotion: 'full',
      effortTicks: 'dim',
      wallpaperBlur: 40,
      wallpaperFrost: 100,
      videoBlur: 0,
      videoBrightness: 44,
    })
    expect(normalizeThemeSettings({})).toMatchObject({
      motion: 'system',
      effortSlider: true,
      effortStyle: 'codex',
      effortMotion: 'full',
      effortTicks: 'highlight',
    })
    expect(normalizeThemeSettings({ motion: 'reduce' }).motion).toBe('system')
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
    // The effort slider portals into the official menu row.
    if (id === 'react-dom') return { createPortal: () => null }
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
    expect(themeCss).toContain('padding: 0;')
    expect(themeCss).toContain('margin: 12px;')
    expect(themeCss).toContain('[data-dsh-desktop-sidebar] [data-dsh-sidebar-root]')
    expect(themeCss).toContain('padding: 10px 12px 14px;')
    expect(themeCss).toContain('backdrop-filter: none;')
    // The glass card is a containing block, so the Windows-fixed collapse
    // toggle must be seated in the brand row instead of landing on the logo.
    expect(themeCss).toContain('flex-direction: row-reverse;')
    expect(themeCss).toContain('[data-window-drag] > button:last-child')
    expect(themeCss).toContain('[data-dsh-desktop-brand]')
    expect(themeCss).toContain('[data-dsh-desktop-new-session]')
    expect(themeCss).toContain('[data-dsh-desktop-conversation]')
    expect(themeCss).toContain('[data-dsh-desktop-conversation] [data-conversation-scroll]')
    expect(themeCss).toContain('[data-dsh-desktop-trajectory]')
    expect(themeCss).toContain('--dsw-alias-bg-layer-1: transparent;')
    expect(themeCss).toContain('[data-sidebar-right-session]')
    expect(themeCss).toContain('[data-sidebar-right-guide-entry]')
    expect(themeCss).toContain('background: transparent;')
  })

  it('keeps the transcript bare and floats only the trajectory on glass', async () => {
    const themeCss = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'theme-css.ts'),
      'utf8'
    )
    // Shadowed transcript text looked smeared, and a pane over the whole
    // conversation boxed in the transcript and the composer.
    expect(themeCss).not.toContain('text-shadow')
    expect(themeCss).not.toContain('[data-conversation-content]::before')
    expect(themeCss).not.toContain('[data-conversation-scroll]::before')
    // The trajectory carries its own plate, lined up with the floating header,
    // so the pane ends above the composer instead of reaching under it.
    expect(themeCss).toMatch(/\[data-dsh-desktop-float\] \[data-dsh-desktop-trajectory\] \{\s+position: relative;\s+isolation: isolate;[^}]*margin: 8px 14px 12px 16px;/u)
    expect(themeCss).toContain('[data-dsh-desktop-float] [data-dsh-desktop-trajectory]::before {')
  })

  it('covers the caption under modals and glazes the surfaces the audit found bare', async () => {
    const themeCss = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'theme-css.ts'),
      'utf8'
    )
    const rule = (selector: string): string => {
      const start = themeCss.indexOf(`${selector} {`)
      if (start < 0) throw new Error(`missing rule ${selector}`)
      return themeCss.slice(start, themeCss.indexOf('}', start))
    }
    // Upstream's mask starts below the Windows caption, which left a hard
    // seam across the window while settings were open.
    expect(rule('[data-dsh-desktop-theme] :has(> [data-shortcut-modal])')).toContain('--dsh-frame-chrome-top: 0px;')
    // Delivered-file cards used opaque neutral fills on the glass transcript.
    expect(rule('[data-dsh-desktop-theme] [data-presented-file]')).toContain('--deliverable-fill: var(--dsh-desktop-glass-raised);')
    // The right dock floats as a card on the host that slides, so closing the
    // panel no longer sweeps a bare strip across the center.
    expect(rule("[data-dsh-desktop-float] [data-sidebar-right-panel] [data-dockkit-host='dock'],\n[data-dsh-desktop-float] [data-sidebar-right-panel] [data-dockkit-empty]")).toContain('margin: 12px 12px 12px 0;')
    // Compatibility's composer frosts what scrolls behind it.
    expect(rule("[data-dsh-desktop-compat] [data-composer-card]::before")).toContain('backdrop-filter: var(--dsh-desktop-glass-filter);')
    // The reading wash sits above the whale and fades with the conversation.
    const ambient = rule('[data-dsh-desktop-theme] [data-dsh-desktop-ambient]::after')
    expect(ambient).toContain('z-index: 2;')
    expect(ambient).toContain('calc(var(--dsh-desktop-text-wash-white, 0) * var(--dsh-desktop-reading, 0))')
    expect(rule('[data-dsh-desktop-theme][data-dsh-desktop-reading]')).toContain('--dsh-desktop-reading: 1;')
    // Modal panels never thin below the fixed floor: the mask darkens behind them.
    expect(rule("[data-dsh-desktop-theme] body [role='dialog'][aria-modal='true']")).toContain('max(var(--dsh-desktop-glass-floor, 0.74), var(--dsh-desktop-glass-alpha))')
  })

  it('carries the sidebar toggle animation marker in the toggle\'s first commit', async () => {
    const layoutPatch = await readFile(patchPath('@deepseek-ai/dsh-client-ui-layout'), 'utf8')
    // Upstream marked data-animating one commit after changing the columns, so
    // a layout read in between settled them without a transition and closing
    // the right sidebar snapped the cards to full width.
    expect(layoutPatch).toContain('+\t\t\tconst toggling = previousToggle.current !== trackToggle && previousViewport.current === viewport;')
    expect(layoutPatch).toContain('+\t\t\t\t"data-animating": animating > 0 || toggling || void 0,')
  })

  it('marks the trajectory root so the theme can scope its surfaces', async () => {
    const [patch, installed] = await Promise.all([
      readFile(patchPath('@deepseek-ai/dsh-client-ui-trajectory'), 'utf8'),
      readFile(
        path.join(
          projectRoot,
          'node_modules',
          '@deepseek-ai',
          'dsh-client-ui-trajectory',
          'lib',
          'client.js'
        ),
        'utf8'
      ),
    ])
    expect(patch).toContain('+\t\t\t\t"data-dsh-desktop-trajectory": "",')
    expect(installed).toContain('"data-dsh-desktop-trajectory": "",')
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
    // The card must sit on the layout-owned column, not on the inner root: the
    // root is already full-width inside its track, so a 12px margin there
    // overflows the track and the overflow clip cuts the card's right and
    // bottom edges.
    expect(source).toContain("{ attribute: 'data-dsh-desktop-sidebar', selector: '[data-dsh-sidebar-root]', closest: true }")
    // The sidebar slot wrapper is `display: contents`; stamping the card there
    // paints nothing, so the stamper must walk to the first laid-out ancestor.
    expect(source).toContain('const element = paintBox(anchor?.parentElement ?? null)')
    expect(source).toContain("getComputedStyle(current).display === 'contents'")
    expect(source).toContain("{ attribute: 'data-dsh-desktop-spot', selector: '[data-dsh-sidebar-root]', first: true }")
    expect(source).toContain("{ attribute: 'data-dsh-desktop-brand', selector: '[data-dsh-sidebar-root] [data-dsh-sidebar-brand]', first: true }")
    expect(source).toContain("{ attribute: 'data-dsh-desktop-new-session', selector: '[data-dsh-sidebar-root] [data-dsh-sidebar-new-session]', first: true }")
    expect(source).toContain("{ attribute: 'data-dsh-desktop-conversation', selector: '[data-phase]', first: true }")
    expect(source).not.toContain('data-dsh-desktop-stats')
    expect(spotlight).toContain("spot.matches('[data-dsh-sidebar-root]')")
    expect(spotlight).not.toContain("spot.matches('[data-dsh-desktop-sidebar]')")
    // The whole pane tilts (text included) but lays flat while a fixed overlay
    // is open in it; the glass stays on a ::before plate so the pane is never
    // a containing block at rest. Behaviour: desktop-theme-tilt.test.ts.
    expect(spotlight).toContain("'[role=\"tooltip\"], [role=\"menu\"], [role=\"listbox\"], [role=\"dialog\"]'")
    const themeCss = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'theme-css.ts'),
      'utf8'
    )
    expect(themeCss).not.toContain('--dsh-desktop-tilt')
    expect(themeCss).toContain('[data-dsh-desktop-float] [data-dsh-desktop-sidebar]::before,')
    expect(themeCss).toContain('[data-dsh-desktop-float] [data-composer-card]::before')
    const sidebar = await readFile(
      path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-client-ui-sidebar', 'lib', 'client.js'),
      'utf8'
    )
    expect(sidebar).toContain('"data-dsh-sidebar-brand": "",')
    expect(sidebar).toContain('"data-dsh-sidebar-new-session": "",')
  })

  it('leaves the upstream-owned center marker in place across theme toggles', async () => {
    const [source, bundle, themeCss, layoutPatch] = await Promise.all([
      readFile(
        path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'ambient.ts'),
        'utf8'
      ),
      readFile(
        path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'lib', 'client.js'),
        'utf8'
      ),
      readFile(
        path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'theme-css.ts'),
        'utf8'
      ),
      readFile(patchPath('@deepseek-ai/dsh-client-ui-layout'), 'utf8'),
    ])
    // The layout patch renders this marker. React keeps its own copy of the
    // attribute list, so a theme disposer that removes it would leave the
    // center column opaque after the theme is toggled off and on again.
    expect(layoutPatch).toContain('"data-dsh-desktop-center": "",')
    for (const text of [source, bundle]) {
      expect(text).not.toContain("attribute: 'data-dsh-desktop-center'")
      expect(text).not.toContain('"data-dsh-desktop-center",')
    }
    expect(source).not.toContain("'data-dsh-desktop-center',")
    expect(themeCss).toContain('[data-dsh-desktop-center]')
  })

  it('registers a settings page and owns its locale and slot lifetime', async () => {
    const document = {
      documentElement: {
        setAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        toggleAttribute: vi.fn(),
        style: { setProperty: vi.fn(), removeProperty: vi.fn() },
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
    const sliderFibers: Array<{ deps: string[]; dispose: ReturnType<typeof vi.fn> }> = []
    const ctx = {
      // The built-in effort slider loads as a child fiber with its own services.
      inject: (deps: string[]) => {
        const fiber = { deps, dispose: vi.fn(async () => undefined) }
        sliderFibers.push(fiber)
        return fiber
      },
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
    expect(sliderFibers).toHaveLength(1)
    expect(sliderFibers[0]?.deps).toContain('modelDirectories')
    for (const dispose of effects.reverse()) dispose()
    expect(sliderFibers[0]?.dispose).toHaveBeenCalledTimes(1)
    expect(document.documentElement.removeAttribute).toHaveBeenCalledWith('data-dsh-desktop-theme')
    // Turning the appearance off also drops the material variables it wrote
    // onto <html>, so nothing of the theme lingers in the page.
    expect(document.documentElement.style.removeProperty).toHaveBeenCalledWith('--dsh-desktop-frost-ratio')
    expect(document.documentElement.style.removeProperty).toHaveBeenCalledWith('--dsh-desktop-blur')
    expect(document.querySelectorAll).toHaveBeenCalled()
  })
})
