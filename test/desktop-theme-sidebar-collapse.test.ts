// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { THEME_RUNTIME_STYLES } from '../packages/dsh-desktop-theme/src/client/theme-css'

/** Mount the theme stylesheet over a minimal mica sidebar. */
function mount(): { frame: HTMLElement; sidebar: HTMLElement; newSession: HTMLElement } {
  const style = document.createElement('style')
  style.textContent = THEME_RUNTIME_STYLES
  document.head.append(style)
  document.documentElement.setAttribute('data-dsh-desktop-float', '')
  document.body.innerHTML = `
    <div data-dsh-desktop-frame>
      <div data-dsh-desktop-sidebar>
        <div data-dsh-sidebar-root><button data-dsh-desktop-new-session></button></div>
      </div>
    </div>`
  const frame = document.querySelector<HTMLElement>('[data-dsh-desktop-frame]')
  const sidebar = document.querySelector<HTMLElement>('[data-dsh-desktop-sidebar]')
  const newSession = document.querySelector<HTMLElement>('[data-dsh-desktop-new-session]')
  if (!frame || !sidebar || !newSession) throw new Error('fixture did not mount')
  return { frame, sidebar, newSession }
}

afterEach(() => {
  document.head.replaceChildren()
  document.body.replaceChildren()
  document.documentElement.removeAttribute('data-dsh-desktop-float')
  document.documentElement.removeAttribute('data-dsh-sidebar-collapsing')
})

it('keeps the floating card while the sidebar column is still closing', () => {
  const { frame, sidebar } = mount()
  expect(getComputedStyle(sidebar).marginTop).toBe('12px')

  // Harness marks the frame collapsed on the first frame of the toggle. The
  // card used to drop its inset there, so it vanished before the column moved.
  frame.setAttribute('data-sidebar-collapsed', 'true')
  document.documentElement.setAttribute('data-dsh-sidebar-collapsing', '')
  expect(getComputedStyle(sidebar).marginTop).toBe('12px')

  // Once the column has closed, the upstream icon rail takes over.
  document.documentElement.removeAttribute('data-dsh-sidebar-collapsing')
  expect(getComputedStyle(sidebar).marginTop).toBe('0px')
})

it('leaves the collapsed rail new-session button as a bare icon', () => {
  const { frame, newSession } = mount()
  expect(getComputedStyle(newSession).borderRadius).toBe('var(--dsw-radius-md)')

  // In the rail it sits beside the bare toggle, outside any pane, so the
  // tile it wears inside the card is out of place there.
  frame.setAttribute('data-sidebar-collapsed', 'true')
  expect(getComputedStyle(newSession).borderRadius).not.toBe('var(--dsw-radius-md)')
})
