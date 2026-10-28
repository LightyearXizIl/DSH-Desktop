import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

interface Registration {
  config: { name: string; id?: string; order?: number }
  component: (props: Record<string, unknown>) => unknown
}

describe('DSH Desktop client slot occupants', () => {
  it('serves only the fixed About assets through the host route', async () => {
    const host = await import('../packages/dsh-desktop-client-ui/index.js')
    const routes = new Map<string, { methods: string[]; fetch: () => Promise<Response> }>()
    host.apply({
      connection: {
        fetch: {
          register: (route) => {
            routes.set(route.path, route)
          }
        }
      }
    })
    expect(host.name).toBe('dsh-desktop-client-ui')
    expect(host.inject).toEqual(['connection'])
    expect([...routes.keys()].sort()).toEqual([
      '/api/desktop-client-ui/assets/author-avatar.png',
      '/api/desktop-client-ui/assets/qrcode-alipay.png',
      '/api/desktop-client-ui/assets/qrcode-wechat.png'
    ])
    for (const route of routes.values()) {
      expect(route.methods).toEqual(['GET'])
      const response = await route.fetch()
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('image/png')
      const bytes = Buffer.from(await response.arrayBuffer())
      expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    }
  })

  it('registers one occupant per brand seat and keeps the official name mark-free', async () => {
    const source = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'),
      'utf8'
    )
    let definition: {
      factory: (require: (id: string) => unknown) => {
        apply: (ctx: unknown) => void
        inject: string[]
      }
    } | undefined
    const appended: Array<{ textContent?: string }> = []
    const removeStyle = vi.fn()
    let disposeStyle: (() => void) | undefined
    const document = {
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({ id: '', dataset: {}, textContent: '', remove: removeStyle })),
      head: { appendChild: (node: { textContent?: string }) => appended.push(node) }
    }
    vm.runInNewContext(source, {
      document,
      navigator: { language: 'en-US' },
      window: {
        __ModuleLoader__: {
          load: (value: typeof definition) => {
            definition = value
          }
        }
      }
    })

    expect(definition).toBeDefined()
    const createElement = (
      type: unknown,
      props: Record<string, unknown> | null,
      ...children: unknown[]
    ): { type: unknown; props: Record<string, unknown> } => ({
      type,
      props: { ...props, children }
    })
    const BrandWordmark = vi.fn()
    const FishLogo = vi.fn()
    const Modal = vi.fn()
    const plugin = definition!.factory((id) => {
      if (id === 'react') {
        return {
          createElement,
          useEffect: (effect: () => void | (() => void)) => effect(),
          useState: (initial: unknown) => [initial, vi.fn()]
        }
      }
      if (id === '@deepseek-ai/dsh-client-ui-primitives') {
        return { BrandWordmark, FishLogo, MenuItemButton: vi.fn(), Modal }
      }
      throw new Error(`Unexpected client dependency: ${id}`)
    })

    const registrations: Registration[] = []
    const localeRegister = vi.fn()
    const slots = {
      inject: (_name: string, callback: () => unknown): unknown => {
        const result = callback()
        if (result && typeof result === 'object' && Symbol.iterator in result) {
          for (const _entry of result as Iterable<unknown>) void _entry
        }
        return result
      },
      register: (
        config: Registration['config'],
        component: Registration['component']
      ): (() => void) => {
        registrations.push({ config, component })
        return () => undefined
      }
    }
    plugin.apply({
      slots,
      locale: {
        register: localeRegister,
        bind: () => (key: string) => key
      },
      effect: (setup: () => (() => void) | undefined) => {
        const dispose = setup()
        if (dispose) disposeStyle = dispose
      }
    })

    expect(plugin.inject).toEqual(['slots', 'locale', 'remote.session', 'sessions', 'uiWorkspace'])
    expect(localeRegister).toHaveBeenCalledWith('settings.desktopAbout', expect.any(Object))
    expect(registrations.map(({ config }) => config.name)).toEqual([
      'sidebar.brand.mark',
      'sidebar.brand.name',
      'conversation.hero.brand.mark',
      'sidebar.right.tab.document.unpreviewable',
      'sidebar.workspaces.session.menu.item',
      'sidebar.workspaces.session.menu.item',
      'sidebar.workspaces.session.menu.item',
      'settings.section'
    ])
    expect(registrations.at(-1)?.config).toMatchObject({
      name: 'settings.section',
      id: 'about',
      order: 100,
      locale: 'settings.desktopAbout'
    })
    // Desktop toolbar styles have an owned lifetime; branding stays in currentColor.
    expect(appended).toHaveLength(1)
    expect(appended[0]?.textContent).toContain("[data-dsh-preset-search]")
    expect(appended[0]?.textContent).toContain('scrollbar-width:none !important')
    expect(appended[0]?.textContent).toContain('html::-webkit-scrollbar')
    expect(appended[0]?.textContent).toContain('::-webkit-scrollbar-corner')
    expect(appended[0]?.textContent).toContain('overflow-x:clip !important')
    disposeStyle?.()
    expect(removeStyle).toHaveBeenCalledOnce()

    const sidebarName = registrations.find(
      ({ config }) => config.name === 'sidebar.brand.name'
    )!.component({}) as { type: unknown; props: Record<string, unknown> }
    expect(sidebarName.type).toBe(BrandWordmark)
    expect(sidebarName.props.includeMark).toBe(false)

    const sidebarMark = registrations.find(
      ({ config }) => config.name === 'sidebar.brand.mark'
    )!.component({ size: 24 }) as { type: unknown; props: Record<string, unknown> }
    expect(sidebarMark.type).toBe('svg')
    expect(sidebarMark.props.height).toBe(17)
    const [markPath] = sidebarMark.props.children as Array<{ type: unknown; props: Record<string, unknown> }>
    if (!markPath) throw new Error('Expected the sidebar brand SVG path')
    expect(markPath.type).toBe('path')
    expect(markPath.props.fill).toBe('currentColor')

    const heroMark = registrations.find(
      ({ config }) => config.name === 'conversation.hero.brand.mark'
    )!.component({ size: 48 }) as { type: unknown; props: Record<string, unknown> }
    expect(heroMark.type).toBe(FishLogo)
    expect(heroMark.props.size).toBe(48)
  })

  it('renders the About details, support QR codes, and update action', async () => {
    const source = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'),
      'utf8'
    )
    let definition: {
      factory: (require: (id: string) => unknown) => {
        apply: (ctx: unknown) => void
      }
    } | undefined
    vm.runInNewContext(source, {
      document: {
        documentElement: { lang: 'zh' },
        getElementById: () => null,
        createElement: () => ({
          id: '',
          textContent: '',
          remove: () => undefined
        }),
        head: { appendChild: () => undefined }
      },
      window: {
        __ModuleLoader__: {
          load: (value: typeof definition) => {
            definition = value
          }
        }
      }
    })

    const createElement = (
      type: unknown,
      props: Record<string, unknown> | null,
      ...children: unknown[]
    ): { type: unknown; props: Record<string, unknown> } => ({
      type,
      props: { ...props, children }
    })
    const Modal = ({ open, children }: { open: boolean; children: unknown }) =>
      open ? createElement('div', { role: 'dialog' }, children) : null
    const checkUpdates = vi.fn(async () => ({
      phase: 'available' as const,
      currentVersion: '0.0.2',
      availableVersion: '0.0.3',
      releaseNotes: '新增：关于页支持更新日志',
      releaseUrl: 'https://github.com/LightyearXizIl/DSH-Desktop/releases/tag/v0.0.3',
      manual: true
    }))
    const plugin = definition!.factory((id) => {
      if (id === 'react') {
        return {
          createElement,
          useEffect: () => undefined,
          useRef: (initial: unknown) => ({ current: initial }),
          useState: (initial: unknown) => [initial, vi.fn()]
        }
      }
      if (id === '@deepseek-ai/dsh-client-ui-primitives') {
        return {
          BrandWordmark: () => null,
          FishLogo: () => null,
          MenuItemButton: () => null,
          Modal
        }
      }
      throw new Error(`Unexpected client dependency: ${id}`)
    })

    const registrations: Array<{
      config: {
        id?: string
        inject?: () => Record<string, unknown>
      }
      component: (props: Record<string, unknown>) => unknown
    }> = []
    plugin.apply({
      locale: {
        register: vi.fn(),
        bind: () => (key: string) => key
      },
      slots: {
        inject: (_name: string, callback: () => unknown) => callback(),
        register: (config: (typeof registrations)[number]['config'], component: (typeof registrations)[number]['component']) => {
          registrations.push({ config, component })
          return () => undefined
        }
      },
      effect: (setup: () => (() => void) | undefined) => setup()
    })
    const about = registrations.find(({ config }) => config.id === 'about')
    if (!about) throw new Error('About section was not registered')

    const injectedWithInfo = about.config.inject!()
    const tree = about.component({
      ...injectedWithInfo,
      readInfo: async () => ({
        desktopVersion: '0.0.2',
        harnessVersion: '0.2.1-rc.4',
        locale: 'zh'
      }),
      checkUpdates,
      t: (key: string) => ({
        title: '关于 DSH Desktop',
        intro: '作者、版本与支持方式。',
        author: '作者',
        repository: 'GitHub 仓库',
        wechat: '微信号',
        desktopVersion: '桌面端版本',
        harnessVersion: '内置 Harness',
        checkUpdates: '检查更新',
        updateLogTitle: 'v{version} 更新日志',
        viewRelease: '查看 GitHub Release',
        noReleaseNotes: '这个版本没有填写更新说明。',
        appreciate: '赞赏',
        appreciateTitle: '支持 DSH Desktop',
        appreciateIntro: '如果这个项目对你有帮助，可以扫码赞赏。',
        wechatPay: '微信赞赏',
        alipay: '支付宝赞赏',
        thanks: '感谢你的支持。',
        avatarAlt: 'NullPointer 的 GitHub 头像',
        wechatQrAlt: '微信赞赏二维码',
        alipayQrAlt: '支付宝赞赏二维码',
        close: '关闭'
      })[key] ?? key
    }) as {
      props: {
        children: Array<{
          type?: unknown
          props?: {
            children?: unknown
            onClick?: () => void
            src?: string
            alt?: string
          }
        }>
      }
    }
    const text = JSON.stringify(tree)
    expect(text).toContain('NullPointer')
    expect(text).toContain('LightyearXizIl/DSH-Desktop')
    expect(text).toContain('XizllHZ_007')
    expect(text).toContain('桌面端版本')
    expect(text).toContain('/api/desktop-client-ui/assets/author-avatar.png')

    expect(text).toContain('/api/desktop-client-ui/assets/qrcode-wechat.png')
    expect(text).toContain('/api/desktop-client-ui/assets/qrcode-alipay.png')
    expect(text).toContain('"draggable":false')

    const flatten = (node: unknown): Array<{ props?: Record<string, unknown> }> => {
      if (!node || typeof node !== 'object') return []
      const current = node as { props?: { children?: unknown } }
      const children = current.props?.children
      return [
        node as { props?: Record<string, unknown> },
        ...(Array.isArray(children) ? children.flatMap(flatten) : [])
      ]
    }
    const check = flatten(tree).find(
      (node) => Array.isArray(node.props?.children) &&
        (node.props.children as unknown[])[0] === '检查更新'
    )
    const onClick = check?.props?.onClick
    expect(onClick).toBeTypeOf('function')
    if (typeof onClick === 'function') void onClick()
    await vi.waitFor(() => expect(checkUpdates).toHaveBeenCalledOnce())
    await expect(checkUpdates.mock.results[0]?.value).resolves.toMatchObject({
      phase: 'available',
      availableVersion: '0.0.3',
      releaseNotes: '新增：关于页支持更新日志',
      releaseUrl: 'https://github.com/LightyearXizIl/DSH-Desktop/releases/tag/v0.0.3'
    })
  })
})
