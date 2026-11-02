// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { SIDEBAR_COLLAPSING_ATTRIBUTE, trackSidebarCollapse } from '../src/preload/sidebar-collapse-state'

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))
const collapsing = (): boolean => document.documentElement.hasAttribute(SIDEBAR_COLLAPSING_ATTRIBUTE)

function frame(): HTMLElement {
  const element = document.createElement('div')
  document.body.append(element)
  return element
}

function manualTimers() {
  const pending: Array<() => void> = []
  return {
    timers: {
      setTimeout: (callback: () => void) => {
        pending.push(callback)
        return pending.length
      },
      clearTimeout: vi.fn()
    },
    fire: () => pending.splice(0).forEach((callback) => callback())
  }
}

afterEach(() => {
  document.body.replaceChildren()
  document.documentElement.removeAttribute(SIDEBAR_COLLAPSING_ATTRIBUTE)
})

it('holds the collapsing state from the first frame until AppFrame stops animating', async () => {
  const tracker = trackSidebarCollapse(document, manualTimers().timers)
  const app = frame()

  // Harness marks the frame collapsed first and starts the column transition
  // in the commit that follows.
  app.setAttribute('data-sidebar-collapsed', 'true')
  await flush()
  expect(collapsing()).toBe(true)
  app.setAttribute('data-animating', 'true')
  await flush()
  expect(collapsing()).toBe(true)

  app.removeAttribute('data-animating')
  await flush()
  expect(collapsing()).toBe(false)
  tracker.dispose()
})

it('ignores a rightbar transition while the sidebar is already collapsed', async () => {
  const app = frame()
  app.setAttribute('data-sidebar-collapsed', 'true')
  const tracker = trackSidebarCollapse(document, manualTimers().timers)

  app.setAttribute('data-animating', 'true')
  await flush()
  expect(collapsing()).toBe(false)
  app.removeAttribute('data-animating')
  await flush()
  expect(collapsing()).toBe(false)
  tracker.dispose()
})

it('hands the seat back when the sidebar is expanded again mid-collapse', async () => {
  const tracker = trackSidebarCollapse(document, manualTimers().timers)
  const app = frame()
  app.setAttribute('data-sidebar-collapsed', 'true')
  app.setAttribute('data-animating', 'true')
  await flush()
  expect(collapsing()).toBe(true)

  app.removeAttribute('data-sidebar-collapsed')
  await flush()
  expect(collapsing()).toBe(false)
  tracker.dispose()
})

it('settles on its own when the frame never animates', async () => {
  const { timers, fire } = manualTimers()
  const tracker = trackSidebarCollapse(document, timers)
  const app = frame()
  app.setAttribute('data-sidebar-collapsed', 'true')
  await flush()
  expect(collapsing()).toBe(true)

  fire()
  expect(collapsing()).toBe(false)
  tracker.dispose()
})

it('clears the state when disposed', async () => {
  const tracker = trackSidebarCollapse(document, manualTimers().timers)
  frame().setAttribute('data-sidebar-collapsed', 'true')
  await flush()
  expect(collapsing()).toBe(true)
  tracker.dispose()
  expect(collapsing()).toBe(false)
})
