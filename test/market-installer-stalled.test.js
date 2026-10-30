// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { runInNewContext } from 'node:vm'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { projectRoot } from './patch-path'

// jsdom replaces the global URL, which fs does not accept; read by path.
const source = readFileSync(path.join(projectRoot, 'packages', 'dsh-desktop-market-installer', 'client.js'), 'utf8')

globalThis.IS_REACT_ACT_ENVIRONMENT = true

/**
 * Load the installer client in its own context and return the placeholder tab
 * component, with the page clock, status endpoint and desktop bridge stubbed.
 */
function loadSection({ now, status, desktop }) {
  const registrations = []
  let client
  runInNewContext(source, {
    window: { __ModuleLoader__: { load(entry) { client = entry.factory(createRequire(import.meta.url)) } } },
    __DSH_BOOT__: { entries: [{ id: 'dshmarket' }] },
    dshDesktop: desktop,
    document: { querySelector: () => ({}) },
    performance: { now: () => now() },
    setTimeout,
    clearTimeout,
    fetch: async () => ({ ok: true, json: async () => status })
  })
  client.apply({
    effect(callback) { return callback() },
    inject() {},
    locale: { register() {}, bind: () => key => key },
    slots: {
      inject(_name, callback) { callback(); return () => {} },
      register(options, component) { registrations.push({ ...options, component }); return () => {} }
    }
  })
  const tab = registrations.find(entry => entry.id === 'market')
  if (tab === undefined) throw new Error('No market tab')
  return { component: tab.component, props: tab.inject() }
}

const INSTALLED = { phase: 'installed', dependency: '^1.73.5', installedVersion: '1.73.5', recommendedVersion: '^1.71.1', restartRequired: false }

describe('market tab for a market that is installed but did not load', () => {
  let root
  let host

  afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    vi.useRealTimers()
  })

  async function render(section) {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root.render(createElement(section.component, { t: key => key, ...section.props }))
    })
    // The status request resolves on the next turns.
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
  }

  it('waits out the activation grace, then offers restart and removal', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    let clock = 1_000
    const uninstallMarket = vi.fn(async () => ({ ok: true }))
    const section = loadSection({ now: () => clock, status: INSTALLED, desktop: { uninstallMarket, restartHarness: vi.fn() } })
    await render(section)

    // Right after boot the market may still be activating.
    expect(host.textContent).toContain('loading')
    expect(host.textContent).not.toContain('loadFailed')
    expect(host.textContent).not.toContain('remove')

    clock = 9_000
    await act(async () => { vi.advanceTimersByTime(8_000) })
    expect(host.textContent).toContain('loadFailed')
    expect(host.textContent).toContain('loadFailedHint')
    // Not the "installed, restart once" message meant for a fresh install.
    expect(host.textContent).not.toContain('installedHint')
    const buttons = [...host.querySelectorAll('button')].map(button => button.textContent)
    expect(buttons).toEqual(['restart', 'remove'])

    const remove = [...host.querySelectorAll('button')].find(button => button.textContent === 'remove')
    await act(async () => { remove.click() })
    expect(uninstallMarket).toHaveBeenCalledTimes(1)
  })

  it('reports a removal the desktop could not finish', async () => {
    const section = loadSection({
      now: () => 20_000,
      status: INSTALLED,
      desktop: { uninstallMarket: async () => ({ ok: false }), restartHarness: vi.fn() }
    })
    await render(section)
    const remove = [...host.querySelectorAll('button')].find(button => button.textContent === 'remove')
    await act(async () => { remove.click() })
    expect(host.querySelector('[role="status"]').textContent).toContain('removeFailed')
    expect(remove.disabled).toBe(false)
  })

  it('keeps the restart prompt for a market installed in this session', async () => {
    const section = loadSection({
      now: () => 20_000,
      status: { ...INSTALLED, restartRequired: true },
      desktop: { uninstallMarket: vi.fn(), restartHarness: vi.fn() }
    })
    await render(section)
    expect(host.textContent).toContain('installedHint')
    expect(host.textContent).not.toContain('loadFailed')
    expect([...host.querySelectorAll('button')].map(button => button.textContent)).toEqual(['restart'])
  })
})
