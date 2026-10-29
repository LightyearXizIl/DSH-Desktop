import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../packages/dsh-desktop-market-installer/client.js', import.meta.url), 'utf8')

/** Load the installer client and apply it against a recording context. */
function load({ marketComposed = false, desktop } = {}) {
  const registrations = []
  const dictionaries = []
  const injected = []
  let client
  runInNewContext(source, {
    window: { __ModuleLoader__: { load(entry) { client = entry.factory(createRequire(import.meta.url)) } } },
    __DSH_BOOT__: { entries: marketComposed ? [{ id: 'dshmarket' }] : [] },
    ...desktop === undefined ? {} : { dshDesktop: desktop },
    document: { querySelector: () => ({}) }
  })
  client.apply({
    effect(callback) { return callback() },
    inject(deps, callback) { injected.push({ deps, callback }) },
    locale: { register(_ns, copy) { dictionaries.push(copy) }, bind: () => key => key },
    slots: {
      inject(_name, callback) { callback(); return () => {} },
      register(options) { registrations.push(options); return () => {} }
    }
  })
  return { registrations, dictionaries, injected }
}

const tabs = registrations => registrations.filter(entry => entry.name === 'settings.plugins.tab').map(entry => entry.id)

describe('Desktop host plugin control in Plugins settings', () => {
  it('keeps the market installer inside Built-in plugins instead of a Settings section', () => {
    const { registrations } = load()
    // Settings' left navigation stays for whole areas; a built-in plugin's page
    // is a Built-in plugins tab like Liquid Glass and the startup animation.
    expect(registrations.some(entry => entry.name === 'settings.section')).toBe(false)
    expect(tabs(registrations)).toContain('market')
  })

  it('leaves market management to the composed dsh-market and hides its Settings section', () => {
    const { registrations, injected } = load({ marketComposed: true })
    // dsh-market's own Built-in plugins card handles version, updates and
    // removal; a second "market" tab from the installer read as a duplicate.
    expect(tabs(registrations)).not.toContain('market')
    expect(tabs(registrations)).not.toContain('desktop-market-management')
    const marketInject = injected.find(entry => entry.deps.includes('market'))
    expect(marketInject).toBeDefined()
    const market = { setSettingsVisible: vi.fn() }
    const dispose = marketInject.callback({ market })
    expect(market.setSettingsVisible).toHaveBeenCalledWith(false)
    dispose()
    expect(market.setSettingsVisible).toHaveBeenLastCalledWith(true)
  })

  it('shows one image generation tab: the built-in plugin\'s own while it is on', async () => {
    const enabled = load({ desktop: { getBuiltInImageGenerationStatus: async () => ({ enabled: true }) } })
    await Promise.resolve()
    await Promise.resolve()
    expect(tabs(enabled.registrations)).not.toContain('desktop-host-plugins')

    const disabled = load({ desktop: { getBuiltInImageGenerationStatus: async () => ({ enabled: false }) } })
    await Promise.resolve()
    await Promise.resolve()
    expect(tabs(disabled.registrations)).toContain('desktop-host-plugins')

    // Without the desktop bridge the control still registers to show its error.
    expect(tabs(load().registrations)).toContain('desktop-host-plugins')
  })

  it('names the image control after the image generation plugin\'s own tab', () => {
    const { dictionaries } = load()
    const copy = dictionaries.find(entry => entry.zh?.imageTab !== undefined)
    const imagePlugin = readFileSync(new URL('../packages/dsh-image-generation/client.js', import.meta.url), 'utf8')
    expect(copy?.zh.imageTab).toBe('影像生成')
    expect(copy?.en.imageTab).toBe('Image & video generation')
    expect(imagePlugin).toContain("title: '影像生成'")
    expect(imagePlugin).toContain("title: 'Image & video generation'")
  })
})
