/**
 * Set on <html> from the moment the left sidebar starts to collapse until
 * AppFrame's column transition has finished.
 *
 * Harness flips `data-sidebar-collapsed` on the first frame of the toggle, so
 * everything keyed to it (the collapsed rail controls, the caption menubar
 * seat, the floating card) changed while the column was still 280px wide:
 * the menubar jumped right and left a gap, and the card vanished before the
 * column moved. `data-animating` alone cannot stand in, because AppFrame also
 * sets it for rightbar toggles while the sidebar is already collapsed.
 */
export const SIDEBAR_COLLAPSING_ATTRIBUTE = 'data-dsh-sidebar-collapsing'

const COLLAPSED = 'data-sidebar-collapsed'
const ANIMATING = 'data-animating'
/**
 * AppFrame settles on `transitionend` or its own timer, both well inside a
 * second; this only bounds a frame that never animates at all.
 */
const SETTLE_FALLBACK_MS = 1000

interface CollapseTimers {
  setTimeout(callback: () => void, ms: number): unknown
  clearTimeout(handle: unknown): void
}

export function trackSidebarCollapse(
  document: Document,
  timers: CollapseTimers = {
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    clearTimeout: (handle) => window.clearTimeout(handle as number)
  }
): { dispose(): void } {
  const root = document.documentElement
  let frame: Element | undefined
  let sawAnimating = false
  let fallback: unknown

  const settle = (): void => {
    if (fallback !== undefined) timers.clearTimeout(fallback)
    fallback = undefined
    frame = undefined
    sawAnimating = false
    root.removeAttribute(SIDEBAR_COLLAPSING_ATTRIBUTE)
  }
  const begin = (target: Element): void => {
    settle()
    frame = target
    sawAnimating = target.hasAttribute(ANIMATING)
    root.setAttribute(SIDEBAR_COLLAPSING_ATTRIBUTE, '')
    fallback = timers.setTimeout(settle, SETTLE_FALLBACK_MS)
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const target = record.target
      if (!(target instanceof Element)) continue
      if (record.attributeName === COLLAPSED) {
        const collapsed = target.hasAttribute(COLLAPSED)
        if (collapsed && record.oldValue === null) begin(target)
        // Expanding again mid-collapse hands the seat straight back.
        else if (!collapsed && target === frame) settle()
      } else if (record.attributeName === ANIMATING && target === frame) {
        if (target.hasAttribute(ANIMATING)) sawAnimating = true
        else if (sawAnimating) settle()
      }
    }
  })
  observer.observe(root, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: [COLLAPSED, ANIMATING],
    subtree: true
  })

  return {
    dispose: () => {
      observer.disconnect()
      settle()
    }
  }
}
