// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

// The Desktop effort slider lives in the root surface of the official model
// menu. Upstream swaps that surface's content for the model or effort list when
// a row is opened, which hid the slider. While <html> carries the slider's
// marker the patch keeps the root rows and renders the list above them in the
// same surface, so the surface grows upward: the model list sits above the
// model row, the effort list covers the model row and sits above the effort
// row. Without the marker upstream behaviour is unchanged.

const STACK_ATTRIBUTE = 'data-dsh-desktop-model-menu-stack'
const CLIENT = path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-client-ui-model-selection', 'lib', 'client.js')
// The repository has no react-dom typings; load it by a runtime specifier.
const REACT_DOM = 'react-dom'
const REACT_DOM_CLIENT = 'react-dom/client'

interface Root {
  render: (element: unknown) => void
  unmount: () => void
}

type Component = (props: Record<string, unknown>) => unknown

let ModelSelect: Component
let createRoot: (host: Element) => Root

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

beforeAll(async () => {
  // jsdom has no layout; the model pane scrolls its current row into view.
  Element.prototype.scrollIntoView = function scrollIntoView() {}
  const reactDom = record(await import(/* @vite-ignore */ REACT_DOM))
  const reactDomClient = record(await import(/* @vite-ignore */ REACT_DOM_CLIENT))
  const create = reactDomClient.createRoot ?? record(reactDomClient.default).createRoot
  if (typeof create !== 'function') throw new Error('react-dom/client has no createRoot')
  createRoot = create as typeof createRoot
  const surface = React.forwardRef<HTMLDivElement, Record<string, unknown>>((props, ref) =>
    React.createElement('div', { ...props, ref }))
  const input = React.forwardRef<HTMLInputElement, Record<string, unknown>>((props, ref) =>
    React.createElement('input', { ...props, ref }))
  const primitives: Record<string, unknown> = {
    MenuSurface: surface,
    MenuGroup: (props: { children?: unknown }) => React.createElement('div', null, props.children as React.ReactNode),
    Input: input,
    StateDot: () => null,
    Toast: () => null,
    rankByName: (items: unknown[]) => items,
    observeStickyMenuGroups: () => () => undefined,
  }
  for (const name of ['IconCheckOutlineRegular', 'IconChevronDownOutlineRegular', 'IconChevronRightOutlineRegular',
    'IconCloseFillRegular', 'IconDataOutlineRegular', 'IconWarningOutlineRegular']) primitives[name] = () => null
  const modules: Record<string, unknown> = {
    react: React,
    'react-dom': reactDom.createPortal === undefined ? record(reactDom.default) : reactDom,
    'react/jsx-runtime': jsxRuntime,
    '@deepseek-ai/dsh-client-ui-primitives': primitives,
    '@deepseek-ai/cordis': { Service: class {} },
    '@deepseek-ai/dsh-client-store': { createSnapshotStore: () => ({ getSnapshot: () => null, subscribe: () => () => undefined, set: () => undefined }) },
  }
  let registration: { factory: (require: (id: string) => unknown) => unknown } | undefined
  const loader = { load: (value: typeof registration) => { registration = value } }
  const source = await readFile(CLIENT, 'utf8')
  const host = window as typeof window & { __ModuleLoader__?: typeof loader }
  host.__ModuleLoader__ = loader
  try {
    new Function(source)()
  } finally {
    delete host.__ModuleLoader__
  }
  if (registration === undefined) throw new Error('model selection client did not register')
  const exports = record(registration.factory((id) => {
    if (!(id in modules)) throw new Error(`unexpected dependency ${id}`)
    return modules[id]
  }))
  const apply = exports.apply
  if (typeof apply !== 'function') throw new Error('model selection client has no apply')
  let captured: Component | undefined
  const scope = {
    get: () => ({ register: () => () => undefined }),
    effect: () => undefined,
    modelDirectories: { directoryFor: () => ({ store: null, load: async () => undefined, select: async () => ({ ok: true }) }) },
    sessions: { subagentAddress: () => undefined },
    slots: {
      inject: (_name: string, callback: () => unknown) => callback(),
      register: (_config: unknown, component: Component) => {
        captured = component
        return () => undefined
      },
    },
  }
  apply({
    effect: () => undefined,
    locale: { register: () => undefined, bind: () => (key: string) => key },
    plugin: () => undefined,
    inject: (_deps: string[], callback: (value: typeof scope) => void) => callback(scope),
  })
  if (captured === undefined) throw new Error('ModelSelect was not registered')
  ModelSelect = captured
})

afterEach(() => {
  document.documentElement.removeAttribute(STACK_ATTRIBUTE)
  document.body.innerHTML = ''
})

function snapshot() {
  return {
    current: { provider: 'p', model: 'm', reasoningEffort: 'high' },
    groups: [{
      id: 'p',
      name: 'Provider',
      models: [{ id: 'm', name: 'Model', reasoning: { defaultEffort: 'high', efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }] } }],
    }],
    failures: [],
    status: 'ready',
    pending: null,
    error: null,
  }
}

/** Menu surfaces portalled to <body>; upstream's model list has its own inner role="group". */
function surfaces(): Element[] {
  return [...document.body.children].filter((node) => node.id.endsWith('-menu'))
}

async function openMenu() {
  const flags = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  flags.IS_REACT_ACT_ENVIRONMENT = true
  const state = snapshot()
  const select = vi.fn(async () => ({ ok: true }))
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await React.act(async () => {
    root.render(React.createElement(ModelSelect as React.FunctionComponent<Record<string, unknown>>, {
      locked: false,
      available: true,
      directory: { getSnapshot: () => state, subscribe: () => () => undefined },
      load: () => undefined,
      select,
      t: (key: string) => key,
      renderSlot: (_name: string, _props: unknown, options: { fallback: unknown }) => options.fallback,
    }))
  })
  const trigger = host.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')
  if (trigger === null) throw new Error('trigger missing')
  await React.act(async () => trigger.click())
  const menu = document.getElementById(trigger.getAttribute('aria-controls') ?? '')
  if (menu === null) throw new Error('menu did not open')
  const rows = [...menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')]
  return { root, menu, rows, select, trigger }
}

describe('stacked model submenu patch', () => {
  it('keeps upstream in-place panes without the slider marker', async () => {
    const { root, menu, rows } = await openMenu()
    expect(rows).toHaveLength(2)
    // Upstream rows carry none of the stacked-mode attributes.
    expect(rows.every((row) => !row.hasAttribute('aria-expanded') && !row.hasAttribute('data-dsh-desktop-open'))).toBe(true)
    await React.act(async () => rows[1]?.click())
    // The root surface now shows the effort list instead of the two rows.
    expect(menu.querySelectorAll('button[role="menuitem"]')).toHaveLength(0)
    expect(menu.querySelectorAll('button[role="menuitemradio"]')).toHaveLength(2)
    expect(document.querySelector('[data-dsh-desktop-submenu]')).toBeNull()
    await React.act(async () => root.unmount())
  })

  it('grows the same surface upward with the effort list, covering the model row', async () => {
    document.documentElement.setAttribute(STACK_ATTRIBUTE, '')
    const { root, menu, rows, select } = await openMenu()
    await React.act(async () => rows[1]?.click())
    // One surface: no second popup, and the list lives in the root surface.
    expect(surfaces()).toEqual([menu])
    expect(document.querySelectorAll('button[role="menuitemradio"]')).toHaveLength(2)
    const options = [...menu.querySelectorAll<HTMLButtonElement>('button[role="menuitemradio"]')]
    expect(options.map((option) => option.textContent)).toEqual(['Low', 'High'])
    // Both rows stay in the DOM (the slider finds the root by them); the model row
    // is covered, the effort row stays in view below the list.
    const cells = [...menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')]
    expect(cells).toHaveLength(2)
    expect(cells[0]?.hidden).toBe(true)
    // The row's own CSS sets display, which would beat [hidden]; it must be inline.
    expect(cells[0]?.style.display).toBe('none')
    expect(cells[1]?.hidden).toBe(false)
    expect(cells[1]?.style.display).toBe('')
    // The list comes first, so it extends the surface upward from the effort row.
    const position = (options[1] as Node).compareDocumentPosition(cells[1] as Node)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // The checked option takes focus, as upstream does for its in-place pane.
    expect(document.activeElement).toBe(options[1])
    // The open row says so; the list sits in the grow-in container.
    expect(cells[1]?.getAttribute('aria-expanded')).toBe('true')
    expect(cells[1]?.getAttribute('data-dsh-desktop-open')).toBe('true')
    const pane = menu.querySelector<HTMLElement>('[data-dsh-desktop-stack-pane="effort"]')
    expect(pane?.contains(options[0] as Node)).toBe(true)
    expect(pane?.style.getPropertyValue('--dsh-stack-from')).toMatch(/^\d+px$/u)
    // The grow target is measured once when the pane mounts.
    expect(pane?.style.getPropertyValue('--dsh-stack-to')).toMatch(/^\d+px$/u)
    expect(pane?.style.animation).toBe('')
    // Choosing a level goes through the official select path.
    await React.act(async () => options[0]?.click())
    expect(select).toHaveBeenCalledWith({ provider: 'p', model: 'm', reasoningEffort: 'low' })
    await React.act(async () => root.unmount())
  })

  it('grows the same surface upward with the model list above both rows', async () => {
    document.documentElement.setAttribute(STACK_ATTRIBUTE, '')
    const { root, menu, rows } = await openMenu()
    await React.act(async () => rows[0]?.click())
    expect(surfaces()).toEqual([menu])
    const model = [...menu.querySelectorAll<HTMLButtonElement>('button[role="menuitemradio"]')]
    expect(model.map((option) => option.textContent)).toEqual(['Model'])
    const cells = [...menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')]
    expect(cells.map((cell) => cell.hidden)).toEqual([false, false])
    expect((model[0] as Node).compareDocumentPosition(cells[0] as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Switching to the effort list covers the model row instead.
    await React.act(async () => cells[1]?.click())
    expect(menu.querySelector('button[role="menuitemradio"]')?.textContent).toBe('Low')
    expect(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')[0]?.hidden).toBe(true)
    // Escape returns to the root rows alone.
    const focused = document.activeElement
    await React.act(async () => focused?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(menu.querySelectorAll('button[role="menuitemradio"]')).toHaveLength(0)
    expect([...menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')].map((cell) => cell.hidden)).toEqual([false, false])
    await React.act(async () => root.unmount())
  })

  it('folds an open list back when its row is clicked again', async () => {
    document.documentElement.setAttribute(STACK_ATTRIBUTE, '')
    const { root, menu, rows } = await openMenu()
    const cells = () => [...menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')]
    for (const index of [1, 0]) {
      await React.act(async () => cells()[index]?.click())
      expect(menu.querySelectorAll('button[role="menuitemradio"]').length).toBeGreaterThan(0)
      expect(cells()[index]?.getAttribute('aria-expanded')).toBe('true')
      // Second click on the same row: back to the two rows, nothing expanded.
      await React.act(async () => cells()[index]?.click())
      expect(menu.querySelectorAll('button[role="menuitemradio"]')).toHaveLength(0)
      expect(menu.querySelector('[data-dsh-desktop-stack-pane]')).toBeNull()
      expect(cells().map((cell) => [cell.hidden, cell.getAttribute('aria-expanded')])).toEqual([[false, 'false'], [false, 'false']])
      // Focus goes back to the row that was open, as upstream's Escape does.
      expect(document.activeElement).toBe(cells()[index])
    }
    // The menu itself stays open throughout.
    expect(rows[0]?.isConnected).toBe(true)
    expect(document.querySelector('button[aria-haspopup="menu"]')?.getAttribute('aria-expanded')).toBe('true')
    await React.act(async () => root.unmount())
  })

  it('is tracked as one patch with its purpose recorded', async () => {
    const patch = await readFile(patchPath('@deepseek-ai/dsh-client-ui-model-selection'), 'utf8')
    expect(patch).toContain(STACK_ATTRIBUTE)
    expect(patch).toContain('hidden: drilled && pane === "effort"')
  })
})
