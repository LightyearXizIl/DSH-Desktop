// @vitest-environment jsdom
import path from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { projectRoot } from './patch-path'

interface SpotlightModule {
  startSpotlight: () => () => void
}

// The theme sources import each other with `.ts` extensions under the
// package's own tsconfig; a static import would pull them into the root test
// program, which does not allow that. Vitest loads the module at runtime and
// the theme package's typecheck covers its types.
const SPOTLIGHT_URL = path.join(projectRoot, 'packages', 'dsh-desktop-theme', 'src', 'client', 'spotlight.ts')
let startSpotlight: SpotlightModule['startSpotlight']

beforeAll(async () => {
  const loaded: unknown = await import(/* @vite-ignore */ SPOTLIGHT_URL)
  if (!isSpotlightModule(loaded)) throw new Error('spotlight.ts no longer exports startSpotlight')
  startSpotlight = loaded.startSpotlight
})

function isSpotlightModule(value: unknown): value is SpotlightModule {
  if (typeof value !== 'object' || value === null) return false
  return typeof (value as Record<string, unknown>).startSpotlight === 'function'
}

const RECT = { left: 12, top: 52, right: 268, bottom: 888, width: 256, height: 836, x: 12, y: 52 }
const TILT = /^perspective\(800px\) rotateX\(.+\) rotateY\(.+\) scale\(1\.01\)$/u

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

/** Let the overlay keeper's MutationObserver deliver. */
const mutationsSettled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('Liquid Glass hover tilt', () => {
  let stop: (() => void) | undefined

  beforeEach(() => {
    document.documentElement.setAttribute('data-dsh-desktop-press', '')
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ ...RECT, toJSON: () => RECT } as DOMRect)
    // Run the frame at once; the handle is already spent, so report none pending.
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0 })
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

  it('tilts the whole sidebar card, its contents included', () => {
    const { column, root, button } = mountSidebar()
    stop = startSpotlight()
    hover(button, 40, 100)
    // The column is the glass card; transforming it carries the text along.
    expect(column.style.transform).toMatch(TILT)
    expect(root.style.transform).toBe('')
  })

  it('lays the card flat the moment a tooltip mounts inside it', async () => {
    const { column, button } = mountSidebar()
    stop = startSpotlight()
    hover(button, 40, 100)
    expect(column.style.transform).toMatch(TILT)
    // A transform makes the card the containing block of the tooltip's
    // fixed, viewport-based coordinates; flat, the tooltip lands on its anchor.
    const tooltip = document.createElement('span')
    tooltip.setAttribute('role', 'tooltip')
    button.after(tooltip)
    await mutationsSettled()
    expect(column.style.transform).toBe('')
    // And it stays flat while the tooltip is open.
    hover(button, 60, 120)
    expect(column.style.transform).toBe('')
    tooltip.remove()
    await mutationsSettled()
    hover(button, 60, 120)
    expect(column.style.transform).toMatch(TILT)
  })

  it('glides back to rest when the pointer leaves the card', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const { column, button } = mountSidebar()
      stop = startSpotlight()
      hover(button, 40, 100)
      button.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, clientX: 600, clientY: 400 }))
      expect(column.style.transform).toBe('perspective(800px) rotateX(0rad) rotateY(0rad) scale(1)')
      vi.advanceTimersByTime(300)
      // No residual transform keeps the card a containing block.
      expect(column.style.transform).toBe('')
    } finally {
      vi.useRealTimers()
    }
  })

  it('rests while the settings overlay is open over the sidebar', () => {
    const { column, button } = mountSidebar()
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    column.appendChild(dialog)
    stop = startSpotlight()
    hover(button, 40, 100)
    expect(column.style.transform).toBe('')
  })

  it('never tilts the collapsed rail, which has no card', () => {
    const { frame, column, button } = mountSidebar()
    frame.setAttribute('data-sidebar-collapsed', '')
    stop = startSpotlight()
    hover(button, 40, 100)
    expect(column.style.transform).toBe('')
  })

  it('stays flat when the hover tilt setting is off', () => {
    const { column, button } = mountSidebar()
    document.documentElement.removeAttribute('data-dsh-desktop-press')
    document.documentElement.setAttribute('data-dsh-desktop-spotlight', '')
    stop = startSpotlight()
    hover(button, 40, 100)
    expect(column.style.transform).toBe('')
    document.documentElement.removeAttribute('data-dsh-desktop-spotlight')
  })
})
