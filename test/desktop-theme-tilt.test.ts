// @vitest-environment jsdom
import path from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { projectRoot } from './patch-path'

interface SpotlightModule {
  startSpotlight: () => () => void
  TILT_PROPERTY: string
}

// The theme sources import each other with `.ts` extensions under the
// package's own tsconfig; a static import would pull them into the root test
// program, which does not allow that. Vitest loads the module at runtime and
// the theme package's typecheck covers its types.
const SPOTLIGHT_URL = path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'spotlight.ts')
let startSpotlight: SpotlightModule['startSpotlight']
let TILT_PROPERTY = ''

beforeAll(async () => {
  const loaded: unknown = await import(/* @vite-ignore */ SPOTLIGHT_URL)
  if (!isSpotlightModule(loaded)) throw new Error('spotlight.ts no longer exports startSpotlight / TILT_PROPERTY')
  startSpotlight = loaded.startSpotlight
  TILT_PROPERTY = loaded.TILT_PROPERTY
})

function isSpotlightModule(value: unknown): value is SpotlightModule {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.startSpotlight === 'function' && typeof record.TILT_PROPERTY === 'string'
}

const RECT = { left: 12, top: 52, right: 268, bottom: 888, width: 256, height: 836, x: 12, y: 52 }

function mountSidebar(): { frame: HTMLElement; column: HTMLElement; root: HTMLElement; button: HTMLElement } {
  document.body.innerHTML = `
    <div data-dsh-desktop-frame>
      <div data-dsh-desktop-sidebar>
        <div data-dsh-sidebar-root data-dsh-desktop-spot>
          <div data-window-drag><button type="button">toggle</button></div>
          <button type="button" id="item">item</button>
        </div>
      </div>
    </div>`
  return {
    frame: query('[data-dsh-desktop-frame]'),
    column: query('[data-dsh-desktop-sidebar]'),
    root: query('[data-dsh-sidebar-root]'),
    button: query('#item'),
  }
}

function query(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector)
  if (element === null) throw new Error(`fixture is missing ${selector}`)
  return element
}

function hover(target: Element, x: number, y: number): void {
  target.dispatchEvent(new MouseEvent('pointerover', { bubbles: true, clientX: x, clientY: y }))
  target.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y }))
}

describe('Liquid Glass hover tilt', () => {
  let stop: (() => void) | undefined

  beforeEach(() => {
    document.documentElement.setAttribute('data-dsh-desktop-press', '')
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ ...RECT, toJSON: () => RECT } as DOMRect)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
  })

  afterEach(() => {
    stop?.()
    stop = undefined
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.documentElement.removeAttribute('data-dsh-desktop-press')
    document.body.innerHTML = ''
  })

  it('tilts the sidebar card through its plate, never by transforming the pane', () => {
    const { column, root, button } = mountSidebar()
    stop = startSpotlight()
    hover(button, 40, 100)
    // The column carries the plate; a transform on it (or on the root) would
    // make it the containing block for the tooltips and caption toggle inside.
    expect(column.style.getPropertyValue(TILT_PROPERTY)).toMatch(/^perspective\(800px\) rotateX\(.+\) rotateY\(.+\) scale\(1\.01\)$/u)
    expect(column.style.transform).toBe('')
    expect(root.style.transform).toBe('')
  })

  it('releases the tilt when the pointer leaves the card', () => {
    const { column, button } = mountSidebar()
    stop = startSpotlight()
    hover(button, 40, 100)
    button.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, clientX: 600, clientY: 400 }))
    expect(column.style.getPropertyValue(TILT_PROPERTY)).toBe('')
  })

  it('rests while the settings overlay is open over the sidebar', () => {
    const { column, button } = mountSidebar()
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    column.appendChild(dialog)
    stop = startSpotlight()
    hover(button, 40, 100)
    expect(column.style.getPropertyValue(TILT_PROPERTY)).toBe('')
  })

  it('never tilts the collapsed rail, which has no card', () => {
    const { frame, column, button } = mountSidebar()
    frame.setAttribute('data-sidebar-collapsed', '')
    stop = startSpotlight()
    hover(button, 40, 100)
    expect(column.style.getPropertyValue(TILT_PROPERTY)).toBe('')
  })

  it('stays flat when the hover tilt setting is off', () => {
    const { column, button } = mountSidebar()
    document.documentElement.removeAttribute('data-dsh-desktop-press')
    document.documentElement.setAttribute('data-dsh-desktop-spotlight', '')
    stop = startSpotlight()
    hover(button, 40, 100)
    expect(column.style.getPropertyValue(TILT_PROPERTY)).toBe('')
    document.documentElement.removeAttribute('data-dsh-desktop-spotlight')
  })
})
